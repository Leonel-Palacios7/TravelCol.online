import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';

export const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

/** Token aleatorio URL-safe con 256 bits de entropía. */
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Seudonimiza la IP para auditoría (no se guarda la IP en claro). */
export const hashIp = (ip: string | undefined) => (ip ? sha256(`${env().IP_HASH_SALT}:${ip}`) : null);

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function humanCode(length = 8): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i]! % ALPHABET.length];
  return out;
}
