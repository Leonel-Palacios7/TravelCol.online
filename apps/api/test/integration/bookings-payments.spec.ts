import { createHash } from 'node:crypto';
import {
  bookingBody, createProvider, createService, createTestApp, createUser, login, paidBooking, sendWebhook, TestCtx, uniq, wompiEvent,
} from './helpers';

let ctx: TestCtx;
beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => ctx.close());

async function setup(opts: Parameters<typeof createService>[2] = {}) {
  const { provider, user: providerUser } = await createProvider(ctx.prisma);
  const { service, slot } = await createService(ctx.prisma, provider.id, opts);
  const tourist = await createUser(ctx.prisma);
  const tc = await login(ctx.app, tourist.email);
  return { provider, providerUser, service, slot, tourist, tc };
}

describe('Reservas e inventario', () => {
  it('calcula el precio en el servidor e ignora/rechaza importes enviados por el cliente', async () => {
    const { slot, tc } = await setup({ priceCop: 85_000 });
    const tampered = await tc.post('/bookings', { ...bookingBody(slot.id, 2), totalCop: 1, priceCop: 1 });
    expect(tampered.status).toBe(400);
    const ok = await tc.post('/bookings', bookingBody(slot.id, 2));
    expect(ok.status).toBe(201);
    expect(ok.body.price).toEqual({ unitPriceCop: 85_000, participants: 2, subtotalCop: 170_000, feesCop: 0, totalCop: 170_000, currency: 'COP' });
    const db = await ctx.prisma.booking.findUniqueOrThrow({ where: { id: ok.body.id } });
    expect(db.commissionBps).toBe(1200);
    expect(db.commissionCop).toBe(20_400);
    expect(db.providerNetCop).toBe(149_600);
  });

  it('la instantánea de precio no cambia si el proveedor modifica el catálogo', async () => {
    const { slot, service, tc } = await setup({ priceCop: 40_000 });
    const b = await tc.post('/bookings', bookingBody(slot.id, 1));
    await ctx.prisma.tourismService.update({ where: { id: service.id }, data: { priceCop: 99_000 } });
    const again = await tc.get(`/bookings/${b.body.id}`);
    expect(again.body.price.totalCop).toBe(40_000);
  });

  it('impide reservar más cupos de los disponibles', async () => {
    const { slot, tc } = await setup({ capacity: 3 });
    expect((await tc.post('/bookings', bookingBody(slot.id, 2))).status).toBe(201);
    const over = await tc.post('/bookings', bookingBody(slot.id, 2));
    expect(over.status).toBe(409);
  });

  it('CONCURRENCIA: 12 solicitudes simultáneas por el último cupo producen exactamente 1 reserva', async () => {
    const { slot } = await setup({ capacity: 1 });
    const clients = await Promise.all(Array.from({ length: 12 }, async () => login(ctx.app, (await createUser(ctx.prisma)).email)));
    const results = await Promise.all(clients.map((c) => c.post('/bookings', bookingBody(slot.id, 1))));
    const created = results.filter((r) => r.status === 201);
    const rejected = results.filter((r) => r.status === 409);
    expect(created).toHaveLength(1);
    expect(rejected).toHaveLength(11);
    const fresh = await ctx.prisma.serviceAvailability.findUniqueOrThrow({ where: { id: slot.id } });
    expect(fresh.reservedCount).toBe(1);
    expect(await ctx.prisma.booking.count({ where: { availabilityId: slot.id } })).toBe(1);
  });

  it('la base de datos rechaza reservedCount > capacity aunque se salte la aplicación (CHECK)', async () => {
    const { slot } = await setup({ capacity: 2 });
    await expect(ctx.prisma.serviceAvailability.update({ where: { id: slot.id }, data: { reservedCount: 3 } })).rejects.toThrow();
  });

  it('las reservas pendientes vencidas expiran y liberan el cupo', async () => {
    const { slot, tc } = await setup({ capacity: 2 });
    const b = await tc.post('/bookings', bookingBody(slot.id, 2));
    await ctx.prisma.booking.update({ where: { id: b.body.id }, data: { holdExpiresAt: new Date(Date.now() - 1000) } });
    const { BookingsService } = await import('../../src/modules/bookings/bookings.service');
    const n = await ctx.app.get(BookingsService).expireHolds();
    expect(n).toBeGreaterThanOrEqual(1);
    const booking = await ctx.prisma.booking.findUniqueOrThrow({ where: { id: b.body.id }, include: { statusHistory: true } });
    expect(booking.status).toBe('EXPIRED');
    expect(booking.statusHistory.map((h) => h.toStatus)).toEqual(expect.arrayContaining(['PENDING_PAYMENT', 'EXPIRED']));
    expect((await ctx.prisma.serviceAvailability.findUniqueOrThrow({ where: { id: slot.id } })).reservedCount).toBe(0);
    // Checkout sobre reserva vencida es rechazado.
    expect((await tc.post(`/bookings/${b.body.id}/checkout`)).status).toBe(409);
  });

  it('cancelar una reserva pendiente libera el cupo sin reembolso', async () => {
    const { slot, tc } = await setup({ capacity: 2 });
    const b = await tc.post('/bookings', bookingBody(slot.id, 2));
    const res = await tc.post(`/bookings/${b.body.id}/cancel`, { reason: 'Cambio de planes' });
    expect(res.body).toMatchObject({ status: 'CANCELLED', refundPercent: 0 });
    expect((await ctx.prisma.serviceAvailability.findUniqueOrThrow({ where: { id: slot.id } })).reservedCount).toBe(0);
  });

  it('un proveedor no puede reservar sus propios servicios', async () => {
    const { slot, providerUser } = await setup();
    const pc = await login(ctx.app, providerUser.email);
    expect((await pc.post('/bookings', bookingBody(slot.id, 1))).status).toBe(403);
  });
});

