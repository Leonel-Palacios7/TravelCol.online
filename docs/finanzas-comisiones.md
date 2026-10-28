# Finanzas, comisiones y liquidaciones

> Supuestos de negocio para validar con contabilidad y con jurídica antes de operar.

## Cálculo (siempre en el servidor)

```
subtotal       = precio_unitario × participantes
cargos         = 0                                  (el MVP no cobra cargos al turista)
total          = subtotal + cargos                  (lo que paga el turista)
comisión       = redondeo_mitad_arriba(subtotal × comisión_bps / 10 000)
neto_proveedor = subtotal − comisión
```

- La comisión se configura en Administración, Configuración, en puntos básicos (1200 = 12 %, rango de 0 a 5000). Cada cambio exige un motivo y queda auditado.
- Cada reserva guarda su `commission_bps`, `commission_cop` y `provider_net_cop`. Un cambio de comisión solo afecta reservas nuevas.
- Ejemplo: 2 personas × $35.000 = $70.000. Comisión 12 % = $8.400. Neto del proveedor = $61.600.

## Libro contable (`ledger_entries`)

Cada movimiento pertenece a un proveedor. El saldo a favor del proveedor es la suma de los asientos.

| Tipo | Signo | Cuándo |
|---|---|---|
| `SALE` | + subtotal | Pago aprobado |
| `COMMISSION` | − comisión | Pago aprobado |
| `REFUND` | − parte del subtotal reembolsada | Reembolso **ejecutado** (registrado por ADMIN) |
| `COMMISSION_REVERSAL` | + parte de la comisión revertida | Reembolso ejecutado |
| `PAYOUT` | − neto pagado | Liquidación marcada como pagada |
| `ADJUSTMENT` | ± | Reservado para ajustes manuales futuros |

Garantías:

- Solo inserción: un trigger en la base rechaza borrados y cambios.
- Cada asiento tiene una `idempotency_key` única, así que un evento repetido no duplica movimientos.

## Reembolsos

1. Cuando hay una cancelación con derecho a reembolso, se calcula `refundSplit`:
   - Devolución al turista = total × %.
   - Parte del proveedor = subtotal × %.
   - Comisión revertida = comisión × %.
2. Se crea un `Refund` en estado `REQUESTED` y se avisa a administración.
3. ADMIN ejecuta la devolución en el panel de Wompi (o por transferencia) y la **registra** con su referencia. En ese momento se escriben `REFUND` y `COMMISSION_REVERSAL`.
4. Los porcentajes dependen de la política de la experiencia:

| Política | Anticipación | Reembolso |
|---|---|---|
| Flexible | ≥ 24 h | 100 % |
| Moderada | ≥ 72 h | 100 % |
| | 24 a 72 h | 50 % |
| Estricta | ≥ 7 días | 50 % |
| Cancelación por el proveedor o el admin | cualquier momento | 100 % |

## Liquidaciones a proveedores

1. Administración, Liquidaciones muestra por proveedor:
   - lo **liquidable hoy** (servicios ya prestados),
   - lo que está en **servicios por prestar**.
2. «Generar liquidación» agrupa los asientos sin liquidar hasta la fecha de corte (hora de Colombia, nunca después del momento actual) y crea un borrador con ventas, comisión, reembolsos y neto.
3. Se transfiere el neto **fuera de la plataforma** y se registra la referencia. Se escribe un `PAYOUT` y el saldo pendiente queda en cero.
4. Un borrador se puede anular: sus asientos vuelven a quedar pendientes.

## Pendiente (contable y tributario)

- Facturación electrónica de la comisión de TravelCol al proveedor, y definir quién factura al turista (ver [cumplimiento.md](cumplimiento.md)).
- Tratamiento de IVA, retenciones (ReteFuente, ReteICA, ReteIVA) y del GMF en recaudos a nombre de terceros.
- Conciliación con los reportes de Wompi, incluidas las comisiones de la pasarela, que **no** están modeladas en este MVP.
