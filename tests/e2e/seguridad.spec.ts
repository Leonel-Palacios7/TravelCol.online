import { expect, test } from '@playwright/test';
import { API, DEMO, login } from './helpers';

test.describe('Controles de acceso y errores visibles', () => {
  test('sin sesión, las áreas privadas redirigen al ingreso conservando el destino', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/ingresar\?next=%2Fadmin/);
    await page.goto('/proveedor/finanzas');
    await expect(page).toHaveURL(/\/ingresar\?next=/);
  });

  test('un turista no puede abrir administración ni el panel del proveedor', async ({ page }) => {
    await login(page, DEMO.tourist.email, DEMO.tourist.password);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/cuenta\?acceso=denegado/);
    await expect(page.getByText('No tienes permisos para ver esa sección.')).toBeVisible();
    // La API también lo impide, independientemente de la interfaz.
    const res = await page.request.get(`${API}/admin/dashboard`);
    expect(res.status()).toBe(403);
  });

  test('credenciales inválidas muestran un mensaje genérico', async ({ page }) => {
    await page.goto('/ingresar');
    await page.getByLabel('Correo electrónico').fill('nadie@prueba.test');
    await page.getByLabel('Contraseña').fill('Clave-Incorrecta-1');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.locator('form [role=alert]')).toHaveText('Correo o contraseña incorrectos');
  });

  test('las mutaciones sin token CSRF son rechazadas', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, { data: { email: DEMO.tourist.email, password: DEMO.tourist.password } });
    expect(res.status()).toBe(403);
  });

  test('la cookie de sesión es HttpOnly y no se guarda nada sensible en localStorage', async ({ page, context }) => {
    await login(page, DEMO.tourist.email, DEMO.tourist.password);
    const cookie = (await context.cookies()).find((c) => c.name === 'tc_session');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('Lax');
    const storage = await page.evaluate(() => JSON.stringify(window.localStorage));
    expect(storage).not.toMatch(/session|token/i);
  });

  test('las cabeceras de seguridad están presentes', async ({ request }) => {
    const res = await request.get('/');
    expect(res.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers()['x-content-type-options']).toBe('nosniff');
  });
});
