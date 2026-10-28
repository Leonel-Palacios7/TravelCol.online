import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ThrottlerException } from '@nestjs/throttler';
import type { Response } from 'express';
import type { AppRequest } from './auth.decorators';

/**
 * Manejo centralizado de errores: respuesta uniforme en español, sin filtrar detalles
 * internos (stack, SQL). Los errores 5xx se registran con el id de correlación.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<AppRequest>();
    const requestId = req.id ? String(req.id) : undefined;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: Record<string, unknown> = { message: 'Ocurrió un error inesperado. Inténtalo de nuevo.' };

    if (exception instanceof ThrottlerException) {
      status = HttpStatus.TOO_MANY_REQUESTS;
      body = { message: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.' };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      body = typeof r === 'string' ? { message: r } : { ...(r as Record<string, unknown>) };
      delete body.statusCode;
      delete body.error;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        body = { message: 'El registro ya existe o entra en conflicto con otro.' };
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        body = { message: 'Recurso no encontrado' };
      }
    }

    if (status >= 500) {
      this.logger.error({ err: exception, requestId }, 'Error no controlado');
    }
    res.status(status).json({ statusCode: status, ...body, requestId });
  }
}
