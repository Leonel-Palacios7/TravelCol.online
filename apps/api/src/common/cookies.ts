import type { CookieOptions, Response } from 'express';
import { cookieSecure, env } from '../config/env';

export const SESSION_COOKIE = 'tc_session';
export const CSRF_COOKIE = 'tc_csrf';
export const CSRF_HEADER = 'x-csrf-token';

function base(): CookieOptions {
  return {
    secure: cookieSecure(),
    sameSite: 'lax',
    path: '/',
    domain: env().COOKIE_DOMAIN || undefined,
  };
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(SESSION_COOKIE, token, { ...base(), httpOnly: true, expires: expiresAt });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { ...base(), httpOnly: true });
}

/** La cookie CSRF es legible por JS (necesario para el doble envío) pero no contiene secretos de sesión. */
export function setCsrfCookie(res: Response, token: string) {
  res.cookie(CSRF_COOKIE, token, { ...base(), httpOnly: false, maxAge: 1000 * 60 * 60 * 24 * 30 });
}
