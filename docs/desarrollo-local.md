# Desarrollo local

## Requisitos

- Node.js 22 (`.nvmrc`) y pnpm 10 (`corepack enable`).
- PostgreSQL 16, sea local o con `docker compose -f docker-compose.dev.yml up -d` (usuario `travelcol`, clave `travelcol_dev`, base `travelcol_dev`).

## Pasos

```bash
./scripts/dev-setup.sh      # instala, crea .env de ejemplo, migra y siembra datos DEMO
# Edita apps/api/.env: DATABASE_URL y, si las tienes, llaves de Wompi Sandbox.
pnpm dev                    # API :4000 (con recarga) y web :3000
```

- Web: http://localhost:3000. Cuentas demo en el [README](https://github.com/Leonel-Palacios7/TravelCol.online#readme).
- API y Swagger: http://localhost:4000/api/docs.
- Correos: con `MAIL_DRIVER=log` aparecen en la consola de la API y en la tabla `email_outbox`. Ahí están los enlaces de verificación y de recuperación.

## Flujo de trabajo

| Tarea | Comando |
|---|---|
| Nueva migración (solo en desarrollo, nunca contra producción) | `pnpm --filter @travelcol/api exec prisma migrate dev --name <cambio>` |
| Aplicar migraciones existentes | `pnpm --filter @travelcol/api exec prisma migrate deploy` |
| Semilla idempotente | `SEED_DEMO=true pnpm --filter @travelcol/api db:seed` |
| Cambiar contratos compartidos | Edita `packages/contracts/src`, luego `pnpm --filter @travelcol/contracts build` |
| Simular un pago | `pnpm --filter @travelcol/api wompi:simulate -- --reference <ref> --status APPROVED` |
| Regenerar OpenAPI y diccionario | `pnpm --filter @travelcol/api openapi:export` y `python3 scripts/docs/gen-data-dictionary.py` |

## Notas

- Las pruebas de integración crean una base `travelcol_it_<marca>` y la eliminan al terminar. Nunca tocan la base de desarrollo. Configura el servidor con `TEST_DATABASE_SERVER_URL`; por defecto es `postgresql://travelcol:travelcol_dev@localhost:5432/postgres`.
- Next.js 16: `params`, `searchParams` y `cookies()` son asíncronos; la configuración de ESLint es *flat*.
- Tailwind CSS 4: los componentes de estilo se declaran con `@utility` en `apps/web/src/app/globals.css`.
