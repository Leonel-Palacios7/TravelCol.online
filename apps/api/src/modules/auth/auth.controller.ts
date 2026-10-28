import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@travelcol/contracts';
import { z } from 'zod';
import { ApiZodBody, ZodPipe } from '../../common/zod';
import { AppRequest, AuthUser, CurrentUser, Public } from '../../common/auth.decorators';
import { clearSessionCookie, setCsrfCookie, setSessionCookie } from '../../common/cookies';
import { randomToken } from '../../common/crypto';
import { env } from '../../config/env';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';

const authLimit = () => ({ default: { limit: env().AUTH_THROTTLE_LIMIT, ttl: env().THROTTLE_TTL_MS } });

function meta(req: AppRequest) {
  return { ip: req.ip, userAgent: req.header('user-agent'), requestId: req.id ? String(req.id) : undefined };
}

@ApiTags('Identidad')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @Public()
  @Get('csrf')
  @ApiOperation({ summary: 'Emite la cookie CSRF (doble envío) y devuelve su valor' })
  csrf(@Req() req: AppRequest, @Res({ passthrough: true }) res: Response) {
    const existing: unknown = req.cookies?.tc_csrf;
    const token = typeof existing === 'string' && existing.length >= 32 ? existing : randomToken();
    setCsrfCookie(res, token);
    return { csrfToken: token };
  }

  @Public()
  @Throttle(authLimit())
  @Post('register')
  @ApiOperation({ summary: 'Registro público de turistas (rol fijo TOURIST)' })
  @ApiZodBody(registerSchema)
  async register(
    @Body(new ZodPipe(registerSchema)) body: z.output<typeof registerSchema>,
    @Req() req: AppRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { userId, session } = await this.auth.register(body, meta(req));
    setSessionCookie(res, session.token, session.expiresAt);
    return this.auth.me(userId);
  }

  @Public()
  @Throttle(authLimit())
  @Post('login')
  @HttpCode(200)
  @ApiZodBody(loginSchema)
  async login(
    @Body(new ZodPipe(loginSchema)) body: z.output<typeof loginSchema>,
    @Req() req: AppRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.auth.login(body, meta(req));
    setSessionCookie(res, session.token, session.expiresAt);
    const resolved = await this.sessions.resolve(session.token);
    return this.auth.me(resolved!.id);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    await this.sessions.revoke(user.sessionId);
    clearSessionCookie(res);
    return { ok: true };
  }

  @Post('logout-all')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoca todas las sesiones del usuario' })
  async logoutAll(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    await this.sessions.revokeAll(user.id);
    clearSessionCookie(res);
    return { ok: true };
  }

  @Public()
  @Throttle(authLimit())
  @Post('forgot-password')
  @HttpCode(202)
  @ApiOperation({ summary: 'Solicita enlace de recuperación (respuesta idéntica exista o no el correo)' })
  @ApiZodBody(forgotPasswordSchema)
  async forgot(@Body(new ZodPipe(forgotPasswordSchema)) body: { email: string }, @Req() req: AppRequest) {
    await this.auth.forgotPassword(body.email, meta(req));
    return { message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.' };
  }

  @Public()
  @Throttle(authLimit())
  @Post('reset-password')
  @HttpCode(200)
  @ApiZodBody(resetPasswordSchema)
  async reset(
    @Body(new ZodPipe(resetPasswordSchema)) body: z.output<typeof resetPasswordSchema>,
    @Req() req: AppRequest,
  ) {
    await this.auth.resetPassword(body, meta(req));
    return { message: 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.' };
  }

  @Public()
  @Throttle(authLimit())
  @Post('verify-email')
  @HttpCode(200)
  @ApiZodBody(verifyEmailSchema)
  async verify(@Body(new ZodPipe(verifyEmailSchema)) body: { token: string }) {
    await this.auth.verifyEmail(body.token);
    return { message: 'Correo verificado. ¡Gracias!' };
  }

  @Throttle(authLimit())
  @Post('resend-verification')
  @HttpCode(202)
  async resend(@CurrentUser() user: AuthUser) {
    await this.auth.resendVerification(user.id);
    return { message: 'Si tu correo aún no está verificado, te enviamos un nuevo enlace.' };
  }
}
