/**
 * Utilidades monetarias. Todos los importes se manejan como ENTEROS en pesos colombianos (COP).
 * Nunca se usan decimales de punto flotante para dinero. Wompi recibe centavos: pesos * 100.
 */
export const CURRENCY = 'COP' as const;

/** Comisión en puntos básicos (1 bps = 0,01 %). Redondeo half-up a peso entero. */
export function applyBps(amount: number, bps: number): number {
  if (!Number.isSafeInteger(amount) || !Number.isSafeInteger(bps)) {
    throw new Error('Importes y bps deben ser enteros seguros');
  }
  if (bps < 0 || bps > 10_000) throw new Error('bps fuera de rango');
  return Math.floor((amount * bps + 5_000) / 10_000);
}

export function toCents(pesos: number): number {
  if (!Number.isSafeInteger(pesos) || pesos < 0) throw new Error('Importe inválido');
  return pesos * 100;
}

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function formatCOP(pesos: number): string {
  return copFormatter.format(pesos);
}
