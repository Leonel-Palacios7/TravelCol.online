import { Injectable } from '@nestjs/common';
import { env } from '../config/env';
import { PrismaService, Tx } from './prisma.service';

export const COMMISSION_KEY = 'commission_bps';

/** Configuración comercial persistida. La comisión vive en UN solo lugar: aquí. */
@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async commissionBps(tx?: Tx): Promise<number> {
    const db = tx ?? this.prisma;
    const row = await db.platformSetting.findUnique({ where: { key: COMMISSION_KEY } });
    const value = row?.value as { bps?: unknown } | undefined;
    if (value && typeof value.bps === 'number' && Number.isInteger(value.bps)) return value.bps;
    return env().DEFAULT_COMMISSION_BPS;
  }

  async setCommissionBps(bps: number, actorId: string, tx?: Tx) {
    const db = tx ?? this.prisma;
    await db.platformSetting.upsert({
      where: { key: COMMISSION_KEY },
      create: { key: COMMISSION_KEY, value: { bps }, updatedById: actorId },
      update: { value: { bps }, updatedById: actorId },
    });
  }
}
