import { expect, test } from '@playwright/test';

test.describe('Diseño responsivo (móvil)', () => {
  for (const path of ['/', '/experiencias', '/experiencias/demo-caminata-salto-de-los-micos', '/ingresar', '/registro', '/contacto']) {
    test(`${path} no tiene desplazamiento horizontal`, async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test('el menú móvil abre la navegación principal', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /menú/i }).click();
    await expect(page.getByRole('link', { name: 'Cómo funciona' }).last()).toBeVisible();
  });
});
