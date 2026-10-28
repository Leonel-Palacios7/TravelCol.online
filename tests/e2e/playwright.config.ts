import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

/**
 * Pruebas E2E del recorrido completo. Levantan la API compilada y la web compilada contra la base
 * indicada en DATABASE_URL, que DEBE ser desechable (nunca producción): ver docs/pruebas.md.
 * Los valores de Wompi son ficticios y exclusivos de E2E; los eventos se firman con ese secreto.
 */
const root = path.resolve(__dirname, '../..');

export const E2E_ENV = {
  STORAGE_DIR: path.join(root, '.e2e-storage'),
  NODE_ENV: 'test',
  WOMPI_ENV: 'SANDBOX',
  WOMPI_PUBLIC_KEY: process.env.WOMPI_PUBLIC_KEY ?? 'pub_test_E2E_ONLY',
  WOMPI_PRIVATE_KEY: process.env.WOMPI_PRIVATE_KEY ?? 'prv_test_E2E_ONLY',
  WOMPI_INTEGRITY_SECRET: process.env.WOMPI_INTEGRITY_SECRET ?? 'test_integrity_E2E_ONLY',
  WOMPI_EVENTS_SECRET: process.env.WOMPI_EVENTS_SECRET ?? 'test_events_E2E_ONLY',
  WOMPI_VERIFY_WITH_API: 'false',
  IP_HASH_SALT: process.env.IP_HASH_SALT ?? 'e2e-ip-salt-not-a-secret',
  WEB_URL: 'http://localhost:3000',
  API_INTERNAL_URL: 'http://localhost:4000',
  // Toda la suite sale de la misma IP (localhost); se amplía el límite SOLO en E2E. El control
  // de bloqueo por intentos fallidos sigue activo y se prueba en integración.
  THROTTLE_LIMIT: '1000',
  AUTH_THROTTLE_LIMIT: '60',
};
Object.assign(process.env, E2E_ENV);


export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: path.join(root, 'playwright-report') }]] : 'list',
  outputDir: path.join(root, 'test-results'),
  use: {
    baseURL: 'http://localhost:3000',
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /responsive\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH || undefined } },
    },
    {
      name: 'movil',
      testMatch: /responsive\.spec\.ts/,
      use: { ...devices['Pixel 7'], launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH || undefined } },
    },
  ],
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      cwd: root,
      url: 'http://localhost:4000/api/v1/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { ...process.env, ...E2E_ENV, PORT: '4000' } as Record<string, string>,
    },
    {
      command: 'pnpm --filter @travelcol/web start',
      cwd: root,
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { ...process.env, ...E2E_ENV, PORT: '3000' } as Record<string, string>,
    },
  ],
});
