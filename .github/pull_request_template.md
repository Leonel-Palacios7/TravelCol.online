## Qué cambia

<!-- Resumen corto y motivo. -->

## Cómo se probó

- [ ] `pnpm lint` y `pnpm typecheck`
- [ ] Pruebas unitarias e integración (`pnpm --filter @travelcol/api test`)
- [ ] E2E si cambia un recorrido de usuario (`pnpm test:e2e`)

## Riesgos

- [ ] Incluye migraciones (deben ser aditivas; ver `docs/despliegue.md`)
- [ ] Toca pagos, permisos o el libro contable
- [ ] No agrega secretos ni datos personales reales
