import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { z } from 'zod';
import type { reviewCreateSchema } from '@travelcol/contracts';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

const URL_RE = /(https?:\/\/|www\.)/i;

/** Reseñas verificadas: solo de reservas COMPLETADAS, una por reserva, autor con correo verificado. */
@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(user: { id: string; emailVerified: boolean }, bookingId: string, input: z.output<typeof reviewCreateSchema>) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId }, include: { provider: true } });
    if (!booking || booking.userId !== user.id) throw new NotFoundException('Reserva no encontrada');
    if (!user.emailVerified) throw new ForbiddenException('Verifica tu correo para publicar reseñas');
    if (booking.status !== 'COMPLETED') throw new ConflictException('Solo puedes reseñar experiencias ya realizadas');
    // Anti-spam básico: sin enlaces. Las reseñas con enlaces quedan ocultas para moderación.
    const status = URL_RE.test(input.comment) ? 'HIDDEN' : 'PUBLISHED';
    try {
      const review = await this.prisma.review.create({
        data: { bookingId, userId: user.id, serviceId: booking.serviceId, rating: input.rating, comment: input.comment, status, moderationNote: status === 'HIDDEN' ? 'Contiene enlaces: requiere moderación' : null },
      });
      await this.notifications.notify({ userId: booking.provider.userId, type: 'REVIEW_RECEIVED', title: 'Nueva reseña', body: `${input.rating}/5 · ${booking.serviceTitle}` });
      return { id: review.id, status: review.status };
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') throw new ConflictException('Ya reseñaste esta reserva');
      throw e;
    }
  }

  async moderate(id: string, status: 'PUBLISHED' | 'HIDDEN', reason: string, actorId: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Reseña no encontrada');
    await this.prisma.review.update({ where: { id }, data: { status, moderationNote: reason } });
    await this.audit.log({ actorId, action: 'REVIEW_MODERATED', entityType: 'Review', entityId: id, metadata: { status, reason } });
    return { ok: true };
  }
}
