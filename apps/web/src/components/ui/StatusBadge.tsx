import { LABELS } from '@travelcol/contracts';
import { cn } from '@/lib/cn';

const TONES: Record<string, string> = {
  CONFIRMED: 'bg-selva-100 text-selva-800',
  APPROVED: 'bg-selva-100 text-selva-800',
  PUBLISHED: 'bg-selva-100 text-selva-800',
  COMPLETED: 'bg-selva-100 text-selva-800',
  VERIFIED: 'bg-selva-100 text-selva-800',
  EXECUTED: 'bg-selva-100 text-selva-800',
  PAID: 'bg-selva-100 text-selva-800',
  ACTIVE: 'bg-selva-100 text-selva-800',
  CLOSED: 'bg-selva-100 text-selva-800',
  PENDING_PAYMENT: 'bg-sol-100 text-[#7a5600]',
  PENDING: 'bg-sol-100 text-[#7a5600]',
  PENDING_REVIEW: 'bg-sol-100 text-[#7a5600]',
  IN_REVIEW: 'bg-sol-100 text-[#7a5600]',
  REQUESTED: 'bg-sol-100 text-[#7a5600]',
  CREATED: 'bg-sol-100 text-[#7a5600]',
  DRAFT: 'bg-arena text-pizarra',
  OPEN: 'bg-sol-100 text-[#7a5600]',
  IN_PROGRESS: 'bg-sol-100 text-[#7a5600]',
  CANCELLED: 'bg-red-50 text-bandera-rojo',
  DECLINED: 'bg-red-50 text-bandera-rojo',
  REJECTED: 'bg-red-50 text-bandera-rojo',
  ERROR: 'bg-red-50 text-bandera-rojo',
  VOIDED: 'bg-red-50 text-bandera-rojo',
  SUSPENDED: 'bg-red-50 text-bandera-rojo',
  EXPIRED: 'bg-arena text-pizarra',
  ARCHIVED: 'bg-arena text-pizarra',
  HIDDEN: 'bg-arena text-pizarra',
};

const EXTRA: Record<string, string> = {
  VERIFIED: 'Verificado',
  EXECUTED: 'Ejecutado',
  PAID: 'Pagada',
  ACTIVE: 'Activa',
  REQUESTED: 'Solicitado',
  OPEN: 'Abierto',
  IN_PROGRESS: 'En gestión',
  CLOSED: 'Cerrado',
  HIDDEN: 'Oculta',
  PENDING: 'Pendiente',
};

export function statusLabel(status: string) {
  return (
    (LABELS.bookingStatus as Record<string, string>)[status] ??
    (LABELS.paymentStatus as Record<string, string>)[status] ??
    (LABELS.serviceStatus as Record<string, string>)[status] ??
    (LABELS.providerStatus as Record<string, string>)[status] ??
    EXTRA[status] ??
    status
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', TONES[status] ?? 'bg-arena text-pizarra', className)}>
      {statusLabel(status)}
    </span>
  );
}
