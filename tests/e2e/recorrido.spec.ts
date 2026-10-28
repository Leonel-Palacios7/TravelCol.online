import { expect, test } from '@playwright/test';
import { DEMO, SERVICE_SLUG, bookFirstSlot, captureWompiCheckout, dbQuery, login, logout, sendSignedWompiEvent } from './helpers';

/**
 * Recorrido principal del MVP (criterios de aceptación de la sección 20 del documento maestro):
 * explorar → registrarse → verificar correo → reservar → pagar (Wompi simulado + webhook firmado)
 * → confirmación → proveedor ve la reserva → administración ve pago, evento y liquida.
 */
test.describe.serial('Recorrido completo turista → proveedor → administración', () => {
  const email = `e2e-${Date.now()}@prueba.test`;
  const password = 'Clave-E2E-2026';
  let bookingId = '';
  let reference = '';

  test('1-2. un visitante explora el catálogo y ve el detalle con datos de demostración identificados', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByRole('link', { name: 'Experiencias' }).first().click();
    await expect(page).toHaveURL(/\/experiencias/);
    await page.goto(`/experiencias/${SERVICE_SLUG}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Salto de los Micos/i);
    await expect(page.getByText(/demostración/i).first()).toBeVisible();
  });

  test('3-4. se registra como turista y verifica su correo con el enlace de un solo uso', async ({ page }) => {
    await page.goto('/registro');
    await page.getByLabel('Nombre completo').fill('Turista E2E');
    await page.getByLabel('Correo electrónico').fill(email);
    await page.getByLabel('Contraseña').fill(password);
    await page.getByLabel(/Acepto los/).check();
    await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
    await page.waitForURL(/\/cuenta/);
    await expect(page.getByText(/Verifica tu correo/)).toBeVisible();

    const [mail] = await dbQuery<{ payload: { link: string } }>(
      `SELECT payload FROM email_outbox WHERE to_email = $1 AND template = 'EMAIL_VERIFICATION' ORDER BY created_at DESC LIMIT 1`,
      [email],
    );
    const link = new URL(mail!.payload.link);
    await page.goto(`${link.pathname}${link.search}`);
    await expect(page.getByRole('status')).toBeVisible();
    await page.goto('/cuenta');
    await expect(page.getByText(/Verifica tu correo/)).toHaveCount(0);
  });

  test('5-6. reserva una fecha y ve el precio calculado por el servidor y el tiempo de retención', async ({ page }) => {
    await login(page, email, password);
    bookingId = await bookFirstSlot(page, ['Ana Prueba', 'Luis Prueba']);
    await expect(page.getByText('Pendiente de pago')).toBeVisible();
    await expect(page.getByText(/Guardamos tu cupo por/)).toBeVisible();
    const [b] = await dbQuery<{ total_cop: number; status: string; participants_count: number }>('SELECT total_cop, status, participants_count FROM bookings WHERE id = $1', [bookingId]);
    expect(b!.status).toBe('PENDING_PAYMENT');
    expect(b!.participants_count).toBe(2);
    await expect(page.getByText(new RegExp(`Pagar .*${new Intl.NumberFormat('es-CO').format(b!.total_cop)}`))).toBeVisible();
  });

  test('7. inicia el pago: Wompi recibe referencia única, monto en centavos y firma de integridad', async ({ page }) => {
    await login(page, email, password);
    await page.goto(`/reservas/${bookingId}/pago`);
    const params = await captureWompiCheckout(page);
    reference = params.get('reference')!;
    const [b] = await dbQuery<{ total_cop: number }>('SELECT total_cop FROM bookings WHERE id = $1', [bookingId]);
    expect(params.get('currency')).toBe('COP');
    expect(Number(params.get('amount-in-cents'))).toBe(b!.total_cop * 100);
    expect(params.get('signature:integrity')).toMatch(/^[a-f0-9]{64}$/);
    expect(params.get('public-key')).toMatch(/^pub_test_/);
    expect(params.toString()).not.toMatch(/prv_|integrity_E2E|events_E2E/);
    expect(params.get('redirect-url')).toContain(`/reservas/${bookingId}/pago?pago=`);
  });

  test('8. un parámetro de la URL no confirma la reserva; solo el webhook firmado lo hace', async ({ page }) => {
    await login(page, email, password);
    const [p] = await dbQuery<{ id: string; amount_in_cents: string }>('SELECT id, amount_in_cents FROM payments WHERE reference = $1', [reference]);
    // El navegador vuelve con un "status=APPROVED" falsificado: no debe tener efecto.
    await page.goto(`/reservas/${bookingId}/pago?pago=${p!.id}&id=falso-123&status=APPROVED`);
    await page.waitForTimeout(2_000);
    let [b] = await dbQuery<{ status: string }>('SELECT status FROM bookings WHERE id = $1', [bookingId]);
    expect(b!.status).toBe('PENDING_PAYMENT');

    // Evento con firma inválida: rechazado y sin efecto.
    const forged = await sendSignedWompiEvent({ reference, status: 'APPROVED', amountInCents: Number(p!.amount_in_cents) }, 'secreto-incorrecto');
    expect(forged.status).toBe(401);
    [b] = await dbQuery<{ status: string }>('SELECT status FROM bookings WHERE id = $1', [bookingId]);
    expect(b!.status).toBe('PENDING_PAYMENT');

    // Evento auténtico (firmado con el secreto de eventos de E2E): confirma.
    const ok = await sendSignedWompiEvent({ reference, status: 'APPROVED', amountInCents: Number(p!.amount_in_cents) });
    expect(ok.status).toBe(200);
    expect(ok.body.outcome).toBe('PROCESSED');
    await page.goto(`/reservas/${bookingId}/pago?pago=${p!.id}&id=${ok.transactionId}`);
    await expect(page.getByText('¡Pago aprobado y reserva confirmada!')).toBeVisible();
    await page.goto(`/cuenta/reservas/${bookingId}`);
    await expect(page.getByText('Confirmada').first()).toBeVisible();
  });

  test('9. el proveedor ve la reserva confirmada con su liquidación neta', async ({ page }) => {
    await login(page, DEMO.provider.email, DEMO.provider.password);
    await page.goto('/proveedor/reservas?scope=all');
    const [b] = await dbQuery<{ code: string }>('SELECT code FROM bookings WHERE id = $1', [bookingId]);
    const card = page.locator('article', { hasText: b!.code });
    await expect(card).toBeVisible();
    await expect(card.getByText('Turista E2E')).toBeVisible();
    await expect(card.getByText(/Neto/)).toBeVisible();
    await page.goto('/proveedor/finanzas');
    await expect(page.getByText(new RegExp(`Venta ${b!.code}`))).toBeVisible();
  });

  test('10. administración ve el pago, los eventos (válido e inválido) y el saldo pendiente del proveedor', async ({ page }) => {
    await login(page, DEMO.admin.email, DEMO.admin.password);
    await page.goto('/admin/pagos');
    await expect(page.getByText(reference)).toBeVisible();
    await page.goto('/admin/pagos?tab=eventos');
    await expect(page.getByText('Inválida').first()).toBeVisible();
    await expect(page.getByText('Válida').first()).toBeVisible();

    // La reserva es futura: su saldo aparece como "servicios por prestar" y aún no es liquidable
    // (la generación y el pago de liquidaciones están cubiertos en las pruebas de integración).
    await page.goto('/admin/liquidaciones');
    const row = page.locator('tr', { hasText: 'Experiencias Villeta (DEMO)' }).first();
    await expect(row).toBeVisible();
    const [pending] = await dbQuery<{ sum: string }>(
      `SELECT COALESCE(SUM(l.amount_cop),0) AS sum FROM ledger_entries l JOIN bookings b ON b.id = l.booking_id WHERE l.settlement_id IS NULL AND b.id = $1`,
      [bookingId],
    );
    expect(Number(pending!.sum)).toBeGreaterThan(0);

    // Configuración: la comisión vigente se muestra y SUPPORT no ve la sección (verificado en API).
    await page.goto('/admin/configuracion');
    await expect(page.getByText(/Comisión de la plataforma/)).toBeVisible();
    await logout(page);
  });
});
