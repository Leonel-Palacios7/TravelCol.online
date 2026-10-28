import type {
  BookingStatus,
  CancellationPolicy,
  PaymentStatus,
  ProviderStatus,
  ServiceStatus,
  UserRole,
} from './enums';

/** Respuestas públicas de la API (DTO de salida). Nunca incluyen campos internos. */
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface MediaDto {
  id: string;
  url: string;
  alt: string;
  credit: string | null;
}

export interface ServiceCardDto {
  id: string;
  slug: string;
  title: string;
  summary: string;
  priceCop: number;
  durationMinutes: number;
  cancellationPolicy: CancellationPolicy;
  isDemo: boolean;
  category: { slug: string; name: string };
  destination: { slug: string; name: string; department: string };
  provider: { slug: string; businessName: string; rntVerified: boolean };
  cover: MediaDto | null;
  ratingAverage: number | null;
  reviewCount: number;
}

export interface ServiceDetailDto extends ServiceCardDto {
  description: string;
  meetingPoint: string;
  latitude: number | null;
  longitude: number | null;
  includes: string[];
  excludes: string[];
  requirements: string[];
  minParticipants: number;
  maxParticipantsPerBooking: number;
  minAge: number | null;
  media: MediaDto[];
  publishedAt: string | null;
}

export interface AvailabilitySlotDto {
  id: string;
  startsAt: string;
  capacity: number;
  remaining: number;
}

export interface SessionUserDto {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  emailVerified: boolean;
  marketingOptIn: boolean;
  provider: { id: string; slug: string; status: ProviderStatus } | null;
  hasPendingProviderApplication: boolean;
}

export interface PriceBreakdownDto {
  unitPriceCop: number;
  participants: number;
  subtotalCop: number;
  feesCop: number;
  totalCop: number;
  currency: 'COP';
}

export interface BookingDto {
  id: string;
  code: string;
  status: BookingStatus;
  service: { id: string; slug: string; title: string };
  providerName: string;
  startsAt: string;
  participants: number;
  price: PriceBreakdownDto;
  cancellationPolicy: CancellationPolicy;
  holdExpiresAt: string | null;
  createdAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  latestPayment: { id: string; status: PaymentStatus; reference: string } | null;
  canReview: boolean;
  hasReview: boolean;
}

export interface CheckoutDto {
  paymentId: string;
  reference: string;
  checkoutUrl: string;
  params: Record<string, string>;
}

export interface ProviderServiceRowDto {
  id: string;
  slug: string;
  title: string;
  status: ServiceStatus;
  priceCop: number;
  rejectionReason: string | null;
  updatedAt: string;
  upcomingSlots: number;
}
