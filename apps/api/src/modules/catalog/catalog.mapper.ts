import type { Prisma } from '@prisma/client';
import type { MediaDto, ServiceCardDto, ServiceDetailDto } from '@travelcol/contracts';

export const cardInclude = {
  category: { select: { slug: true, name: true } },
  destination: { select: { slug: true, name: true, department: true } },
  provider: { select: { slug: true, businessName: true, rntVerifiedAt: true } },
  media: { orderBy: { sortOrder: 'asc' }, take: 1 },
} satisfies Prisma.TourismServiceInclude;

export const detailInclude = {
  ...cardInclude,
  media: { orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.TourismServiceInclude;

type CardRow = Prisma.TourismServiceGetPayload<{ include: typeof cardInclude }>;
type DetailRow = Prisma.TourismServiceGetPayload<{ include: typeof detailInclude }>;
type MediaRow = DetailRow['media'][number];

/** "static:/ruta" = recurso del sitio web (ilustraciones de demo); otro = almacenamiento público. */
export function mediaUrl(storageKey: string): string {
  if (storageKey.startsWith('static:')) return storageKey.slice('static:'.length);
  return `/api/v1/media/${storageKey}`;
}

export const toMedia = (m: MediaRow): MediaDto => ({ id: m.id, url: mediaUrl(m.storageKey), alt: m.alt, credit: m.credit });

export interface RatingInfo {
  avg: number | null;
  count: number;
}

export function toCard(s: CardRow, rating?: RatingInfo): ServiceCardDto {
  return {
    id: s.id,
    slug: s.slug,
    title: s.title,
    summary: s.summary,
    priceCop: s.priceCop,
    durationMinutes: s.durationMinutes,
    cancellationPolicy: s.cancellationPolicy,
    isDemo: s.isDemo,
    category: s.category,
    destination: s.destination,
    provider: { slug: s.provider.slug, businessName: s.provider.businessName, rntVerified: !!s.provider.rntVerifiedAt },
    cover: s.media[0] ? toMedia(s.media[0]) : null,
    ratingAverage: rating?.avg ?? null,
    reviewCount: rating?.count ?? 0,
  };
}

export function toDetail(s: DetailRow, rating?: RatingInfo): ServiceDetailDto {
  return {
    ...toCard(s, rating),
    description: s.description,
    meetingPoint: s.meetingPoint,
    latitude: s.latitude ? Number(s.latitude) : null,
    longitude: s.longitude ? Number(s.longitude) : null,
    includes: s.includes,
    excludes: s.excludes,
    requirements: s.requirements,
    minParticipants: s.minParticipants,
    maxParticipantsPerBooking: s.maxParticipantsPerBooking,
    minAge: s.minAge,
    media: s.media.map(toMedia),
    publishedAt: s.publishedAt?.toISOString() ?? null,
  };
}

/** Condición de visibilidad pública: publicado y proveedor aprobado. */
export const publicServiceWhere = {
  status: 'PUBLISHED',
  provider: { status: 'APPROVED' },
} satisfies Prisma.TourismServiceWhereInput;
