#!/usr/bin/env bash
# Respaldo lógico de PostgreSQL (pg_dump formato custom, comprimido) con retención.
#   DATABASE_URL=postgresql://... BACKUP_DIR=/var/backups/travelcol RETENTION_DAYS=14 ./scripts/backup-db.sh
# Programar con cron (p. ej. cada 6 horas) y copiar BACKUP_DIR fuera del servidor (S3, otro proveedor).
# Ver docs/respaldos.md. Los archivos de respaldo contienen datos personales: cifrar y restringir acceso.
set -euo pipefail
: "${DATABASE_URL:?Define DATABASE_URL}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_DIR/travelcol-$STAMP.dump"

pg_dump --format=custom --compress=9 --no-owner --no-privileges --file="$FILE" "$DATABASE_URL"
# Verificación mínima: el archivo debe poder listarse.
pg_restore --list "$FILE" > /dev/null
sha256sum "$FILE" > "$FILE.sha256"
chmod 600 "$FILE" "$FILE.sha256"
echo "Respaldo creado: $FILE ($(du -h "$FILE" | cut -f1))"

find "$BACKUP_DIR" -name 'travelcol-*.dump*' -type f -mtime +"$RETENTION_DAYS" -print -delete
