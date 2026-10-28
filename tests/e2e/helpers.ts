import { createHash, randomUUID } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
import { Client } from 'pg';

export const API = 'http://localhost:4000/api/v1';
export const DEMO = {
  admin: { email: 'admin@travelcol.local', password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin-TravelCol-2026' },
  provider: { email: 'proveedor.demo@travelcol.local', password: 'Demo-TravelCol-2026' },
  tourist: { email: 'turista.demo@travelcol.local', password: 'Demo-TravelCol-2026' },
};
export const SERVICE_SLUG = 'demo-caminata-salto-de-los-micos';

/** Lectura puntual de la base E2E (enlaces del buzón de salida y estados). Nunca escribe. */
export async function dbQuery<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(sql, params)).rows as T[];
  } finally {
    await client.end();
  }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto('/ingresar');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/ingresar'));
}

export async function logout(page: Page) {
  await page.context().clearCookies();
}

/** Evento transaction.updated firmado como lo hace Wompi (checksum SHA-256 sobre properties+timestamp+secreto). */
export async function sendSignedWompiEvent(tx: { reference: string; status: string; amountInCents: number; id?: string }, secret = process.env.WOMPI_EVENTS_SECRET!) {
  const timestamp = Math.floor(Date.now() / 1000);
  const transaction = { id: tx.id ?? `e2e-${randomUUID().slice(0, 10)}`, reference: tx.reference, status: tx.status, amount_in_cents: tx.amountInCents, currency: 'COP', payment_method_type: 'CARD' };
  const checksum = createHash('sha256').update(`${transaction.id}${transaction.status}${transaction.amount_in_cents}${timestamp}${secret}`).digest('hex');
  const body = { event: 'transaction.updated', data: { transaction }, environment: 'test', signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'], checksum }, timestamp, sent_at: new Date().toISOString() };
  const res = await fetch(`${API}/webhooks/wompi`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Event-Checksum': checksum }, body: JSON.stringify(body) });
  return { status: res.status, body: (await res.json()) as { outcome: string }, transactionId: transaction.id };
}

/**
 * Intercepta la redirección a Wompi (no hay red externa en CI) y devuelve los parámetros firmados
 * que el navegador habría enviado al Web Checkout.
 */
export async function captureWompiCheckout(page: Page): Promise<URLSearchParams> {
  let captured: URL | null = null;
  await page.route('https://checkout.wompi.co/**', async (route) => {
    captured = new URL(route.request().url());
    await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Wompi (simulado en E2E)</title><p>Checkout simulado</p>' });
  });
  await page.getByRole('button', { name: /Pagar .* con Wompi/ }).click();
  await expect.poll(() => captured !== null).toBe(true);
  return (captured as unknown as URL).searchParams;
}

export async function bookFirstSlot(page: Page, names: string[]) {
  await page.goto(`/experiencias/${SERVICE_SLUG}`);
  const form = page.locator('form[aria-labelledby="reserva-titulo"]');
  await expect(form.getByLabel('Elige la fecha')).toBeVisible();
  // Segundo día disponible: evita horarios del mismo día que podrían cerrarse durante la prueba.
  const options = form.getByLabel('Elige la fecha').locator('option');
  if ((await options.count()) > 1) await form.getByLabel('Elige la fecha').selectOption({ index: 1 });
  await form.locator('label:has(input[type=radio]:not([disabled]))').first().click();
  for (let i = 1; i < names.length; i++) await form.getByRole('button', { name: 'Agregar participante' }).click();
  for (const [i, n] of names.entries()) await form.locator(`#p-${i}`).fill(n);
  await form.getByLabel('Celular de contacto').fill('3001234567');
  await form.getByRole('button', { name: 'Reservar y continuar al pago' }).click();
  await page.waitForURL(/\/reservas\/[0-9a-f-]+\/pago$/);
  return page.url().match(/reservas\/([0-9a-f-]+)\/pago/)![1]!;
}

/** Registra un usuario por la interfaz y verifica su correo con el enlace del buzón de salida. */
export async function registerAndVerify(page: Page, fullName: string, email: string, password: string) {
  await page.goto('/registro');
  await page.getByLabel('Nombre completo').fill(fullName);
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByLabel(/Acepto los/).check();
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await page.waitForURL(/\/cuenta/);
  const [mail] = await dbQuery<{ payload: { link: string } }>(
    `SELECT payload FROM email_outbox WHERE to_email = $1 AND template = 'EMAIL_VERIFICATION' ORDER BY created_at DESC LIMIT 1`,
    [email],
  );
  const link = new URL(mail!.payload.link);
  await page.goto(`${link.pathname}${link.search}`);
  await expect(page.getByRole('status')).toBeVisible();
}
