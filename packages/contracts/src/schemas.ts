import { z } from 'zod';
import {
  CANCELLATION_POLICIES,
  PQR_TYPES,
  PROVIDER_DOCUMENT_TYPES,
  SERVICE_STATUSES,
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  USER_ROLES,
} from './enums';

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);
const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email({ message: 'Ingresa un correo electrónico válido' }));
/** Teléfono colombiano: móvil (3xx xxx xxxx) o fijo (60x xxx xxxx), con +57 opcional. */
export const colombianPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s()-]/g, ''))
  .pipe(
    z
      .string()
      .regex(/^(\+57)?(3\d{9}|60\d{8})$/, 'Ingresa un teléfono colombiano válido, p. ej. 300 123 4567'),
  );

export const passwordSchema = z
  .string()
  .min(10, 'La contraseña debe tener al menos 10 caracteres')
  .max(128, 'La contraseña no puede superar 128 caracteres')
  .refine((v) => /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(v) && /\d/.test(v), {
    message: 'Incluye al menos una letra y un número',
  });

// ---------- Identidad ----------
export const registerSchema = z
  .object({
    fullName: trimmed(3, 120),
    email,
    password: passwordSchema,
    phone: colombianPhone.optional(),
    acceptTerms: z.literal(true, { message: 'Debes aceptar los términos y la política de privacidad' }),
    marketingOptIn: z.boolean().default(false),
  })
  .strict();
export type RegisterInput = z.input<typeof registerSchema>;

export const loginSchema = z.object({ email, password: z.string().min(1).max(128) }).strict();
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email }).strict();
export const resetPasswordSchema = z
  .object({ token: z.string().min(20).max(200), password: passwordSchema })
  .strict();
export const verifyEmailSchema = z.object({ token: z.string().min(20).max(200) }).strict();

export const updateProfileSchema = z
  .object({
    fullName: trimmed(3, 120).optional(),
    phone: colombianPhone.nullable().optional(),
    marketingOptIn: z.boolean().optional(),
  })
  .strict();

// ---------- Proveedores ----------
const nit = z
  .string()
  .trim()
  .regex(/^\d{6,10}(-\d)?$/, 'NIT o cédula sin puntos, con dígito de verificación opcional (p. ej. 900123456-7)');

export const providerApplicationSchema = z
  .object({
    businessName: trimmed(3, 120),
    legalName: trimmed(3, 160),
    taxId: nit,
    rntNumber: z
      .string()
      .trim()
      .regex(/^\d{3,8}$/, 'El RNT es numérico')
      .optional(),
    contactPhone: colombianPhone,
    description: trimmed(30, 2000),
    destinationSlug: z.string().trim().max(80),
    acceptProviderTerms: z.literal(true, { message: 'Debes aceptar las condiciones para proveedores' }),
  })
  .strict();
export type ProviderApplicationInput = z.input<typeof providerApplicationSchema>;

export const updateProviderSchema = z
  .object({
    businessName: trimmed(3, 120).optional(),
    description: trimmed(30, 2000).optional(),
    contactPhone: colombianPhone.optional(),
    rntNumber: z.string().trim().regex(/^\d{3,8}$/).optional(),
  })
  .strict();

export const providerDocumentTypeSchema = z.enum(PROVIDER_DOCUMENT_TYPES);

// ---------- Catálogo ----------
export const serviceSearchSchema = z
  .object({
    q: z.string().trim().max(80).optional(),
    destination: z.string().trim().max(80).optional(),
    category: z.string().trim().max(80).optional(),
    minPrice: z.coerce.number().int().min(0).max(100_000_000).optional(),
    maxPrice: z.coerce.number().int().min(0).max(100_000_000).optional(),
    date: z.iso.date().optional(),
    participants: z.coerce.number().int().min(1).max(50).optional(),
    sort: z.enum(['relevance', 'price_asc', 'price_desc', 'newest']).default('relevance'),
    page: z.coerce.number().int().min(1).max(500).default(1),
    pageSize: z.coerce.number().int().min(1).max(48).default(12),
  })
  .strict();
export type ServiceSearchInput = z.input<typeof serviceSearchSchema>;

export const serviceUpsertSchema = z
  .object({
    title: trimmed(8, 120),
    summary: trimmed(20, 240),
    description: trimmed(80, 8000),
    categorySlug: z.string().trim().max(80),
    destinationSlug: z.string().trim().max(80),
    priceCop: z.coerce
      .number()
      .int('El precio debe ser un número entero de pesos')
      .min(5_000, 'El precio mínimo es $5.000')
      .max(20_000_000),
    durationMinutes: z.coerce.number().int().min(30).max(60 * 24 * 14),
    minParticipants: z.coerce.number().int().min(1).max(50).default(1),
    maxParticipantsPerBooking: z.coerce.number().int().min(1).max(50).default(10),
    meetingPoint: trimmed(5, 240),
    latitude: z.coerce.number().min(-4.3).max(13.5).nullable().optional(),
    longitude: z.coerce.number().min(-82).max(-66).nullable().optional(),
    includes: z.array(trimmed(2, 120)).max(20).default([]),
    excludes: z.array(trimmed(2, 120)).max(20).default([]),
    requirements: z.array(trimmed(2, 160)).max(20).default([]),
    cancellationPolicy: z.enum(CANCELLATION_POLICIES),
    minAge: z.coerce.number().int().min(0).max(99).nullable().optional(),
  })
  .strict()
  .refine((v) => v.minParticipants <= v.maxParticipantsPerBooking, {
    message: 'El mínimo de participantes no puede superar el máximo por reserva',
    path: ['minParticipants'],
  });
