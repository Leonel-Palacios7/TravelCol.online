import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import type { Booking, BookingStatus, Prisma } from '@prisma/client';
import type { z } from 'zod';
import { refundPercentFor, type BookingDto, type createBookingSchema } from '@travelcol/contracts';
import { PrismaService, Tx } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { SettingsService } from '../../common/settings.service';
import { humanCode } from '../../common/crypto';
import { addMinutes, hoursBetween } from '../../common/time';
import { env } from '../../config/env';
import { quote, refundSplit } from '../../domain/pricing';
import { canTransitionBooking } from '../../domain/booking-state';
import { NotificationsService } from '../notifications/notifications.service';

export const bookingInclude = {
  service: { select: { id: true, slug: true, title: true } },
  provider: { select: { businessName: true, userId: true } },
  payments: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, status: true, reference: true } },
  review: { select: { id: true } },
} satisfies Prisma.BookingInclude;

type BookingRow = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

export function toBookingDto(b: BookingRow): BookingDto {
  return {
    id: b.id,
    code: b.code,
    status: b.status,
    service: b.service,
    providerName: b.provider.businessName,
    startsAt: b.startsAt.toISOString(),
    participants: b.participantsCount,
    price: {
      unitPriceCop: b.unitPriceCop,
      participants: b.participantsCount,
      subtotalCop: b.subtotalCop,
      feesCop: b.feesCop,
      totalCop: b.totalCop,
      currency: 'COP',
    },
    cancellationPolicy: b.cancellationPolicy,
    holdExpiresAt: b.status === 'PENDING_PAYMENT' ? (b.holdExpiresAt?.toISOString() ?? null) : null,
    createdAt: b.createdAt.toISOString(),
    confirmedAt: b.confirmedAt?.toISOString() ?? null,
    cancelledAt: b.cancelledAt?.toISOString() ?? null,
    latestPayment: b.payments[0] ?? null,
    canReview: b.status === 'COMPLETED' && !b.review,
    hasReview: !!b.review,
  };
}

@Injectable()
export class BookingsService {
  private readonly logger = new Logger('Bookings');

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Crea una reserva pendiente de pago reteniendo cupo de forma ATÓMICA:
   * UPDATE ... SET reserved_count = reserved_count + n WHERE reserved_count + n <= capacity.
   * Dos solicitudes simultáneas por el último cupo: solo una actualiza la fila; la otra recibe 409.
   * El precio se toma del servicio persistido; el cliente no envía importes.
   */
  async create(userId: string, input: z.output<typeof createBookingSchema>): Promise<BookingDto> {
    const participants = input.participants.length;
    const slot = await this.prisma.serviceAvailability.findUnique({
      where: { id: input.availabilityId },
      include: { service: { include: { provider: true } } },
    });
    if (!slot) throw new NotFoundException('Horario no encontrado');
    const service = slot.service;
    if (service.status !== 'PUBLISHED' || service.provider.status !== 'APPROVED') {
      throw new BadRequestException('Esta experiencia no está disponible para reservas');
    }
    if (service.provider.userId === userId) throw new ForbiddenException('No puedes reservar tus propios servicios');
    if (slot.status !== 'OPEN' || slot.startsAt <= addMinutes(new Date(), 60)) {
      throw new BadRequestException('Este horario ya no admite reservas');
    }
    if (participants < service.minParticipants || participants > service.maxParticipantsPerBooking) {
      throw new BadRequestException(
        `El número de participantes debe estar entre ${service.minParticipants} y ${service.maxParticipantsPerBooking}`,
      );
    }

    const booking = await this.prisma.$transaction(async (tx) => {
      const held = await tx.$executeRaw`
        UPDATE "service_availability"
           SET "reserved_count" = "reserved_count" + ${participants}, "updated_at" = now()
         WHERE "id" = ${slot.id}::uuid AND "status" = 'OPEN'
           AND "reserved_count" + ${participants} <= "capacity"`;
      if (held !== 1) throw new ConflictException('No hay cupos suficientes para este horario');

      const bps = await this.settings.commissionBps(tx);
      const q = quote(service.priceCop, participants, bps);
      const created = await tx.booking.create({
        data: {
          code: `TC-${humanCode(8)}`,
          userId,
          serviceId: service.id,
          providerId: service.providerId,
          availabilityId: slot.id,
          status: 'PENDING_PAYMENT',
          participantsCount: participants,
          serviceTitle: service.title,
          startsAt: slot.startsAt,
          unitPriceCop: q.unitPriceCop,
          subtotalCop: q.subtotalCop,
          feesCop: q.feesCop,
          totalCop: q.totalCop,
          commissionBps: q.commissionBps,
          commissionCop: q.commissionCop,
          providerNetCop: q.providerNetCop,
          cancellationPolicy: service.cancellationPolicy,
          contactPhone: input.contactPhone,
          notes: input.notes,
          holdExpiresAt: addMinutes(new Date(), env().BOOKING_HOLD_MINUTES),
          participants: { create: input.participants.map((p) => ({ fullName: p.fullName })) },
          statusHistory: { create: { toStatus: 'PENDING_PAYMENT', actorId: userId, reason: 'Reserva creada' } },
        },
        include: bookingInclude,
      });
      return created;
    });
    return toBookingDto(booking);
  }

