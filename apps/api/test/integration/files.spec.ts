import { createProvider, createService, createTestApp, login, TestCtx } from './helpers';

let ctx: TestCtx;
beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => ctx.close());

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64, 1),
]);

describe('Archivos', () => {
  it('rechaza un archivo disfrazado de imagen (tipo real por firma, no por nombre)', async () => {
    const { user, provider } = await createProvider(ctx.prisma);
    const { service } = await createService(ctx.prisma, provider.id, { status: 'DRAFT' });
    const c = await login(ctx.app, user.email);
    const res = await c.agent
      .post(`/api/v1/provider/services/${service.id}/media`)
      .set('X-CSRF-Token', c.csrf)
      .attach('file', Buffer.from('<script>alert(1)</script>'.repeat(5)), { filename: 'foto.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(400);
  });

  it('acepta una imagen PNG real y la sirve con cabeceras seguras', async () => {
    const { user, provider } = await createProvider(ctx.prisma);
    const { service } = await createService(ctx.prisma, provider.id, { status: 'DRAFT' });
    const c = await login(ctx.app, user.email);
    const res = await c.agent
      .post(`/api/v1/provider/services/${service.id}/media`)
      .set('X-CSRF-Token', c.csrf)
      .field('alt', 'Vista de la cascada')
      .attach('file', PNG, { filename: 'x.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    const img = await c.agent.get(res.body.url);
    expect(img.status).toBe(200);
    expect(img.headers['content-type']).toBe('image/png');
    expect(img.headers['x-content-type-options']).toBe('nosniff');
  });

  it('rechaza PDF con JavaScript y protege los documentos privados', async () => {
    const { user } = await createProvider(ctx.prisma);
    const c = await login(ctx.app, user.email);
    const evil = Buffer.from('%PDF-1.7\n1 0 obj << /OpenAction << /JS (app.alert(1)) >> >>\n%%EOF');
    const bad = await c.agent.post('/api/v1/providers/me/documents').set('X-CSRF-Token', c.csrf).field('type', 'RNT').attach('file', evil, 'rnt.pdf');
    expect(bad.status).toBe(400);
    const good = Buffer.from('%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF');
    const ok = await c.agent.post('/api/v1/providers/me/documents').set('X-CSRF-Token', c.csrf).field('type', 'RNT').attach('file', good, 'rnt.pdf');
    expect(ok.status).toBe(201);
    const doc = await ctx.prisma.providerDocument.findUniqueOrThrow({ where: { id: ok.body.id } });
    expect(doc.storageKey.startsWith('private/')).toBe(true);
    // No accesible por la ruta pública de medios.
    const leaked = await c.agent.get(`/api/v1/media/${doc.storageKey.replace(/^private\//, 'public/')}`);
    expect(leaked.status).toBe(404);
    const traversal = await c.agent.get(`/api/v1/media/public/..%2F${doc.storageKey}`);
    expect(traversal.status).toBe(404);
    // Otro proveedor no puede descargarlo.
    const other = await createProvider(ctx.prisma);
    const oc = await login(ctx.app, other.user.email);
    expect((await oc.get(`/providers/me/documents/${doc.id}/file`)).status).toBe(404);
    expect((await c.get(`/providers/me/documents/${doc.id}/file`)).status).toBe(200);
  });

  it('entrada inválida produce 400 con detalle en español', async () => {
    const { user } = await createProvider(ctx.prisma);
    const c = await login(ctx.app, user.email);
    const res = await c.post('/provider/services', { title: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Los datos enviados no son válidos');
    expect(Array.isArray(res.body.errors)).toBe(true);
  });
});
