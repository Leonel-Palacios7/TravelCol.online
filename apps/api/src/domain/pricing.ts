import { applyBps } from '@travelcol/contracts';

export interface PriceQuote {
  unitPriceCop: number;
  participants: number;
  subtotalCop: number;
  feesCop: number;
  totalCop: number;
  commissionBps: number;
  commissionCop: number;
  providerNetCop: number;
}

/**
 * Cálculo de precio SIEMPRE en el servidor a partir del precio persistido del servicio.
 * Supuestos (docs/finanzas-comisiones.md):
 *  - El precio publicado por el proveedor es el precio final al turista (impuestos incluidos
 *    según declare el proveedor). TravelCol no suma cargos al turista en el MVP (feesCop = 0).
 *  - La comisión de TravelCol se descuenta del valor bruto a liquidar al proveedor.
 */
export function quote(unitPriceCop: number, participants: number, commissionBps: number): PriceQuote {
  if (!Number.isSafeInteger(unitPriceCop) || unitPriceCop <= 0) throw new Error('Precio inválido');
  if (!Number.isSafeInteger(participants) || participants < 1) throw new Error('Participantes inválidos');
  const subtotalCop = unitPriceCop * participants;
  if (!Number.isSafeInteger(subtotalCop * 100)) throw new Error('Importe fuera de rango');
  const feesCop = 0;
  const commissionCop = applyBps(subtotalCop, commissionBps);
  return {
    unitPriceCop,
    participants,
    subtotalCop,
    feesCop,
    totalCop: subtotalCop + feesCop,
    commissionBps,
    commissionCop,
    providerNetCop: subtotalCop - commissionCop,
  };
}

/** Reparto proporcional de un reembolso: cuánto se devuelve y cuánta comisión se revierte. */
export function refundSplit(
  booking: { subtotalCop: number; totalCop: number; commissionCop: number },
  refundPercent: number,
) {
  if (!Number.isInteger(refundPercent) || refundPercent < 0 || refundPercent > 100) {
    throw new Error('Porcentaje inválido');
  }
  const refundTotalCop = Math.floor((booking.totalCop * refundPercent) / 100);
  const providerRefundCop = Math.floor((booking.subtotalCop * refundPercent) / 100);
  const commissionReversalCop = Math.floor((booking.commissionCop * refundPercent) / 100);
  return { refundTotalCop, providerRefundCop, commissionReversalCop };
}
