import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import type {
  availabilityCreateSchema,
  availabilityUpdateSchema,
  ProviderServiceRowDto,
  serviceUpsertSchema,
} from '@travelcol/contracts';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { uniqueSlug } from '../../common/slug';
import { bogotaLocalToUtc } from '../../common/time';
import { StorageService } from '../storage/storage.service';
import { validateUpload } from '../storage/file-validation';
import { NotificationsService } from '../notifications/notifications.service';
import { ProviderAccessService } from '../providers/provider-access.service';
import { detailInclude, toMedia } from './catalog.mapper';

type Upsert = z.output<typeof serviceUpsertSchema>;

const MAX_MEDIA = 10;

@Injectable()
export class ProviderServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProviderAccessService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  private async refs(input: Upsert) {
    const [category, destination] = await Promise.all([
      this.prisma.serviceCategory.findFirst({ where: { slug: input.categorySlug, isActive: true } }),
      this.prisma.destination.findFirst({ where: { slug: input.destinationSlug, isActive: true } }),
    ]);
    if (!category) throw new BadRequestException('Categoría inválida');
    if (!destination) throw new BadRequestException('Destino inválido');
    return { categoryId: category.id, destinationId: destination.id };
  }

  private data(input: Upsert) {
    return {
      title: input.title,
      summary: input.summary,
      description: input.description,
      priceCop: input.priceCop,
      durationMinutes: input.durationMinutes,
      minParticipants: input.minParticipants,
      maxParticipantsPerBooking: input.maxParticipantsPerBooking,
      meetingPoint: input.meetingPoint,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      includes: input.includes,
      excludes: input.excludes,
      requirements: input.requirements,
      cancellationPolicy: input.cancellationPolicy,
      minAge: input.minAge ?? null,
    };
  }

  async list(userId: string): Promise<ProviderServiceRowDto[]> {
    const provider = await this.access.provider(userId, { requireApproved: false });
    const rows = await this.prisma.tourismService.findMany({
      where: { providerId: provider.id },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { availability: { where: { startsAt: { gt: new Date() }, status: 'OPEN' } } } } },
    });
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      status: r.status,
      priceCop: r.priceCop,
      rejectionReason: r.rejectionReason,
      updatedAt: r.updatedAt.toISOString(),
      upcomingSlots: r._count.availability,
    }));
  }

  async get(userId: string, id: string) {
    await this.access.ownedService(userId, id);
    const s = await this.prisma.tourismService.findUniqueOrThrow({ where: { id }, include: detailInclude });
    return {
      id: s.id,
      slug: s.slug,
      status: s.status,
      rejectionReason: s.rejectionReason,
      title: s.title,
      summary: s.summary,
      description: s.description,
      categorySlug: s.category.slug,
      destinationSlug: s.destination.slug,
      priceCop: s.priceCop,
      durationMinutes: s.durationMinutes,
      minParticipants: s.minParticipants,
      maxParticipantsPerBooking: s.maxParticipantsPerBooking,
      meetingPoint: s.meetingPoint,
      latitude: s.latitude ? Number(s.latitude) : null,
      longitude: s.longitude ? Number(s.longitude) : null,
      includes: s.includes,
      excludes: s.excludes,
      requirements: s.requirements,
      cancellationPolicy: s.cancellationPolicy,
      minAge: s.minAge,
      media: s.media.map(toMedia),
    };
  }

  async create(userId: string, input: Upsert) {
    const provider = await this.access.provider(userId);
    const refs = await this.refs(input);
    const service = await this.prisma.tourismService.create({
      data: { ...this.data(input), ...refs, providerId: provider.id, slug: uniqueSlug(input.title), status: 'DRAFT' },
    });
    await this.audit.log({ actorId: userId, action: 'SERVICE_CREATED', entityType: 'TourismService', entityId: service.id });
    return { id: service.id, slug: service.slug, status: service.status };
  }

  /** Editar un servicio publicado lo devuelve a revisión (el contenido debe moderarse de nuevo). */
  async update(userId: string, id: string, input: Upsert) {
    const { service } = await this.access.ownedService(userId, id);
    if (service.status === 'ARCHIVED') throw new ConflictException('El servicio está archivado');
    const refs = await this.refs(input);
    const nextStatus = service.status === 'PUBLISHED' ? 'IN_REVIEW' : service.status;
    const updated = await this.prisma.tourismService.update({
      where: { id },
      data: { ...this.data(input), ...refs, status: nextStatus },
    });
    await this.audit.log({ actorId: userId, action: 'SERVICE_UPDATED', entityType: 'TourismService', entityId: id, metadata: { from: service.status, to: nextStatus } });
    return { id: updated.id, status: updated.status };
  }

  async submitForReview(userId: string, id: string) {
    const { service } = await this.access.ownedService(userId, id);
    if (!['DRAFT', 'REJECTED'].includes(service.status)) {
      throw new ConflictException('Solo se pueden enviar a revisión servicios en borrador o rechazados');
    }
    const mediaCount = await this.prisma.serviceMedia.count({ where: { serviceId: id } });
    if (mediaCount === 0) throw new BadRequestException('Agrega al menos una fotografía antes de enviar a revisión');
    await this.prisma.tourismService.update({ where: { id }, data: { status: 'IN_REVIEW', rejectionReason: null } });
    await this.notifications.notifyAdmins({ type: 'SERVICE_IN_REVIEW', title: 'Servicio por revisar', body: service.title, link: '/admin/servicios' });
    await this.audit.log({ actorId: userId, action: 'SERVICE_SUBMITTED', entityType: 'TourismService', entityId: id });
    return { id, status: 'IN_REVIEW' };
  }

  async archive(userId: string, id: string) {
    await this.access.ownedService(userId, id);
    await this.prisma.tourismService.update({ where: { id }, data: { status: 'ARCHIVED' } });
    await this.audit.log({ actorId: userId, action: 'SERVICE_ARCHIVED', entityType: 'TourismService', entityId: id });
    return { id, status: 'ARCHIVED' };
  }

  async addMedia(userId: string, id: string, file: Express.Multer.File | undefined, alt: string | undefined) {
    await this.access.ownedService(userId, id);
    const count = await this.prisma.serviceMedia.count({ where: { serviceId: id } });
    if (count >= MAX_MEDIA) throw new BadRequestException(`Máximo ${MAX_MEDIA} fotografías por servicio`);
    const type = validateUpload(file, 'image');
    const key = `public/services/${id}/${randomUUID()}.${type.ext}`;
    await this.storage.put(key, file!.buffer);
    const media = await this.prisma.serviceMedia.create({
      data: {
        serviceId: id,
        storageKey: key,
        alt: (alt ?? '').trim().slice(0, 200) || 'Fotografía del servicio',
        mimeType: type.mime,
        sizeBytes: file!.size,
        sortOrder: count,
        credit: 'Fotografía aportada por el proveedor',
      },
    });
    return toMedia(media);
  }

  async removeMedia(userId: string, id: string, mediaId: string) {
    await this.access.ownedService(userId, id);
    const media = await this.prisma.serviceMedia.findFirst({ where: { id: mediaId, serviceId: id } });
    if (!media) throw new NotFoundException('Imagen no encontrada');
    await this.prisma.serviceMedia.delete({ where: { id: mediaId } });
    if (!media.storageKey.startsWith('static:')) await this.storage.delete(media.storageKey);
    return { ok: true };
  }

  async listAvailability(userId: string, id: string) {
    await this.access.ownedService(userId, id);
    const slots = await this.prisma.serviceAvailability.findMany({
      where: { serviceId: id, startsAt: { gt: new Date(Date.now() - 7 * 86_400_000) } },
      orderBy: { startsAt: 'asc' },
      take: 300,
    });
    return slots.map((s) => ({
      id: s.id,
      startsAt: s.startsAt.toISOString(),
      capacity: s.capacity,
      reserved: s.reservedCount,
      status: s.status,
    }));
  }

  async createAvailability(userId: string, id: string, input: z.output<typeof availabilityCreateSchema>) {
    await this.access.ownedService(userId, id);
    const first = bogotaLocalToUtc(input.startsAtLocal);
    if (first <= new Date()) throw new BadRequestException('La fecha debe ser futura');
    const dates = Array.from({ length: input.repeatDays + 1 }, (_, i) => new Date(first.getTime() + i * 86_400_000));
    const result = await this.prisma.serviceAvailability.createMany({
      data: dates.map((startsAt) => ({ serviceId: id, startsAt, capacity: input.capacity })),
      skipDuplicates: true,
    });
    return { created: result.count, skipped: dates.length - result.count };
  }

  /** La capacidad nunca puede quedar por debajo de lo ya reservado (también lo impide un CHECK en BD). */
  async updateAvailability(userId: string, slotId: string, input: z.output<typeof availabilityUpdateSchema>) {
    const provider = await this.access.provider(userId);
    const slot = await this.prisma.serviceAvailability.findFirst({ where: { id: slotId, service: { providerId: provider.id } } });
    if (!slot) throw new NotFoundException('Cupo no encontrado');
    if (input.capacity !== undefined) {
      const res = await this.prisma.serviceAvailability.updateMany({
        where: { id: slotId, reservedCount: { lte: input.capacity } },
        data: { capacity: input.capacity },
      });
      if (res.count === 0) throw new ConflictException('La capacidad no puede ser menor que los cupos ya reservados');
    }
    if (input.closed !== undefined) {
      await this.prisma.serviceAvailability.update({ where: { id: slotId }, data: { status: input.closed ? 'CLOSED' : 'OPEN' } });
    }
    return { ok: true };
  }
}
