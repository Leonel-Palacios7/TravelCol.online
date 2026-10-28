import { createHash, timingSafeEqual } from 'node:crypto';

const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

/**
 * Firma de integridad del Web Checkout de Wompi (documentación oficial):
 * SHA256(referencia + montoEnCentavos + moneda + secretoDeIntegridad).
 * No se usa expiration-time en el MVP.
 */
export function integritySignature(reference: string, amountInCents: number | bigint, currency: string, integritySecret: string) {
  return sha256(`${reference}${amountInCents.toString()}${currency}${integritySecret}`);
}

export interface WompiEvent {
  event: string;
  data: Record<string, unknown>;
  environment?: string;
  signature?: { properties?: unknown; checksum?: unknown };
  timestamp?: unknown;
  sent_at?: string;
}

function readPath(data: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, data);
}

/**
 * Checksum de eventos (documentación oficial de Wompi, "Eventos"):
 * 1) concatenar los valores de data indicados en signature.properties (en orden),
 * 2) concatenar timestamp, 3) concatenar el secreto de eventos, 4) SHA256.
 * Las propiedades se leen de cada evento; no se fijan en el código.
 */
export function eventChecksum(event: WompiEvent, eventsSecret: string): string | null {
  const props = event.signature?.properties;
  if (!Array.isArray(props) || props.length === 0 || props.length > 20) return null;
  if (typeof event.timestamp !== 'number' && typeof event.timestamp !== 'string') return null;
  let concatenated = '';
  for (const p of props) {
    if (typeof p !== 'string' || !/^[a-z_.]+$/i.test(p)) return null;
    const value = readPath(event.data, p);
    if (value === undefined || value === null || typeof value === 'object') return null;
    concatenated += String(value);
  }
  return sha256(`${concatenated}${String(event.timestamp)}${eventsSecret}`);
}

export function verifyEventChecksum(event: WompiEvent, eventsSecret: string, headerChecksum?: string): boolean {
  if (!eventsSecret) return false;
  const expected = eventChecksum(event, eventsSecret);
  const received = typeof event.signature?.checksum === 'string' ? event.signature.checksum : headerChecksum;
  if (!expected || !received || !/^[a-f0-9]{64}$/i.test(received)) return false;
  if (headerChecksum && headerChecksum.toLowerCase() !== received.toLowerCase()) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received.toLowerCase(), 'hex'));
}
