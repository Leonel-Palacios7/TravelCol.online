import { Controller, Get, Headers, HttpCode, Param, ParseUUIDPipe, Post, Query, Req, Res } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { z } from 'zod';
import { AppRequest, AuthUser, CurrentUser, Public, SkipCsrf } from '../../common/auth.decorators';
import { ZodPipe } from '../../common/zod';
import { PaymentsService } from './payments.service';

const uuid = new ParseUUIDPipe();
const syncQuery = z.object({ transactionId: z.string().regex(/^[A-Za-z0-9-]{3,64}$/) }).strict();

@ApiTags('Pagos')
@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('bookings/:id/checkout')
  @ApiOperation({ summary: 'Crea un intento de pago Wompi (referencia única + firma de integridad)' })
  checkout(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string) {
    return this.payments.checkout(u.id, id);
  }

  @Get('payments/:id')
  get(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string) {
    return this.payments.getForUser(u, id);
  }

  @Post('payments/:id/sync')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reconciliación: consulta la transacción en Wompi desde el backend' })
  sync(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string, @Query(new ZodPipe(syncQuery)) q: { transactionId: string }) {
    return this.payments.syncFromProvider(u, id, q.transactionId);
  }

  /** Endpoint de eventos de Wompi. Autenticado por checksum (no por sesión ni CSRF). */
  @Public()
  @SkipCsrf()
  @SkipThrottle()
  @Post('webhooks/wompi')
  @ApiOperation({ summary: 'Webhook de eventos de Wompi (transaction.updated)' })
  async webhook(
    @Req() req: AppRequest,
    @Headers('x-event-checksum') checksum: string | undefined,
    @Res() res: Response,
  ) {
    const { outcome, status } = await this.payments.handleWebhook(req.body, checksum);
    res.status(status).json({ received: true, outcome });
  }

  @ApiExcludeEndpoint()
  @Get('webhooks/wompi')
  @Public()
  ping() {
    return { ok: true };
  }
}
