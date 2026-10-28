#!/usr/bin/env bash
# Restaura un respaldo en una base de datos NUEVA y vacía (nunca sobre la base productiva en uso).
#   TARGET_DATABASE_URL=postgresql://.../travelcol_restore ./scripts/restore-db.sh backups/travelcol-XXXX.dump
# Procedimiento completo y prueba periódica de restauración: docs/respaldos.md
set -euo pipefail
FILE="${1:?Uso: restore-db.sh <archivo.dump>}"
: "${TARGET_DATABASE_URL:?Define TARGET_DATABASE_URL (base nueva y vacía)}"
if [[ -f "$FILE.sha256" ]]; then sha256sum --check "$FILE.sha256"; fi

TABLES="$(psql "$TARGET_DATABASE_URL" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")"
if [[ "$TABLES" != "0" ]]; then
  echo "Abortado: la base destino no está vacía ($TABLES tablas). Restaura sobre una base nueva." >&2
  exit 1
fi
pg_restore --no-owner --no-privileges --exit-on-error --dbname="$TARGET_DATABASE_URL" "$FILE"
psql "$TARGET_DATABASE_URL" -tAc "SELECT 'reservas: ' || count(*) FROM bookings UNION ALL SELECT 'pagos: ' || count(*) FROM payments UNION ALL SELECT 'movimientos: ' || count(*) FROM ledger_entries"
echo "Restauración completa. Valida la aplicación contra esta base antes de cambiar el tráfico."
