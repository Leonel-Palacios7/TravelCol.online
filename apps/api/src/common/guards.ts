import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@prisma/client';
import { SessionService } from '../modules/auth/session.service';
import { AppRequest, IS_PUBLIC, ROLES, SKIP_CSRF } from './auth.decorators';
import { safeEqual } from './crypto';
import { CSRF_COOKIE, CSRF_HEADER, SESSION_COOKIE } from './cookies';

/** Guard global: resuelve la sesión y exige autenticación salvo en rutas @Public. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AppRequest>();
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token === 'string' && token.length > 0) {
      const user = await this.sessions.resolve(token);
      if (user) req.user = user;
    }
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;
    if (!req.user) throw new UnauthorizedException('Debes iniciar sesión');
    return true;
  }
}

/** Guard global de roles. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;
    const req = ctx.switchToHttp().getRequest<AppRequest>();
    if (!req.user) throw new UnauthorizedException('Debes iniciar sesión');
    if (!roles.includes(req.user.role)) throw new ForbiddenException('No tienes permiso para esta acción');
    return true;
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Protección CSRF por doble envío: toda petición que modifica estado debe enviar el
 * encabezado X-CSRF-Token igual a la cookie tc_csrf. Complementa SameSite=Lax.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<AppRequest>();
    if (SAFE_METHODS.has(req.method)) return true;
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF, [ctx.getHandler(), ctx.getClass()]);
    if (skip) return true;
    const cookie: unknown = req.cookies?.[CSRF_COOKIE];
    const header = req.header(CSRF_HEADER);
    if (typeof cookie !== 'string' || !header || !safeEqual(cookie, header)) {
      throw new ForbiddenException('Token CSRF inválido o ausente. Recarga la página e inténtalo de nuevo.');
    }
    return true;
  }
}
