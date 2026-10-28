import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { API, DEMO, login, logout, registerAndVerify } from './helpers';

/**
 * Habilitación de un proveedor nuevo y publicación de su primera experiencia:
 * solicitud → aprobación ADMIN → borrador con foto y fechas → revisión → bloqueo sin RNT verificado
 * → documento RNT verificado → publicación por SUPPORT → visible en el catálogo.
 */
test.describe.serial('Proveedor nuevo: habilitación y publicación con revisión', () => {
  const stamp = Date.now();
  const email = `operador-${stamp}@prueba.test`;
  const password = 'Clave-Operador-2026';
  const business = `Operador E2E ${stamp}`;
  const title = `Experiencia E2E ${stamp}`;
  const photo = path.join(__dirname, 'fixtures/foto-prueba.png');

  async function confirmDialog(page: Page, button: string) {
    await page.getByRole('dialog').getByRole('button', { name: button, exact: true }).click();
  }

  test('1. un turista solicita ser proveedor; la solicitud no le da permisos', async ({ page }) => {
    await registerAndVerify(page, 'Operador Prueba', email, password);
    await page.goto('/cuenta/ser-proveedor');
    await page.getByLabel('Nombre comercial').fill(business);
    await page.getByLabel('Razón social o nombre del titular').fill(`${business} SAS`);
    await page.getByLabel('NIT o cédula').fill(`9${String(stamp).slice(-8)}-1`);
    await page.getByLabel('Número de RNT').fill('12345');
    await page.getByLabel('Celular de contacto').fill('3109876543');
    await page.getByLabel('Cuéntanos sobre tu operación').fill('Operador de prueba automatizada: caminatas guiadas y experiencias rurales en Villeta.');
    await page.getByLabel(/Acepto las/).check();
    await page.getByRole('button', { name: 'Enviar solicitud' }).click();
    await expect(page.getByText('Tus solicitudes')).toBeVisible();
    await expect(page.locator('li', { hasText: business }).getByText('En verificación')).toBeVisible();
    await page.goto('/proveedor');
    await expect(page).toHaveURL(/acceso=denegado/);
  });

  test('2. ADMIN aprueba la solicitud', async ({ page }) => {
    await login(page, DEMO.admin.email, DEMO.admin.password);
    await page.goto('/admin/solicitudes');
    const card = page.locator('article', { hasText: business });
    await card.getByRole('button', { name: 'Aprobar' }).click();
    await page.getByRole('dialog').getByLabel(/Notas de verificación/).fill('RNT y NIT revisados (datos de prueba E2E).');
    await confirmDialog(page, 'Aprobar');
    await expect(page.locator('article', { hasText: business })).toHaveCount(0);
  });

  test('3. el proveedor crea un borrador con foto y fechas y lo envía a revisión', async ({ page }) => {
    await login(page, email, password);
    await page.goto('/proveedor/servicios/nueva');
    await page.getByLabel('Título').fill(title);
    await page.getByLabel('Resumen corto').fill('Recorrido de prueba automatizada por senderos de Villeta.');
    await page.getByLabel('Descripción', { exact: true }).fill('Descripción de prueba E2E. '.repeat(6));
    await page.getByLabel('Precio por persona (COP)').fill('45000');
    await page.getByLabel('Punto de encuentro').fill('Parque principal de Villeta');
    await page.getByLabel('Incluye (uno por línea)', { exact: true }).fill('Guía local\nHidratación');
    await page.getByRole('button', { name: 'Crear borrador' }).click();
    await page.waitForURL(/\/proveedor\/servicios\/[0-9a-f-]+\?nuevo=1/);

    // Sin foto no se puede enviar a revisión (regla del servidor).
    await page.getByRole('button', { name: 'Enviar a revisión' }).click();
    await confirmDialog(page, 'Enviar');
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('al menos una fotografía');
    await page.getByRole('dialog').getByRole('button', { name: 'Volver' }).click();

    await page.locator('#media-file').setInputFiles(photo);
    await page.getByLabel('Descripción de la imagen').fill('Sendero con vegetación (prueba)');
    await page.getByRole('button', { name: 'Subir', exact: true }).click();
    await expect(page.getByRole('img', { name: 'Sendero con vegetación (prueba)' })).toBeVisible();

    const day = new Date(Date.now() + 10 * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    await page.getByLabel('Fecha y hora (hora de Colombia)').fill(`${day}T09:00`);
    await page.getByLabel('Cupos', { exact: true }).fill('8');
    await page.getByLabel('Repetir días').fill('2');
    await page.getByRole('button', { name: 'Agregar' }).click();
    await expect(page.getByText('Se crearon 3 cupos.')).toBeVisible();

    await page.getByRole('button', { name: 'Enviar a revisión' }).click();
    await confirmDialog(page, 'Enviar');
    await expect(page.getByText('En revisión').first()).toBeVisible();
  });

  test('4. sin RNT verificado no se puede publicar, y no aparece en el catálogo', async ({ page }) => {
    // Consulta directa a la API pública (la página de catálogo usa caché de 30 s).
    const search = await page.request.get(`${API}/services?q=${encodeURIComponent(title)}`);
    expect((await search.json()).total).toBe(0);
    await login(page, 'soporte@travelcol.local', DEMO.provider.password);
    await page.goto('/admin/servicios');
    const card = page.locator('article', { hasText: title });
    await expect(card.getByText('El proveedor no tiene RNT verificado.')).toBeVisible();
    await card.getByRole('button', { name: 'Publicar' }).click();
    await confirmDialog(page, 'Publicar');
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('RNT');
  });

  test('5. el proveedor sube el certificado RNT y la verificación lo habilita', async ({ page }) => {
    await login(page, email, password);
    await page.goto('/proveedor/documentos');
    await page.getByLabel('Tipo de documento').selectOption('RNT');
    await page.locator('#doc-file').setInputFiles(photo);
    await page.getByRole('button', { name: 'Subir', exact: true }).click();
    await expect(page.getByText('Documento recibido')).toBeVisible();
    await logout(page);

    await login(page, 'soporte@travelcol.local', DEMO.provider.password);
    await page.goto(`/admin/proveedores?q=${encodeURIComponent(business)}`);
    await page.getByRole('link', { name: business }).click();
    await page.getByRole('button', { name: 'Verificar' }).click();
    await confirmDialog(page, 'Verificar');
    await expect(page.getByText(/Verificado el/)).toBeVisible();
  });

  test('6. SUPPORT publica la experiencia y queda visible y reservable', async ({ page }) => {
    await login(page, 'soporte@travelcol.local', DEMO.provider.password);
    await page.goto('/admin/servicios');
    await page.locator('article', { hasText: title }).getByRole('button', { name: 'Publicar' }).click();
    await confirmDialog(page, 'Publicar');
    await expect(page.locator('article', { hasText: title })).toHaveCount(0);
    await logout(page);
    await page.goto(`/experiencias?q=${encodeURIComponent(title)}`);
    await page.getByText(title).first().click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.getByLabel('Elige la fecha')).toBeVisible();
  });
});
