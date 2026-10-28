import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { z } from 'zod';
import type {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  SessionUserDto,
} from '@travelcol/contracts';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { randomToken, sha256 } from '../../common/crypto';
import { env } from '../../config/env';
import { NotificationsService } from '../notifications/notifications.service';
import { SessionService } from './session.service';

const ARGON_OPTS: argon2.HashOptions = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 };
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
const VERIFY_TTL_H = 48;
const RESET_TTL_MIN = 30;

interface Meta {
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

@Injectable()
export class AuthService {
  private dummyHash: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {
    // Hash señuelo para igualar tiempos cuando el correo no existe (evita enumeración).
    this.dummyHash = argon2.hash(randomToken(), ARGON_OPTS);
  }

  hashPassword(password: string) {
    return argon2.hash(password, ARGON_OPTS);
  }

  async register(input: z.output<typeof registerSchema>, meta: Meta) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException('No fue posible crear la cuenta con ese correo. Si ya tienes cuenta, inicia sesión o recupera tu contraseña.');
    }
    const passwordHash = await this.hashPassword(input.password);
    const legalDocs = await this.prisma.legalDocumentVersion.findMany({
      where: { type: { in: ['TERMS', 'PRIVACY'] }, publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: 'desc' },
    });
    const latest = (type: 'TERMS' | 'PRIVACY') => legalDocs.find((d) => d.type === type);

    const { user, session } = await this.prisma.$transaction(async (tx) => {
      // El rol SIEMPRE es TOURIST en el registro público: el esquema rechaza campos extra.
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          fullName: input.fullName,
          phone: input.phone ?? null,
          role: 'TOURIST',
          marketingOptIn: input.marketingOptIn ?? false,
        },
      });
      for (const type of ['TERMS', 'PRIVACY'] as const) {
        const doc = latest(type);
        if (doc) {
          await tx.consentRecord.create({
            data: { userId: user.id, legalDocumentId: doc.id, purpose: type, granted: true, ipHash: null },
          });
        }
      }
      await this.issueToken(tx, user.id, user.email, 'EMAIL_VERIFICATION');
      const session = await this.sessions.create(user.id, meta, tx);
      await this.audit.log({ actorId: user.id, action: 'USER_REGISTERED', entityType: 'User', entityId: user.id, ip: meta.ip, requestId: meta.requestId }, tx);
      return { user, session };
    });
    return { userId: user.id, session };
  }

  async login(input: z.output<typeof loginSchema>, meta: Meta) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    const invalid = new UnauthorizedException('Correo o contraseña incorrectos');
    if (!user) {
      await argon2.verify(await this.dummyHash, input.password).catch(() => false);
      throw invalid;
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Cuenta bloqueada temporalmente por intentos fallidos. Inténtalo más tarde o recupera tu contraseña.');
    }
    const ok = await argon2.verify(user.passwordHash, input.password).catch(() => false);
    if (!ok) {
      const failed = user.failedLoginCount + 1;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: failed >= MAX_FAILED ? 0 : failed,
          lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : user.lockedUntil,
        },
      });
      await this.audit.log({ actorId: user.id, action: failed >= MAX_FAILED ? 'LOGIN_LOCKED' : 'LOGIN_FAILED', entityType: 'User', entityId: user.id, ip: meta.ip, requestId: meta.requestId });
      throw invalid;
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tu cuenta está suspendida. Escríbenos desde la página de contacto.');
    }
    if (argon2.needsRehash(user.passwordHash, ARGON_OPTS)) {
      await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash: await this.hashPassword(input.password) } });
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    const session = await this.sessions.create(user.id, meta);
    await this.audit.log({ actorId: user.id, action: 'LOGIN_SUCCESS', entityType: 'User', entityId: user.id, ip: meta.ip, requestId: meta.requestId });
    return session;
  }

  /** Siempre responde igual, exista o no el correo. */
  async forgotPassword(email: string, meta: Meta) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== 'ACTIVE') return;
    await this.prisma.$transaction(async (tx) => {
      await tx.authToken.updateMany({
        where: { userId: user.id, type: 'PASSWORD_RESET', usedAt: null },
        data: { usedAt: new Date() },
      });
      await this.issueToken(tx, user.id, user.email, 'PASSWORD_RESET');
      await this.audit.log({ actorId: user.id, action: 'PASSWORD_RESET_REQUESTED', entityType: 'User', entityId: user.id, ip: meta.ip }, tx);
    });
  }

  async resetPassword(input: z.output<typeof resetPasswordSchema>, meta: Meta) {
    const token = await this.consumeToken(input.token, 'PASSWORD_RESET');
    const passwordHash = await this.hashPassword(input.password);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: token.userId },
        data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
      });
      await this.sessions.revokeAll(token.userId, tx);
      await this.audit.log({ actorId: token.userId, action: 'PASSWORD_RESET', entityType: 'User', entityId: token.userId, ip: meta.ip }, tx);
    });
  }

  async verifyEmail(rawToken: string) {
    const token = await this.consumeToken(rawToken, 'EMAIL_VERIFICATION');
    await this.prisma.user.update({ where: { id: token.userId }, data: { emailVerifiedAt: new Date() } });
  }

  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.emailVerifiedAt) return;
    await this.prisma.$transaction((tx) => this.issueToken(tx, user.id, user.email, 'EMAIL_VERIFICATION'));
  }

  async me(userId: string): Promise<SessionUserDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        provider: { select: { id: true, slug: true, status: true } },
        applications: { where: { status: 'PENDING' }, select: { id: true } },
      },
    });
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      emailVerified: !!user.emailVerifiedAt,
      marketingOptIn: user.marketingOptIn,
      provider: user.provider,
      hasPendingProviderApplication: user.applications.length > 0,
    };
  }

  private async issueToken(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    userId: string,
    email: string,
    type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET',
  ) {
    const raw = randomToken();
    const ttlMs = type === 'PASSWORD_RESET' ? RESET_TTL_MIN * 60_000 : VERIFY_TTL_H * 3_600_000;
    await tx.authToken.create({
      data: { userId, type, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + ttlMs) },
    });
    const path = type === 'PASSWORD_RESET' ? '/restablecer-contrasena' : '/verificar-correo';
    const link = `${env().WEB_URL}${path}?token=${raw}`;
    await this.notifications.queueEmail(
      email,
      type,
      type === 'PASSWORD_RESET' ? 'Restablece tu contraseña de TravelCol' : 'Confirma tu correo en TravelCol',
      { link },
      tx,
    );
  }

  private async consumeToken(raw: string, type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET') {
    const token = await this.prisma.authToken.findUnique({ where: { tokenHash: sha256(raw) } });
    if (!token || token.type !== type || token.usedAt || token.expiresAt <= new Date()) {
      throw new BadRequestException('El enlace no es válido o ya expiró. Solicita uno nuevo.');
    }
    const updated = await this.prisma.authToken.updateMany({
      where: { id: token.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (updated.count !== 1) throw new BadRequestException('El enlace ya fue utilizado.');
    return token;
  }
}
