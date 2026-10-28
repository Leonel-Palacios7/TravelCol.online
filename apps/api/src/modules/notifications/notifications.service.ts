import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { PrismaService, Tx } from '../../common/prisma.service';

interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
}

/**
 * Notificaciones internas (persistidas) + bandeja de salida de correo (outbox).
 * El envío real de correo NO está integrado: MAIL_DRIVER=log solo registra en el log
 * del servidor. Integrar un proveedor (SES, SendGrid, Postmark…) es requisito previo a producción.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('Mailer');
  constructor(private readonly prisma: PrismaService) {}

  async notify(input: NotifyInput, tx?: Tx) {
    const db = tx ?? this.prisma;
    await db.notification.create({ data: input });
  }

  async notifyAdmins(input: Omit<NotifyInput, 'userId'>, tx?: Tx) {
    const db = tx ?? this.prisma;
    const admins = await db.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPPORT'] }, status: 'ACTIVE' },
      select: { id: true },
    });
    if (admins.length === 0) return;
    await db.notification.createMany({ data: admins.map((a) => ({ ...input, userId: a.id })) });
  }

  async queueEmail(
    to: string,
    template: string,
    subject: string,
    payload: Prisma.InputJsonValue,
    tx?: Tx,
  ) {
    const db = tx ?? this.prisma;
    await db.emailOutbox.create({ data: { toEmail: to, template, subject, payload } });
  }

  /** Despacha la bandeja pendiente. Con MAIL_DRIVER=log se registra (solo desarrollo). */
  async dispatchPending(limit = 20) {
    if (env().MAIL_DRIVER === 'disabled') return 0;
    const pending = await this.prisma.emailOutbox.findMany({
      where: { status: 'PENDING', attempts: { lt: 5 } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    for (const mail of pending) {
      if (env().NODE_ENV === 'production') {
        // Sin proveedor configurado: no se simula el envío. Queda pendiente y visible.
        await this.prisma.emailOutbox.update({
          where: { id: mail.id },
          data: { attempts: { increment: 1 }, lastError: 'Proveedor de correo no configurado' },
        });
        continue;
      }
      this.logger.log(`[DEV] Correo "${mail.subject}" para ${mail.toEmail}: ${JSON.stringify(mail.payload)}`);
      await this.prisma.emailOutbox.update({
        where: { id: mail.id },
        data: { status: 'SENT', sentAt: new Date(), attempts: { increment: 1 } },
      });
    }
    return pending.length;
  }
}
