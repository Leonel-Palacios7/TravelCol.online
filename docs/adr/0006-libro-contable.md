# ADR 0006: Libro contable de solo inserción y liquidaciones manuales

- Estado: aceptada (28-oct-2026)

## Contexto
Saldos calculados con `UPDATE` pierden historia y son difíciles de auditar.

## Decisión
Cada hecho económico (venta, comisión, reembolso, ajuste, liquidación) es una fila de `ledger_entries` con clave de idempotencia. Un trigger impide `UPDATE` y `DELETE`, salvo asignar o liberar la liquidación a la que pertenece una fila. El saldo del proveedor es la suma de sus movimientos. Solo se liquidan reservas cuyo servicio ya ocurrió dentro del periodo; la transferencia bancaria se hace fuera y se registra con su referencia.

## Consecuencias
- Auditoría completa y conciliable con Wompi.
- Las correcciones se hacen con movimientos de ajuste, nunca editando filas.
- No hay pagos automáticos a proveedores.
