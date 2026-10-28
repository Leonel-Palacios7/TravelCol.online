# Fase 0: diagnóstico

## Punto de partida

- **No había repositorio previo.** El proyecto se construyó desde cero en un monorepo nuevo. No se migró código ni datos existentes.
- No había llaves de Wompi, proveedor de correo, almacenamiento en la nube ni dominio configurado. Todas esas integraciones quedaron preparadas por configuración y documentadas como pendientes. No se simuló ninguna integración real.
- El entorno de construcción no tenía salida a Internet hacia Wompi ni a bancos de imágenes. Por eso:
  - El pago se verificó hasta el borde del sistema: los parámetros firmados enviados al Web Checkout y los webhooks firmados con el algoritmo oficial y un secreto de prueba.
  - Las imágenes del sitio son **ilustraciones SVG originales**, no fotografías.
- Se recibieron dos referencias visuales: una página de viajes verde y amarilla con bordes de papel rasgado, y una página “triply” con tarjetas ovaladas y acentos caligráficos. Se combinaron con una identidad colombiana propia (ver [diseno.md](diseno.md)).

## Alcance confirmado

- Roles `TOURIST`, `PROVIDER` y `ADMIN`. Se añadió `SUPPORT` para operar sin acceso a finanzas ni configuración.
- Moneda COP en enteros, idioma es-CO y zona horaria America/Bogota.
- Pagos con Wompi Web Checkout en Sandbox. La confirmación solo llega por webhook firmado o por consulta del backend a Wompi.

## Supuestos de negocio (validar con el negocio y con jurídica)

| Supuesto | Dónde se aplica |
|---|---|
| El precio publicado es el precio final para el turista (impuestos incluidos según el proveedor). TravelCol no suma cargos al turista. | `apps/api/src/domain/pricing.ts` |
| La comisión de TravelCol (12 % por defecto, configurable) se descuenta de lo que se liquida al proveedor | `PlatformSetting commission_bps` |
| Las políticas de cancelación son flexible, moderada y estricta, con los porcentajes de `packages/contracts/src/policies.ts` | Contratos compartidos |
| La reserva retiene el cupo 20 minutos mientras el turista paga | `BOOKING_HOLD_MINUTES` |
| Los reembolsos se ejecutan en el panel de Wompi y se **registran** en TravelCol | ADR-0005 |
| Las liquidaciones a proveedores se pagan por transferencia fuera de la plataforma y se registran con su referencia | ADR-0006 |
| Solo se liquidan servicios ya prestados | `FinanceService.createSettlement` |