describe('Pagos Wompi', () => {
  it('checkout genera referencia única y firma de integridad correcta', async () => {
    const { slot, tc } = await setup({ priceCop: 50_000 });
    const b = await tc.post('/bookings', bookingBody(slot.id, 2));
    const co = await tc.post(`/bookings/${b.body.id}/checkout`);
    expect(co.status).toBe(201);
    const p = co.body.params;
    expect(p['amount-in-cents']).toBe('10000000');
    expect(p.currency).toBe('COP');
    const expected = createHash('sha256').update(`${p.reference}${p['amount-in-cents']}COP${process.env.WOMPI_INTEGRITY_SECRET}`).digest('hex');
    expect(p['signature:integrity']).toBe(expected);
    expect(JSON.stringify(co.body)).not.toContain(process.env.WOMPI_INTEGRITY_SECRET!);
    expect(JSON.stringify(co.body)).not.toContain(process.env.WOMPI_PRIVATE_KEY!);
    const co2 = await tc.post(`/bookings/${b.body.id}/checkout`);
    expect(co2.body.reference).not.toBe(co.body.reference);
  });

  it('evento válido APPROVED confirma la reserva y registra venta y comisión una sola vez (idempotencia)', async () => {
    const { slot, tc, provider } = await setup({ priceCop: 60_000 });
    const r = await paidBooking(ctx, tc, slot.id, 2);
    const booking = await ctx.prisma.booking.findUniqueOrThrow({ where: { id: r.bookingId } });
    expect(booking.status).toBe('CONFIRMED');
    const ledger = await ctx.prisma.ledgerEntry.findMany({ where: { bookingId: r.bookingId } });
    expect(ledger.map((l) => [l.type, l.amountCop]).sort()).toEqual([['COMMISSION', -14_400], ['SALE', 120_000]]);

    // Reenvío del MISMO evento (reintento de Wompi) → duplicado sin efectos.
    const ev = wompiEvent({ id: r.txId, reference: r.reference, status: 'APPROVED', amount_in_cents: r.amount }, { timestamp: 1_800_000_000 });
    expect((await sendWebhook(ctx.app, ev)).body.outcome).toBe('DUPLICATE'); // mismo estado ya aplicado
    expect((await sendWebhook(ctx.app, ev)).body.outcome).toBe('DUPLICATE'); // evento idéntico ya registrado
    expect(await ctx.prisma.ledgerEntry.count({ where: { bookingId: r.bookingId } })).toBe(2);
    expect(await ctx.prisma.payment.count({ where: { bookingId: r.bookingId, status: 'APPROVED' } })).toBe(1);

    // El proveedor ve la reserva en su panel y el turista ve la confirmación.
    const pc = await login(ctx.app, (await ctx.prisma.user.findFirstOrThrow({ where: { provider: { id: provider.id } } })).email);
    const pb = await pc.get('/providers/me/bookings?scope=upcoming');
    expect(pb.body.map((b: { id: string }) => b.id)).toContain(r.bookingId);
    expect((await tc.get(`/bookings/${r.bookingId}`)).body.status).toBe('CONFIRMED');
  });

  it('evento con firma inválida se registra como evidencia y no modifica nada', async () => {
    const { slot, tc } = await setup();
    const b = await tc.post('/bookings', bookingBody(slot.id, 1));
    const co = await tc.post(`/bookings/${b.body.id}/checkout`);
    const ev = wompiEvent({ id: `tx-${uniq()}`, reference: co.body.reference, status: 'APPROVED', amount_in_cents: Number(co.body.params['amount-in-cents']) }, { secret: 'secreto-falso' });
    const res = await sendWebhook(ctx.app, ev);
    expect(res.status).toBe(401);
    expect(res.body.outcome).toBe('INVALID_SIGNATURE');
    expect((await ctx.prisma.booking.findUniqueOrThrow({ where: { id: b.body.id } })).status).toBe('PENDING_PAYMENT');
    const stored = await ctx.prisma.paymentWebhookEvent.findFirst({ where: { reference: co.body.reference } });
    expect(stored?.signatureValid).toBe(false);
  });

  it('un parámetro del navegador status=APPROVED no confirma nada (no existe esa vía)', async () => {
    const { slot, tc } = await setup();
    const b = await tc.post('/bookings', bookingBody(slot.id, 1));
    const co = await tc.post(`/bookings/${b.body.id}/checkout`);
    await tc.get(`/payments/${co.body.paymentId}?status=APPROVED`);
    expect((await ctx.prisma.booking.findUniqueOrThrow({ where: { id: b.body.id } })).status).toBe('PENDING_PAYMENT');
  });

  it('importe manipulado en el evento → discrepancia, sin confirmar', async () => {
    const { slot, tc } = await setup();
    const b = await tc.post('/bookings', bookingBody(slot.id, 1));
    const co = await tc.post(`/bookings/${b.body.id}/checkout`);
    const ev = wompiEvent({ id: `tx-${uniq()}`, reference: co.body.reference, status: 'APPROVED', amount_in_cents: 100 });
    const res = await sendWebhook(ctx.app, ev);
    expect(res.body.outcome).toBe('MISMATCH');
    const booking = await ctx.prisma.booking.findUniqueOrThrow({ where: { id: b.body.id } });
    expect(booking.status).toBe('PENDING_PAYMENT');
    expect(booking.needsAttention).toBe(true);
  });

  it('pago rechazado deja la reserva pendiente y permite reintentar', async () => {
    const { slot, tc } = await setup();
    const b = await tc.post('/bookings', bookingBody(slot.id, 1));
    const co = await tc.post(`/bookings/${b.body.id}/checkout`);
    const ev = wompiEvent({ id: `tx-${uniq()}`, reference: co.body.reference, status: 'DECLINED', amount_in_cents: Number(co.body.params['amount-in-cents']) });
    expect((await sendWebhook(ctx.app, ev)).body.outcome).toBe('PROCESSED');
    expect((await ctx.prisma.payment.findUniqueOrThrow({ where: { id: co.body.paymentId } })).status).toBe('DECLINED');
    expect((await ctx.prisma.booking.findUniqueOrThrow({ where: { id: b.body.id } })).status).toBe('PENDING_PAYMENT');
    expect((await tc.post(`/bookings/${b.body.id}/checkout`)).status).toBe(201);
  });

  it('eventos fuera de orden: PENDING después de APPROVED no retrocede el estado', async () => {
    const { slot, tc } = await setup();
    const r = await paidBooking(ctx, tc, slot.id, 1);
    const late = wompiEvent({ id: r.txId, reference: r.reference, status: 'PENDING', amount_in_cents: r.amount });
    expect((await sendWebhook(ctx.app, late)).body.outcome).toBe('STALE');
    expect((await ctx.prisma.payment.findUniqueOrThrow({ where: { id: r.paymentId } })).status).toBe('APPROVED');
  });

  it('pago pendiente (PENDING) no confirma la reserva', async () => {
    const { slot, tc } = await setup();
    const b = await tc.post('/bookings', bookingBody(slot.id, 1));
    const co = await tc.post(`/bookings/${b.body.id}/checkout`);
    const ev = wompiEvent({ id: `tx-${uniq()}`, reference: co.body.reference, status: 'PENDING', amount_in_cents: Number(co.body.params['amount-in-cents']) });
    await sendWebhook(ctx.app, ev);
    expect((await ctx.prisma.booking.findUniqueOrThrow({ where: { id: b.body.id } })).status).toBe('PENDING_PAYMENT');
  });

  it('referencia desconocida se registra y no rompe nada', async () => {
    const ev = wompiEvent({ id: `tx-${uniq()}`, reference: 'NO-EXISTE', status: 'APPROVED', amount_in_cents: 100 });
    const res = await sendWebhook(ctx.app, ev);
    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe('UNKNOWN_REFERENCE');
  });

  it('pago aprobado tardío: si hay cupo se confirma; si no, se genera reembolso y alerta', async () => {
    const { slot, tc } = await setup({ capacity: 1 });
    const b = await tc.post('/bookings', bookingBody(slot.id, 1));
    const co = await tc.post(`/bookings/${b.body.id}/checkout`);
    await ctx.prisma.booking.update({ where: { id: b.body.id }, data: { holdExpiresAt: new Date(Date.now() - 1000) } });
    const { BookingsService } = await import('../../src/modules/bookings/bookings.service');
    await ctx.app.get(BookingsService).expireHolds();
    // Otro turista toma el único cupo.
    const other = await login(ctx.app, (await createUser(ctx.prisma)).email);
    expect((await other.post('/bookings', bookingBody(slot.id, 1))).status).toBe(201);
    const ev = wompiEvent({ id: `tx-${uniq()}`, reference: co.body.reference, status: 'APPROVED', amount_in_cents: Number(co.body.params['amount-in-cents']) });
    await sendWebhook(ctx.app, ev);
    const booking = await ctx.prisma.booking.findUniqueOrThrow({ where: { id: b.body.id } });
    expect(booking.status).toBe('EXPIRED');
    expect(booking.needsAttention).toBe(true);
    const refund = await ctx.prisma.refund.findFirst({ where: { bookingId: b.body.id } });
    expect(refund).toMatchObject({ status: 'REQUESTED', refundPercent: 100 });
    expect((await ctx.prisma.serviceAvailability.findUniqueOrThrow({ where: { id: slot.id } })).reservedCount).toBe(1);
  });
});

