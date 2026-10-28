# Brecha a producción

Este repositorio es un **MVP funcional y verificado con pruebas automatizadas**, pero **no está listo para producción con dinero real**. El encargo pide no usar esa expresión mientras queden pruebas críticas pendientes, secretos sin configurar o pagos sin validar, y hoy quedan las tres cosas.

Prioridad: **P0** bloquea el lanzamiento con dinero real, **P1** debe resolverse antes de crecer más allá del piloto y **P2** es una mejora planeada.

## P0: antes de cobrar el primer peso

| # | Brecha | Por qué bloquea | Qué hacer | Responsable sugerido |
|---|---|---|---|---|
| 1 | Pagos no probados contra **Wompi Sandbox real** | Las firmas y el webhook están probados con eventos firmados localmente, pero no hubo una transacción de extremo a extremo con Wompi ni se probó `WOMPI_VERIFY_WITH_API` contra su API | Seguir la lista de [pagos-wompi.md](pagos-wompi.md#prueba-manual-en-sandbox-lista-de-verificación): aprobada, rechazada, pendiente, anulada, evento repetido y pago tardío | Desarrollo |
| 2 | Llaves y secretos de producción sin configurar | Ningún secreto real está en el repositorio, como debe ser | Cuenta Wompi de producción y su verificación comercial; secretos en un gestor; `IP_HASH_SALT` y contraseña de base nuevas | Negocio + operaciones |
| 3 | Sin proveedor de correo | El controlador `log` escribe los correos en el registro: los turistas no reciben verificación, confirmación ni recuperación | Implementar el controlador SMTP o de API (Amazon SES, Postmark…) en `MailService`; SPF, DKIM y DMARC del dominio | Desarrollo |
| 4 | Textos legales en borrador y matriz normativa sin validar | Términos, privacidad, cancelaciones y términos de proveedor son la versión `0.1-borrador` | Revisión jurídica de [cumplimiento.md](cumplimiento.md) y publicación de versiones definitivas. Hoy el consentimiento queda ligado a la versión aceptada, pero la plataforma no pide aceptar de nuevo cuando sale una versión nueva: hay que agregar ese paso | Asesoría jurídica |
| 5 | Facturación electrónica, impuestos y costos de la pasarela no modelados | La comisión se debe facturar y el neto del proveedor cambia con IVA, retenciones y la tarifa de Wompi | Definir el modelo tributario con contabilidad e integrar un proveedor tecnológico de la DIAN | Contabilidad + desarrollo |
| 6 | Sin revisión de seguridad externa | Solo hay autoevaluación y pruebas automatizadas ([seguridad.md](seguridad.md)) | Prueba de penetración enfocada en autenticación, permisos, pagos y archivos; `pnpm audit` sin vulnerabilidades altas | Seguridad |
| 7 | Despliegue completo no ensayado | Las imágenes de API y web se probaron por separado; el `docker compose` con PostgreSQL y Caddy no se ejecutó completo en este entorno (límite de descargas de Docker Hub) | Ensayo en un servidor de pruebas con dominio real: despliegue, actualización, rollback y restauración de respaldo | Operaciones |
| 8 | Sin monitoreo ni alertas | Un webhook rechazado o un pago atascado pasaría inadvertido | Registros centralizados, monitor de `/health/ready` y alertas por `INVALID_SIGNATURE`, `MISMATCH` y `stalePendingPayments > 0` | Operaciones |
| 9 | Proveedores reales sin incorporar | El catálogo actual es **DEMO** | Incorporar operadores de Villeta con RNT verificado, fotos propias y precios reales; cargar con `SEED_DEMO=false` | Negocio |

## P1: antes de crecer

| Brecha | Qué hacer |
|---|---|
| Archivos en disco local | Implementar `StorageService` sobre S3 o compatible ([ADR 0008](adr/0008-archivos.md)) |
| Limitador en memoria y tareas en el proceso | Redis para el limitador; worker único o `pg_advisory_lock` para las tareas |
| CSP con `'unsafe-inline'` | Nonces por petición en Next.js |
| Fotos con metadatos EXIF | Reprocesar con `sharp` al subir |
| Sin MFA para administración | TOTP para ADMIN y SUPPORT |
| Sin antivirus de documentos | ClamAV o servicio equivalente |
| Imagen de la API de 773 MB | Etapa final más delgada (copiar solo `dist`, `prisma` y dependencias de producción) |
| Aviso de Prisma «OpenSSL no detectado» | Instalar `openssl` en la imagen; aquí no fue posible porque el proxy del entorno bloqueaba `apt` |
| Accesibilidad sin auditoría formal | Pruebas con lector de pantalla y `axe` en el CI contra WCAG 2.2 AA |
| Pruebas en Safari y Firefox, y de carga | Agregar proyectos de Playwright y una prueba de carga del flujo de reserva |
| Base de datos sin PITR | Base administrada o archivado WAL ([respaldos.md](respaldos.md)) |

## P2: funcionalidades planeadas

- Mapa de experiencias y punto de encuentro.
- Promociones y cupones.
- Reembolsos automáticos por la API de Wompi.
- Pagos automáticos a proveedores.
- Más destinos además de Villeta.
- Aplicación móvil.

## Lo que sí está cerrado

Para ver la otra cara de la lista: autenticación y sesiones seguras, permisos por rol y propiedad, inventario sin sobreventa, precio calculado en el servidor, webhook idempotente con verificación de firma, libro contable inmutable, reembolsos y liquidaciones, paneles de las tres audiencias, documentación, Docker, CI y respaldos probados. El detalle y la evidencia están en [pruebas.md](pruebas.md) y en el [informe por fases](informe-por-fases.md).
