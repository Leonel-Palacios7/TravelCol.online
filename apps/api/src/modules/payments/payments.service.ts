import {
  BadRequestException, ConflictException, Injectable, Logger, NotFoundException, ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, type Payment, type PaymentStatus } from '@prisma/client';
import { toCents, type CheckoutDto } from '@travelcol/contracts';
import { PrismaService, Tx } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { humanCode, sha256 } from '../../common/crypto';
import { env } from '../../config/env';
import { canTransitionPayment, mapWompiStatus } from '../../domain/payment-state';
import { integritySignature, verifyEventChecksum, type WompiEvent } from '../../domain/wompi-signature';
import { BookingsService } from '../bookings/bookings.service';
import { LedgerService } from '../finance/ledger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WompiClient, type WompiTransaction } from './wompi.client';

export type WebhookOutcome =
  | 'INVALID_SIGNATURE'
  | 'DUPLICATE'
  | 'IGNORED_EVENT'
  | 'UNKNOWN_REFERENCE'
  | 'MISMATCH'
  | 'NOT_VERIFIABLE'
  | 'STALE'
  | 'PROCESSED';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('Payments');

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookings: BookingsService,
    private readonly ledger: LedgerService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly wompi: WompiClient,
  ) {}

  private configured() {
    const e = env();
    return !!(e.WOMPI_PUBLIC_KEY && e.WOMPI_INTEGRITY_SECRET && e.WOMPI_EVENTS_SECRET);
  }

  /** Paso 1-3 del flujo: valida la reserva y genera un intento con referencia única y firma de integridad. */
  async checkout(userId: string, bookingId: string): Promise<CheckoutDto> {
    if (!this.configured()) {
      throw new ServiceUnavailableException('Los pagos no están configurados en este entorno (faltan llaves de Wompi Sandbox).');
    }
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId }, include: { service: { include: { provider: true } }, user: true } });
    if (!booking || booking.userId !== userId) throw new NotFoundException('Reserva no encontrada');
    if (booking.status !== 'PENDING_PAYMENT') throw new ConflictException('Esta reserva no está pendiente de pago');
    if (!booking.holdExpiresAt || booking.holdExpiresAt <= new Date()) {
      throw new ConflictException('El tiempo para pagar esta reserva expiró. Crea una nueva reserva.');
    }
    if (booking.service.provider.status !== 'APPROVED') throw new ConflictException('El proveedor no está habilitado');
    const approved = await this.prisma.payment.count({ where: { bookingId, status: 'APPROVED' } });
    if (approved > 0) throw new ConflictException('Esta reserva ya tiene un pago aprobado');

    const amountInCents = toCents(booking.totalCop);
    const reference = `${booking.code}-${humanCode(6)}`;
    const e = env();
    const payment = await this.prisma.payment.create({
      data: {
        bookingId,
        reference,
        environment: e.WOMPI_ENV,
        amountInCents: BigInt(amountInCents),
        currency: 'COP',
        status: 'CREATED',
      },
    });
    const params: Record<string, string> = {
      'public-key': e.WOMPI_PUBLIC_KEY,
      currency: 'COP',
      'amount-in-cents': String(amountInCents),
      reference,
      'signature:integrity': integritySignature(reference, amountInCents, 'COP', e.WOMPI_INTEGRITY_SECRET),
      'redirect-url': `${e.WEB_URL}/reservas/${booking.id}/pago?pago=${payment.id}`,
      'customer-data:email': booking.user.email,
      'customer-data:full-name': booking.user.fullName,
    };
    await this.audit.log({ actorId: userId, action: 'CHECKOUT_STARTED', entityType: 'Payment', entityId: payment.id, metadata: { reference, amountInCents } });
    return { paymentId: payment.id, reference, checkoutUrl: e.WOMPI_CHECKOUT_URL, params };
  }

  async getForUser(user: { id: string; role: string }, paymentId: string) {
    const p = await this.prisma.payment.findUnique({ where: { id: paymentId }, include: { booking: { select: { userId: true, status: true, id: true, code: true } } } });
    if (!p) throw new NotFoundException('Pago no encontrado');
    const staff = user.role === 'ADMIN' || user.role === 'SUPPORT';
    if (p.booking.userId !== user.id && !staff) throw new NotFoundException('Pago no encontrado');
    return {
      id: p.id,
      reference: p.reference,
      status: p.status,
      amountCop: Number(p.amountInCents / 100n),
      paymentMethodType: p.paymentMethodType,
      statusMessage: p.statusMessage,
      booking: { id: p.booking.id, code: p.booking.code, status: p.booking.status },
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  /**
   * Reconciliación desde el backend usando el id de transacción que Wompi pone en la redirección.
   * El parámetro del navegador NO se cree: se consulta la API de Wompi con credenciales privadas y
   * se valida referencia, importe y moneda antes de aplicar el estado.
   */
  async syncFromProvider(user: { id: string; role: string }, paymentId: string, transactionId: string) {
    const p = await this.prisma.payment.findUnique({ where: { id: paymentId }, include: { booking: true } });
    if (!p || (p.booking.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPPORT')) {
      throw new NotFoundException('Pago no encontrado');
    }
    if (!this.configured()) throw new ServiceUnavailableException('Pagos no configurados');
    const tx = await this.wompi.getTransaction(transactionId);
    if (!tx) return { status: p.status, verified: false };
    if (tx.reference !== p.reference) throw new BadRequestException('La transacción no corresponde a este pago');
    await this.applyTransaction(tx, 'SYNC');
    const fresh = await this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    return { status: fresh.status, verified: true };
  }

  /** Pasos 5-11: recepción idempotente y validada del webhook. */
  async handleWebhook(body: unknown, headerChecksum: string | undefined): Promise<{ outcome: WebhookOutcome; status: number }> {
    const event = (body ?? {}) as WompiEvent;
    const signatureValid = verifyEventChecksum(event, env().WOMPI_EVENTS_SECRET, headerChecksum);
    const txData = (event.data?.transaction ?? {}) as Partial<WompiTransaction>;
    const checksum = typeof event.signature?.checksum === 'string' ? event.signature.checksum : '';
    const eventKey = sha256(`${checksum}|${JSON.stringify(event.data ?? {})}|${String(event.timestamp ?? '')}`);

    // Evidencia: todo evento recibido se registra (también los inválidos), una sola vez.
    let stored;
    try {
      stored = await this.prisma.paymentWebhookEvent.create({
        data: {
          eventKey,
          eventType: String(event.event ?? 'unknown').slice(0, 60),
          signatureValid,
          transactionId: typeof txData.id === 'string' ? txData.id.slice(0, 64) : null,
          reference: typeof txData.reference === 'string' ? txData.reference.slice(0, 64) : null,
          reportedStatus: typeof txData.status === 'string' ? txData.status.slice(0, 20) : null,
          eventTimestamp: typeof event.timestamp === 'number' ? BigInt(event.timestamp) : null,
          payload: (body ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return { outcome: 'DUPLICATE', status: 200 };
      }
      throw e;
    }

    const finish = async (outcome: WebhookOutcome, status: number, paymentId?: string) => {
      await this.prisma.paymentWebhookEvent.update({
        where: { id: stored.id },
        data: { processingResult: outcome, processedAt: new Date(), paymentId: paymentId ?? null },
      });
      return { outcome, status };
    };

    if (!signatureValid) {
      this.logger.warn(`Webhook con firma inválida (evento ${stored.id})`);
      return finish('INVALID_SIGNATURE', 401);
    }
    if (event.event !== 'transaction.updated') return finish('IGNORED_EVENT', 200);
    const expectedEnv = env().WOMPI_ENV === 'PRODUCTION' ? 'prod' : 'test';
    if (event.environment && event.environment !== expectedEnv) return finish('MISMATCH', 200);

    if (typeof txData.id !== 'string' || typeof txData.reference !== 'string' || typeof txData.status !== 'string'
      || typeof txData.amount_in_cents !== 'number' || typeof txData.currency !== 'string') {
      return finish('MISMATCH', 200);
    }

    let transaction = txData as WompiTransaction;
    if (env().WOMPI_VERIFY_WITH_API) {
      const remote = await this.wompi.getTransaction(transaction.id);
      if (!remote) {
        // No verificable ahora: respondemos != 200 para que Wompi reintente más tarde.
        return finish('NOT_VERIFIABLE', 503);
      }
      transaction = remote;
    }
    const result = await this.applyTransaction(transaction, `WEBHOOK:${stored.id}`);
    return finish(result.outcome, 200, result.paymentId);
  }

  /** Aplica el estado de una transacción verificada, con validaciones de consistencia y transición segura. */
  private async applyTransaction(t: WompiTransaction, source: string): Promise<{ outcome: WebhookOutcome; paymentId?: string }> {
    const payment = await this.prisma.payment.findUnique({ where: { reference: t.reference } });
    if (!payment) return { outcome: 'UNKNOWN_REFERENCE' };
    const amountOk = BigInt(t.amount_in_cents) === payment.amountInCents && t.currency === payment.currency;
    const txIdOk = !payment.providerTransactionId || payment.providerTransactionId === t.id;
    if (!amountOk || !txIdOk) {
      await this.flagDiscrepancy(payment, `Discrepancia en ${source}: importe/moneda/transacción no coinciden`);
      return { outcome: 'MISMATCH', paymentId: payment.id };
    }
    const next = mapWompiStatus(t.status);
    if (!next) return { outcome: 'MISMATCH', paymentId: payment.id };
    if (next === payment.status) return { outcome: 'DUPLICATE', paymentId: payment.id };
    if (!canTransitionPayment(payment.status, next)) {
      // Evento fuera de orden (p. ej. PENDING después de APPROVED): se ignora sin retroceder.
      return { outcome: 'STALE', paymentId: payment.id };
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.updateMany({
        where: { id: payment.id, status: payment.status },
        data: {
          status: next,
          providerTransactionId: t.id,
          paymentMethodType: t.payment_method_type?.slice(0, 40) ?? null,
          statusMessage: t.status_message?.slice(0, 300) ?? null,
          lastEventAt: new Date(),
          approvedAt: next === 'APPROVED' ? new Date() : undefined,
        },
      });
      if (updated.count !== 1) throw new ConflictException('El pago cambió en paralelo');
      if (next === 'APPROVED') await this.onApproved(tx, payment);
      if (next === 'VOIDED' && payment.status === 'APPROVED') await this.onVoidedAfterApproval(tx, payment);
      if (next === 'DECLINED' || next === 'ERROR') await this.onFailed(tx, payment, next);
    }).catch(async (e) => {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        // Ya existe otro pago aprobado para la reserva: doble cobro → requiere anulación manual.
        await this.flagDiscrepancy(payment, 'Segundo pago aprobado para la misma reserva: anular/reembolsar en Wompi');
        return;
      }
      if (e instanceof ConflictException) return;
      throw e;
    });
    return { outcome: 'PROCESSED', paymentId: payment.id };
  }

  private async onApproved(tx: Tx, payment: Payment) {
    const booking = await tx.booking.findUniqueOrThrow({ where: { id: payment.bookingId }, include: { provider: true } });
    if (booking.status === 'PENDING_PAYMENT') {
      await this.bookings.transition(tx, booking, 'CONFIRMED', 'Pago aprobado y verificado', null, { confirmedAt: new Date(), holdExpiresAt: null });
    } else if (booking.status === 'EXPIRED') {
      // Pago tardío: intentar recuperar el cupo de forma atómica.
      const held = await tx.$executeRaw`
        UPDATE "service_availability" SET "reserved_count" = "reserved_count" + ${booking.participantsCount}, "updated_at" = now()
         WHERE "id" = ${booking.availabilityId}::uuid AND "status" = 'OPEN' AND "starts_at" > now()
           AND "reserved_count" + ${booking.participantsCount} <= "capacity"`;
      if (held === 1) {
        await this.bookings.transition(tx, booking, 'CONFIRMED', 'Pago aprobado tras expiración; cupo recuperado', null, { confirmedAt: new Date(), holdExpiresAt: null });
      } else {
        await this.refundWithoutService(tx, booking, payment, 'Pago aprobado después de expirar la reserva y sin cupo disponible');
        return;
      }
    } else {
      // Reserva cancelada u otro estado: el dinero debe devolverse.
      await this.refundWithoutService(tx, booking, payment, `Pago aprobado con la reserva en estado ${booking.status}`);
      return;
    }
    await this.ledger.recordSale(tx, booking, payment.id);
    await this.notifications.notify({ userId: booking.userId, type: 'BOOKING_CONFIRMED', title: '¡Reserva confirmada!', body: `${booking.code} · ${booking.serviceTitle}`, link: `/cuenta/reservas/${booking.id}` }, tx);
    await this.notifications.notify({ userId: booking.provider.userId, type: 'BOOKING_RECEIVED', title: 'Nueva reserva confirmada', body: `${booking.code} · ${booking.participantsCount} pers. · ${booking.serviceTitle}`, link: '/proveedor/reservas' }, tx);
    const user = await tx.user.findUniqueOrThrow({ where: { id: booking.userId } });
    await this.notifications.queueEmail(user.email, 'BOOKING_CONFIRMED', `Reserva confirmada ${booking.code}`, { code: booking.code, title: booking.serviceTitle, startsAt: booking.startsAt.toISOString(), totalCop: booking.totalCop }, tx);
  }

  private async refundWithoutService(tx: Tx, booking: { id: string; code: string; totalCop: number }, payment: Payment, reason: string) {
    await tx.booking.update({ where: { id: booking.id }, data: { needsAttention: true } });
    await tx.refund.create({ data: { bookingId: booking.id, paymentId: payment.id, amountCop: booking.totalCop, refundPercent: 100, reason } });
    await this.notifications.notifyAdmins({ type: 'PAYMENT_DISCREPANCY', title: 'Pago requiere reembolso', body: `${booking.code}: ${reason}`, link: '/admin/reembolsos' }, tx);
  }

  private async onVoidedAfterApproval(tx: Tx, payment: Payment) {
    const booking = await tx.booking.findUniqueOrThrow({ where: { id: payment.bookingId } });
    if (booking.status === 'CONFIRMED') {
      await this.bookings.transition(tx, booking, 'CANCELLED', 'Pago anulado en Wompi', null, { cancelledAt: new Date(), cancelReason: 'Pago anulado' });
      await this.bookings.releaseInventory(tx, booking);
    }
    await tx.booking.update({ where: { id: booking.id }, data: { needsAttention: true } });
    await this.notifications.notifyAdmins({ type: 'PAYMENT_VOIDED', title: 'Pago anulado', body: `${booking.code}: revisar libro contable`, link: '/admin/pagos' }, tx);
  }

  private async onFailed(tx: Tx, payment: Payment, status: PaymentStatus) {
    const booking = await tx.booking.findUniqueOrThrow({ where: { id: payment.bookingId } });
    await this.notifications.notify({ userId: booking.userId, type: 'PAYMENT_FAILED', title: 'Pago no aprobado', body: status === 'DECLINED' ? 'Tu pago fue rechazado. Puedes intentarlo de nuevo mientras la reserva siga vigente.' : 'Hubo un error con el pago. Intenta nuevamente.', link: `/reservas/${booking.id}/pago` }, tx);
  }

  private async flagDiscrepancy(payment: Payment, message: string) {
    await this.prisma.booking.update({ where: { id: payment.bookingId }, data: { needsAttention: true } });
    await this.prisma.payment.update({ where: { id: payment.id }, data: { statusMessage: message.slice(0, 300) } });
    await this.notifications.notifyAdmins({ type: 'PAYMENT_DISCREPANCY', title: 'Discrepancia de pago', body: `${payment.reference}: ${message}`, link: '/admin/pagos' });
    await this.audit.log({ action: 'PAYMENT_DISCREPANCY', entityType: 'Payment', entityId: payment.id, metadata: { message } });
  }
}
