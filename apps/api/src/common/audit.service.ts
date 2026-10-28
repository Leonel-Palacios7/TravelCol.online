import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService, Tx } from './prisma.service';
import { hashIp } from './crypto';

export interface AuditEntry {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  /** Nunca incluir contraseñas, tokens ni datos de tarjetas. */
  metadata?: Prisma.InputJsonValue;
  ip?: string;
  requestId?: string;
}

const FORBIDDEN_KEYS = /pass|token|secret|card|cvc|cvv|signature|checksum/i;

function scrub(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        FORBIDDEN_KEYS.test(k) ? '[REDACTADO]' : scrub(v),
      ]),
    );
  }
  return value;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry, tx?: Tx) {
    const db = tx ?? this.prisma;
    await db.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        metadata: entry.metadata === undefined ? undefined : (scrub(entry.metadata) as Prisma.InputJsonValue),
        ipHash: hashIp(entry.ip),
        requestId: entry.requestId ?? null,
      },
    });
  }
}
