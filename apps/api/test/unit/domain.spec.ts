import { createHash } from 'node:crypto';
import { quote, refundSplit } from '../../src/domain/pricing';
import { canTransitionBooking } from '../../src/domain/booking-state';
import { canTransitionPayment, mapWompiStatus } from '../../src/domain/payment-state';
import { eventChecksum, integritySignature, verifyEventChecksum } from '../../src/domain/wompi-signature';
import { detectFileType } from '../../src/modules/storage/file-validation';
import { bogotaDayRange, bogotaLocalToUtc } from '../../src/common/time';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

describe('Precios y comisiones', () => {
  it('calcula subtotal, comisión y neto con enteros', () => {
    expect(quote(85_000, 3, 1200)).toEqual({
      unitPriceCop: 85_000, participants: 3, subtotalCop: 255_000, feesCop: 0, totalCop: 255_000,
      commissionBps: 1200, commissionCop: 30_600, providerNetCop: 224_400,
    });
  });
  it('redondea la comisión half-up a peso', () => {
    expect(quote(33_333, 1, 1250).commissionCop).toBe(4_167);
  });
  it('rechaza precios o participantes inválidos', () => {
    expect(() => quote(0, 1, 1000)).toThrow();
    expect(() => quote(1000.5, 1, 1000)).toThrow();
    expect(() => quote(1000, 0, 1000)).toThrow();
  });
  it('reparto proporcional del reembolso', () => {
    expect(refundSplit({ subtotalCop: 100_000, totalCop: 100_000, commissionCop: 12_000 }, 50)).toEqual({
      refundTotalCop: 50_000, providerRefundCop: 50_000, commissionReversalCop: 6_000,
    });
    expect(() => refundSplit({ subtotalCop: 1, totalCop: 1, commissionCop: 0 }, 101)).toThrow();
  });
});

describe('Máquinas de estado', () => {
  it('reservas: transiciones válidas e inválidas', () => {
    expect(canTransitionBooking('PENDING_PAYMENT', 'CONFIRMED')).toBe(true);
    expect(canTransitionBooking('CONFIRMED', 'PENDING_PAYMENT')).toBe(false);
    expect(canTransitionBooking('CANCELLED', 'CONFIRMED')).toBe(false);
    expect(canTransitionBooking('COMPLETED', 'CANCELLED')).toBe(false);
    expect(canTransitionBooking('EXPIRED', 'CONFIRMED')).toBe(true);
  });
  it('pagos: un estado final no retrocede', () => {
    expect(canTransitionPayment('PENDING', 'APPROVED')).toBe(true);
    expect(canTransitionPayment('APPROVED', 'PENDING')).toBe(false);
    expect(canTransitionPayment('DECLINED', 'APPROVED')).toBe(false);
    expect(canTransitionPayment('APPROVED', 'VOIDED')).toBe(true);
    expect(mapWompiStatus('APPROVED')).toBe('APPROVED');
    expect(mapWompiStatus('FOO')).toBeNull();
  });
});

describe('Firmas Wompi', () => {
  it('firma de integridad = SHA256(referencia + centavos + moneda + secreto)', () => {
    expect(integritySignature('TC-ABC-1', 2_490_000, 'COP', 'test_integrity_x')).toBe(sha('TC-ABC-12490000COPtest_integrity_x'));
  });
  it('checksum de eventos reproduce el ejemplo de la documentación oficial', () => {
    const event = {
      event: 'transaction.updated',
      data: { transaction: { id: '1234-1610641025-49201', status: 'APPROVED', amount_in_cents: 4490000 } },
      signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'], checksum: '' },
      timestamp: 1530291411,
    };
    const secret = 'prod_events_OcHnIzeBl5socpwByQ4hA52Em3USQ93Z';
    const expected = sha('1234-1610641025-49201APPROVED44900001530291411prod_events_OcHnIzeBl5socpwByQ4hA52Em3USQ93Z');
    expect(eventChecksum(event, secret)).toBe(expected);
    event.signature.checksum = expected;
    expect(verifyEventChecksum(event, secret)).toBe(true);
    expect(verifyEventChecksum(event, 'otro')).toBe(false);
    expect(verifyEventChecksum(event, secret, 'a'.repeat(64))).toBe(false);
    expect(verifyEventChecksum({ ...event, data: { transaction: { ...event.data.transaction, amount_in_cents: 1 } } }, secret)).toBe(false);
  });
  it('rechaza propiedades malformadas', () => {
    expect(eventChecksum({ event: 'x', data: {}, signature: { properties: ['__proto__.x'] }, timestamp: 1 }, 's')).toBeNull();
    expect(verifyEventChecksum({ event: 'x', data: {} }, '')).toBe(false);
  });
});

describe('Archivos y fechas', () => {
  it('detecta el tipo real por firma', () => {
    expect(detectFileType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))?.mime).toBe('image/jpeg');
    expect(detectFileType(Buffer.from('%PDF-1.7 xxxxxxx'))?.mime).toBe('application/pdf');
    expect(detectFileType(Buffer.from('GIF89a......'))).toBeNull();
  });
  it('convierte hora de Colombia (UTC-5) a UTC', () => {
    expect(bogotaLocalToUtc('2026-12-24T08:00').toISOString()).toBe('2026-12-24T13:00:00.000Z');
    const r = bogotaDayRange('2026-12-24');
    expect(r.from.toISOString()).toBe('2026-12-24T05:00:00.000Z');
    expect(r.to.toISOString()).toBe('2026-12-25T05:00:00.000Z');
  });
});
