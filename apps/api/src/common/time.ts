/**
 * Colombia (America/Bogota) usa UTC-5 todo el año, sin horario de verano.
 * Las fechas se guardan en UTC (timestamptz) y se presentan en hora de Colombia.
 */
export const BOGOTA_OFFSET = '-05:00';
export const BOGOTA_TZ = 'America/Bogota';

/** Convierte "AAAA-MM-DDTHH:mm" (hora local de Colombia) a Date UTC. */
export function bogotaLocalToUtc(local: string): Date {
  const d = new Date(`${local}:00${BOGOTA_OFFSET}`);
  if (Number.isNaN(d.getTime())) throw new Error('Fecha inválida');
  return d;
}

/** Rango UTC [inicio, fin) del día calendario de Colombia "AAAA-MM-DD". */
export function bogotaDayRange(day: string): { from: Date; to: Date } {
  const from = new Date(`${day}T00:00:00${BOGOTA_OFFSET}`);
  const to = new Date(from.getTime() + 24 * 3600 * 1000);
  return { from, to };
}

export const addMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);
export const hoursBetween = (from: Date, to: Date) => (to.getTime() - from.getTime()) / 3_600_000;
