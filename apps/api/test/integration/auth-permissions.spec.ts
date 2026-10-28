import request from 'supertest';
import { Client, createProvider, createService, createTestApp, createUser, login, PASSWORD, TestCtx, bookingBody } from './helpers';

let ctx: TestCtx;
beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => ctx.close());

describe('Identidad', () => {
  it('registra un turista, crea sesión en cookie HttpOnly y registra consentimiento', async () => {
    const c = await new Client(ctx.app).init();
    const email = `nuevo-${Date.now()}@prueba.test`;
    const res = await c.post('/auth/register', { fullName: 'Ana Gómez', email, password: 'Segura-12345', acceptTerms: true });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('TOURIST');
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/tc_session=.*HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    const me = await c.get('/users/me');
    expect(me.body.email).toBe(email);
    // El token de sesión no se guarda en claro.
    const session = await ctx.prisma.authSession.findFirst({ where: { user: { email } } });
    expect(session?.tokenHash).toHaveLength(64);
    expect(cookie).not.toContain(session!.tokenHash);
  });

  it('impide elevar privilegios en el registro (campo role rechazado)', async () => {
    const c = await new Client(ctx.app).init();
    const res = await c.post('/auth/register', { fullName: 'Hacker', email: `h-${Date.now()}@prueba.test`, password: 'Segura-12345', acceptTerms: true, role: 'ADMIN' });
    expect(res.status).toBe(400);
  });

  it('rechaza solicitudes sin token CSRF', async () => {
    const res = await request(ctx.app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'x@y.co', password: 'x' });
    expect(res.status).toBe(403);
  });

  it('login con credenciales inválidas responde mensaje genérico y bloquea tras 5 intentos', async () => {
    const user = await createUser(ctx.prisma);
    const c = await new Client(ctx.app).init();
    const unknown = await c.post('/auth/login', { email: 'noexiste@prueba.test', password: 'Algo-12345' });
    expect(unknown.status).toBe(401);
    for (let i = 0; i < 5; i++) {
      const r = await c.post('/auth/login', { email: user.email, password: 'Incorrecta-123' });
      expect(r.status).toBe(401);
      if (i === 0) expect(r.body.message).toBe(unknown.body.message);
    }
    const locked = await c.post('/auth/login', { email: user.email, password: PASSWORD });
    expect(locked.status).toBe(401);
    expect(locked.body.message).toMatch(/bloqueada/);
  });

  it('recuperación no revela si el correo existe y restablece con token de un solo uso', async () => {
    const user = await createUser(ctx.prisma);
    const c = await new Client(ctx.app).init();
    const a = await c.post('/auth/forgot-password', { email: user.email });
    const b = await c.post('/auth/forgot-password', { email: 'nadie@prueba.test' });
    expect(a.status).toBe(202);
    expect(b.status).toBe(202);
    expect(a.body).toEqual(b.body);
    const mail = await ctx.prisma.emailOutbox.findFirst({ where: { toEmail: user.email, template: 'PASSWORD_RESET' } });
    const token = new URL((mail!.payload as { link: string }).link).searchParams.get('token')!;
    const reset = await c.post('/auth/reset-password', { token, password: 'Nueva-Clave-999' });
    expect(reset.status).toBe(200);
    const reuse = await c.post('/auth/reset-password', { token, password: 'Otra-Clave-999' });
    expect(reuse.status).toBe(400);
    await login(ctx.app, user.email, 'Nueva-Clave-999');
  });

  it('logout revoca la sesión en el servidor', async () => {
    const user = await createUser(ctx.prisma);
    const c = await login(ctx.app, user.email);
    expect((await c.get('/users/me')).status).toBe(200);
    await c.post('/auth/logout');
    expect((await c.get('/users/me')).status).toBe(401);
  });

  it('una cuenta suspendida pierde el acceso inmediatamente', async () => {
    const admin = await createUser(ctx.prisma, 'ADMIN');
    const victim = await createUser(ctx.prisma);
    const vc = await login(ctx.app, victim.email);
    const ac = await login(ctx.app, admin.email);
    const res = await ac.patch(`/admin/users/${victim.id}/status`, { status: 'SUSPENDED', reason: 'Prueba de suspensión' });
    expect(res.status).toBe(200);
    expect((await vc.get('/users/me')).status).toBe(401);
  });
});

