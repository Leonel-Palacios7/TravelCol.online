import type { CancellationPolicy } from './enums';

/**
 * Reglas de reembolso por política de cancelación (supuesto de negocio documentado en
 * docs/finanzas-comisiones.md; requiere validación jurídica frente a la Ley 1480 de 2011).
 * Cada regla: si faltan al menos `minHoursBefore` horas para el inicio, se reembolsa `refundPercent`.
 * Las reglas se evalúan de mayor a menor anticipación.
 */
export const CANCELLATION_RULES: Record<
  CancellationPolicy,
  ReadonlyArray<{ minHoursBefore: number; refundPercent: number }>
> = {
  FLEXIBLE: [{ minHoursBefore: 24, refundPercent: 100 }],
  MODERATE: [
    { minHoursBefore: 72, refundPercent: 100 },
    { minHoursBefore: 24, refundPercent: 50 },
  ],
  STRICT: [{ minHoursBefore: 168, refundPercent: 50 }],
};

export function describeCancellationPolicy(policy: CancellationPolicy): string {
  switch (policy) {
    case 'FLEXIBLE':
      return 'Reembolso del 100 % si cancelas con al menos 24 horas de anticipación. Después no hay reembolso.';
    case 'MODERATE':
      return 'Reembolso del 100 % con 72 horas o más de anticipación; 50 % entre 72 y 24 horas; sin reembolso con menos de 24 horas.';
    case 'STRICT':
      return 'Reembolso del 50 % si cancelas con al menos 7 días de anticipación. Después no hay reembolso.';
  }
}

/** Porcentaje de reembolso aplicable (0-100) dadas las horas que faltan para el inicio. */
export function refundPercentFor(policy: CancellationPolicy, hoursBeforeStart: number): number {
  for (const rule of CANCELLATION_RULES[policy]) {
    if (hoursBeforeStart >= rule.minHoursBefore) return rule.refundPercent;
  }
  return 0;
}
