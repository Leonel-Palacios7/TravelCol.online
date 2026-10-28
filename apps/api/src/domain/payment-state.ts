import type { PaymentStatus } from '@prisma/client';

/**
 * Máquina de estados de pagos. Los eventos pueden llegar repetidos o fuera de orden:
 * un estado final nunca retrocede a PENDING y un pago aprobado solo puede pasar a VOIDED.
 */
const TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  CREATED: ['PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR'],
  PENDING: ['APPROVED', 'DECLINED', 'VOIDED', 'ERROR'],
  APPROVED: ['VOIDED'],
  DECLINED: [],
  VOIDED: [],
  ERROR: [],
};

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function mapWompiStatus(status: string): PaymentStatus | null {
  switch (status) {
    case 'APPROVED':
      return 'APPROVED';
    case 'DECLINED':
      return 'DECLINED';
    case 'VOIDED':
      return 'VOIDED';
    case 'ERROR':
      return 'ERROR';
    case 'PENDING':
      return 'PENDING';
    default:
      return null;
  }
}
