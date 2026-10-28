# Respaldos y recuperación

## Qué se respalda

| Dato | Dónde vive | Cómo se respalda |
|---|---|---|
| Base de datos (usuarios, reservas, pagos, libro contable, auditoría) | Volumen `pgdata` | `scripts/backup-db.sh` (`pg_dump` formato custom, nivel 9) |
| Fotos públicas y documentos privados (RNT, RUT) | Volumen `storage` (`/data/storage`) | Copia del volumen (p. ej. `restic` o `rsync` cifrado) |
| Certificados TLS | Volumen `caddy_data` | No es crítico: Caddy los vuelve a emitir |
| Secretos | `infrastructure/.env` | Gestor de secretos, nunca junto a los respaldos |

## Objetivos sugeridos

- **RPO** (pérdida máxima): 6 horas con `pg_dump` programado. Para bajarlo a minutos hace falta archivado WAL o una base administrada con PITR.
- **RTO** (tiempo de recuperación): menos de 1 hora para una base del tamaño del piloto.

Estos números son una propuesta; los define el negocio.

## Respaldo

```bash
DATABASE_URL=postgresql://... BACKUP_DIR=/var/backups/travelcol RETENTION_DAYS=14 ./scripts/backup-db.sh
```

El script:

1. crea el directorio con permisos 700;
2. genera `travelcol-<UTC>.dump` y comprueba que se puede listar con `pg_restore --list`;
3. escribe el `sha256` del archivo y deja ambos con permisos 600;
4. elimina los respaldos más antiguos que `RETENTION_DAYS`.

Programación con cron (cada 6 horas), desde el servidor:

```cron
0 */6 * * * cd /opt/travelcol && docker compose -f infrastructure/docker-compose.yml --env-file infrastructure/.env exec -T db \
  pg_dump -U travelcol -Fc -Z9 travelcol > /var/backups/travelcol/travelcol-$(date -u +\%Y\%m\%dT\%H\%M\%SZ).dump
```

o, con `pg_dump` 16 instalado en el servidor, el script directamente. **Copia los respaldos fuera del servidor** (otro proveedor o un bucket con bloqueo de objetos). Los respaldos contienen datos personales: cífralos (p. ej. `age` o el cifrado del bucket) y limita quién puede leerlos (Ley 1581 de 2012).

## Restauración

```bash
createdb travelcol_restore     # base NUEVA y vacía
TARGET_DATABASE_URL=postgresql://.../travelcol_restore ./scripts/restore-db.sh /var/backups/travelcol/travelcol-XXXX.dump
```

El script verifica el `sha256`, **se niega a restaurar sobre una base que tenga tablas** y al final muestra el conteo de reservas, pagos y movimientos contables. Después:

1. arranca la API contra la base restaurada en un entorno aparte y revisa el panel de administración;
2. cuando esté validada, cambia `DATABASE_URL` (o el volumen) y reinicia la API;
3. registra el incidente: qué se perdió entre el respaldo y la falla, y concilia los pagos de esa ventana con el panel de Wompi.

## Prueba periódica

Una vez al mes, restaura el último respaldo en una base desechable y verifica el conteo. Un respaldo que nunca se restauró no está probado.

**Verificado en este repositorio (28-oct-2026):** respaldo de la base de desarrollo, restauración en una base nueva con conteos idénticos, y rechazo de la restauración sobre una base con tablas.
