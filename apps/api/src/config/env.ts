import { z } from 'zod';

/**
 * Validación estricta de variables de entorno al arrancar. Si falta algo crítico,
 * la API no inicia (fail-fast). Ver docs/variables-de-entorno.md.
 */
const bool = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().default(4000),
    DATABASE_URL: z.string().min(1),
    WEB_URL: z.url().default('http://localhost:3000'),
    /** Orígenes permitidos para CORS, separados por coma. */
    CORS_ORIGINS: z.string().default('http://localhost:3000'),
    COOKIE_SECURE: bool.optional(),
    COOKIE_DOMAIN: z.string().optional(),
    SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(24 * 60).default(24 * 7),
    /** Sal para seudonimizar IP en auditoría (hash). Obligatoria en producción. */
    IP_HASH_SALT: z.string().min(16).default('dev-only-ip-salt-change-me'),
    TRUST_PROXY: bool.default(false),
    THROTTLE_TTL_MS: z.coerce.number().int().default(60_000),
    THROTTLE_LIMIT: z.coerce.number().int().default(120),
    AUTH_THROTTLE_LIMIT: z.coerce.number().int().default(10),
    BOOKING_HOLD_MINUTES: z.coerce.number().int().min(5).max(120).default(20),
    DEFAULT_COMMISSION_BPS: z.coerce.number().int().min(0).max(5000).default(1200),
    JOBS_ENABLED: bool.default(true),
    STORAGE_DIR: z.string().default('./storage'),
    SWAGGER_ENABLED: bool.optional(),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    // ---- Wompi ----
    WOMPI_ENV: z.enum(['SANDBOX', 'PRODUCTION']).default('SANDBOX'),
    WOMPI_PUBLIC_KEY: z.string().default(''),
    WOMPI_PRIVATE_KEY: z.string().default(''),
    WOMPI_INTEGRITY_SECRET: z.string().default(''),
    WOMPI_EVENTS_SECRET: z.string().default(''),
    WOMPI_API_URL: z.url().default('https://sandbox.wompi.co/v1'),
    WOMPI_CHECKOUT_URL: z.url().default('https://checkout.wompi.co/p/'),
    /** Consulta el estado de la transacción en la API de Wompi antes de confirmar. */
    WOMPI_VERIFY_WITH_API: bool.default(false),
    // ---- Correo ----
    MAIL_DRIVER: z.enum(['log', 'disabled']).default('log'),
    MAIL_FROM: z.string().default('TravelCol.online <no-responder@travelcol.online>'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;
    const required: Array<keyof typeof env> = [
      'WOMPI_PUBLIC_KEY',
      'WOMPI_PRIVATE_KEY',
      'WOMPI_INTEGRITY_SECRET',
      'WOMPI_EVENTS_SECRET',
    ];
    for (const key of required) {
      if (!env[key]) ctx.addIssue({ code: 'custom', path: [key], message: 'Obligatoria en producción' });
    }
    if (env.IP_HASH_SALT.startsWith('dev-only')) {
      ctx.addIssue({ code: 'custom', path: ['IP_HASH_SALT'], message: 'Define una sal propia en producción' });
    }
    if (env.WOMPI_ENV === 'PRODUCTION' && env.WOMPI_PUBLIC_KEY.startsWith('pub_test_')) {
      ctx.addIssue({ code: 'custom', path: ['WOMPI_PUBLIC_KEY'], message: 'Llave de sandbox con WOMPI_ENV=PRODUCTION' });
    }
    if (env.WOMPI_ENV === 'SANDBOX' && env.WOMPI_PUBLIC_KEY.startsWith('pub_prod_')) {
      ctx.addIssue({ code: 'custom', path: ['WOMPI_PUBLIC_KEY'], message: 'Llave de producción con WOMPI_ENV=SANDBOX' });
    }
  });

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n  ');
    throw new Error(`Configuración inválida:\n  ${issues}`);
  }
  return parsed.data;
}

export function env(): Env {
  if (!cached) cached = loadEnv();
  return cached;
}

/** Solo para pruebas: fuerza recargar variables. */
export function resetEnvCache(): void {
  cached = null;
}

export const isProduction = () => env().NODE_ENV === 'production';
export const cookieSecure = () => env().COOKIE_SECURE ?? isProduction();
