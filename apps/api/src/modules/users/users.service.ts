import { Injectable, NotFoundException } from '@nestjs/common';
import type { z } from 'zod';
import type { updateProfileSchema } from '@travelcol/contracts';
import { PrismaService } from '../../common/prisma.service';
import { humanCode } from '../../common/crypto';
import { cardInclude, publicServiceWhere, toCard } from '../catalog/catalog.mapper';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async update(userId: string, input: z.output<typeof updateProfileSchema>) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fullName: input.fullName, phone: input.phone, marketingOptIn: input.marketingOptIn },
    });
    return { ok: true };
  }

  async favorites(userId: string) {
    const rows = await this.prisma.favorite.findMany({
      where: { userId, service: publicServiceWhere },
      orderBy: { createdAt: 'desc' },
      include: { service: { include: cardInclude } },
      take: 100,
    });
    return rows.map((r) => toCard(r.service));
  }

  async addFavorite(userId: string, serviceId: string) {
    const exists = await this.prisma.tourismService.findFirst({ where: { id: serviceId, ...publicServiceWhere }, select: { id: true } });
    if (!exists) throw new NotFoundException('Experiencia no encontrada');
    await this.prisma.favorite.upsert({ where: { userId_serviceId: { userId, serviceId } }, create: { userId, serviceId }, update: {} });
    return { favorite: true };
  }

  async removeFavorite(userId: string, serviceId: string) {
    await this.prisma.favorite.deleteMany({ where: { userId, serviceId } });
    return { favorite: false };
  }

  async notifications(userId: string, page: number, pageSize: number) {
    const [total, unread, items] = await this.prisma.$transaction([
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
      this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    return { items, unread, page, pageSize, total };
  }

  async readAll(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return { ok: true };
  }

  async exportData(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        email: true, fullName: true, phone: true, role: true, createdAt: true, marketingOptIn: true, emailVerifiedAt: true,
        consents: { select: { purpose: true, granted: true, createdAt: true, legalDocument: { select: { type: true, version: true } } } },
        bookings: { select: { code: true, serviceTitle: true, startsAt: true, status: true, totalCop: true, contactPhone: true, participants: { select: { fullName: true } } } },
        reviews: { select: { rating: true, comment: true, createdAt: true } },
        favorites: { select: { service: { select: { title: true } } } },
      },
    });
    return { generatedAt: new Date().toISOString(), data: user };
  }

  async requestDeletion(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ticket = await this.prisma.supportTicket.create({
      data: {
        radicado: `PQR-${humanCode(8)}`,
        userId,
        fullName: user.fullName,
        email: user.email,
        type: 'DATOS_PERSONALES',
        subject: 'Solicitud de supresión de datos personales',
        message: 'El titular solicita la supresión de sus datos. Conservar únicamente registros financieros y contables exigidos por ley.',
      },
    });
    return { radicado: ticket.radicado };
  }
}
