/**
 * Genera docs/openapi.json a partir de los controladores y esquemas Zod (sin abrir puertos).
 *   pnpm --filter @travelcol/api openapi:export
 * Requiere DATABASE_URL (Prisma se conecta al iniciar los módulos); usa la base de desarrollo.
 */
import 'reflect-metadata';
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { buildOpenApi, configureApp } from '../src/bootstrap';

async function main() {
  process.env.JOBS_ENABLED = 'false';
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false, bodyParser: false });
  configureApp(app);
  await app.init();
  const doc = buildOpenApi(app);
  const out = path.resolve(__dirname, '../../../docs/openapi.json');
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(doc, null, 2)}\n`);
  console.log(`OpenAPI exportado: ${out} (${Object.keys(doc.paths).length} rutas)`);
  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
