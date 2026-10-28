# Despliegue, actualización y rollback

Despliegue de referencia: **un servidor Linux con Docker** (un solo nodo) con `infrastructure/docker-compose.yml`. Para más de un nodo hacen falta los cambios de la sección [Escalar](#escalar-a-más-de-un-nodo).

## Componentes

| Servicio | Imagen | Función | Expuesto |
|---|---|---|---|
| `proxy` | `caddy:2-alpine` | HTTPS automático (Let's Encrypt). `/api/v1/webhooks/*` va directo a la API; el resto va a la web | 80 y 443 |
| `web` | `travelcol-web:${TAG}` | Next.js standalone. Reenvía `/api/v1` a la API por la red interna | No |
| `api` | `travelcol-api:${TAG}` | NestJS. Usuario `node`, `HEALTHCHECK` en `/api/v1/health/ready` | No |
| `migrate` | `travelcol-api:${TAG}` | `prisma migrate deploy` (solo migraciones aditivas). Corre y termina antes de la API | No |
| `db` | `postgres:16-alpine` | Base de datos. Volumen `pgdata` | No |

Volúmenes: `pgdata` (base), `storage` (fotos y documentos privados), `caddy_data` y `caddy_config` (certificados).

## Primer despliegue

1. Servidor con Docker 24+ y el DNS del dominio apuntando a él (puertos 80 y 443 abiertos).
2. Copia el repositorio y prepara las variables:
   ```bash
   cp .env.example infrastructure/.env
   chmod 600 infrastructure/.env
   ```
   Completa `DOMAIN`, `ACME_EMAIL`, `POSTGRES_PASSWORD` (aleatoria y larga), `IP_HASH_SALT` (`openssl rand -hex 32`) y las cuatro llaves de Wompi **del ambiente que corresponda**. La lista completa está en [variables-de-entorno.md](variables-de-entorno.md). Nunca subas este archivo al repositorio.
3. Construye y arranca:
   ```bash
   export TAG=$(git rev-parse --short HEAD)
   docker compose -f infrastructure/docker-compose.yml --env-file infrastructure/.env up -d --build
   ```
4. Crea el administrador inicial (la semilla de producción **no** crea datos de demostración):
   ```bash
   docker compose -f infrastructure/docker-compose.yml --env-file infrastructure/.env run --rm \
     -e SEED_ADMIN_EMAIL=admin@tu-dominio.co -e SEED_ADMIN_PASSWORD='<contraseña larga>' \
     api node dist-seed/seed.js
   ```
   Cambia la contraseña al ingresar por primera vez y guárdala en un gestor de secretos.
5. Verifica:
   ```bash
   curl -fsS https://$DOMAIN/api/v1/health/ready
   ```
   Abre el sitio, ingresa como administración y revisa **Configuración** (comisión) y **Pagos → Eventos**.
6. En el panel de Wompi, configura la URL de eventos: `https://$DOMAIN/api/v1/webhooks/wompi`. Haz una transacción de prueba en Sandbox y comprueba que el evento aparece como `PROCESSED` (ver [pagos-wompi.md](pagos-wompi.md)).
7. Programa los respaldos ([respaldos.md](respaldos.md)) **antes** de recibir usuarios reales.

> Si las imágenes no están en un registro, `--build` compila en el servidor. En una organización lo normal es que el CI publique las imágenes con la etiqueta del commit y el servidor solo haga `pull`.

## Actualizar

```bash
./scripts/backup-db.sh                       # respaldo previo, siempre
git pull && export TAG=$(git rev-parse --short HEAD)
docker compose -f infrastructure/docker-compose.yml --env-file infrastructure/.env build
docker compose -f infrastructure/docker-compose.yml --env-file infrastructure/.env up -d
```

`migrate` corre primero; si falla, la API nueva no arranca y la anterior sigue sirviendo hasta que la reemplaces. Revisa `docker compose logs migrate`.

## Rollback

Las imágenes se etiquetan con el commit (`TAG`), así que volver atrás es arrancar la etiqueta anterior:

```bash
export TAG=<commit-anterior>
docker compose -f infrastructure/docker-compose.yml --env-file infrastructure/.env up -d api web
```

Reglas para que el rollback sea seguro:

- **Las migraciones son aditivas** (agregar tablas, columnas que admiten nulos, índices). Una columna se elimina en una versión posterior, cuando ningún código desplegado la usa (patrón *expand/contract*). Así la versión anterior funciona con el esquema nuevo.
- No uses `prisma migrate reset` ni `db push` contra producción. El repositorio no los usa en ningún script de despliegue.
- Si una migración dañó datos, restaura el respaldo previo **en una base nueva** con `scripts/restore-db.sh`, valida y luego cambia `DATABASE_URL`. No restaures sobre la base en uso.

## Operación

| Tarea | Cómo |
|---|---|
| Salud | `GET /api/v1/health` (proceso) y `/api/v1/health/ready` (base de datos y pagos pendientes de más de 2 h). Docker marca el contenedor como `unhealthy`; conecta ese estado a tu monitoreo |
| Registros | `docker compose logs -f api`. Son JSON (pino) y no incluyen contraseñas, tokens, cookies ni firmas (campos redactados) |
| Tareas programadas | Corren dentro de la API: expirar retenciones (60 s), completar reservas pasadas (10 min), enviar correos en cola (30 s) y purgar sesiones (6 h) |
| Webhooks fallidos | Administración → Pagos → Eventos. Wompi reintenta; la API es idempotente |
| Rotar secretos | Cambia el valor en `.env` y `up -d api`. Rotar `IP_HASH_SALT` solo afecta la correlación de IP de auditoría |

## Escalar a más de un nodo

Hoy la API asume una sola réplica. Antes de escalar horizontalmente:

1. Mover el limitador de peticiones a Redis (hoy está en memoria).
2. Ejecutar las tareas programadas en un solo proceso (un worker dedicado o bloqueo con `pg_advisory_lock`).
3. Mover los archivos a almacenamiento de objetos (S3 o compatible), ver [ADR 0008](adr/0008-archivos.md).
4. Base de datos administrada con respaldos automáticos y PITR.
