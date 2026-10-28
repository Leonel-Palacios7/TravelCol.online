# Variables de entorno

Los archivos de ejemplo son `apps/api/.env.example`, `apps/web/.env.example` y `.env.example` (este último para `infrastructure/docker-compose.yml`). La API valida todo al arrancar con Zod: si algo falta o es inválido, **no inicia**. En producción hay reglas adicionales.

## API

| Variable | Por defecto | Secreto | Descripción |
|---|---|---|---|
| `NODE_ENV` | `development` | | `development`, `test` o `production` |
| `PORT` | `4000` | | Puerto HTTP |
| `DATABASE_URL` | — (obligatoria) | **Sí** | Cadena de conexión de PostgreSQL |
| `WEB_URL` | `http://localhost:3000` | | Origen público de la web (enlaces de correo, retorno de Wompi) |
| `CORS_ORIGINS` | `http://localhost:3000` | | Orígenes permitidos, separados por coma |
| `COOKIE_SECURE` | automático (`true` en producción) | | Cookie solo por HTTPS |
| `COOKIE_DOMAIN` | — | | Dominio de las cookies |
| `SESSION_TTL_HOURS` | `168` | | Duración de la sesión |
| `IP_HASH_SALT` | valor de desarrollo | **Sí** | Sal para seudonimizar IP. En producción es obligatoria y propia (mínimo 16 caracteres) |
| `TRUST_PROXY` | `false` | | `true` detrás de Caddy o de un balanceador (IP real del cliente) |
| `THROTTLE_TTL_MS` / `THROTTLE_LIMIT` | `60000` / `120` | | Límite global por IP |
| `AUTH_THROTTLE_LIMIT` | `10` | | Límite por minuto en ingreso, registro y recuperación |
| `BOOKING_HOLD_MINUTES` | `20` | | Retención del cupo mientras se paga |
| `DEFAULT_COMMISSION_BPS` | `1200` | | Comisión inicial (luego se gestiona en Administración) |
| `JOBS_ENABLED` | `true` | | Tareas programadas. Debe estar activa en **un solo** nodo |
| `STORAGE_DIR` | `./storage` | | Carpeta de archivos (`/data/storage` en Docker) |
| `SWAGGER_ENABLED` | activo fuera de producción | | Documentación interactiva |
| `LOG_LEVEL` | `info` | | Nivel de los registros JSON |
| `WOMPI_ENV` | `SANDBOX` | | `SANDBOX` o `PRODUCTION`; se valida contra el prefijo de las llaves |
| `WOMPI_PUBLIC_KEY` | — | | Llave pública (`pub_test_…` / `pub_prod_…`) |
| `WOMPI_PRIVATE_KEY` | — | **Sí** | Llave privada, solo para consultar transacciones |
| `WOMPI_INTEGRITY_SECRET` | — | **Sí** | Firma de integridad del checkout |
| `WOMPI_EVENTS_SECRET` | — | **Sí** | Verificación del checksum de eventos |
| `WOMPI_API_URL` | `https://sandbox.wompi.co/v1` | | `https://production.wompi.co/v1` en producción |
| `WOMPI_CHECKOUT_URL` | `https://checkout.wompi.co/p/` | | Web Checkout |
| `WOMPI_VERIFY_WITH_API` | `false` | | Confirmar cada evento consultando a Wompi (recomendado en producción) |
| `MAIL_DRIVER` | `log` | | `log` (registro y `email_outbox`) o `disabled`. **Falta un proveedor real** |
| `MAIL_FROM` | `TravelCol.online <no-responder@travelcol.online>` | | Remitente |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | `admin@travelcol.local` / — | **Sí** | Administrador inicial. La contraseña es obligatoria en producción |
| `SEED_DEMO` | `false` | | Datos de demostración (prohibidos en producción) |

Reglas de producción: las cuatro variables de Wompi son obligatorias, `IP_HASH_SALT` debe ser propia, no se pueden mezclar llaves de Sandbox y producción, Swagger se desactiva y las cookies son `Secure`.

## Web

| Variable | Momento | Descripción |
|---|---|---|
| `API_INTERNAL_URL` | compilación y ejecución | URL interna de la API, para reescrituras y SSR. Se fija al compilar la imagen |
| `NEXT_PUBLIC_SITE_URL` | compilación | Origen público (`robots.txt`, `sitemap.xml`, metadatos) |
| `NEXT_PUBLIC_WOMPI_CHECKOUT_ORIGIN` | compilación | Origen permitido en la directiva CSP `form-action` |

Ninguna variable `NEXT_PUBLIC_*` puede contener secretos, porque llegan al navegador.

## Gestión de secretos

- No se versionan: `.gitignore` excluye `.env*` salvo los ejemplos, y `.dockerignore` también los excluye.
- En el servidor se guardan en `infrastructure/.env` con permisos `600`, o mejor en el gestor de secretos del proveedor de nube.
- Rotación: cambia el secreto en Wompi y en el servidor y reinicia la API. Si cambias `IP_HASH_SALT`, los hashes antiguos dejan de poder correlacionarse, y es aceptable.
