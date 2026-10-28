import { Injectable } from '@nestjs/common';
import { env } from '../../config/env';
import { PrismaService, Tx } from '../../common/prisma.service';
import { hashIp, randomToken, sha256 } from '../../common/crypto';
import type { AuthUser } from '../../common/auth.decorators';

const TOUCH_INTERVAL_MS = 5 * 60_000;

/**
 * Sesiones opacas persistidas. El token viaja solo en cookie HttpOnly; en BD se guarda su
 * hash SHA-256, de modo que una filtración de la BD no permite suplantar sesiones.
 */
@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, meta: { userAgent?: string; ip?: string }, tx?: Tx) {
    const db = tx ?? this.prisma;
    const token = randomToken();
    const expiresAt = new Date(Date.now() + env().SESSION_TTL_HOURS * 3_600_000);
    await db.authSession.create({
      data: {
        userId,
        tokenHash: sha256(token),
        expiresAt,
        userAgent: meta.userAgent?.slice(0, 255),
        ipHash: hashIp(meta.ip),
      },
    });
    return { token, expiresAt };
  }

  async resolve(token: string): Promise<AuthUser | null> {
    if (token.length > 100) return null;
    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
    if (session.user.status !== 'ACTIVE') return null;
    if (Date.now() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      await this.prisma.authSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
    }
    return {
      id: session.user.id,
      email: session.user.email,
      fullName: session.user.fullName,
      role: session.user.role,
      emailVerified: !!session.user.emailVerifiedAt,
      sessionId: session.id,
    };
  }

  async revoke(sessionId: string) {
    await this.prisma.authSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAll(userId: string, tx?: Tx) {
    const db = tx ?? this.prisma;
    await db.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async purgeExpired() {
    const cutoff = new Date(Date.now() - 30 * 24 * 3_600_000);
    await this.prisma.authSession.deleteMany({ where: { expiresAt: { lt: cutoff } } });
  }
}
