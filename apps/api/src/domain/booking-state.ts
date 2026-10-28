import type { BookingStatus } from '@prisma/client';

/** Máquina de estados de reservas. Ninguna transición se acepta desde el frontend directamente. */
export const BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED', 'EXPIRED'],
  CONFIRMED: ['CANCELLED', 'COMPLETED'],
  // Un pago aprobado tardío puede rescatar una reserva expirada si aún hay cupo.
  EXPIRED: ['CONFIRMED'],
  CANCELLED: [],
  COMPLETED: [],
};

export function canTransitionBooking(from: BookingStatus, to: BookingStatus): boolean {
  return BOOKING_TRANSITIONS[from].includes(to);
}

/** Estados que ocupan cupo de inventario. */
export const HOLDS_INVENTORY: readonly BookingStatus[] = ['PENDING_PAYMENT', 'CONFIRMED'];