export type ServiceUpsertInput = z.input<typeof serviceUpsertSchema>;
export const serviceUpdateSchema = serviceUpsertSchema;

export const availabilityCreateSchema = z
  .object({
    /** Fecha-hora local de Colombia en formato ISO sin zona (YYYY-MM-DDTHH:mm). */
    startsAtLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Formato AAAA-MM-DDTHH:mm'),
    capacity: z.coerce.number().int().min(1).max(500),
    repeatDays: z.coerce.number().int().min(0).max(90).default(0),
  })
  .strict();
export type AvailabilityCreateInput = z.input<typeof availabilityCreateSchema>;

export const availabilityUpdateSchema = z
  .object({ capacity: z.coerce.number().int().min(0).max(500).optional(), closed: z.boolean().optional() })
  .strict();

// ---------- Reservas ----------
export const createBookingSchema = z
  .object({
    availabilityId: z.uuid(),
    participants: z.array(z.object({ fullName: trimmed(3, 120) }).strict()).min(1).max(50),
    contactPhone: colombianPhone,
    notes: z.string().trim().max(500).optional(),
  })
  .strict();
export type CreateBookingInput = z.input<typeof createBookingSchema>;

export const cancelBookingSchema = z.object({ reason: trimmed(5, 500) }).strict();

export const reviewCreateSchema = z
  .object({ rating: z.coerce.number().int().min(1).max(5), comment: trimmed(20, 2000) })
  .strict();

// ---------- Administración ----------
export const adminProviderStatusSchema = z
  .object({ status: z.enum(['APPROVED', 'SUSPENDED']), reason: trimmed(5, 500).optional() })
  .strict();
export const adminServiceModerationSchema = z
  .object({ decision: z.enum(['PUBLISH', 'REJECT', 'ARCHIVE']), reason: trimmed(5, 500).optional() })
  .strict()
  .refine((v) => v.decision === 'PUBLISH' || !!v.reason, {
    message: 'Indica el motivo del rechazo o archivo',
    path: ['reason'],
  });
export const adminDocumentReviewSchema = z
  .object({ status: z.enum(['VERIFIED', 'REJECTED']), notes: z.string().trim().max(500).optional() })
  .strict();
export const adminUserStatusSchema = z
  .object({ status: z.enum(['ACTIVE', 'SUSPENDED']), reason: trimmed(5, 500) })
  .strict();
export const adminUserRoleSchema = z.object({ role: z.enum(USER_ROLES), reason: trimmed(5, 500) }).strict();
export const commissionSettingSchema = z
  .object({ commissionBps: z.coerce.number().int().min(0).max(5000), reason: trimmed(5, 500) })
  .strict();
export const refundDecisionSchema = z
  .object({
    decision: z.enum(['MARK_EXECUTED', 'REJECT']),
    externalReference: z.string().trim().max(120).optional(),
    notes: trimmed(5, 500),
  })
  .strict()
  .refine((v) => v.decision === 'REJECT' || !!v.externalReference, {
    message: 'Registra la referencia del reembolso ejecutado en Wompi',
    path: ['externalReference'],
  });
export const settlementCreateSchema = z
  .object({ providerId: z.uuid(), periodEnd: z.iso.date() })
  .strict();
export const settlementPaySchema = z
  .object({ payoutReference: trimmed(3, 120), notes: z.string().trim().max(500).optional() })
  .strict();
export const reviewModerationSchema = z
  .object({ status: z.enum(['PUBLISHED', 'HIDDEN']), reason: trimmed(5, 300) })
  .strict();

export const paginationSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
export const adminListSchema = paginationSchema.extend({
  status: z.string().trim().max(40).optional(),
  q: z.string().trim().max(80).optional(),
});
export const adminBookingListSchema = paginationSchema.extend({
  status: z.enum(BOOKING_STATUSES).optional(),
});
export const adminPaymentListSchema = paginationSchema.extend({
  status: z.enum(PAYMENT_STATUSES).optional(),
});
export const serviceStatusFilter = z.enum(SERVICE_STATUSES);

// ---------- Contacto / PQR ----------
export const contactSchema = z
  .object({
    fullName: trimmed(3, 120),
    email,
    type: z.enum(PQR_TYPES),
    subject: trimmed(5, 160),
    message: trimmed(20, 4000),
    acceptPrivacy: z.literal(true, { message: 'Debes autorizar el tratamiento de datos para responderte' }),
  })
  .strict();
export type ContactInput = z.input<typeof contactSchema>;
