import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createHash, randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import type { PrismaClient, UserRole, CancellationPolicy } from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { PrismaService } from '../../src/common/prisma.service';
import { resetEnvCache } from '../../src/config/env';

export interface TestCtx {
  app: NestExpressApplication;
  prisma: PrismaClient;
  close: () => Promise<void>;
}

export async function createTestApp(): Promise<TestCtx> {
  resetEnvCache();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false, logger: false });
  configureApp(app);
  await app.init();
  const prisma = app.get(PrismaService);
  return { app, prisma, close: () => app.close() };
}

/** Cliente HTTP con cookies persistentes y token CSRF (simula un navegador). */
export class Client {
  readonly agent: ReturnType<typeof request.agent>;
  csrf = '';
  constructor(app: NestExpressApplication) {
    this.agent = request.agent(app.getHttpServer());
  }
  async init() {
    const res = await this.agent.get('/api/v1/auth/csrf');
    this.csrf = res.body.csrfToken;
    return this;
  }
  get(url: string) {
    return this.agent.get(`/api/v1${url}`);
  }
  post(url: string, body?: object) {
    return this.agent.post(`/api/v1${url}`).set('X-CSRF-Token', this.csrf).send(body ?? {});
  }
  patch(url: string, body?: object) {
    return this.agent.patch(`/api/v1${url}`).set('X-CSRF-Token', this.csrf).send(body ?? {});
  }
  put(url: string, body?: object) {
    return this.agent.put(`/api/v1${url}`).set('X-CSRF-Token', this.csrf).send(body ?? {});
  }
  delete(url: string) {
    return this.agent.delete(`/api/v1${url}`).set('X-CSRF-Token', this.csrf);
  }
}

export const PASSWORD = 'Clave-Prueba-2026';
let hashCache: string | null = null;
export const uniq = () => randomUUID().slice(0, 8);

export async function createUser(prisma: PrismaClient, role: UserRole = 'TOURIST', opts: { verified?: boolean } = {}) {
  hashCache ??= await argon2.hash(PASSWORD, { type: argon2.argon2id });
  return prisma.user.create({
    data: {
      email: `${role.toLowerCase()}-${uniq()}@prueba.test`,
      passwordHash: hashCache,
      fullName: `Usuario ${role} Prueba`,
      role,
      emailVerifiedAt: opts.verified === false ? null : new Date(),
    },
  });
}

export async function login(app: NestExpressApplication, email: string, password = PASSWORD) {
  const c = await new Client(app).init();
  const res = await c.post('/auth/login', { email, password });
  if (res.status !== 200) throw new Error(`login falló ${res.status} ${JSON.stringify(res.body)}`);
  return c;
}

export async function baseCatalog(prisma: PrismaClient) {
  const destination = await prisma.destination.upsert({
    where: { slug: 'villeta' },
    create: { slug: 'villeta', name: 'Villeta', department: 'Cundinamarca', summary: 'Destino de prueba', description: 'Destino de prueba', isPilot: true },
    update: {},
  });
  const category = await prisma.serviceCategory.upsert({
    where: { slug: 'caminatas-y-tours' },
    create: { slug: 'caminatas-y-tours', name: 'Caminatas', description: 'Prueba', icon: 'mountain' },
    update: {},
  });
  return { destination, category };
}

export async function createProvider(prisma: PrismaClient, opts: { rntVerified?: boolean } = {}) {
  const { destination } = await baseCatalog(prisma);
  const user = await createUser(prisma, 'PROVIDER');
  const provider = await prisma.providerProfile.create({
    data: {
      userId: user.id,
      slug: `prov-${uniq()}`,
      businessName: `Operador ${uniq()}`,
      legalName: 'Operador de prueba SAS',
      taxId: `9${Math.floor(Math.random() * 1e8).toString().padStart(8, '0')}`,
      rntNumber: '12345',
      rntVerifiedAt: opts.rntVerified === false ? null : new Date(),
      contactPhone: '+573001112233',
      description: 'Proveedor creado por las pruebas de integración de TravelCol.',
      destinationId: destination.id,
      status: 'APPROVED',
    },
  });
  return { user, provider };
}