  async listMine(userId: string) {
    const rows = await this.prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: bookingInclude,
    });
    return rows.map(toBookingDto);
  }

  /** Solo el turista dueño, el proveedor del servicio o personal administrativo. */
  async getForUser(user: { id: string; role: string }, id: string) {
    const b = await this.prisma.booking.findUnique({
      where: { id },
      include: { ...bookingInclude, participants: { select: { fullName: true } }, statusHistory: { orderBy: { createdAt: 'asc' } } },
    });
    if (!b) throw new NotFoundException('Reserva no encontrada');
    const isOwner = b.userId === user.id;
    const isProvider = b.provider.userId === user.id;
    const isStaff = user.role === 'ADMIN' || user.role === 'SUPPORT';
    if (!isOwner && !isProvider && !isStaff) throw new NotFoundException('Reserva no encontrada');
    return {
      ...toBookingDto(b),
      participantsList: b.participants.map((p) => p.fullName),
      contactPhone: isOwner || isProvider || isStaff ? b.contactPhone : null,
      notes: b.notes,
      history: b.statusHistory.map((h) => ({ from: h.fromStatus, to: h.toStatus, reason: h.reason, at: h.createdAt.toISOString() })),
    };
  }

  /** Transición condicional: solo cambia si el estado actual coincide (evita carreras). */
  async transition(tx: Tx, booking: Pick<Booking, 'id' | 'status'>, to: BookingStatus, reason: string, actorId: string | null, extra: Prisma.BookingUpdateManyMutationInput = {}) {
    if (!canTransitionBooking(booking.status, to)) {
      throw new ConflictException(`Transición no permitida: ${booking.status} → ${to}`);
    }
    const res = await tx.booking.updateMany({ where: { id: booking.id, status: booking.status }, data: { status: to, ...extra } });
    if (res.count !== 1) throw new ConflictException('La reserva cambió de estado; recarga la página');
    await tx.bookingStatusHistory.create({
      data: { bookingId: booking.id, fromStatus: booking.status, toStatus: to, reason, actorId },
    });
  }

  async releaseInventory(tx: Tx, booking: Pick<Booking, 'availabilityId' | 'participantsCount'>) {
    await tx.$executeRaw`
      UPDATE "service_availability"
         SET "reserved_count" = GREATEST("reserved_count" - ${booking.participantsCount}, 0), "updated_at" = now()
       WHERE "id" = ${booking.availabilityId}::uuid`;
  }

  /**
   * Cancelación. Turista: según la política vigente al contratar (instantánea en la reserva).
   * Proveedor o administración: reembolso del 100 %.
   */
  async cancel(actor: { id: string; role: string }, id: string, reason: string, by: 'TOURIST' | 'PROVIDER' | 'STAFF') {
    return this.prisma.$transaction(async (tx) => {
      const b = await tx.booking.findUnique({ where: { id }, include: { provider: true, payments: { where: { status: 'APPROVED' } } } });
      if (!b) throw new NotFoundException('Reserva no encontrada');
      if (by === 'TOURIST' && b.userId !== actor.id) throw new NotFoundException('Reserva no encontrada');
      if (by === 'PROVIDER' && b.provider.userId !== actor.id) throw new NotFoundException('Reserva no encontrada');
      if (b.status !== 'PENDING_PAYMENT' && b.status !== 'CONFIRMED') {
        throw new ConflictException('Esta reserva ya no se puede cancelar');
      }
      let refundPercent = 0;
      if (b.status === 'CONFIRMED') {
        refundPercent = by === 'TOURIST' ? refundPercentFor(b.cancellationPolicy, hoursBetween(new Date(), b.startsAt)) : 100;
        if (by === 'TOURIST' && b.startsAt <= new Date()) throw new ConflictException('La experiencia ya inició');
      }
      await this.transition(tx, b, 'CANCELLED', reason, actor.id, { cancelledAt: new Date(), cancelReason: reason });
      await this.releaseInventory(tx, b);

      let refund = null;
      const approved = b.payments[0];
      if (approved && refundPercent > 0) {
        const split = refundSplit(b, refundPercent);
        refund = await tx.refund.create({
          data: {
            bookingId: b.id,
            paymentId: approved.id,
            amountCop: split.refundTotalCop,
            refundPercent,
            reason,
            requestedById: actor.id,
          },
        });
        await this.notifications.notifyAdmins({ type: 'REFUND_REQUESTED', title: 'Reembolso por ejecutar', body: `${b.code}: ${split.refundTotalCop} COP`, link: '/admin/reembolsos' }, tx);
      }
      await this.notifications.notify({ userId: b.provider.userId, type: 'BOOKING_CANCELLED', title: 'Reserva cancelada', body: `${b.code} · ${b.serviceTitle}`, link: '/proveedor/reservas' }, tx);
      if (by !== 'TOURIST') {
        await this.notifications.notify({ userId: b.userId, type: 'BOOKING_CANCELLED', title: 'Tu reserva fue cancelada', body: `${b.code}: ${reason}. Recibirás el reembolso completo.`, link: `/cuenta/reservas/${b.id}` }, tx);
      }
      await this.audit.log({ actorId: actor.id, action: 'BOOKING_CANCELLED', entityType: 'Booking', entityId: b.id, metadata: { by, refundPercent } }, tx);
      return { status: 'CANCELLED' as const, refundPercent, refundAmountCop: refund?.amountCop ?? 0 };
    });
  }

  /** Libera cupos de reservas pendientes vencidas. Idempotente y seguro ante carreras con el webhook. */
  async expireHolds(now = new Date()) {
    const expired = await this.prisma.booking.findMany({
      where: { status: 'PENDING_PAYMENT', holdExpiresAt: { lt: now } },
      select: { id: true, status: true, availabilityId: true, participantsCount: true },
      take: 200,
    });
    let count = 0;
    for (const b of expired) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await this.transition(tx, b, 'EXPIRED', 'Tiempo de pago agotado', null);
          await this.releaseInventory(tx, b);
        });
        count++;
      } catch (e) {
        if (!(e instanceof ConflictException)) this.logger.error(e);
      }
    }
    return count;
  }

  /** Marca como completadas las reservas confirmadas cuya experiencia ya terminó. */
  async completePast(now = new Date()) {
    const rows = await this.prisma.booking.findMany({
      where: { status: 'CONFIRMED', startsAt: { lt: now } },
      select: { id: true, status: true, startsAt: true, service: { select: { durationMinutes: true } } },
      take: 500,
    });
    let count = 0;
    for (const b of rows) {
      if (addMinutes(b.startsAt, b.service.durationMinutes) > now) continue;
      try {
        await this.prisma.$transaction((tx) => this.transition(tx, b, 'COMPLETED', 'Experiencia finalizada', null));
        count++;
      } catch (e) {
        if (!(e instanceof ConflictException)) this.logger.error(e);
      }
    }
    return count;
  }
}