describe('Autorización por rol y propiedad', () => {
  it('sin sesión no se pueden ejecutar acciones privadas', async () => {
    const c = await new Client(ctx.app).init();
    expect((await c.get('/bookings/me')).status).toBe(401);
    expect((await c.post('/bookings', {})).status).toBe(401);
    expect((await c.get('/admin/dashboard')).status).toBe(401);
  });

  it('un turista no accede a administración ni a endpoints de proveedor', async () => {
    const t = await createUser(ctx.prisma);
    const c = await login(ctx.app, t.email);
    expect((await c.get('/admin/dashboard')).status).toBe(403);
    expect((await c.get('/provider/services')).status).toBe(403);
    expect((await c.get('/providers/me')).status).toBe(403);
  });

  it('SUPPORT (operativo) no puede ejecutar operaciones financieras ni de configuración', async () => {
    const s = await createUser(ctx.prisma, 'SUPPORT');
    const c = await login(ctx.app, s.email);
    expect((await c.get('/admin/dashboard')).status).toBe(200);
    expect((await c.put('/admin/settings/commission', { commissionBps: 0, reason: 'intento indebido' })).status).toBe(403);
    expect((await c.get('/admin/refunds')).status).toBe(403);
    expect((await c.get('/admin/users')).status).toBe(403);
    expect((await c.get('/admin/audit-logs')).status).toBe(403);
  });

  it('un proveedor no puede ver ni editar servicios de otro proveedor', async () => {
    const a = await createProvider(ctx.prisma);
    const b = await createProvider(ctx.prisma);
    const { service } = await createService(ctx.prisma, b.provider.id, { status: 'DRAFT' });
    const c = await login(ctx.app, a.user.email);
    expect((await c.get(`/provider/services/${service.id}`)).status).toBe(404);
    const patch = await c.patch(`/provider/services/${service.id}`, {
      title: 'Intento de edición ajena', summary: 'x'.repeat(30), description: 'y'.repeat(100), categorySlug: 'caminatas-y-tours',
      destinationSlug: 'villeta', priceCop: 10000, durationMinutes: 60, meetingPoint: 'Parque', cancellationPolicy: 'FLEXIBLE',
    });
    expect(patch.status).toBe(404);
    expect((await c.post(`/provider/services/${service.id}/archive`)).status).toBe(404);
    const unchanged = await ctx.prisma.tourismService.findUnique({ where: { id: service.id } });
    expect(unchanged?.status).toBe('DRAFT');
  });

  it('un turista no puede consultar ni cancelar la reserva de otro turista', async () => {
    const { provider } = await createProvider(ctx.prisma);
    const { slot } = await createService(ctx.prisma, provider.id);
    const t1 = await login(ctx.app, (await createUser(ctx.prisma)).email);
    const t2 = await login(ctx.app, (await createUser(ctx.prisma)).email);
    const booking = await t1.post('/bookings', bookingBody(slot.id, 1));
    expect(booking.status).toBe(201);
    expect((await t2.get(`/bookings/${booking.body.id}`)).status).toBe(404);
    expect((await t2.post(`/bookings/${booking.body.id}/cancel`, { reason: 'No es mía' })).status).toBe(404);
    expect((await t2.post(`/bookings/${booking.body.id}/checkout`)).status).toBe(404);
  });

  it('la solicitud de proveedor no habilita capacidades hasta ser aprobada por ADMIN', async () => {
    const t = await createUser(ctx.prisma);
    const c = await login(ctx.app, t.email);
    const app = await c.post('/provider-applications', {
      businessName: 'Aventuras del Gualivá', legalName: 'Aventuras del Gualivá SAS', taxId: '901234567-1', rntNumber: '98765',
      contactPhone: '3109876543', description: 'Operador local de caminatas y experiencias rurales en Villeta y alrededores.', destinationSlug: 'villeta', acceptProviderTerms: true,
    });
    expect(app.status).toBe(201);
    expect((await c.get('/provider/services')).status).toBe(403);
    const support = await login(ctx.app, (await createUser(ctx.prisma, 'SUPPORT')).email);
    expect((await support.post(`/admin/provider-applications/${app.body.id}/decision`, { decision: 'APPROVE', notes: 'Documentos ok' })).status).toBe(403);
    const admin = await login(ctx.app, (await createUser(ctx.prisma, 'ADMIN')).email);
    expect((await admin.post(`/admin/provider-applications/${app.body.id}/decision`, { decision: 'APPROVE', notes: 'Documentos ok' })).status).toBe(200);
    const after = await c.get('/users/me');
    expect(after.body.role).toBe('PROVIDER');
    expect((await c.get('/provider/services')).status).toBe(200);
  });

  it('ADMIN no puede cambiar su propio rol ni asignar PROVIDER directamente', async () => {
    const admin = await createUser(ctx.prisma, 'ADMIN');
    const other = await createUser(ctx.prisma);
    const c = await login(ctx.app, admin.email);
    expect((await c.patch(`/admin/users/${admin.id}/role`, { role: 'TOURIST', reason: 'propio rol' })).status).toBe(403);
    expect((await c.patch(`/admin/users/${other.id}/role`, { role: 'PROVIDER', reason: 'atajo indebido' })).status).toBe(400);
    expect((await c.patch(`/admin/users/${other.id}/role`, { role: 'SUPPORT', reason: 'nuevo agente de soporte' })).status).toBe(200);
    const log = await ctx.prisma.auditLog.findFirst({ where: { action: 'USER_ROLE_CHANGED', entityId: other.id } });
    expect(log).not.toBeNull();
  });

  it('/providers/me no se confunde con el perfil público /providers/:slug', async () => {
    const c = await new Client(ctx.app).init();
    expect((await c.get('/providers/me')).status).toBe(401);
  });

  it('los servicios no publicados no son visibles públicamente', async () => {
    const { provider } = await createProvider(ctx.prisma);
    const { service } = await createService(ctx.prisma, provider.id, { status: 'DRAFT' });
    const c = await new Client(ctx.app).init();
    expect((await c.get(`/services/${service.slug}`)).status).toBe(404);
    expect((await c.get(`/services/${service.id}/availability`)).status).toBe(404);
  });
});
