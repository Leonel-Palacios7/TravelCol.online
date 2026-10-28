/**
 * Enumeraciones de dominio compartidas. Deben coincidir con los enums de Prisma
 * (apps/api/prisma/schema.prisma). Una prueba de la API verifica la coincidencia.
 */
export const USER_ROLES = ['TOURIST', 'PROVIDER', 'SUPPORT', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SERVICE_STATUSES = ['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED'] as const;
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

export const BOOKING_STATUSES = [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'CANCELLED',
  'EXPIRED',
  'COMPLETED',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAYMENT_STATUSES = ['CREATED', 'PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const CANCELLATION_POLICIES = ['FLEXIBLE', 'MODERATE', 'STRICT'] as const;
export type CancellationPolicy = (typeof CANCELLATION_POLICIES)[number];

export const PROVIDER_STATUSES = ['PENDING_REVIEW', 'APPROVED', 'SUSPENDED'] as const;
export type ProviderStatus = (typeof PROVIDER_STATUSES)[number];

export const PROVIDER_DOCUMENT_TYPES = [
  'RNT',
  'RUT',
  'CAMARA_COMERCIO',
  'IDENTIFICACION',
  'POLIZA',
  'OTRO',
] as const;
export type ProviderDocumentType = (typeof PROVIDER_DOCUMENT_TYPES)[number];

export const PQR_TYPES = ['PETICION', 'QUEJA', 'RECLAMO', 'SUGERENCIA', 'DATOS_PERSONALES'] as const;
export type PqrType = (typeof PQR_TYPES)[number];

export const LABELS = {
  bookingStatus: {
    PENDING_PAYMENT: 'Pendiente de pago',
    CONFIRMED: 'Confirmada',
    CANCELLED: 'Cancelada',
    EXPIRED: 'Expirada',
    COMPLETED: 'Completada',
  } satisfies Record<BookingStatus, string>,
  paymentStatus: {
    CREATED: 'Iniciado',
    PENDING: 'En verificación',
    APPROVED: 'Aprobado',
    DECLINED: 'Rechazado',
    VOIDED: 'Anulado',
    ERROR: 'Error',
  } satisfies Record<PaymentStatus, string>,
  serviceStatus: {
    DRAFT: 'Borrador',
    IN_REVIEW: 'En revisión',
    PUBLISHED: 'Publicado',
    REJECTED: 'Rechazado',
    ARCHIVED: 'Archivado',
  } satisfies Record<ServiceStatus, string>,
  cancellationPolicy: {
    FLEXIBLE: 'Flexible',
    MODERATE: 'Moderada',
    STRICT: 'Estricta',
  } satisfies Record<CancellationPolicy, string>,
  providerStatus: {
    PENDING_REVIEW: 'En revisión',
    APPROVED: 'Aprobado',
    SUSPENDED: 'Suspendido',
  } satisfies Record<ProviderStatus, string>,
  role: {
    TOURIST: 'Turista',
    PROVIDER: 'Proveedor',
    SUPPORT: 'Soporte (operativo)',
    ADMIN: 'Administrador',
  } satisfies Record<UserRole, string>,
  documentType: {
    RNT: 'Registro Nacional de Turismo (RNT)',
    RUT: 'RUT',
    CAMARA_COMERCIO: 'Certificado de Cámara de Comercio',
    IDENTIFICACION: 'Documento de identidad del representante',
    POLIZA: 'Póliza de responsabilidad civil',
    OTRO: 'Otro',
  } satisfies Record<ProviderDocumentType, string>,
  pqrType: {
    PETICION: 'Petición',
    QUEJA: 'Queja',
    RECLAMO: 'Reclamo',
    SUGERENCIA: 'Sugerencia',
    DATOS_PERSONALES: 'Solicitud sobre datos personales (Ley 1581 de 2012)',
  } satisfies Record<PqrType, string>,
} as const;
