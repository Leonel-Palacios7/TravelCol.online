import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyBps, refundPercentFor, registerSchema, colombianPhone, toCents } from './index';

test('applyBps redondea a peso entero sin flotantes', () => {
  assert.equal(applyBps(150_000, 1200), 18_000);
  assert.equal(applyBps(99_999, 1250), 12_500);
  assert.equal(applyBps(1, 5000), 1);
  assert.throws(() => applyBps(10.5, 100));
});

test('toCents convierte pesos a centavos', () => {
  assert.equal(toCents(85_000), 8_500_000);
  assert.throws(() => toCents(-1));
});

test('política MODERATE: 100/50/0', () => {
  assert.equal(refundPercentFor('MODERATE', 80), 100);
  assert.equal(refundPercentFor('MODERATE', 30), 50);
  assert.equal(refundPercentFor('MODERATE', 2), 0);
  assert.equal(refundPercentFor('STRICT', 200), 50);
  assert.equal(refundPercentFor('FLEXIBLE', 23.9), 0);
});

test('registro rechaza campos extra como role (no elevación de privilegios)', () => {
  const r = registerSchema.safeParse({
    fullName: 'Ana Pérez',
    email: 'ANA@example.com',
    password: 'clave-segura-123',
    acceptTerms: true,
    role: 'ADMIN',
  });
  assert.equal(r.success, false);
});

test('teléfono colombiano', () => {
  assert.equal(colombianPhone.parse('+57 300 123 4567'), '+573001234567');
  assert.equal(colombianPhone.safeParse('12345').success, false);
});
