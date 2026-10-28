import { Injectable } from '@nestjs/common';
import type { Booking, LedgerEntryType } from '@prisma/client';
import { Tx } from '../../common/prisma.service';

/**
 * Asientos del libro de movimientos por proveedor (append-only, ver trigger SQL).
 * Convención de signo: + a favor del proveedor, − a cargo del proveedor.
 * Cada asiento tiene una clave de idempotencia: reprocesar un evento no duplica dinero.
 */
@Injectable()
export class LedgerService {
  private async entry(
    tx: Tx,
    data: {
      providerId: string;
      type: LedgerEntryType;
      amountCop: number;
      description: string;
      idempotencyKey: string;
      bookingId?: string;
      paymentId?: string;
      refundId?: string;
      settlementId?: string;
      createdById?: string;
    },
  ) {
    if (data.amountCop === 0) return;
    await tx.ledgerEntry.upsert({
      where: { idempotencyKey: data.idempotencyKey },
      create: data,
      update: {},
    });
  }

  /** Venta confirmada: + subtotal y − comisión (instantánea de la reserva). */
  async recordSale(tx: Tx, booking: Booking, paymentId: string) {
    await this.entry(tx, {
      providerId: booking.providerId,
      type: 'SALE',
      amountCop: booking.subtotalCop,
      description: `Venta ${booking.code} (${booking.participantsCount} pers.)`,
      idempotencyKey: `sale:${booking.id}`,
      bookingId: booking.id,
      paymentId,
    });
    await this.entry(tx, {
      providerId: booking.providerId,
      type: 'COMMISSION',
      amountCop: -booking.commissionCop,
      description: `Comisión TravelCol ${(booking.commissionBps / 100).toFixed(2)} % · ${booking.code}`,
      idempotencyKey: `commission:${booking.id}`,
      bookingId: booking.id,
      paymentId,
    });
  }

  /** Reembolso ejecutado: − parte del proveedor y + reversión proporcional de comisión. */
  async recordRefund(
    tx: Tx,
    booking: Booking,
    refund: { id: string; paymentId: string },
    split: { providerRefundCop: number; commissionReversalCop: number },
    actorId: string,
  ) {
    await this.entry(tx, {
      providerId: booking.providerId,
      type: 'REFUND',
      amountCop: -split.providerRefundCop,
      description: `Reembolso ${booking.code}`,
      idempotencyKey: `refund:${refund.id}`,
      bookingId: booking.id,
      paymentId: refund.paymentId,
      refundId: refund.id,
      createdById: actorId,
    });
    await this.entry(tx, {
      providerId: booking.providerId,
      type: 'COMMISSION_REVERSAL',
      amountCop: split.commissionReversalCop,
      description: `Reversión de comisión por reembolso ${booking.code}`,
      idempotencyKey: `commission-reversal:${refund.id}`,
      bookingId: booking.id,
      paymentId: refund.paymentId,
      refundId: refund.id,
      createdById: actorId,
    });
  }

  async recordPayout(tx: Tx, providerId: string, settlementId: string, amountCop: number, actorId: string) {
    await this.entry(tx, {
      providerId,
      type: 'PAYOUT',
      amountCop: -amountCop,
      description: 'Pago de liquidación al proveedor',
      idempotencyKey: `payout:${settlementId}`,
      settlementId,
      createdById: actorId,
    });
  }
}
