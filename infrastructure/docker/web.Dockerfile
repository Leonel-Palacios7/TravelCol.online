# syntax=docker/dockerfile:1.7
# Imagen de la web (Next.js, salida standalone). Construir desde la raíz del repositorio:
#   docker build -f infrastructure/docker/web.Dockerfile --build-arg API_INTERNAL_URL=http://api:4000 -t travelcol-web .
# API_INTERNAL_URL y NEXT_PUBLIC_SITE_URL se fijan en la compilación (reescrituras y robots/sitemap).
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true NEXT_TELEMETRY_DISABLED=1
# Opcional: CA de un proxy corporativo (docker build --secret id=ca_bundle,src=ruta/ca.crt).
RUN --mount=type=secret,id=ca_bundle,required=false if [ -f /run/secrets/ca_bundle ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca_bundle npm_config_cafile=/run/secrets/ca_bundle; fi; corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /repo

FROM base AS build
ARG API_INTERNAL_URL=http://api:4000
ARG NEXT_PUBLIC_SITE_URL=https://travelcol.online
ARG NEXT_PUBLIC_WOMPI_CHECKOUT_ORIGIN=https://checkout.wompi.co
ENV API_INTERNAL_URL=$API_INTERNAL_URL NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_WOMPI_CHECKOUT_ORIGIN=$NEXT_PUBLIC_WOMPI_CHECKOUT_ORIGIN NODE_ENV=production
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/
RUN --mount=type=secret,id=ca_bundle,required=false if [ -f /run/secrets/ca_bundle ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca_bundle npm_config_cafile=/run/secrets/ca_bundle; fi; pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY apps/web apps/web
RUN pnpm --filter @travelcol/contracts build && pnpm --filter @travelcol/web build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"
# Ejecutar con un init (docker run --init / compose "init: true") para reenviar señales.
CMD ["node", "apps/web/server.js"]
