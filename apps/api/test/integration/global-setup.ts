import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';

export const RUN_FILE = path.join(os.tmpdir(), 'travelcol-test-db-url');

/**
 * Crea una base de datos NUEVA y exclusiva para esta ejecución (travelcol_it_<marca>) y le aplica
 * las migraciones versionadas con `prisma migrate deploy` (no destructivo). Así se verifica que las
 * migraciones funcionan sobre una BD limpia sin tocar ninguna base existente.
 */
export default async function globalSetup() {
  const server = process.env.TEST_DATABASE_SERVER_URL ?? 'postgresql://travelcol:travelcol_dev@localhost:5432/postgres';
  if (/prod/i.test(server)) throw new Error('Negado: TEST_DATABASE_SERVER_URL parece de producción');
  const dbName = `travelcol_it_${Date.now()}`;
  const admin = new PrismaClient({ datasources: { db: { url: server } } });
  await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
  await admin.$disconnect();
  const url = new URL(server);
  url.pathname = `/${dbName}`;
  url.searchParams.set('schema', 'public');
  const dbUrl = url.toString();
  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '../..'),
    env: { ...process.env, DATABASE_URL: dbUrl, PRISMA_HIDE_UPDATE_MESSAGE: '1' },
    stdio: 'pipe',
  });
  writeFileSync(RUN_FILE, JSON.stringify({ dbName, dbUrl, server }));
}
