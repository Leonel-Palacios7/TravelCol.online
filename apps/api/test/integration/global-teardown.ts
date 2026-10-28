import { readFileSync, rmSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { RUN_FILE } from './global-setup';

/** Elimina SOLO la base temporal creada por esta misma ejecución (prefijo travelcol_it_). */
export default async function globalTeardown() {
  if (process.env.KEEP_TEST_DB === 'true') return;
  const { dbName, server } = JSON.parse(readFileSync(RUN_FILE, 'utf8')) as { dbName: string; server: string };
  if (!/^travelcol_it_\d+$/.test(dbName)) return;
  const admin = new PrismaClient({ datasources: { db: { url: server } } });
  await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
  await admin.$disconnect();
  rmSync(RUN_FILE, { force: true });
}
