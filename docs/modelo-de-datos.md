# Modelo de datos

El diccionario completo (28 tablas, columnas, tipos, nulos, valores por defecto y relaciones) y el diagrama entidad-relación se generan desde el esquema Prisma. Están en [modelo-de-datos.generado.md](modelo-de-datos.generado.md). Para regenerarlos: `python3 scripts/docs/gen-data-dictionary.py`.

## Convenciones

- Claves primarias UUID.
- Tablas y columnas en `snake_case`, con `@@map` y `@map` en Prisma.
- Fechas en `timestamptz` (UTC). La conversión a hora de Colombia ocurre en la presentación y al interpretar las fechas locales que ingresa el proveedor (`bogotaLocalToUtc`).
- Dinero en **pesos enteros** (`Int`). En Wompi se usan centavos (`BigInt amount_in_cents`).
- La reserva guarda una **foto** de lo pactado: título, precio unitario, subtotal, comisión en puntos básicos, comisión, neto del proveedor y política de cancelación. Un cambio posterior en la experiencia o en la comisión no altera reservas existentes.

## Agrupación

| Dominio | Tablas |
|---|---|
| Identidad | `users`, `auth_sessions`, `auth_tokens` |
| Proveedores | `provider_applications`, `provider_profiles`, `provider_documents` |
| Catálogo | `destinations`, `service_categories`, `tourism_services`, `service_media`, `service_availability` |
| Reservas | `bookings`, `booking_participants`, `booking_status_history` |
| Pagos | `payments`, `payment_webhook_events`, `refunds` |
| Finanzas | `ledger_entries`, `provider_settlements`, `platform_settings` |
| Interacción | `reviews`, `favorites`, `notifications`, `support_tickets`, `email_outbox` |
| Cumplimiento | `audit_logs`, `legal_document_versions`, `consent_records` |

## Integridad garantizada por la base de datos

Están en la migración inicial `apps/api/prisma/migrations/20261028023912_init/migration.sql`.

| Regla | Mecanismo |
|---|---|
| Nunca más reservados que la capacidad; nunca negativos | `CHECK (reserved_count >= 0 AND reserved_count <= capacity)` |
| Precio positivo; mínimo de participantes ≤ máximo | `CHECK` en `tourism_services` |
| Coherencia de importes de la reserva (subtotal, total, comisión, neto) | `CHECK bookings_amounts_chk` |
| Monto de pago positivo; reembolso entre 0 % y 100 %; calificación de 1 a 5 | `CHECK` |
| Un solo pago **aprobado** por reserva | Índice único parcial `payments_one_approved_per_booking` |
| Un solo reembolso activo por pago | Índice único parcial `refunds_one_active_per_payment` |
| Una sola solicitud de proveedor pendiente por usuario | Índice único parcial `provider_applications_one_pending` |
| Un evento de webhook se procesa una sola vez | `UNIQUE payment_webhook_events.event_key` |
| Referencia de pago y transacción de Wompi únicas | `UNIQUE payments.reference`, `UNIQUE payments.provider_transaction_id` |
| Movimientos contables idempotentes | `UNIQUE ledger_entries.idempotency_key` |
| Libro contable de **solo inserción** | Trigger que rechaza `DELETE` y cualquier cambio de importe, tipo o referencias; solo permite asignar o liberar (al anular) la liquidación |
| Un cupo por servicio y hora | `UNIQUE (service_id, starts_at)` |
| Una reseña por reserva | `UNIQUE reviews.booking_id` |
| Búsqueda por texto en títulos | Índice `pg_trgm` (GIN) |

## Datos personales

| Dato | Tratamiento |
|---|---|
| Contraseñas | Hash argon2id |
| Tokens de sesión, verificación y recuperación | Solo hash SHA-256; los tokens de verificación y recuperación son de un solo uso y expiran |
| IP en auditoría | Hash con sal (`IP_HASH_SALT`) |
| Documentos de proveedores | Almacenamiento privado; descarga solo para el dueño y para el personal autorizado |
| Tarjetas | Nunca pasan por TravelCol (Web Checkout de Wompi) |
| Consentimientos | `consent_records`, con versión del documento aceptado |
