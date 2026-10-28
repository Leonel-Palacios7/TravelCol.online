# Pagos con Wompi

Integración: **Web Checkout** (redirección). TravelCol nunca recibe, transmite ni guarda datos de tarjetas.

## Configuración en Sandbox

1. En el panel de comercios de Wompi, en modo **Sandbox**, sección *Desarrolladores*, copia:
   - la llave pública (`pub_test_…`),
   - la llave privada (`prv_test_…`),
   - el secreto de integridad,
   - el secreto de eventos.
2. Ponlos en `apps/api/.env`: `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET` y `WOMPI_EVENTS_SECRET`. Nunca van en la web ni en variables `NEXT_PUBLIC_*`.
3. Configura la URL de eventos: `https://<tu-dominio>/api/v1/webhooks/wompi`. En desarrollo usa un túnel HTTPS hacia el puerto 4000.
4. Deja `WOMPI_ENV=SANDBOX`. La API se niega a arrancar si mezclas llaves de producción con Sandbox o al revés.

Referencias oficiales: [documentación de Wompi](https://docs.wompi.co/), en especial *Widget & Checkout Web*, *Eventos* y *Ambientes y llaves*.

## Qué se verificó en este repositorio y qué no

| Aspecto | Estado |
|---|---|
| Firma de integridad SHA256(referencia + monto en centavos + moneda + secreto) | Verificado con pruebas unitarias |
| Parámetros enviados al Web Checkout (sin secretos, monto en centavos, referencia única) | Verificado con E2E (intercepción de la redirección) |
| Checksum de eventos (propiedades dinámicas + timestamp + secreto, comparación en tiempo constante) | Verificado con pruebas de integración y E2E usando eventos firmados con un secreto de prueba |
| Idempotencia, desorden, montos alterados, referencia desconocida, pago tardío y anulación | Verificado con integración |
| **Transacción real en Wompi Sandbox** (tarjetas de prueba, Nequi, PSE) | **Pendiente.** El entorno de construcción no tenía acceso a Wompi ni llaves reales |
| Consulta de la transacción a la API de Wompi (`WOMPI_VERIFY_WITH_API`, `/payments/:id/sync`) | Implementada; **pendiente** probarla contra Sandbox |

## Prueba manual en Sandbox (lista de verificación)

1. Configura las llaves de Sandbox y la URL de eventos. Arranca API y web con HTTPS (túnel o servidor de preproducción).
2. Reserva con la cuenta de turista demo y pulsa «Pagar con Wompi».
3. En Wompi usa los datos de prueba de la documentación oficial para obtener una transacción **aprobada**. Comprueba:
   - La página de retorno muestra «Verificando» y luego «¡Pago aprobado y reserva confirmada!».
   - En Administración, Pagos y webhooks, el evento aparece con firma **Válida** y resultado **Procesado**.
   - El proveedor ve la reserva y el libro contable tiene los asientos SALE y COMMISSION.
4. Repite con una transacción **rechazada**: la reserva sigue pendiente y el turista puede reintentar.
5. Reenvía el mismo evento desde el panel de Wompi: debe registrarse como **Duplicado** sin efectos.
6. Activa `WOMPI_VERIFY_WITH_API=true` y repite el paso 3.
7. Deja expirar una reserva (o baja `BOOKING_HOLD_MINUTES` a 5) y paga tarde: debe recuperar el cupo o crear un reembolso pendiente.

## Simulación local (sin Wompi)

`pnpm --filter @travelcol/api wompi:simulate -- --reference <ref> --status APPROVED` envía un evento firmado con el secreto de eventos de tu `.env`. El script se niega a ejecutarse con `NODE_ENV=production` o `WOMPI_ENV=PRODUCTION`. **No reemplaza la prueba en Sandbox.**

## Paso a producción

- Llaves de producción en el gestor de secretos del servidor y `WOMPI_ENV=PRODUCTION`.
- `WOMPI_API_URL=https://production.wompi.co/v1`.
- URL de eventos de producción configurada en el panel.
- `WOMPI_VERIFY_WITH_API=true` recomendado.
- Contrato de comercio vigente con Wompi y revisión del modelo de recaudo a nombre de terceros (ver [cumplimiento.md](cumplimiento.md)).
- Prueba de punta a punta con un valor bajo y su reembolso desde el panel.
