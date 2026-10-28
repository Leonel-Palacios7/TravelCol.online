import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LedgerService } from './ledger.service';

/**
 * Liquidaciones controladas manualmente (MVP). TravelCol cobra con su cuenta Wompi y luego
 * transfiere al proveedor por fuera de la plataforma; aquí solo se REGISTRA la transferencia
 * cuando un administrador la ejecutó y aporta su referencia. No se afirma ningún pago no realizado.
 */
@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async providerSummary(providerId: string) {
    const [byType, unsettled, settlements] = await Promise.all([
      this.prisma.ledgerEntry.groupBy({ by: ['type'], where: { providerId }, _sum: { amountCop: true } }),
      this.prisma.ledgerEntry.aggregate({ where: { providerId, settlementId: null }, _sum: { amountCop: true } }),
      this.prisma.providerSettlement.findMany({ where: { providerId }, orderBy: { createdAt: 'desc' }, take: 50 }),
    ]);
    const sum = (t: string) => byType.find((r) => r.type === t)?._sum.amountCop ?? 0;
    return {
      grossSalesCop: sum('SALE'),
      commissionCop: -(sum('COMMISSION') + sum('COMMISSION_REVERSAL')),
      refundsCop: -sum('REFUND'),
      paidOutCop: -sum('PAYOUT'),
      adjustmentsCop: sum('ADJUSTMENT'),
      pendingSettlementCop: unsettled._sum.amountCop ?? 0,
      settlements: settlements.map((s) => ({
        id: s.id,
        periodEnd: s.periodEnd.toISOString(),
        grossCop: s.grossCop,
        commissionCop: s.commissionCop,
        refundsCop: s.refundsCop,
        netCop: s.netCop,
        status: s.status,
        payoutReference: s.payoutReference,
        paidAt: s.paidAt?.toISOString() ?? null,
      })),
    };
  }

  async providerLedger(providerId: string, page: number, pageSize: number) {
    const [total, items] = await this.prisma.$transaction([
      this.prisma.ledgerEntry.count({ where: { providerId } }),
      this.prisma.ledgerEntry.findMany({
        where: { providerId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, type: true, amountCop: true, description: true, createdAt: true, settlementId: true, booking: { select: { code: true } } },
      }),
    ]);
    return { items, page, pageSize, total };
  }

  /** Crea una liquidación con los asientos no liquidados de servicios ya prestados hasta periodEnd. */
  async createSettlement(providerId: string, periodEndDay: string, actorId: string) {
    const endOfDay = new Date(`${periodEndDay}T23:59:59.999-05:00`);
    const now = new Date();
    if (endOfDay.getTime() - now.getTime() > 86_400_000) throw new BadRequestException('El corte no puede ser una fecha futura');
    // El corte nunca supera el momento actual: solo se liquidan movimientos ya existentes.
    const periodEnd = endOfDay < now ? endOfDay : now;
    return this.prisma.$transaction(async (tx) => {
      const provider = await tx.providerProfile.findUnique({ where: { id: providerId } });
      if (!provider) throw new NotFoundException('Proveedor no encontrado');
      const entries = await tx.ledgerEntry.findMany({
        where: {
          providerId,
          settlementId: null,
          type: { in: ['SALE', 'COMMISSION', 'REFUND', 'COMMISSION_REVERSAL', 'ADJUSTMENT'] },
          createdAt: { lte: periodEnd },
          OR: [{ bookingId: null }, { booking: { startsAt: { lte: periodEnd } } }],
        },
        select: { id: true, type: true, amountCop: true },
      });
      const sum = (types: string[]) => entries.filter((e) => types.includes(e.type)).reduce((a, e) => a + e.amountCop, 0);
      const netCop = entries.reduce((a, e) => a + e.amountCop, 0);
      if (entries.length === 0 || netCop <= 0) {
        throw new ConflictException('No hay saldo positivo por liquidar en el periodo');
      }
      const settlement = await tx.providerSettlement.create({
        data: {
          providerId,
          periodEnd,
          grossCop: sum(['SALE']),
          commissionCop: -sum(['COMMISSION', 'COMMISSION_REVERSAL']),
          refundsCop: -sum(['REFUND']),
          netCop,
          createdById: actorId,
        },
      });
      const assigned = await tx.ledgerEntry.updateMany({
        where: { id: { in: entries.map((e) => e.id) }, settlementId: null },
        data: { settlementId: settlement.id },
      });
      if (assigned.count !== entries.length) throw new ConflictException('Los asientos cambiaron; inténtalo de nuevo');
      await this.audit.log({ actorId, action: 'SETTLEMENT_CREATED', entityType: 'ProviderSettlement', entityId: settlement.id, metadata: { netCop, entries: entries.length } }, tx);
      return settlement;
    });
  }

  async markSettlementPaid(id: string, payoutReference: string, notes: string | undefined, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const s = await tx.providerSettlement.findUnique({ where: { id }, include: { provider: true } });
      if (!s) throw new NotFoundException('Liquidación no encontrada');
      const res = await tx.providerSettlement.updateMany({
        where: { id, status: 'DRAFT' },
        data: { status: 'PAID', payoutReference, notes, paidAt: new Date(), paidById: actorId },
      });
      if (res.count !== 1) throw new ConflictException('La liquidación no está en borrador');
      await this.ledger.recordPayout(tx, s.providerId, s.id, s.netCop, actorId);
      await this.notifications.notify({ userId: s.provider.userId, type: 'SETTLEMENT_PAID', title: 'Liquidación pagada', body: `Registramos la transferencia de tu liquidación (ref. ${payoutReference}).`, link: '/proveedor/finanzas' }, tx);
      await this.audit.log({ actorId, action: 'SETTLEMENT_PAID', entityType: 'ProviderSettlement', entityId: id, metadata: { payoutReference, netCop: s.netCop } }, tx);
      return { ok: true };
    });
  }

  async cancelSettlement(id: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const res = await tx.providerSettlement.updateMany({ where: { id, status: 'DRAFT' }, data: { status: 'CANCELLED' } });
      if (res.count !== 1) throw new ConflictException('Solo se pueden anular liquidaciones en borrador');
      await tx.ledgerEntry.updateMany({ where: { settlementId: id }, data: { settlementId: null } });
      await this.audit.log({ actorId, action: 'SETTLEMENT_CANCELLED', entityType: 'ProviderSettlement', entityId: id }, tx);
      return { ok: true };
    });
  }
}
