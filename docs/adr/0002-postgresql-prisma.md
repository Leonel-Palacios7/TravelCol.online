# ADR 0002: PostgreSQL 16 con Prisma y reglas de integridad en la base

- Estado: aceptada (28-oct-2026)

## Contexto
Reservas, pagos y contabilidad requieren integridad aun si un error de aplicación o una consulta manual se salta las validaciones.

## Decisión
PostgreSQL 16 y Prisma 6 con migraciones versionadas. Las reglas críticas viven también en la base, en SQL dentro de las migraciones: `CHECK (reserved_count <= capacity)`, montos no negativos, índice único parcial que impide dos pagos aprobados por reserva y un trigger que vuelve inmutable el libro contable. Solo se usa `prisma migrate deploy` (no destructivo) fuera de desarrollo.

## Consecuencias
- Las pruebas de integración corren contra PostgreSQL real, no contra simulaciones.
- Parte del modelo no se ve en `schema.prisma`; está documentado en [modelo-de-datos.md](../modelo-de-datos.md).
- Las migraciones deben ser aditivas para permitir rollback ([despliegue.md](../despliegue.md)).
