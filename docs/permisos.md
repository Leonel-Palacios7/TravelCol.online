# Matriz de permisos

La autorización vive en la API, no en la interfaz. Hay guardas globales en este orden: limitación de tasa, sesión, rol y CSRF. Además, cada servicio de dominio verifica la **propiedad** del recurso: un recurso ajeno responde `404` para no revelar que existe. La web solo oculta lo que el usuario no puede usar.

Leyenda: ✅ permitido · 🔒 solo recursos propios · ❌ denegado (`401` sin sesión, `403` por rol).

| Capacidad | Visitante | TOURIST | PROVIDER | SUPPORT | ADMIN |
|---|---|---|---|---|---|
| Ver catálogo, detalle, destinos, perfiles públicos, textos legales | ✅ | ✅ | ✅ | ✅ | ✅ |
| Enviar PQR / contacto | ✅ | ✅ | ✅ | ✅ | ✅ |
| Registrarse (siempre como TOURIST; el campo `role` se rechaza) | ✅ | — | — | — | — |
| Perfil, favoritos, notificaciones, exportar datos, solicitar supresión | ❌ | 🔒 | 🔒 | 🔒 | 🔒 |
| Crear reserva y pagarla | ❌ | 🔒 | 🔒 | 🔒 | 🔒 |
| Ver y cancelar sus reservas | ❌ | 🔒 | 🔒 | 🔒 | 🔒 |
| Reseñar (reserva completada, correo verificado, una por reserva) | ❌ | 🔒 | 🔒 | 🔒 | 🔒 |
| Solicitar ser proveedor (correo verificado, una solicitud pendiente a la vez) | ❌ | ✅ | — | — | — |
| Gestionar experiencias, fotos, fechas y cupos | ❌ | ❌ | 🔒 | ❌ | ❌ |
| Ver reservas de sus experiencias con datos de contacto | ❌ | ❌ | 🔒 | ❌ | ❌ |
| Cancelar una reserva de su experiencia (reembolso del 100 %) | ❌ | ❌ | 🔒 | ❌ | ❌ |
| Ver su libro contable y liquidaciones; subir y descargar sus documentos | ❌ | ❌ | 🔒 | ❌ | ❌ |
| Panel administrativo: indicadores, reservas, pagos, eventos de webhook | ❌ | ❌ | ❌ | ✅ | ✅ |
| Ver proveedores, verificar y rechazar documentos (incluye RNT) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Moderar experiencias (publicar exige RNT verificado) y reseñas | ❌ | ❌ | ❌ | ✅ | ✅ |
| Atender PQR | ❌ | ❌ | ❌ | ✅ | ✅ |
| Aprobar o rechazar solicitudes de proveedor | ❌ | ❌ | ❌ | ❌ | ✅ |
| Suspender o reactivar proveedores | ❌ | ❌ | ❌ | ❌ | ✅ |
| Cancelar reservas administrativamente | ❌ | ❌ | ❌ | ❌ | ✅ |
| Reembolsos (registrar ejecución o rechazo) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Liquidaciones (generar, registrar pago, anular) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Usuarios: suspender o reactivar, cambiar rol | ❌ | ❌ | ❌ | ❌ | ✅ (no a sí mismo; `PROVIDER` solo vía solicitud) |
| Comisión de la plataforma | ❌ | ❌ | ❌ | ❌ | ✅ |
| Auditoría y reportes CSV | ❌ | ❌ | ❌ | ❌ | ✅ |
| Webhook de Wompi | Autenticado por checksum del evento (sin sesión ni CSRF) | | | | |

## Reglas transversales

- Una cuenta suspendida pierde el acceso al instante, porque todas sus sesiones se revocan.
- Restablecer la contraseña y usar “cerrar sesión en todos los dispositivos” también revocan todas las sesiones.
- Los cambios de rol, estado, comisión y decisiones financieras exigen un motivo y quedan en `audit_logs`.
- Pruebas que lo verifican: `apps/api/test/integration/auth-permissions.spec.ts` y `tests/e2e/seguridad.spec.ts`.
