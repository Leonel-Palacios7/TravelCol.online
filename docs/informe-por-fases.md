# Informe por fases (formato A–E)

Fecha: 28-oct-2026. Cada fase sigue el formato pedido: **A** trabajo realizado, **B** verificación, **C** incidencias, **D** ejecución y **E** estado. Los comandos de ejecución (D) son comunes a todas las fases y están al final para no repetirlos.

Estados usados en E: **Completo y verificado**, **Implementado con validación pendiente**, **Parcial** y **Bloqueado por un requisito externo**.

---

## Fase 0. Auditoría y diagnóstico

- **A.** No había repositorio ni código previo: el proyecto se construyó desde cero. Se documentaron supuestos (piloto Villeta, COP, `America/Bogota`, comisión 12 %, retención de 20 min) en [00-fase-0-diagnostico.md](00-fase-0-diagnostico.md).
- **B.** No aplica compilación. Se revisaron las referencias visuales y la documentación pública de Wompi (firma de integridad y checksum de eventos; la prueba unitaria reproduce el ejemplo oficial).
- **C.** Sin código heredado que auditar. Riesgo: los supuestos de negocio deben confirmarse.
- **E.** Completo y verificado.

## Fase 1. Diseño técnico

- **A.** Arquitectura ([arquitectura.md](arquitectura.md)), modelo de datos con 28 modelos y 21 enums ([modelo-de-datos.md](modelo-de-datos.md), diccionario generado y diagrama ER Mermaid), matriz de permisos ([permisos.md](permisos.md)), flujos de reserva y pago, finanzas y 9 ADR.
- **B.** El diccionario y el diagrama se generan desde `schema.prisma` (`scripts/docs/gen-data-dictionary.py`), así que no divergen del código. La especificación OpenAPI se exporta desde la API (90 rutas, 97 operaciones).
- **C.** Ninguna.
- **E.** Completo y verificado.

## Fase 2. Fundamentos ejecutables

- **A.** Monorepo pnpm y Turborepo; `packages/contracts` (Zod); API NestJS con configuración validada, registros pino con redacción, Helmet, limitador y salud; migración inicial con CHECK, índices parciales y trigger; semilla base y semilla DEMO separadas.
- **B.** `pnpm lint` y `pnpm typecheck` sin problemas; la migración se aplica sobre una base limpia en cada ejecución de las pruebas de integración.
- **C.** Prisma pasó a dependencias de producción para correr `migrate deploy` dentro del contenedor.
- **E.** Completo y verificado.

## Fase 3. Identidad y permisos

- **A.** Registro con consentimiento versionado, verificación de correo, ingreso con bloqueo, recuperación, sesiones opacas en cookie HttpOnly, CSRF de doble envío, roles TOURIST, PROVIDER, SUPPORT y ADMIN, verificación de propiedad, solicitud de proveedor aprobada por ADMIN, suspensión y auditoría.
- **B.** 16 pruebas de integración de autenticación y permisos y 6 E2E de seguridad, todas aprobadas.
- **C.** Se agregó SUPPORT (no estaba en el encargo) para separar la operación diaria de las acciones financieras y de configuración, que quedan solo para ADMIN.
- **E.** Implementado con validación pendiente: el correo real no está conectado (los enlaces se escriben en el registro) y no hay MFA.

## Fase 4. Catálogo y experiencia visual

- **A.** Sistema de diseño que combina las dos referencias ([diseno.md](diseno.md)); inicio, catálogo con filtros y paginación, detalle con disponibilidad, destino Villeta, perfil de operador, FAQ, contacto/PQR, textos legales, SEO (metadatos, `sitemap`, `robots`, datos estructurados) y 7 ilustraciones SVG originales. Los datos de demostración están marcados como DEMO.
- **B.** 7 pruebas E2E responsive en Pixel 7 (sin desplazamiento horizontal, menú móvil). Revisión visual con capturas de Playwright durante el desarrollo.
- **C.** Corregidos: desajuste de hidratación por el espacio fino de ICU en las fechas, desbordamiento horizontal de los paneles en móvil. Pendiente: auditoría WCAG 2.2 AA con lector de pantalla; mapa no implementado.
- **E.** Implementado con validación pendiente (accesibilidad formal).

## Fase 5. Reservas e inventario

- **A.** Reserva con precio calculado en el servidor y foto de precio, inventario con actualización condicional atómica, retención que expira, cancelación por políticas FLEXIBLE, MODERADA y ESTRICTA, cancelación por el proveedor, reseñas solo de reservas completadas.
- **B.** 12 pruebas de integración, entre ellas 12 peticiones concurrentes por el último cupo con exactamente una reserva, y el CHECK que rechaza la sobreventa aunque se salte la aplicación.
- **C.** Ninguna abierta.
- **E.** Completo y verificado.

## Fase 6. Wompi

