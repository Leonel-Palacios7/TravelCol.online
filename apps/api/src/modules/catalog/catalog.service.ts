import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { z } from 'zod';
import type { AvailabilitySlotDto, Paginated, ServiceCardDto, serviceSearchSchema } from '@travelcol/contracts';
import { PrismaService } from '../../common/prisma.service';
import { pageArgs } from '../../common/pagination';
import { bogotaDayRange } from '../../common/time';
import { cardInclude, detailInclude, publicServiceWhere, RatingInfo, toCard, toDetail } from './catalog.mapper';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  destinations() {
    return this.prisma.destination.findMany({
      where: { isActive: true },
      orderBy: [{ isPilot: 'desc' }, { name: 'asc' }],
      select: {
        id: true, slug: true, name: true, department: true, summary: true, isPilot: true,
        _count: { select: { services: { where: publicServiceWhere } } },
      },
    });
  }

  async destination(slug: string) {
    const d = await this.prisma.destination.findFirst({ where: { slug, isActive: true } });
    if (!d) throw new NotFoundException('Destino no encontrado');
    return d;
  }

  categories() {
    return this.prisma.serviceCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true, slug: true, name: true, description: true, icon: true,
        _count: { select: { services: { where: publicServiceWhere } } },
      },
    });
  }

  async ratings(serviceIds: string[]): Promise<Map<string, RatingInfo>> {
    if (serviceIds.length === 0) return new Map();
    const rows = await this.prisma.review.groupBy({
      by: ['serviceId'],
      where: { serviceId: { in: serviceIds }, status: 'PUBLISHED' },
      _avg: { rating: true },
      _count: { _all: true },
    });
    return new Map(
      rows.map((r) => [r.serviceId, { avg: r._avg.rating ? Math.round(r._avg.rating * 10) / 10 : null, count: r._count._all }]),
    );
  }

  async search(q: z.output<typeof serviceSearchSchema>): Promise<Paginated<ServiceCardDto>> {
    const where: Prisma.TourismServiceWhereInput = { ...publicServiceWhere };
    if (q.q) {
      where.OR = [
        { title: { contains: q.q, mode: 'insensitive' } },
        { summary: { contains: q.q, mode: 'insensitive' } },
      ];
    }
    if (q.destination) where.destination = { slug: q.destination };
    if (q.category) where.category = { slug: q.category };
    if (q.minPrice !== undefined || q.maxPrice !== undefined) {
      where.priceCop = { gte: q.minPrice, lte: q.maxPrice };
    }
    if (q.date) {
      const { from, to } = bogotaDayRange(q.date);
      const now = new Date();
      where.availability = {
        some: { status: 'OPEN', startsAt: { gte: from > now ? from : now, lt: to } },
      };
    }
    if (q.participants) where.maxParticipantsPerBooking = { gte: q.participants };

    const orderBy: Prisma.TourismServiceOrderByWithRelationInput[] =
      q.sort === 'price_asc'
        ? [{ priceCop: 'asc' }]
        : q.sort === 'price_desc'
          ? [{ priceCop: 'desc' }]
          : q.sort === 'newest'
            ? [{ publishedAt: 'desc' }]
            : [{ publishedAt: 'desc' }, { title: 'asc' }];

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.tourismService.count({ where }),
      this.prisma.tourismService.findMany({ where, orderBy, include: cardInclude, ...pageArgs(q.page, q.pageSize) }),
    ]);
    const ratings = await this.ratings(rows.map((r) => r.id));
    return { items: rows.map((r) => toCard(r, ratings.get(r.id))), page: q.page, pageSize: q.pageSize, total };
  }

  async featured(limit = 6) {
    const rows = await this.prisma.tourismService.findMany({
      where: publicServiceWhere,
      orderBy: { publishedAt: 'desc' },
      take: limit,
      include: cardInclude,
    });
    const ratings = await this.ratings(rows.map((r) => r.id));
    return rows.map((r) => toCard(r, ratings.get(r.id)));
  }

  async bySlug(slug: string) {
    const row = await this.prisma.tourismService.findFirst({ where: { slug, ...publicServiceWhere }, include: detailInclude });
    if (!row) throw new NotFoundException('Experiencia no encontrada');
    const ratings = await this.ratings([row.id]);
    return toDetail(row, ratings.get(row.id));
  }

  async availability(serviceId: string, from?: string, days = 60): Promise<AvailabilitySlotDto[]> {
    const service = await this.prisma.tourismService.findFirst({ where: { id: serviceId, ...publicServiceWhere }, select: { id: true } });
    if (!service) throw new NotFoundException('Experiencia no encontrada');
    const now = new Date();
    const start = from ? bogotaDayRange(from).from : now;
    const effectiveStart = start > now ? start : now;
    const end = new Date(effectiveStart.getTime() + Math.min(days, 120) * 86_400_000);
    const slots = await this.prisma.serviceAvailability.findMany({
      where: { serviceId, status: 'OPEN', startsAt: { gt: effectiveStart, lt: end } },
      orderBy: { startsAt: 'asc' },
      take: 200,
    });
    return slots
      .map((s) => ({ id: s.id, startsAt: s.startsAt.toISOString(), capacity: s.capacity, remaining: s.capacity - s.reservedCount }))
      .filter((s) => s.remaining > 0);
  }

  async reviews(serviceId: string, page: number, pageSize: number) {
    const where = { serviceId, status: 'PUBLISHED' as const };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(page, pageSize),
        select: { id: true, rating: true, comment: true, createdAt: true, user: { select: { fullName: true } } },
      }),
    ]);
    return {
      items: items.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        // Solo nombre e inicial del apellido (minimización de datos personales).
        authorName: r.user.fullName.split(' ').slice(0, 2).map((p, i) => (i === 0 ? p : `${p[0]}.`)).join(' '),
        verifiedBooking: true,
      })),
      page,
      pageSize,
      total,
    };
  }

  async providerPublic(slug: string) {
    const p = await this.prisma.providerProfile.findFirst({
      where: { slug, status: 'APPROVED' },
      select: {
        id: true, slug: true, businessName: true, description: true, rntNumber: true, rntVerifiedAt: true,
        isDemo: true, createdAt: true, destination: { select: { slug: true, name: true, department: true } },
      },
    });
    if (!p) throw new NotFoundException('Proveedor no encontrado');
    const services = await this.prisma.tourismService.findMany({
      where: { providerId: p.id, ...publicServiceWhere },
      include: cardInclude,
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });
    const ratings = await this.ratings(services.map((s) => s.id));
    const { id: _id, rntNumber, rntVerifiedAt, ...rest } = p;
    return {
      ...rest,
      // El número de RNT solo se muestra cuando fue verificado por el equipo de TravelCol.
      rntNumber: rntVerifiedAt ? rntNumber : null,
      rntVerified: !!rntVerifiedAt,
      services: services.map((s) => toCard(s, ratings.get(s.id))),
    };
  }

  async sitemapEntries() {
    const [services, destinations, providers] = await Promise.all([
      this.prisma.tourismService.findMany({ where: publicServiceWhere, select: { slug: true, updatedAt: true }, take: 5000 }),
      this.prisma.destination.findMany({ where: { isActive: true }, select: { slug: true } }),
      this.prisma.providerProfile.findMany({ where: { status: 'APPROVED' }, select: { slug: true, updatedAt: true }, take: 5000 }),
    ]);
    return {
      services: services.map((s) => ({ slug: s.slug, updatedAt: s.updatedAt.toISOString() })),
      destinations: destinations.map((d) => d.slug),
      providers: providers.map((p) => ({ slug: p.slug, updatedAt: p.updatedAt.toISOString() })),
    };
  }
}
