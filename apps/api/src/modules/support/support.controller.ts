import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { contactSchema } from '@travelcol/contracts';
import { AppRequest, Public } from '../../common/auth.decorators';
import { ApiZodBody, ZodPipe } from '../../common/zod';
import { humanCode } from '../../common/crypto';
import { PrismaService } from '../../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const legalQuery = z.object({ type: z.enum(['TERMS', 'PRIVACY', 'CANCELLATION', 'PROVIDER_TERMS']) }).strict();

@ApiTags('Soporte y legal')
@Public()
@Controller()
export class SupportController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** PQR y solicitudes de titulares de datos: genera radicado consultable. */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('support/tickets')
  @ApiZodBody(contactSchema)
  async create(@Body(new ZodPipe(contactSchema)) body: z.output<typeof contactSchema>, @Req() req: AppRequest) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        radicado: `PQR-${humanCode(8)}`,
        userId: req.user?.id ?? null,
        fullName: body.fullName,
        email: body.email,
        type: body.type,
        subject: body.subject,
        message: body.message,
      },
    });
    await this.notifications.notifyAdmins({ type: 'TICKET_CREATED', title: 'Nuevo radicado PQR', body: `${ticket.radicado} · ${body.subject}`, link: '/admin/pqr' });
    await this.notifications.queueEmail(body.email, 'PQR_RECEIVED', `Recibimos tu solicitud ${ticket.radicado}`, { radicado: ticket.radicado });
    return { radicado: ticket.radicado };
  }

  @Get('legal/current')
  async legal(@Query(new ZodPipe(legalQuery)) q: z.output<typeof legalQuery>) {
    const doc = await this.prisma.legalDocumentVersion.findFirst({
      where: { type: q.type, publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: 'desc' },
      select: { type: true, version: true, title: true, content: true, publishedAt: true },
    });
    return doc;
  }
}