- **A.** Checkout con referencia única y firma de integridad, redirección al Web Checkout, webhook con checksum, almacenamiento idempotente de eventos, comparación de importe y moneda, verificación opcional contra la API de Wompi, sincronización al volver y manejo de pagos tardíos, anulados y duplicados. Script `wompi:simulate` para desarrollo (se niega a correr en producción).
- **B.** 10 pruebas de integración de pagos y los pasos 7 y 8 del recorrido E2E, todas aprobadas, con eventos firmados localmente.
- **C.** Limitación externa: no se contó con llaves de Wompi Sandbox, así que **no hubo una transacción real** ni se probó la consulta a su API.
- **E.** Bloqueado por un requisito externo (llaves de Sandbox) para la validación final; el código está implementado y probado localmente.

## Fase 7. Paneles operativos

- **A.** Panel del turista (reservas, favoritos, notificaciones, perfil, exportación y supresión), del proveedor (experiencias, fotos, fechas, reservas, finanzas, documentos) y de administración/soporte (indicadores, solicitudes, verificación de RNT, moderación, pagos y eventos, reembolsos, liquidaciones, usuarios, comisión, auditoría, reseñas, PQR y reportes CSV).
- **B.** Recorrido E2E de 10 pasos (visitante → turista → pago → proveedor → administración) y alta de proveedor de 6 pasos, aprobados.
- **C.** Se separó el saldo liquidable del saldo por servicios aún no prestados, porque una liquidación no debe incluir reservas futuras (encontrado por la prueba E2E).
- **E.** Completo y verificado.

## Fase 8. Calidad y seguridad

- **A.** Pruebas en cuatro niveles ([pruebas.md](pruebas.md)), matriz de seguridad orientada a ASVS 5.0 ([seguridad.md](seguridad.md)), validación de archivos por firma binaria y CI con lint, tipos, pruebas, E2E y construcción de imágenes.
- **B.** Contratos 5/5, unitarias 16/16, integración 44/44, E2E 26/26, lint y tipos sin problemas.
- **C.** Pendientes: CSP con `'unsafe-inline'`, sin eliminación de EXIF, sin antivirus, limitador en memoria. **No se hizo auditoría externa**; la matriz es una autoevaluación.
- **E.** Implementado con validación pendiente.

## Fase 9. Preparación para lanzamiento

- **A.** Dockerfiles de API y web (usuario sin privilegios, healthcheck), `docker-compose.yml` con migración previa y Caddy con HTTPS, scripts de respaldo y restauración, guías de despliegue y rollback, matriz de cumplimiento ([cumplimiento.md](cumplimiento.md)) y brecha a producción ([brecha-a-produccion.md](brecha-a-produccion.md)).
- **B.** Imágenes construidas y ejecutadas: migración, semilla de producción sin datos DEMO, healthcheck, Swagger desactivado y login a través de la web. La API se niega a arrancar sin llaves Wompi ni sal. Respaldo y restauración probados. `docker compose config` válido.
- **C.** Limitaciones del entorno: el `docker compose` completo no se ejecutó (límite de descargas de Docker Hub para `postgres` y `caddy`); `apt` bloqueado por el proxy, por lo que la imagen no incluye `openssl` (Prisma lo advierte pero funciona). Imagen de la API de 773 MB por optimizar.
- **E.** Parcial: faltan los puntos P0 de [brecha-a-produccion.md](brecha-a-produccion.md).

---

## Controles obligatorios antes de liberar una versión

| Control | Estado |
|---|---|
| El frontend compila | Sí (`next build`) |
| El backend compila | Sí (`nest build`) |
| Las migraciones funcionan en una base limpia | Sí, en cada ejecución de integración y en la imagen Docker |
| Las pruebas automatizadas pasan | Sí: 5 + 16 + 44 + 26 |
| Lint y tipos pasan | Sí |
| Los recorridos críticos están comprobados | Sí con Wompi simulado por eventos firmados; **falta Sandbox real** |
| No hay secretos reales en el repositorio | Sí: solo valores de ejemplo y llaves falsas marcadas `*_E2E_ONLY` |
| Errores de seguridad críticos identificados corregidos | Sí los encontrados; sin revisión externa |
| La documentación permite reproducir el entorno | Sí ([desarrollo-local.md](desarrollo-local.md), [despliegue.md](despliegue.md)) |
| Los fallos pendientes están documentados | Sí ([brecha-a-produccion.md](brecha-a-produccion.md)) |

**Conclusión:** MVP completo y verificado con pruebas automatizadas. **No está listo para producción con dinero real** hasta cerrar los puntos P0.

---

## D. Ejecución (común a todas las fases)

```bash
# Entorno
./scripts/dev-setup.sh          # dependencias, .env de ejemplo, migraciones y semilla DEMO
pnpm dev                        # web :3000 · API :4000 (Swagger en /api/docs)

# Variables
#   apps/api/.env y apps/web/.env a partir de los .env.example; lista en docs/variables-de-entorno.md

# Pruebas
pnpm lint && pnpm typecheck
pnpm --filter @travelcol/contracts test
pnpm --filter @travelcol/api test
pnpm --filter @travelcol/api build && pnpm --filter @travelcol/web build
DATABASE_URL=postgresql://travelcol:travelcol_dev@localhost:5432/travelcol_e2e pnpm test:e2e
```

Acceso a los módulos con las cuentas de demostración del [README](https://github.com/Leonel-Palacios7/TravelCol.online#readme): `/cuenta` (turista), `/proveedor` (proveedor), `/admin` (administración y soporte).
