import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { SettingsService } from '../../common/settings.service';
import { pageArgs } from '../../common/pagination';
import { uniqueSlug } from '../../common/slug';
import { refundSplit } from '../../domain/pricing';
import { SessionService } from '../auth/session.service';
import { LedgerService } from '../finance/ledger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';

interface Actor {
  id: string;
  role: UserRole;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly settings: SettingsService,
    private readonly sessions: SessionService,
    private readonly ledger: LedgerService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
  ) {}

  /** Indicadores calculados SOLO con datos persistidos. */
  async dashboard() {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [bookingsByStatus, gmv, commission, pendingApps, servicesInReview, attention, refundsPending, openTickets, users, payments30, approved30] =
      await Promise.all([
        this.prisma.booking.groupBy({ by: ['status'], _count: true }),
        this.prisma.booking.aggregate({ where: { status: { in: ['CONFIRMED', 'COMPLETED'] }, confirmedAt: { gte: since } }, _sum: { totalCop: true }, _avg: { totalCop: true }, _count: true }),
        this.prisma.ledgerEntry.aggregate({ where: { type: { in: ['COMMISSION', 'COMMISSION_REVERSAL'] }, createdAt: { gte: since } }, _sum: { amountCop: true } }),
        this.prisma.providerApplication.count({ where: { status: 'PENDING' } }),
        this.prisma.tourismService.count({ where: { status: 'IN_REVIEW' } }),
        this.prisma.booking.count({ where: { needsAttention: true } }),
        this.prisma.refund.count({ where: { status: 'REQUESTED' } }),
        this.prisma.supportTicket.count({ where: { status: { not: 'CLOSED' } } }),
        this.prisma.user.groupBy({ by: ['role'], _count: true }),
        this.prisma.payment.count({ where: { createdAt: { gte: since } } }),
        this.prisma.payment.count({ where: { createdAt: { gte: since }, status: 'APPROVED' } }),
      ]);
    return {
      periodDays: 30,
      bookingsByStatus: Object.fromEntries(bookingsByStatus.map((b) => [b.status, b._count])),
      confirmedBookings30d: gmv._count,
      gmvCop30d: gmv._sum.totalCop ?? 0,
      averageBookingCop30d: gmv._avg.totalCop ? Math.round(gmv._avg.totalCop) : 0,
      commissionCop30d: -(commission._sum.amountCop ?? 0),
      paymentAttempts30d: payments30,
      paymentApprovalRate30d: payments30 ? Math.round((approved30 / payments30) * 1000) / 10 : null,
      pendingProviderApplications: pendingApps,
      servicesInReview,
      bookingsNeedingAttention: attention,
      refundsPending,
      openTickets,
      usersByRole: Object.fromEntries(users.map((u) => [u.role, u._count])),
    };
  }

  // ---------------- Proveedores ----------------
  listApplications(status?: string) {
    return this.prisma.providerApplication.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { email: true, fullName: true, emailVerifiedAt: true } }, destination: { select: { name: true } } },
    });
  }

  async decideApplication(actor: Actor, id: string, decision: 'APPROVE' | 'REJECT', notes: string) {
    return this.prisma.$transaction(async (tx) => {
      const app = await tx.providerApplication.findUnique({ where: { id }, include: { user: true } });
      if (!app) throw new NotFoundException('Solicitud no encontrada');
      if (app.status !== 'PENDING') throw new ConflictException('La solicitud ya fue resuelta');
      await tx.providerApplication.update({
        where: { id },
        data: { status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', reviewNotes: notes, reviewedById: actor.id, reviewedAt: new Date() },
      });
      if (decision === 'APPROVE') {
        if (app.user.role !== 'TOURIST') throw new ConflictException('El usuario ya tiene otro rol');
        const exists = await tx.providerProfile.findFirst({ where: { OR: [{ userId: app.userId }, { taxId: app.taxId }] } });
        if (exists) throw new ConflictException('Ya existe un perfil de proveedor para este usuario o NIT');
        await tx.providerProfile.create({
          data: {
            userId: app.userId,
            slug: uniqueSlug(app.businessName),
            businessName: app.businessName,
            legalName: app.legalName,
            taxId: app.taxId,
            rntNumber: app.rntNumber,
            contactPhone: app.contactPhone,
            description: app.description,
            destinationId: app.destinationId,
            status: 'APPROVED',
          },
        });
        await tx.user.update({ where: { id: app.userId }, data: { role: 'PROVIDER' } });
      }
      await this.notifications.notify({
        userId: app.userId,
        type: 'PROVIDER_APPLICATION_DECIDED',
        title: decision === 'APPROVE' ? '¡Bienvenido como proveedor!' : 'Solicitud de proveedor no aprobada',
        body: decision === 'APPROVE' ? 'Ya puedes crear tus experiencias. Para publicarlas debes tener tu RNT verificado.' : notes,
        link: decision === 'APPROVE' ? '/proveedor' : '/cuenta',
      }, tx);
      await this.audit.log({ actorId: actor.id, action: `PROVIDER_APPLICATION_${decision}`, entityType: 'ProviderApplication', entityId: id, metadata: { notes } }, tx);
      return { ok: true };
    });
  }

  async listProviders(q: { status?: string; q?: string; page: number; pageSize: number }) {
    const where: Prisma.ProviderProfileWhereInput = {
      status: q.status ? (q.status as never) : undefined,
      businessName: q.q ? { contains: q.q, mode: 'insensitive' } : undefined,
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.providerProfile.count({ where }),
      this.prisma.providerProfile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(q.page, q.pageSize),
        include: {
          user: { select: { email: true, fullName: true } },
          _count: { select: { services: true, documents: { where: { status: 'PENDING' } } } },
        },
      }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  async providerDetail(id: string) {
    const p = await this.prisma.providerProfile.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, fullName: true, phone: true } },
        documents: { orderBy: { createdAt: 'desc' }, select: { id: true, type: true, originalName: true, status: true, reviewNotes: true, createdAt: true, sizeBytes: true } },
        services: { select: { id: true, title: true, status: true, slug: true } },
      },
    });
    if (!p) throw new NotFoundException('Proveedor no encontrado');
    return p;
  }

  async setProviderStatus(actor: Actor, id: string, status: 'APPROVED' | 'SUSPENDED', reason?: string) {
    const p = await this.prisma.providerProfile.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Proveedor no encontrado');
    await this.prisma.providerProfile.update({ where: { id }, data: { status } });
    await this.notifications.notify({ userId: p.userId, type: 'PROVIDER_STATUS', title: status === 'SUSPENDED' ? 'Tu perfil de proveedor fue suspendido' : 'Tu perfil de proveedor está habilitado', body: reason ?? '', link: '/proveedor' });
    await this.audit.log({ actorId: actor.id, action: 'PROVIDER_STATUS_CHANGED', entityType: 'ProviderProfile', entityId: id, metadata: { from: p.status, to: status, reason: reason ?? null } });
    return { ok: true };
  }

  async reviewDocument(actor: Actor, id: string, status: 'VERIFIED' | 'REJECTED', notes?: string) {
    return this.prisma.$transaction(async (tx) => {
      const doc = await tx.providerDocument.findUnique({ where: { id }, include: { provider: true } });
      if (!doc) throw new NotFoundException('Documento no encontrado');
      await tx.providerDocument.update({ where: { id }, data: { status, reviewNotes: notes, reviewedById: actor.id, reviewedAt: new Date() } });
      if (doc.type === 'RNT' && status === 'VERIFIED') {
        if (!doc.provider.rntNumber) throw new BadRequestException('El proveedor no ha registrado su número de RNT');
        await tx.providerProfile.update({ where: { id: doc.providerId }, data: { rntVerifiedAt: new Date() } });
      }
      await this.notifications.notify({ userId: doc.provider.userId, type: 'DOCUMENT_REVIEWED', title: status === 'VERIFIED' ? 'Documento verificado' : 'Documento rechazado', body: `${doc.type}${notes ? `: ${notes}` : ''}`, link: '/proveedor/documentos' }, tx);
      await this.audit.log({ actorId: actor.id, action: 'PROVIDER_DOCUMENT_REVIEWED', entityType: 'ProviderDocument', entityId: id, metadata: { status, type: doc.type } }, tx);
      return { ok: true };
    });
  }

  async documentFile(actor: Actor, id: string) {
    const doc = await this.prisma.providerDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    await this.audit.log({ actorId: actor.id, action: 'PROVIDER_DOCUMENT_ACCESSED', entityType: 'ProviderDocument', entityId: id });
    return { doc, data: await this.storage.get(doc.storageKey) };
  }

  // ---------------- Catálogo / moderación ----------------
  async listServices(q: { status?: string; q?: string; page: number; pageSize: number }) {
    const where: Prisma.TourismServiceWhereInput = {
      status: q.status ? (q.status as never) : undefined,
      title: q.q ? { contains: q.q, mode: 'insensitive' } : undefined,
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.tourismService.count({ where }),
      this.prisma.tourismService.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        ...pageArgs(q.page, q.pageSize),
        select: {
          id: true, slug: true, title: true, summary: true, status: true, priceCop: true, isDemo: true, updatedAt: true, rejectionReason: true,
          provider: { select: { businessName: true, rntVerifiedAt: true, status: true } },
          category: { select: { name: true } },
          _count: { select: { media: true, availability: true } },
        },
      }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  async moderateService(actor: Actor, id: string, decision: 'PUBLISH' | 'REJECT' | 'ARCHIVE', reason?: string) {
    const s = await this.prisma.tourismService.findUnique({ where: { id }, include: { provider: true, _count: { select: { media: true } } } });
    if (!s) throw new NotFoundException('Servicio no encontrado');
    if (decision === 'PUBLISH') {
      if (s.status !== 'IN_REVIEW') throw new ConflictException('Solo se publican servicios en revisión');
      if (s.provider.status !== 'APPROVED') throw new ConflictException('El proveedor no está aprobado');
      if (!s.provider.rntVerifiedAt) throw new ConflictException('El proveedor no tiene el RNT verificado');
      if (s._count.media === 0) throw new ConflictException('El servicio no tiene fotografías');
    }
    const status = decision === 'PUBLISH' ? 'PUBLISHED' : decision === 'REJECT' ? 'REJECTED' : 'ARCHIVED';
    await this.prisma.tourismService.update({
      where: { id },
      data: { status, rejectionReason: decision === 'PUBLISH' ? null : reason, publishedAt: decision === 'PUBLISH' ? (s.publishedAt ?? new Date()) : undefined },
    });
    await this.notifications.notify({ userId: s.provider.userId, type: 'SERVICE_MODERATED', title: decision === 'PUBLISH' ? 'Tu experiencia fue publicada' : 'Tu experiencia requiere cambios', body: `${s.title}${reason ? `: ${reason}` : ''}`, link: '/proveedor/servicios' });
    await this.audit.log({ actorId: actor.id, action: `SERVICE_${decision}`, entityType: 'TourismService', entityId: id, metadata: { reason: reason ?? null } });
    return { status };
  }

  // ---------------- Reservas y pagos ----------------
  async listBookings(q: { status?: string; page: number; pageSize: number; attention?: boolean }) {
    const where: Prisma.BookingWhereInput = { status: q.status ? (q.status as never) : undefined, needsAttention: q.attention ? true : undefined };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(q.page, q.pageSize),
        select: {
          id: true, code: true, status: true, serviceTitle: true, startsAt: true, participantsCount: true, totalCop: true,
          commissionCop: true, needsAttention: true, createdAt: true,
          user: { select: { email: true, fullName: true } }, provider: { select: { businessName: true } },
          payments: { orderBy: { createdAt: 'desc' }, take: 1, select: { status: true, reference: true } },
        },
      }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  async listPayments(q: { status?: string; page: number; pageSize: number }) {
    const where: Prisma.PaymentWhereInput = { status: q.status ? (q.status as never) : undefined };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(q.page, q.pageSize),
        select: {
          id: true, reference: true, status: true, amountInCents: true, currency: true, environment: true, providerTransactionId: true,
          paymentMethodType: true, statusMessage: true, createdAt: true, approvedAt: true,
          booking: { select: { id: true, code: true, status: true, needsAttention: true } },
          _count: { select: { webhookEvents: true } },
        },
      }),
    ]);
    return { items: items.map((p) => ({ ...p, amountCop: Number(p.amountInCents / 100n), amountInCents: p.amountInCents.toString() })), total, page: q.page, pageSize: q.pageSize };
  }

  async webhookEvents(page: number, pageSize: number) {
    const [total, items] = await this.prisma.$transaction([
      this.prisma.paymentWebhookEvent.count(),
      this.prisma.paymentWebhookEvent.findMany({
        orderBy: { receivedAt: 'desc' },
        ...pageArgs(page, pageSize),
        select: { id: true, eventType: true, signatureValid: true, transactionId: true, reference: true, reportedStatus: true, processingResult: true, receivedAt: true },
      }),
    ]);
    return { items, total, page, pageSize };
  }

  // ---------------- Reembolsos ----------------
  listRefunds(status?: string) {
    return this.prisma.refund.findMany({
      where: { status: status ? (status as never) : undefined },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { booking: { select: { code: true, serviceTitle: true, user: { select: { email: true } } } }, payment: { select: { reference: true, providerTransactionId: true } } },
    });
  }

  /**
   * El reembolso se ejecuta en el panel de Wompi (o por transferencia) y aquí se REGISTRA con su
   * referencia. La API pública de Wompi no se usa para reembolsos automáticos en el MVP (ADR-0005).
   */
  async decideRefund(actor: Actor, id: string, decision: 'MARK_EXECUTED' | 'REJECT', notes: string, externalReference?: string) {
    return this.prisma.$transaction(async (tx) => {
      const refund = await tx.refund.findUnique({ where: { id }, include: { booking: true } });
      if (!refund) throw new NotFoundException('Reembolso no encontrado');
      const res = await tx.refund.updateMany({
        where: { id, status: 'REQUESTED' },
        data: {
          status: decision === 'MARK_EXECUTED' ? 'EXECUTED' : 'REJECTED',
          processedById: actor.id,
          notes,
          externalReference: externalReference ?? null,
          executedAt: decision === 'MARK_EXECUTED' ? new Date() : null,
        },
      });
      if (res.count !== 1) throw new ConflictException('El reembolso ya fue procesado');
      if (decision === 'MARK_EXECUTED') {
        // Solo se ajusta el libro si existió una venta registrada para esa reserva.
        const sale = await tx.ledgerEntry.findUnique({ where: { idempotencyKey: `sale:${refund.bookingId}` } });
        if (sale) {
          const split = refundSplit(refund.booking, refund.refundPercent);
          await this.ledger.recordRefund(tx, refund.booking, refund, split, actor.id);
        }
        await tx.booking.update({ where: { id: refund.bookingId }, data: { needsAttention: false } });
        await this.notifications.notify({ userId: refund.booking.userId, type: 'REFUND_EXECUTED', title: 'Reembolso realizado', body: `Reembolsamos ${refund.amountCop} COP de la reserva ${refund.booking.code}.`, link: `/cuenta/reservas/${refund.bookingId}` }, tx);
      }
      await this.audit.log({ actorId: actor.id, action: `REFUND_${decision}`, entityType: 'Refund', entityId: id, metadata: { externalReference: externalReference ?? null, amountCop: refund.amountCop } }, tx);
      return { ok: true };
    });
  }

  // ---------------- Liquidaciones ----------------
  async balances() {
    const rows = await this.prisma.ledgerEntry.groupBy({ by: ['providerId'], where: { settlementId: null }, _sum: { amountCop: true } });
    const providers = await this.prisma.providerProfile.findMany({ where: { id: { in: rows.map((r) => r.providerId) } }, select: { id: true, businessName: true } });
    return rows.map((r) => ({ providerId: r.providerId, businessName: providers.find((p) => p.id === r.providerId)?.businessName ?? '', unsettledCop: r._sum.amountCop ?? 0 }));
  }

  listSettlements() {
    return this.prisma.providerSettlement.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { provider: { select: { businessName: true } }, _count: { select: { entries: true } } } });
  }

  // ---------------- Usuarios ----------------
  async listUsers(q: { q?: string; status?: string; page: number; pageSize: number }) {
    const where: Prisma.UserWhereInput = {
      status: q.status ? (q.status as never) : undefined,
      OR: q.q ? [{ email: { contains: q.q, mode: 'insensitive' } }, { fullName: { contains: q.q, mode: 'insensitive' } }] : undefined,
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(q.page, q.pageSize),
        select: { id: true, email: true, fullName: true, role: true, status: true, emailVerifiedAt: true, lastLoginAt: true, createdAt: true },
      }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  async setUserStatus(actor: Actor, id: string, status: 'ACTIVE' | 'SUSPENDED', reason: string) {
    if (id === actor.id) throw new ForbiddenException('No puedes cambiar el estado de tu propia cuenta');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { status } });
      if (status === 'SUSPENDED') await this.sessions.revokeAll(id, tx);
      await this.audit.log({ actorId: actor.id, action: 'USER_STATUS_CHANGED', entityType: 'User', entityId: id, metadata: { from: user.status, to: status, reason } }, tx);
    });
    return { ok: true };
  }

  /** Solo ADMIN. No se asigna PROVIDER por esta vía (requiere solicitud aprobada) ni se modifica el propio rol. */
  async setUserRole(actor: Actor, id: string, role: UserRole, reason: string) {
    if (id === actor.id) throw new ForbiddenException('No puedes cambiar tu propio rol');
    if (role === 'PROVIDER') throw new BadRequestException('El rol de proveedor se otorga aprobando una solicitud');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.role === 'PROVIDER') throw new ConflictException('Para retirar a un proveedor, suspende su perfil de proveedor');
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { role } });
      await this.sessions.revokeAll(id, tx);
      await this.audit.log({ actorId: actor.id, action: 'USER_ROLE_CHANGED', entityType: 'User', entityId: id, metadata: { from: user.role, to: role, reason } }, tx);
    });
    return { ok: true };
  }

  // ---------------- Configuración ----------------
  async getSettings() {
    return { commissionBps: await this.settings.commissionBps() };
  }

  async setCommission(actor: Actor, bps: number, reason: string) {
    const before = await this.settings.commissionBps();
    await this.prisma.$transaction(async (tx) => {
      await this.settings.setCommissionBps(bps, actor.id, tx);
      await this.audit.log({ actorId: actor.id, action: 'COMMISSION_CHANGED', entityType: 'PlatformSetting', entityId: 'commission_bps', metadata: { from: before, to: bps, reason } }, tx);
    });
    return { commissionBps: bps };
  }

  async auditLogs(q: { page: number; pageSize: number; q?: string }) {
    const where: Prisma.AuditLogWhereInput = q.q ? { OR: [{ action: { contains: q.q, mode: 'insensitive' } }, { entityType: { contains: q.q, mode: 'insensitive' } }] } : {};
    const [total, items] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(q.page, q.pageSize), include: { actor: { select: { email: true } } } }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  // ---------------- Reseñas y PQR ----------------
  listReviews(status?: string) {
    return this.prisma.review.findMany({
      where: { status: status ? (status as never) : undefined },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { service: { select: { title: true } }, user: { select: { fullName: true } } },
    });
  }

  listTickets(status?: string) {
    return this.prisma.supportTicket.findMany({ where: { status: status ? (status as never) : undefined }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async updateTicket(actor: Actor, id: string, status: 'IN_PROGRESS' | 'CLOSED', response?: string) {
    const t = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Radicado no encontrado');
    await this.prisma.supportTicket.update({ where: { id }, data: { status, response, closedAt: status === 'CLOSED' ? new Date() : null } });
    if (response) await this.notifications.queueEmail(t.email, 'PQR_RESPONSE', `Respuesta a tu radicado ${t.radicado}`, { radicado: t.radicado, response });
    await this.audit.log({ actorId: actor.id, action: 'TICKET_UPDATED', entityType: 'SupportTicket', entityId: id, metadata: { status } });
    return { ok: true };
  }

  // ---------------- Reportes ----------------
  async bookingsCsv(): Promise<string> {
    const rows = await this.prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10_000,
      select: { code: true, status: true, serviceTitle: true, startsAt: true, participantsCount: true, totalCop: true, commissionCop: true, providerNetCop: true, createdAt: true, provider: { select: { businessName: true } } },
    });
    const esc = (v: unknown) => {
      const s = String(v ?? '');
      // Neutraliza inyección de fórmulas en hojas de cálculo.
      const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const header = ['codigo', 'estado', 'servicio', 'proveedor', 'inicio_utc', 'participantes', 'total_cop', 'comision_cop', 'neto_proveedor_cop', 'creada_utc'];
    const lines = rows.map((r) => [r.code, r.status, r.serviceTitle, r.provider.businessName, r.startsAt.toISOString(), r.participantsCount, r.totalCop, r.commissionCop, r.providerNetCop, r.createdAt.toISOString()].map(esc).join(','));
    return [header.join(','), ...lines].join('\n');
  }

  async performance() {
    const rows = await this.prisma.booking.groupBy({
      by: ['providerId', 'status'],
      _count: true,
      _sum: { totalCop: true },
    });
    const providers = await this.prisma.providerProfile.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.providerId))] } }, select: { id: true, businessName: true } });
    return providers.map((p) => {
      const mine = rows.filter((r) => r.providerId === p.id);
      const count = (s: string) => mine.find((r) => r.status === s)?._count ?? 0;
      const sold = mine.filter((r) => r.status === 'CONFIRMED' || r.status === 'COMPLETED');
      return {
        providerId: p.id,
        businessName: p.businessName,
        confirmed: count('CONFIRMED') + count('COMPLETED'),
        cancelled: count('CANCELLED'),
        expired: count('EXPIRED'),
        revenueCop: sold.reduce((a, r) => a + (r._sum.totalCop ?? 0), 0),
      };
    });
  }
}
