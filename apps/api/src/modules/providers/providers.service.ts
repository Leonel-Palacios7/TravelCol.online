import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import type { providerApplicationSchema, updateProviderSchema, ProviderDocumentType } from '@travelcol/contracts';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { StorageService } from '../storage/storage.service';
import { validateUpload } from '../storage/file-validation';
import { NotificationsService } from '../notifications/notifications.service';
import { FinanceService } from '../finance/finance.service';
import { ProviderAccessService } from './provider-access.service';

@Injectable()
export class ProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProviderAccessService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly finance: FinanceService,
  ) {}

  /** La solicitud NO otorga capacidades de proveedor: solo crea un registro PENDING para revisión. */
  async apply(user: { id: string; role: string; emailVerified: boolean }, input: z.output<typeof providerApplicationSchema>) {
    if (user.role !== 'TOURIST') throw new ConflictException('Tu cuenta ya tiene un rol distinto a turista');
    if (!user.emailVerified) throw new ForbiddenException('Verifica tu correo antes de enviar la solicitud');
    const destination = await this.prisma.destination.findFirst({ where: { slug: input.destinationSlug, isActive: true } });
    if (!destination) throw new BadRequestException('Destino inválido');
    const taken = await this.prisma.providerProfile.findUnique({ where: { taxId: input.taxId } });
    if (taken) throw new ConflictException('Ya existe un proveedor registrado con ese NIT/cédula');
    try {
      const app = await this.prisma.providerApplication.create({
        data: {
          userId: user.id,
          businessName: input.businessName,
          legalName: input.legalName,
          taxId: input.taxId,
          rntNumber: input.rntNumber ?? null,
          contactPhone: input.contactPhone,
          description: input.description,
          destinationId: destination.id,
        },
      });
      await this.notifications.notifyAdmins({ type: 'PROVIDER_APPLICATION', title: 'Nueva solicitud de proveedor', body: input.businessName, link: '/admin/proveedores' });
      await this.audit.log({ actorId: user.id, action: 'PROVIDER_APPLICATION_SUBMITTED', entityType: 'ProviderApplication', entityId: app.id });
      return { id: app.id, status: app.status };
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') throw new ConflictException('Ya tienes una solicitud en revisión');
      throw e;
    }
  }

  async myApplications(userId: string) {
    return this.prisma.providerApplication.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, businessName: true, status: true, reviewNotes: true, createdAt: true, reviewedAt: true },
    });
  }

  async me(userId: string) {
    const p = await this.access.provider(userId, { requireApproved: false });
    const docs = await this.prisma.providerDocument.findMany({
      where: { providerId: p.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, type: true, originalName: true, status: true, reviewNotes: true, createdAt: true, sizeBytes: true },
    });
    return {
      id: p.id,
      slug: p.slug,
      businessName: p.businessName,
      legalName: p.legalName,
      taxId: p.taxId,
      rntNumber: p.rntNumber,
      rntVerified: !!p.rntVerifiedAt,
      contactPhone: p.contactPhone,
      description: p.description,
      status: p.status,
      documents: docs,
    };
  }

  async update(userId: string, input: z.output<typeof updateProviderSchema>) {
    const p = await this.access.provider(userId, { requireApproved: false });
    const rntChanged = input.rntNumber !== undefined && input.rntNumber !== p.rntNumber;
    await this.prisma.providerProfile.update({
      where: { id: p.id },
      data: {
        businessName: input.businessName,
        description: input.description,
        contactPhone: input.contactPhone,
        rntNumber: input.rntNumber,
        // Cambiar el RNT invalida la verificación previa.
        rntVerifiedAt: rntChanged ? null : undefined,
      },
    });
    await this.audit.log({ actorId: userId, action: 'PROVIDER_PROFILE_UPDATED', entityType: 'ProviderProfile', entityId: p.id, metadata: { rntChanged } });
    return { ok: true };
  }

  async uploadDocument(userId: string, type: ProviderDocumentType, file: Express.Multer.File | undefined) {
    const p = await this.access.provider(userId, { requireApproved: false });
    const detected = validateUpload(file, 'document');
    const key = `private/providers/${p.id}/${randomUUID()}.${detected.ext}`;
    const stored = await this.storage.put(key, file!.buffer);
    const doc = await this.prisma.providerDocument.create({
      data: {
        providerId: p.id,
        type,
        storageKey: key,
        originalName: (file!.originalname || 'documento').replace(/[^\w.\- ]/g, '_').slice(0, 200),
        mimeType: detected.mime,
        sizeBytes: file!.size,
        sha256: stored.sha256,
      },
    });
    await this.notifications.notifyAdmins({ type: 'PROVIDER_DOCUMENT', title: 'Documento por verificar', body: `${p.businessName}: ${type}`, link: '/admin/proveedores' });
    return { id: doc.id, status: doc.status };
  }

  async documentFile(userId: string, docId: string) {
    const p = await this.access.provider(userId, { requireApproved: false });
    const doc = await this.prisma.providerDocument.findFirst({ where: { id: docId, providerId: p.id } });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    return { doc, data: await this.storage.get(doc.storageKey) };
  }

  async bookings(userId: string, scope: 'upcoming' | 'past' | 'all') {
    const p = await this.access.provider(userId, { requireApproved: false });
    const now = new Date();
    const rows = await this.prisma.booking.findMany({
      where: {
        providerId: p.id,
        status: { in: ['CONFIRMED', 'COMPLETED', 'CANCELLED'] },
        startsAt: scope === 'upcoming' ? { gte: now } : scope === 'past' ? { lt: now } : undefined,
      },
      orderBy: { startsAt: scope === 'past' ? 'desc' : 'asc' },
      take: 200,
      include: { participants: { select: { fullName: true } }, user: { select: { fullName: true } } },
    });
    return rows.map((b) => ({
      id: b.id,
      code: b.code,
      status: b.status,
      serviceTitle: b.serviceTitle,
      startsAt: b.startsAt.toISOString(),
      participants: b.participantsCount,
      participantNames: b.participants.map((x) => x.fullName),
      customerName: b.user.fullName,
      // El teléfono de contacto solo se comparte en reservas confirmadas (minimización).
      contactPhone: b.status === 'CONFIRMED' ? b.contactPhone : null,
      notes: b.notes,
      subtotalCop: b.subtotalCop,
      commissionCop: b.commissionCop,
      providerNetCop: b.providerNetCop,
    }));
  }

  async dashboard(userId: string) {
    const p = await this.access.provider(userId, { requireApproved: false });
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 5));
    const [upcoming, confirmedMonth, services, finance] = await Promise.all([
      this.prisma.booking.count({ where: { providerId: p.id, status: 'CONFIRMED', startsAt: { gte: now } } }),
      this.prisma.booking.aggregate({ where: { providerId: p.id, status: { in: ['CONFIRMED', 'COMPLETED'] }, confirmedAt: { gte: monthStart } }, _count: true, _sum: { subtotalCop: true, providerNetCop: true } }),
      this.prisma.tourismService.groupBy({ by: ['status'], where: { providerId: p.id }, _count: true }),
      this.finance.providerSummary(p.id),
    ]);
    return {
      provider: { businessName: p.businessName, status: p.status, slug: p.slug },
      upcomingBookings: upcoming,
      monthBookings: confirmedMonth._count,
      monthGrossCop: confirmedMonth._sum.subtotalCop ?? 0,
      monthNetCop: confirmedMonth._sum.providerNetCop ?? 0,
      servicesByStatus: Object.fromEntries(services.map((s) => [s.status, s._count])),
      pendingSettlementCop: finance.pendingSettlementCop,
    };
  }

  async financeSummary(userId: string) {
    const p = await this.access.provider(userId, { requireApproved: false });
    return this.finance.providerSummary(p.id);
  }

  async ledger(userId: string, page: number, pageSize: number) {
    const p = await this.access.provider(userId, { requireApproved: false });
    return this.finance.providerLedger(p.id, page, pageSize);
  }
}
