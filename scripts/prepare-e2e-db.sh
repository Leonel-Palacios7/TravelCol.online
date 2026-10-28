#!/usr/bin/env bash
# Prepara una base de datos DESECHABLE para las pruebas E2E: crea la base si no existe, aplica
# migraciones (no destructivas) y ejecuta el seed idempotente con datos de demostración.
# Se niega a operar sobre bases cuyo nombre no termine en _e2e o _test.
set -euo pipefail

: "${DATABASE_URL:?Define DATABASE_URL apuntando a la base E2E (p. ej. postgresql://travelcol:clave@localhost:5432/travelcol_e2e)}"
DB_NAME="$(node -e 'console.log(new URL(process.env.DATABASE_URL).pathname.slice(1))')"
if [[ ! "$DB_NAME" =~ _(e2e|test)$ ]]; then
  echo "Abortado: la base \"$DB_NAME\" no parece desechable (debe terminar en _e2e o _test)." >&2
  exit 1
fi
if [[ "${NODE_ENV:-}" == "production" ]]; then
  echo "Abortado: NODE_ENV=production." >&2
  exit 1
fi

ADMIN_URL="$(node -e 'const u=new URL(process.env.DATABASE_URL);u.pathname="/postgres";console.log(u.toString())')"
EXISTS="$(psql "$ADMIN_URL" -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'")"
if [[ "$EXISTS" != "1" ]]; then
  echo "Creando base $DB_NAME…"
  psql "$ADMIN_URL" -c "CREATE DATABASE \"${DB_NAME}\""
fi

cd "$(dirname "$0")/../apps/api"
pnpm exec prisma migrate deploy
SEED_DEMO=true pnpm db:seed
echo "Base E2E lista: $DB_NAME"
