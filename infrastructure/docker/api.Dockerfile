# syntax=docker/dockerfile:1.7
# Imagen de la API (NestJS + Prisma). Construir desde la raíz del repositorio:
#   docker build -f infrastructure/docker/api.Dockerfile -t travelcol-api .
FROM node:25-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true
# Opcional: CA de un proxy corporativo (docker build --secret id=ca_bundle,src=ruta/ca.crt).
RUN --mount=type=secret,id=ca_bundle,required=false if [ -f /run/secrets/ca_bundle ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca_bundle npm_config_cafile=/run/secrets/ca_bundle; fi; corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/
RUN --mount=type=secret,id=ca_bundle,required=false if [ -f /run/secrets/ca_bundle ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca_bundle npm_config_cafile=/run/secrets/ca_bundle; fi; pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY apps/api apps/api
RUN pnpm --filter @travelcol/contracts build && pnpm --filter @travelcol/api build
# Copia autocontenida solo con dependencias de producción.
RUN --mount=type=secret,id=ca_bundle,required=false if [ -f /run/secrets/ca_bundle ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca_bundle npm_config_cafile=/run/secrets/ca_bundle; fi; pnpm --filter @travelcol/api deploy --prod --legacy /out && cd /out && ./node_modules/.bin/prisma generate

FROM node:25-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=4000 STORAGE_DIR=/data/storage
WORKDIR /app
COPY --from=build --chown=node:node /out ./
RUN mkdir -p /data/storage && chown -R node:node /data
USER node
EXPOSE 4000
VOLUME ["/data/storage"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Ejecutar con un init (docker run --init / compose "init: true") para reenviar señales.
CMD ["node", "dist/main.js"]
