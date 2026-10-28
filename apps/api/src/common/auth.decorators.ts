import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { UserRole } from '@prisma/client';
import type { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  emailVerified: boolean;
  sessionId: string;
}

export interface AppRequest extends Request {
  user?: AuthUser;
}

export const IS_PUBLIC = 'isPublic';
export const ROLES = 'roles';
export const SKIP_CSRF = 'skipCsrf';

/** Ruta accesible sin sesión (si hay sesión válida, igual se adjunta el usuario). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
/** Restringe la ruta a los roles indicados. La verificación ocurre SIEMPRE en el servidor. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES, roles);
/** Solo para endpoints servidor-a-servidor autenticados por firma (webhooks). */
export const SkipCsrf = () => SetMetadata(SKIP_CSRF, true);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  const req = ctx.switchToHttp().getRequest<AppRequest>();
  return req.user as AuthUser;
});

export const ClientIp = createParamDecorator((_: unknown, ctx: ExecutionContext): string | undefined => {
  const req = ctx.switchToHttp().getRequest<AppRequest>();
  return req.ip;
});

export const RequestId = createParamDecorator((_: unknown, ctx: ExecutionContext): string | undefined => {
  const req = ctx.switchToHttp().getRequest<AppRequest>();
  return req.id ? String(req.id) : undefined;
});
