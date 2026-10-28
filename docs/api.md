# API REST v1

- Base: `/api/v1`. En producción se accede por el mismo dominio de la web.
- Especificación: [openapi.json](openapi.json), con 90 rutas y 97 operaciones. Se regenera con `pnpm --filter @travelcol/api openapi:export`.
- Swagger UI: `http://localhost:4000/api/docs`. Está activo fuera de producción y se controla con `SWAGGER_ENABLED`.

## Convenciones

| Tema | Regla |
|---|---|
| Autenticación | Cookie `tc_session` (HttpOnly, SameSite=Lax, Secure en producción). No hay tokens en `localStorage` ni en encabezados `Authorization` |
| CSRF | Toda operación que modifica estado requiere `X-CSRF-Token` igual a la cookie `tc_csrf`. Se obtiene con `GET /auth/csrf`. Excepción: el webhook de Wompi |
| Validación | Esquemas Zod estrictos de `@travelcol/contracts`: los campos desconocidos se rechazan con `400` |
| Errores | `{ statusCode, error, message, errors?: [{ path, message }], requestId }`, con mensajes en español y sin trazas internas |
| Paginación | `?page=1&pageSize=20` → `{ items, total, page, pageSize }` |
| Fechas | ISO 8601 en UTC. Las fechas locales que ingresa el proveedor llevan el formato `AAAA-MM-DDTHH:mm`, en hora de Colombia |
| Dinero | Enteros en COP (`…Cop`). En Wompi, centavos (`amount-in-cents`) |
| Límite de tasa | Global (`THROTTLE_LIMIT` por minuto) y más estricto en autenticación (`AUTH_THROTTLE_LIMIT`) |
| Trazabilidad | Cada respuesta incluye `X-Request-Id`; los registros JSON (pino) lo incluyen |

## Grupos de rutas

| Grupo | Rutas principales |
|---|---|
| Autenticación | `GET /auth/csrf`, `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/logout-all`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/verify-email`, `POST /auth/resend-verification` |
| Catálogo público | `GET /destinations`, `GET /categories`, `GET /services`, `GET /services/featured`, `GET /services/:slug`, `GET /services/:id/availability`, `GET /services/:id/reviews`, `GET /providers/:slug`, `GET /sitemap-entries`, `GET /media/public/*` |
| Turista | `GET/PATCH /users/me`, favoritos, notificaciones, `GET /users/me/data-export`, `POST /users/me/deletion-request`, `POST /bookings`, `GET /bookings/me`, `GET /bookings/:id`, `POST /bookings/:id/cancel`, `POST /bookings/:id/review` |
| Pagos | `POST /bookings/:id/checkout`, `GET /payments/:id`, `POST /payments/:id/sync`, `POST /webhooks/wompi` |
| Proveedor | `POST /provider-applications`, `GET /provider-applications/me`, `/providers/me` (perfil, panel, reservas, cancelación, liquidaciones, libro, documentos), `/provider/services` (CRUD, envío a revisión, archivo, fotos, disponibilidad) |
| Administración | `/admin/*`: panel, solicitudes, proveedores, documentos, experiencias, reservas, pagos, eventos de webhook, reembolsos, liquidaciones, usuarios, configuración, auditoría, reseñas, PQR y reportes |
| Soporte y legal | `POST /support/tickets`, `GET /legal/current?type=` |
| Salud | `GET /health`, `GET /health/ready` |
