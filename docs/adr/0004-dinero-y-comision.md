# ADR 0004: Dinero en enteros COP y comisión en puntos básicos

- Estado: aceptada (28-oct-2026)

## Contexto
Los decimales binarios producen errores de redondeo. Wompi recibe centavos, pero el peso colombiano no usa fracciones en la práctica.

## Decisión
Todos los montos se guardan como enteros en pesos (`*_cop`). La comisión se expresa en puntos básicos (1200 = 12 %) con redondeo *half-up* a peso. Cada reserva guarda una foto inmutable de precio unitario, subtotal, comisión, neto del proveedor y total. A Wompi se envía `total × 100` en centavos.

## Consecuencias
- Cambiar el precio de un servicio o la comisión no altera reservas existentes.
- Impuestos y costos de la pasarela no están modelados ([cumplimiento.md](../cumplimiento.md)).
