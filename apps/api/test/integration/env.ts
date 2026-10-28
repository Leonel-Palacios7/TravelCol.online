/** Entorno de pruebas de integración: BD dedicada, secretos de PRUEBA (no reales). */
import * as os from 'node:os';
import * as path from 'node:path';
import { readFileSync } from 'node:fs';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = (JSON.parse(readFileSync(path.join(os.tmpdir(), 'travelcol-test-db-url'), 'utf8')) as { dbUrl: string }).dbUrl;
process.env.LOG_LEVEL = 'silent';
process.env.JOBS_ENABLED = 'false';
process.env.MAIL_DRIVER = 'disabled';
process.env.THROTTLE_LIMIT = '100000';
process.env.AUTH_THROTTLE_LIMIT = '100000';
process.env.WOMPI_ENV = 'SANDBOX';
process.env.WOMPI_PUBLIC_KEY = 'pub_test_integration';
process.env.WOMPI_PRIVATE_KEY = 'prv_test_integration';
process.env.WOMPI_INTEGRITY_SECRET = 'test_integrity_integration';
process.env.WOMPI_EVENTS_SECRET = 'test_events_integration';
process.env.WOMPI_VERIFY_WITH_API = 'false';
process.env.STORAGE_DIR = path.join(os.tmpdir(), 'travelcol-test-storage');
process.env.DEFAULT_COMMISSION_BPS = '1200';
process.env.BOOKING_HOLD_MINUTES = '20';
