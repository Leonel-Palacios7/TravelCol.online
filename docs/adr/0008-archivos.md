# ADR 0008: Archivos en disco local con validación por firma binaria

- Estado: aceptada, con reemplazo previsto (28-oct-2026)

## Contexto
Los proveedores suben fotos públicas y documentos privados (RNT, RUT, cédula). No había un almacenamiento de objetos configurado.

## Decisión
Un `StorageService` guarda en `STORAGE_DIR` (volumen Docker), con carpetas separadas para público y privado y nombres aleatorios. El tipo se valida por firma binaria; los PDF con JavaScript se rechazan. Los documentos privados se sirven solo por la API, tras verificar dueño o rol.

## Consecuencias
- Funciona en un solo nodo. Para varias réplicas hay que implementar el mismo servicio sobre S3 o compatible.
- No se eliminan metadatos EXIF ni se escanea con antivirus (pendientes en [seguridad.md](../seguridad.md)).
