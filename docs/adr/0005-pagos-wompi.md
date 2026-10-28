# ADR 0005: Wompi Web Checkout con el webhook firmado como fuente de verdad

- Estado: aceptada (28-oct-2026)

## Contexto
La URL de retorno del checkout la controla el navegador y puede manipularse. Los eventos pueden llegar duplicados, tarde o fuera de orden.

## Decisión
La API genera la referencia única y la firma de integridad; la web redirige al Web Checkout de Wompi. Solo un evento con checksum válido (y, con `WOMPI_VERIFY_WITH_API=true`, confirmado contra la API de Wompi) cambia el estado. Cada evento se guarda con una clave idempotente y su resultado (`PROCESSED`, `DUPLICATE`, `MISMATCH`, `INVALID_SIGNATURE`…). El retorno solo dispara una consulta de sincronización al servidor y luego espera.

Los reembolsos no se ejecutan por API: administración los realiza en el panel de Wompi y los registra en la plataforma, lo que ajusta el libro contable.

## Consecuencias
- Un parámetro `status=APPROVED` en la URL no tiene efecto (probado).
- Hace falta una prueba real en Sandbox antes de producción ([pagos-wompi.md](../pagos-wompi.md)).
- Los reembolsos dependen de un paso manual que debe quedar en el procedimiento operativo.
