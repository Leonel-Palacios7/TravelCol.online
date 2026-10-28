# Estrategia de pruebas

## Niveles

| Nivel | Herramienta | Dónde | Qué cubre | Resultado (28-oct-2026) |
|---|---|---|---|---|
| Contratos | `node:test` | `packages/contracts` | Esquemas Zod, cálculo de comisión y redondeo, políticas de cancelación | 5/5 |
| Unitarias | Jest | `apps/api/test/unit` | Dominio puro (precios, reembolsos, firmas Wompi, máquina de estados) y sincronía contratos/Prisma | 16/16 |
| Integración | Jest + Supertest + PostgreSQL real | `apps/api/test/integration` | La API completa contra una base temporal: autenticación, permisos, reservas, concurrencia, webhook, contabilidad, archivos | 44/44 |
| E2E | Playwright (Chromium escritorio y Pixel 7) | `tests/e2e` | Recorridos de usuario en el navegador con la web y la API compiladas | 26/26 |
| Imágenes | Docker | `infrastructure/docker` | Construcción, migración, semilla de producción, healthcheck y login por la web | Verificado a mano |
| Estático | ESLint + `tsc --noEmit` | Todo el monorepo | Tipos y reglas, sin advertencias | 0 problemas |

Las pruebas de integración **no usan simulaciones de la base de datos**: crean una base `travelcol_it_<marca de tiempo>`, aplican las migraciones reales (incluidos CHECK y triggers) y la eliminan al terminar. Wompi no se llama: los eventos se firman con un secreto de prueba igual que lo haría Wompi (ver [pagos-wompi.md](pagos-wompi.md)).

## Cómo ejecutar

```bash
pnpm lint && pnpm typecheck
pnpm --filter @travelcol/contracts test
# Necesita un PostgreSQL con permiso para crear bases (por defecto postgresql://travelcol:travelcol_dev@localhost:5432/postgres; se niega si la URL contiene «prod»)
TEST_DATABASE_SERVER_URL=postgresql://travelcol:travelcol_dev@localhost:5432/postgres pnpm --filter @travelcol/api test
```

E2E (usa una base **desechable**; el script se niega a tocar una base cuyo nombre no termine en `_e2e` o `_test`):

```bash
pnpm --filter @travelcol/api build && pnpm --filter @travelcol/web build
DATABASE_URL=postgresql://travelcol:travelcol_dev@localhost:5432/travelcol_e2e pnpm test:e2e
# En este entorno: PW_CHROMIUM_PATH=/opt/pw-browsers/chromium
```

`playwright.config.ts` levanta la API y la web en modo producción con llaves Wompi falsas marcadas `*_E2E_ONLY`, un almacenamiento temporal y límites de peticiones más altos para que el recorrido no choque con el limitador. El informe HTML queda en `playwright-report/`.

## Cobertura por criterio de aceptación

| Criterio | Prueba que lo demuestra |
|---|---|
| Registro sin elevación de privilegios | integración: «impide elevar privilegios en el registro» |
| Sesión segura sin tokens en `localStorage` | integración: «crea sesión en cookie HttpOnly»; E2E seguridad: «la cookie de sesión es HttpOnly…» |
| CSRF | integración: «rechaza solicitudes sin token CSRF»; E2E: «las mutaciones sin token CSRF son rechazadas» |
| Bloqueo por intentos fallidos y mensaje genérico | integración: «bloquea tras 5 intentos»; E2E: «credenciales inválidas…» |
| Recuperación sin enumeración de usuarios | integración: «recuperación no revela si el correo existe…» |
| Revocación de sesión y suspensión | integración: «logout revoca…», «una cuenta suspendida pierde el acceso…» |
| Permisos por rol | integración: turista sin acceso a administración; SUPPORT sin operaciones financieras; ADMIN no cambia su propio rol |
| Permisos por propiedad (IDOR) | integración: proveedor no edita servicios ajenos; turista no ve reservas ajenas |
| Proveedor habilitado solo tras aprobación y RNT | integración: «la solicitud de proveedor no habilita capacidades…»; E2E proveedor 1–6 |
| Precio calculado en el servidor | integración: «calcula el precio en el servidor e ignora importes del cliente»; instantánea de precio |
| Sin sobreventa | integración: «12 solicitudes simultáneas por el último cupo producen exactamente 1 reserva» y CHECK en la base |
| Retenciones que expiran | integración: «las reservas pendientes vencidas expiran y liberan el cupo» |
| El navegador no confirma pagos | integración: «un parámetro del navegador status=APPROVED no confirma nada»; E2E recorrido paso 8 |
| Webhook con firma, idempotencia y orden | integración: firma inválida, evento duplicado, PENDING tras APPROVED, referencia desconocida, importe manipulado |
| Pago tardío | integración: «pago aprobado tardío: si hay cupo se confirma; si no, reembolso y alerta» |
| Cancelación y reembolso según política | integración: MODERADA > 72 h, ESTRICTA < 7 días, cancelación por el proveedor |
| Comisión y libro contable inmutable | integración: venta y comisión una sola vez; trigger de solo inserción |
| Liquidación | integración: «liquidación: agrupa saldo positivo…»; E2E recorrido paso 10 |
| Reseñas verificadas | integración: «las reseñas solo se permiten sobre reservas completadas y una vez» |
| Archivos seguros | integración: firma binaria, PDF con JavaScript, documentos privados |
| Responsive y accesible | E2E móvil: sin desplazamiento horizontal en 6 páginas; menú móvil |
| Cabeceras de seguridad | E2E: «las cabeceras de seguridad están presentes» |

## Lo que no está probado

- Una transacción real contra **Wompi Sandbox** (el entorno de construcción no tenía llaves de Sandbox). Es el primer paso de [brecha-a-produccion.md](brecha-a-produccion.md).
- Envío real de correo (el controlador `log` escribe los correos en el registro).
- Pruebas de carga, de accesibilidad con lector de pantalla y en Safari/Firefox.
- El `docker compose` completo con Caddy y certificados reales (las imágenes sí se probaron por separado).
- Una revisión de seguridad externa o una prueba de penetración.

## Reglas

- No se desactivan ni se omiten pruebas para que el CI pase.
- Ninguna prueba destructiva corre contra una base que no sea desechable.
- Las pruebas no dependen de datos de demostración: cada una crea los suyos.
