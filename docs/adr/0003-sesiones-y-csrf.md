# ADR 0003: Sesiones opacas en cookie HttpOnly y CSRF de doble envío

- Estado: aceptada (28-oct-2026)

## Contexto
El encargo prohíbe guardar tokens en `localStorage`. Un JWT en el navegador tampoco se puede revocar al instante cuando se suspende una cuenta o cambia un rol.

## Decisión
Token aleatorio de 256 bits en la cookie `tc_session` (HttpOnly, SameSite=Lax, Secure en producción). La base guarda solo su SHA-256, con expiración y revocación. Web y API comparten origen gracias al reenvío `/api/v1` de Next.js, así que las cookies son de primera parte. Toda mutación exige la cabecera `X-CSRF-Token` igual a la cookie legible `tc_csrf`.

## Consecuencias
- Revocación inmediata al salir, suspender o cambiar rol.
- Una consulta a la base por petición autenticada (aceptable a la escala del piloto; cacheable más adelante).
- Clientes móviles nativos futuros necesitarán otro mecanismo (p. ej. tokens con rotación).