describe('Cancelación, reembolso y liquidación', () => {
  it('cancelación con política MODERATE a >72 h → reembolso 100 %; ADMIN lo registra y el libro se ajusta', async () => {
    const { slot, tc, provider } = await setup({ priceCop: 100_000, policy: 'MODERATE', startsInHours: 24 * 10 });
    const r = await paidBooking(ctx, tc, slot.id, 1);
    const cancel = await tc.post(`/bookings/${r.bookingId}/cancel`, { reason: 'Enfermedad' });
    expect(cancel.body).toMatchObject({ status: 'CANCELLED', refundPercent: 100, refundAmountCop: 100_000 });
    const refund = await ctx.prisma.refund.findFirstOrThrow({ where: { bookingId: r.bookingId } });
    const admin = await login(ctx.app, (await createUser(ctx.prisma, 'ADMIN')).email);
    const missingRef = await admin.post(`/admin/refunds/${refund.id}/decision`, { decision: 'MARK_EXECUTED', notes: 'Ejecutado en Wompi' });
    expect(missingRef.status).toBe(400);
    const done = await admin.post(`/admin/refunds/${refund.id}/decision`, { decision: 'MARK_EXECUTED', notes: 'Ejecutado en Wompi', externalReference: 'WOMPI-REF-1' });
    expect(done.status).toBe(200);
    const again = await admin.post(`/admin/refunds/${refund.id}/decision`, { decision: 'MARK_EXECUTED', notes: 'Doble', externalReference: 'X' });
    expect(again.status).toBe(409);
    const sum = await ctx.prisma.ledgerEntry.aggregate({ where: { providerId: provider.id }, _sum: { amountCop: true } });
    expect(sum._sum.amountCop).toBe(0); // venta − comisión − reembolso + reversión = 0
  });

  it('cancelación con política ESTRICTA a < 7 días → sin reembolso', async () => {
    const { slot, tc } = await setup({ policy: 'STRICT', startsInHours: 48 });
    const r = await paidBooking(ctx, tc, slot.id, 1);
    const cancel = await tc.post(`/bookings/${r.bookingId}/cancel`, { reason: 'Cambio de planes' });
    expect(cancel.body.refundPercent).toBe(0);
    expect(await ctx.prisma.refund.count({ where: { bookingId: r.bookingId } })).toBe(0);
  });

  it('cancelación por el proveedor → reembolso del 100 %', async () => {
    const { slot, tc, providerUser } = await setup({ policy: 'STRICT', startsInHours: 30 });
    const r = await paidBooking(ctx, tc, slot.id, 1);
    const pc = await login(ctx.app, providerUser.email);
    const res = await pc.post(`/providers/me/bookings/${r.bookingId}/cancel`, { reason: 'Lluvias fuertes en la zona' });
    expect(res.body.refundPercent).toBe(100);
  });

  it('liquidación: agrupa saldo positivo, registra el pago con referencia y deja el saldo pendiente en cero', async () => {
    const { slot, tc, provider } = await setup({ priceCop: 50_000, startsInHours: 24 * 3 });
    await paidBooking(ctx, tc, slot.id, 2);
    // Simula que la experiencia ya ocurrió moviendo la fecha (prueba de corte).
    await ctx.prisma.booking.updateMany({ where: { providerId: provider.id }, data: { startsAt: new Date(Date.now() - 86_400_000) } });
    const admin = await login(ctx.app, (await createUser(ctx.prisma, 'ADMIN')).email);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
    const s = await admin.post('/admin/settlements', { providerId: provider.id, periodEnd: today });
    expect(s.status).toBe(201);
    expect(s.body).toMatchObject({ grossCop: 100_000, commissionCop: 12_000, refundsCop: 0, netCop: 88_000, status: 'DRAFT' });
    const pay = await admin.post(`/admin/settlements/${s.body.id}/pay`, { payoutReference: 'TRANSF-0001' });
    expect(pay.status).toBe(200);
    const unsettled = await ctx.prisma.ledgerEntry.aggregate({ where: { providerId: provider.id, settlementId: null }, _sum: { amountCop: true } });
    expect(unsettled._sum.amountCop ?? 0).toBe(0);
    const total = await ctx.prisma.ledgerEntry.aggregate({ where: { providerId: provider.id }, _sum: { amountCop: true } });
    expect(total._sum.amountCop).toBe(0);
    expect((await admin.post('/admin/settlements', { providerId: provider.id, periodEnd: today })).status).toBe(409);
  });

  it('el libro contable es de solo inserción (trigger en BD)', async () => {
    const entry = await ctx.prisma.ledgerEntry.findFirstOrThrow();
    await expect(ctx.prisma.ledgerEntry.delete({ where: { id: entry.id } })).rejects.toThrow();
    await expect(ctx.prisma.ledgerEntry.update({ where: { id: entry.id }, data: { amountCop: 1 } })).rejects.toThrow();
  });

  it('las reseñas solo se permiten sobre reservas completadas y una vez', async () => {
    const { slot, tc } = await setup({ startsInHours: 24 * 3 });
    const r = await paidBooking(ctx, tc, slot.id, 1);
    expect((await tc.post(`/bookings/${r.bookingId}/review`, { rating: 5, comment: 'Excelente experiencia, muy recomendada.' })).status).toBe(409);
    await ctx.prisma.booking.update({ where: { id: r.bookingId }, data: { status: 'COMPLETED' } });
    expect((await tc.post(`/bookings/${r.bookingId}/review`, { rating: 5, comment: 'Excelente experiencia, muy recomendada.' })).status).toBe(201);
    expect((await tc.post(`/bookings/${r.bookingId}/review`, { rating: 4, comment: 'Intento duplicado de reseña aquí.' })).status).toBe(409);
  });
});
