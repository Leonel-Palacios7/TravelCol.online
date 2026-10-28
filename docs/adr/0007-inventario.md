# ADR 0007: Inventario con actualización condicional atómica y retención con vencimiento

- Estado: aceptada (28-oct-2026)

## Contexto
Dos turistas pueden intentar el último cupo al mismo tiempo. Un turista puede abandonar el pago.

## Decisión
La reserva se crea en una transacción con `UPDATE availability_slots SET reserved_count = reserved_count + n WHERE id = $1 AND reserved_count + n <= capacity`. Si no afecta filas, no hay cupo. El `CHECK` de la base es la segunda barrera. La reserva queda `PENDING_PAYMENT` con una retención (`BOOKING_HOLD_MINUTES`, 20 min por defecto); una tarea cada minuto libera las vencidas. Un pago aprobado tardío intenta recuperar el cupo de forma atómica; si no hay, se marca para reembolso.

## Consecuencias
- Probado con 12 peticiones simultáneas por el último cupo: exactamente 1 reserva.
- Sin bloqueos largos ni colas externas.
- Las tareas corren en el proceso de la API (una sola réplica por ahora).