export async function createService(
  prisma: PrismaClient,
  providerId: string,
  opts: { priceCop?: number; capacity?: number; startsInHours?: number; policy?: CancellationPolicy; status?: 'PUBLISHED' | 'DRAFT' | 'IN_REVIEW' } = {},
) {
  const { destination, category } = await baseCatalog(prisma);
  const service = await prisma.tourismService.create({
    data: {
      providerId,
      categoryId: category.id,
      destinationId: destination.id,
      slug: `servicio-${uniq()}`,
      title: 'Caminata de prueba al Salto',
      summary: 'Resumen de prueba suficientemente largo para validar.',
      description: 'Descripción de prueba '.repeat(10),
      priceCop: opts.priceCop ?? 50_000,
      durationMinutes: 120,
      maxParticipantsPerBooking: 10,
      meetingPoint: 'Parque principal',
      cancellationPolicy: opts.policy ?? 'MODERATE',
      status: opts.status ?? 'PUBLISHED',
      publishedAt: new Date(),
      media: { create: [{ storageKey: 'static:/illustrations/cascada.svg', alt: 'x', mimeType: 'image/svg+xml' }] },
    },
  });
  const slot = await prisma.serviceAvailability.create({
    data: {
      serviceId: service.id,
      startsAt: new Date(Date.now() + (opts.startsInHours ?? 24 * 10) * 3_600_000),
      capacity: opts.capacity ?? 10,
    },
  });
  return { service, slot };
}

export const participants = (n: number) => Array.from({ length: n }, (_, i) => ({ fullName: `Participante ${i + 1}` }));

export function bookingBody(availabilityId: string, n = 2) {
  return { availabilityId, participants: participants(n), contactPhone: '3001234567' };
}

// ---------- Wompi (eventos firmados con el secreto de PRUEBA) ----------
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

export function wompiEvent(
  tx: { id: string; reference: string; status: string; amount_in_cents: number; currency?: string },
  opts: { secret?: string; timestamp?: number } = {},
) {
  const timestamp = opts.timestamp ?? Math.floor(Date.now() / 1000);
  const transaction = { currency: 'COP', payment_method_type: 'CARD', status_message: null, ...tx };
  const properties = ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'];
  const checksum = sha(
    `${transaction.id}${transaction.status}${transaction.amount_in_cents}${timestamp}${opts.secret ?? process.env.WOMPI_EVENTS_SECRET}`,
  );
  return {
    body: { event: 'transaction.updated', data: { transaction }, environment: 'test', signature: { properties, checksum }, timestamp, sent_at: new Date().toISOString() },
    checksum,
  };
}

export async function sendWebhook(app: NestExpressApplication, ev: { body: object; checksum: string }) {
  return request(app.getHttpServer()).post('/api/v1/webhooks/wompi').set('X-Event-Checksum', ev.checksum).send(ev.body);
}

/** Reserva pagada de punta a punta: crea reserva, checkout y webhook APPROVED. */
export async function paidBooking(ctx: TestCtx, tourist: Client, slotId: string, n = 2) {
  const b = await tourist.post('/bookings', bookingBody(slotId, n));
  if (b.status !== 201) throw new Error(`reserva falló ${b.status} ${JSON.stringify(b.body)}`);
  const co = await tourist.post(`/bookings/${b.body.id}/checkout`);
  if (co.status !== 201) throw new Error(`checkout falló ${co.status} ${JSON.stringify(co.body)}`);
  const txId = `tx-${uniq()}`;
  const ev = wompiEvent({ id: txId, reference: co.body.reference, status: 'APPROVED', amount_in_cents: Number(co.body.params['amount-in-cents']) });
  const wh = await sendWebhook(ctx.app, ev);
  if (wh.status !== 200) throw new Error(`webhook falló ${wh.status}`);
  return { bookingId: b.body.id as string, paymentId: co.body.paymentId as string, reference: co.body.reference as string, txId, amount: Number(co.body.params['amount-in-cents']) };
}
