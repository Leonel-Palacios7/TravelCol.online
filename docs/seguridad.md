# Seguridad

> **Alcance de esta evaluación.** Lo que sigue es una autoevaluación del equipo de desarrollo, orientada a OWASP ASVS 5.0 (nivel 2), el marco pedido en el encargo, y al OWASP Top 10 (2021), respaldada por pruebas automatizadas. **No es una auditoría de seguridad.** No se ha hecho una prueba de penetración ni una revisión externa, y ambas son requisito antes de operar con dinero real ([brecha-a-produccion.md](brecha-a-produccion.md)).

## Matriz de controles

| Capítulo ASVS 5.0 | Control implementado | Evidencia |
|---|---|---|
| V6 Autenticación | Contraseñas con Argon2id (19 MiB, t=2), mínimo 10 caracteres con letra y número, máximo 128. Rehash automático si cambian los parámetros | `auth.service.ts`, `passwordSchema` |
| V6 Autenticación | Bloqueo de 15 min tras 5 intentos fallidos; mensaje genérico; hash ficticio para igualar tiempos cuando el correo no existe | integración «bloquea tras 5 intentos» |
| V6 Autenticación (recuperación) | Token aleatorio de un solo uso con vencimiento, guardado como hash; la respuesta no revela si el correo existe; al restablecer se cierran las demás sesiones | integración «recuperación no revela…» |
| V7 Gestión de sesiones | Token opaco de 256 bits en cookie `tc_session` HttpOnly, SameSite=Lax, Secure en producción. La base guarda solo su SHA-256. Vence en 7 días (configurable); revocación en servidor al salir, al suspender y al cambiar rol | integración «logout revoca…», «cuenta suspendida…» |
| V3 Seguridad del frontend web | Nada sensible en `localStorage` ni `sessionStorage` | E2E seguridad |
| V8 Autorización | Guardias globales: todo endpoint es privado salvo `@Public()`; roles por decorador; propiedad verificada en cada consulta (responde 404 para no revelar existencia) | [permisos.md](permisos.md); 10 pruebas de integración de permisos |
| V3 Seguridad del frontend web (CSRF) | Doble envío: cookie `tc_csrf` + cabecera `X-CSRF-Token` comparadas en tiempo constante en toda mutación; además SameSite=Lax y CORS con lista de orígenes | integración y E2E CSRF |
| V1 Codificación y saneamiento / V2 Validación | Esquemas Zod estrictos compartidos (rechazan campos desconocidos como `role` o `totalCop`); Prisma con consultas parametrizadas; React escapa la salida | integración «impide elevar privilegios», «ignora importes del cliente» |
| V11 Criptografía | `crypto.randomBytes` para tokens; SHA-256 para firmas Wompi; comparación `timingSafeEqual`; HSTS en producción; TLS por Caddy | unitarias de firmas |
| V16 Registro de seguridad y manejo de errores | JSON con pino; se redactan cookies, `Authorization`, `X-CSRF-Token`, `X-Event-Checksum` y `Set-Cookie`; IP guardada como hash con sal (`IP_HASH_SALT`); auditoría de acciones administrativas | `app.module.ts`, tabla `audit_logs` |
| V14 Protección de datos | Exportación de datos personales y solicitud de supresión (Ley 1581); documentos privados fuera de la carpeta pública y servidos solo a dueño y administración | E2E/integración de archivos |
| V12 Comunicación segura | HTTPS obligatorio en el despliegue de referencia; cookies `Secure` en producción | `Caddyfile` |
| V15 Codificación y arquitectura segura | Sin `eval`; dependencias fijadas en `pnpm-lock.yaml` | CI |
| V2 Validación y lógica de negocio | Precio, comisión y total calculados solo en el servidor; inventario con `UPDATE` condicional y CHECK; confirmación de pago solo por webhook firmado (nunca por la URL de retorno); máquinas de estado que no retroceden; libro contable de solo inserción por trigger | integración de reservas y pagos |
| V5 Manejo de archivos | Tipo real por firma binaria (no por extensión ni `Content-Type`); máximo 5 MB fotos y 10 MB documentos; PDF con JavaScript o acciones rechazado; nombres aleatorios; `Content-Disposition` y `nosniff` | integración de archivos |
| V4 API y servicios web | Limitador global (120 por minuto por IP) y estricto en autenticación (10 por minuto); tamaño de cuerpo limitado; errores sin trazas en producción; Swagger desactivado en producción | `env.ts`, verificación Docker |
| V13 Configuración | Variables validadas al iniciar (la API no arranca sin llaves Wompi ni sal); cabeceras con Helmet en la API y CSP, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` en la web; contenedores sin root | E2E «cabeceras de seguridad», verificación Docker |

## Pagos (resumen)

- La llave privada y el secreto de eventos de Wompi viven solo en la API, nunca en la web ni en el navegador. La web recibe la firma de integridad ya calculada.
- Cada evento se verifica con su checksum, se guarda con una clave idempotente y se compara con el importe y la moneda esperados. Un evento con firma inválida queda registrado como evidencia y no cambia nada.
- Con `WOMPI_VERIFY_WITH_API=true`, el estado se vuelve a consultar en la API de Wompi antes de confirmar.
- La plataforma no recibe ni almacena datos de tarjetas: el pago ocurre en el checkout de Wompi.

Detalle en [pagos-wompi.md](pagos-wompi.md) y [flujo-reservas-y-pagos.md](flujo-reservas-y-pagos.md).

## Pendientes conocidos

| Pendiente | Riesgo | Propuesta |
|---|---|---|
| CSP con `'unsafe-inline'` en scripts | Un XSS tendría menos barreras | Nonces por petición en el middleware de Next.js |
| Limitador en memoria | Con varias réplicas el límite se multiplica | Redis como almacenamiento del limitador |
| Fotos sin eliminación de metadatos EXIF | Pueden filtrar ubicación GPS del proveedor | Reprocesar con `sharp` al subir (hoy se advierte al usuario) |
| Sin segundo factor (MFA) para administración | Una contraseña filtrada da acceso total | TOTP obligatorio para ADMIN y SUPPORT |
| Sin escaneo antivirus de documentos | Un PDF malicioso que pase la validación | ClamAV o servicio equivalente antes de guardar |
| Sin auditoría de dependencias programada | Vulnerabilidades conocidas sin detectar | `pnpm audit` y Dependabot en el CI |
| Sin prueba de penetración | Fallas no cubiertas por las pruebas | Contratar revisión externa antes del lanzamiento |
| Sin monitoreo ni alertas | Incidentes detectados tarde | Centralizar registros y alertar sobre eventos `INVALID_SIGNATURE`, `MISMATCH` y pagos pendientes antiguos |

## Reportar una vulnerabilidad

Define un buzón (por ejemplo `seguridad@<dominio>`) y publícalo en `/.well-known/security.txt` antes del lanzamiento.
