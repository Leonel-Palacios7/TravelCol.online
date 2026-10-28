# TravelCol.online

Marketplace turístico para Colombia. Conecta a turistas con prestadores locales para reservar y pagar experiencias en línea. El piloto es **Villeta, Cundinamarca**. La plataforma está en español (es-CO), cobra en pesos colombianos (COP) y usa la zona horaria `America/Bogota`. Los pagos van por **Wompi** (en este repositorio, configurado en Sandbox).

> **Estado:** MVP funcional, verificado con pruebas automatizadas (unitarias, de integración, E2E y de imágenes Docker).
> **Todavía no está listo para operar con dinero real.** Faltan las pruebas contra Wompi Sandbox real, conectar un proveedor de correo, la revisión jurídica de los textos legales y los demás puntos de [docs/brecha-a-produccion.md](docs/brecha-a-produccion.md).

## Qué incluye

| Área | Contenido |
|---|---|
| Sitio público | Inicio, catálogo con filtros, detalle con disponibilidad en vivo, destino Villeta, perfil de operador, cómo funciona, FAQ, contacto/PQR y textos legales (borradores) |
| Turista | Registro, verificación de correo, recuperación de contraseña, reserva con retención de cupo, pago Wompi, cancelación según política, reseñas, favoritos, notificaciones, exportación de datos y solicitud de supresión (Ley 1581) |
| Proveedor | Solicitud de habilitación, experiencias (borrador, fotos, fechas y cupos, revisión), reservas con datos de contacto, cancelación por fuerza mayor, finanzas con libro contable, documentos privados (RNT, RUT…) |
| Administración / soporte | Indicadores, solicitudes, verificación de documentos y RNT, moderación, reservas, pagos y eventos de webhook, reembolsos, liquidaciones, usuarios y roles, comisión, auditoría, reseñas, PQR y reportes CSV |
| Plataforma | API REST documentada (OpenAPI), sesiones seguras en cookie HttpOnly, CSRF, control de acceso por rol y por propiedad, inventario sin sobreventa, webhook idempotente con verificación de firma, libro contable de solo inserción, Docker, CI y respaldos |

## Arquitectura en una línea

`Navegador → Next.js 16 (web, mismo origen) → NestJS 11 (API /api/v1) → PostgreSQL 16`, con `Wompi → webhook → API`. Detalle en [docs/arquitectura.md](docs/arquitectura.md).

```
apps/
  api/        NestJS + Prisma (dominio, seguridad, pagos, pruebas de integración)
  web/        Next.js App Router + Tailwind CSS 4 (sitio público y paneles)
packages/
  contracts/  Esquemas Zod, enums, políticas y tipos compartidos por web y API
tests/e2e/    Playwright (recorridos completos, seguridad, móvil)
infrastructure/
  docker/     Dockerfiles de API y web
  caddy/      Proxy inverso con HTTPS automático
  docker-compose.yml
scripts/      Preparación local, base E2E, respaldo y restauración, generación de docs
docs/         Documentación técnica, funcional, de seguridad y cumplimiento, y ADR
```

## Inicio rápido (desarrollo)

Requisitos: Node 22, pnpm 10 (`corepack enable`) y PostgreSQL 16 (local o `docker compose -f docker-compose.dev.yml up -d`).

```bash
./scripts/dev-setup.sh   # dependencias, .env de ejemplo, migraciones y datos DEMO
pnpm dev                 # web http://localhost:3000 · API http://localhost:4000/api/docs
```

Cuentas de demostración (solo desarrollo, creadas por la semilla con `SEED_DEMO=true`):

| Rol | Correo | Contraseña |
|---|---|---|
| Administración | `admin@travelcol.local` | `Admin-TravelCol-2026` (o `SEED_ADMIN_PASSWORD`) |
| Soporte | `soporte@travelcol.local` | `Demo-TravelCol-2026` |
| Proveedor (DEMO) | `proveedor.demo@travelcol.local` | `Demo-TravelCol-2026` |
| Turista | `turista.demo@travelcol.local` | `Demo-TravelCol-2026` |

El proveedor y sus 6 experiencias son **datos de demostración** y la interfaz los marca así. No son un operador real, no tienen RNT y sus precios son ilustrativos. La semilla se niega a crearlos con `NODE_ENV=production`, salvo que se pida de forma explícita con `SEED_ALLOW_DEMO_IN_PRODUCTION=true` (pensado solo para un ambiente de pruebas).

Para probar un pago sin acceso a Wompi, envía un evento firmado con tu secreto local de Sandbox:

```bash
pnpm --filter @travelcol/api wompi:simulate -- --reference <referencia> --status APPROVED
```

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm lint` / `pnpm typecheck` | ESLint y TypeScript en todo el monorepo |
| `pnpm --filter @travelcol/api test` | Pruebas unitarias e integración (crean y eliminan su propia base temporal) |
| `pnpm --filter @travelcol/contracts test` | Pruebas de contratos compartidos |
| `pnpm build` | Compila contratos, API y web |
| `pnpm test:e2e` | Playwright contra una base desechable (ver [docs/pruebas.md](docs/pruebas.md)) |
| `pnpm --filter @travelcol/api openapi:export` | Regenera `docs/openapi.json` |

## Resultados de verificación (28-oct-2026)

| Verificación | Resultado |
|---|---|
| Lint y tipos (4 paquetes) | Sin errores ni advertencias |
| Contratos | 5/5 |
| API unitarias | 16/16 |
| API integración (PostgreSQL real) | 44/44 |
| E2E Playwright (escritorio y móvil) | 26/26 |
| Imágenes Docker API y web | Compiladas y probadas: migración, semilla de producción, healthcheck y login a través de la web |
| Respaldo y restauración | Probados con `pg_dump`/`pg_restore` sobre una base nueva |

## Documentación

Empieza por [docs/README.md](docs/README.md), el índice de toda la documentación. El informe por fases está en [docs/informe-por-fases.md](docs/informe-por-fases.md).
