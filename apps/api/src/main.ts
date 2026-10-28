import 'reflect-metadata';
import { createApp } from './bootstrap';
import { env } from './config/env';

async function main() {
  env(); // valida configuración (fail-fast)
  const app = await createApp();
  await app.listen(env().PORT, '0.0.0.0');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
