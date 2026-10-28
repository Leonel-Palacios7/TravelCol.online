#!/usr/bin/env bash
# Prepara el entorno local: dependencias, contratos, base de desarrollo, migraciones y semilla demo.
set -euo pipefail
cd "$(dirname "$0")/.."
command -v pnpm >/dev/null || { echo "Instala pnpm 10 (corepack enable)"; exit 1; }
pnpm install
[[ -f apps/api/.env ]] || { cp apps/api/.env.example apps/api/.env; echo "Creado apps/api/.env: revisa DATABASE_URL y llaves de Wompi Sandbox."; }
[[ -f apps/web/.env.local ]] || cp apps/web/.env.example apps/web/.env.local
pnpm --filter @travelcol/contracts build
pnpm --filter @travelcol/api exec prisma generate
pnpm --filter @travelcol/api exec prisma migrate deploy
SEED_DEMO=true pnpm --filter @travelcol/api db:seed
echo "Listo. Ejecuta: pnpm dev  (web http://localhost:3000 · API http://localhost:4000/api/docs)"
