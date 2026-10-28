/**
 * SOLO DESARROLLO / PRUEBAS. Envía a la API local un evento `transaction.updated` firmado con el
 * secreto de eventos configurado en el entorno, para probar el flujo de pago sin acceso a Wompi.
 *
 *   pnpm --filter @travelcol/api wompi:simulate -- --reference TC-XXXX-YYYYYY --status APPROVED
 *
 * Se niega a ejecutarse si NODE_ENV=production o WOMPI_ENV=PRODUCTION. No reemplaza las pruebas
 * contra Wompi Sandbox real (ver docs/pagos-wompi.md).
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { eventChecksum, type WompiEvent } from '../src/domain/wompi-signature';

function arg(name: string, fallback?: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.WOMPI_ENV === 'PRODUCTION') {
    throw new Error('Este script no se puede usar en producción.');
  }
  const secret = process.env.WOMPI_EVENTS_SECRET;
  if (!secret) throw new Error('Falta WOMPI_EVENTS_SECRET en el entorno.');
  const reference = arg('reference');
  const status = arg('status', 'APPROVED')!;
  if (!reference) throw new Error('Uso: --reference <referencia> [--status APPROVED|DECLINED|VOIDED|ERROR|PENDING]');
  const apiUrl = arg('api', process.env.API_PUBLIC_URL ?? 'http://localhost:4000')!;

  const prisma = new PrismaClient();
  const payment = await prisma.payment.findUnique({ where: { reference } });
  await prisma.$disconnect();
  if (!payment) throw new Error(`No existe un pago con referencia ${reference}`);

  const timestamp = Math.floor(Date.now() / 1000);
  const event: WompiEvent = {
    event: 'transaction.updated',
    data: {
      transaction: {
        id: `sim-${randomUUID().slice(0, 12)}`,
        reference,
        status,
        amount_in_cents: Number(arg('amount', String(payment.amountInCents))),
        currency: 'COP',
        payment_method_type: 'CARD',
        status_message: status === 'DECLINED' ? 'Transacción rechazada (simulada)' : null,
      },
    },
    environment: 'test',
    signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'] },
    timestamp,
    sent_at: new Date().toISOString(),
  };
  const checksum = eventChecksum(event, secret)!;
  event.signature!.checksum = checksum;
  const res = await fetch(`${apiUrl}/api/v1/webhooks/wompi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Event-Checksum': checksum },
    body: JSON.stringify(event),
  });
  console.log(`Webhook simulado → HTTP ${res.status}`, await res.text());
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
