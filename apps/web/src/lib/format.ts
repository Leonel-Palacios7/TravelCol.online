import { formatCOP } from '@travelcol/contracts';

export { formatCOP };
const TZ = 'America/Bogota';

/**
 * Node y los navegadores traen versiones distintas de ICU: unos separan "p. m." con espacio
 * normal y otros con espacio fino (U+202F). Se normaliza para evitar errores de hidratación.
 */
function fmt(opts: Intl.DateTimeFormatOptions, locale = 'es-CO') {
  const f = new Intl.DateTimeFormat(locale, { timeZone: TZ, ...opts });
  return (iso: string) => f.format(new Date(iso)).replace(/[\u00a0\u202f]/g, ' ');
}

export const formatDateTime = fmt({ dateStyle: 'full', timeStyle: 'short' });
export const formatDate = fmt({ day: 'numeric', month: 'short', year: 'numeric' });
export const formatShort = fmt({ weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export const formatTime = fmt({ hour: 'numeric', minute: '2-digit' });
export const formatDay = fmt({ day: '2-digit' });
export const formatMonthShort = fmt({ month: 'short' });
/** Clave AAAA-MM-DD del día en hora de Colombia. */
export const dayKey = fmt({}, 'en-CA');

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h >= 24) return `${Math.round(h / 24)} día(s)`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function formatPhone(phone: string | null | undefined) {
  if (!phone) return '';
  const d = phone.replace(/^\+57/, '');
  return d.length === 10 ? `+57 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : phone;
}
