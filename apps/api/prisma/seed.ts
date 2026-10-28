/**
 * Datos iniciales.
 *  - Catálogo base (destino piloto Villeta, categorías) y documentos legales (BORRADORES).
 *  - Cuenta administradora inicial (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD).
 *  - Datos de DEMOSTRACIÓN (SEED_DEMO=true): proveedor, turista y experiencias marcadas isDemo.
 *    No representan proveedores, precios ni reseñas reales. Nunca usar SEED_DEMO en producción.
 * Es idempotente: puede ejecutarse varias veces.
 */
import { PrismaClient, type CancellationPolicy } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';

const prisma = new PrismaClient();
const isProd = process.env.NODE_ENV === 'production';
const seedDemo = process.env.SEED_DEMO === 'true';

async function hash(pw: string) {
  return argon2.hash(pw, { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
}

const LEGAL_NOTICE =
  '**BORRADOR — pendiente de revisión jurídica.** Este texto es una plantilla técnica y no constituye asesoría legal. Debe ser revisado y aprobado por un profesional del derecho en Colombia antes del lanzamiento.\n\n';

const legalDocs = [
  {
    type: 'TERMS' as const,
    title: 'Términos y condiciones de uso',
    content:
      LEGAL_NOTICE +
      '## 1. Quiénes somos\nTravelCol.online es una plataforma digital que conecta a viajeros con prestadores de servicios turísticos en Colombia. Cada experiencia es prestada por el proveedor identificado en su ficha.\n\n## 2. Reservas y pagos\nEl precio que ves antes de pagar es el total que se cobra. La reserva se confirma únicamente cuando el pago es aprobado y verificado por nuestro sistema. Los pagos se procesan a través de Wompi.\n\n## 3. Cancelaciones\nCada experiencia indica su política de cancelación (flexible, moderada o estricta) antes del pago. La política aplicable es la vigente al momento de reservar.\n\n## 4. Responsabilidades\nEl proveedor es responsable de la prestación del servicio. TravelCol verifica la documentación declarada por los proveedores conforme a su proceso de revisión.\n\n## 5. PQR\nPuedes radicar peticiones, quejas y reclamos desde la página de contacto; recibirás un número de radicado.',
  },
  {
    type: 'PRIVACY' as const,
    title: 'Política de tratamiento de datos personales',
    content:
      LEGAL_NOTICE +
      '## Responsable\nTravelCol.online (razón social, NIT y datos de contacto por definir antes del lanzamiento).\n\n## Finalidades\nGestionar tu cuenta, tus reservas y pagos; comunicarte información de tus reservas; atender PQR; cumplir obligaciones legales y contables; y, solo si lo autorizas, enviarte comunicaciones comerciales.\n\n## Derechos del titular (Ley 1581 de 2012)\nConocer, actualizar, rectificar y suprimir tus datos, solicitar prueba de la autorización y revocarla. Desde tu cuenta puedes descargar tus datos y solicitar su supresión.\n\n## Datos que NO almacenamos\nNo almacenamos números de tarjeta, códigos de seguridad ni credenciales bancarias: el pago se realiza en el entorno de Wompi.\n\n## Conservación\nLos registros contables y de transacciones se conservan por el término exigido por la ley; los demás datos se suprimen cuando dejan de ser necesarios o cuando lo solicites.',
  },
  {
    type: 'CANCELLATION' as const,
    title: 'Política de cancelación y reembolsos',
    content:
      LEGAL_NOTICE +
      '## Flexible\nReembolso del 100 % si cancelas con al menos 24 horas de anticipación.\n\n## Moderada\nReembolso del 100 % con 72 horas o más; del 50 % entre 72 y 24 horas; sin reembolso con menos de 24 horas.\n\n## Estricta\nReembolso del 50 % si cancelas con al menos 7 días de anticipación.\n\n## Cancelación por el proveedor\nSi el proveedor cancela, recibes el reembolso del 100 %.\n\n## Ejecución del reembolso\nLos reembolsos se ejecutan por el mismo medio de pago o por transferencia y quedan registrados con su referencia. Los tiempos dependen de la entidad financiera.\n\n> Pendiente: validar con asesoría jurídica la aplicación del derecho de retracto y demás reglas del Estatuto del Consumidor (Ley 1480 de 2011) a servicios turísticos con fecha determinada.',
  },
  {
    type: 'PROVIDER_TERMS' as const,
    title: 'Condiciones para proveedores',
    content:
      LEGAL_NOTICE +
      '## Requisitos\nPara publicar experiencias debes contar con Registro Nacional de Turismo (RNT) vigente cuando aplique a tu actividad, RUT y demás documentos solicitados. TravelCol verifica la documentación antes de publicar.\n\n## Comisión\nTravelCol cobra una comisión configurable sobre el valor de cada reserva confirmada, informada en tu panel y registrada en cada transacción.\n\n## Liquidaciones\nEl valor neto (ventas menos comisión y reembolsos) se liquida periódicamente por transferencia. Cada pago queda registrado con su referencia.',
  },
];

const categories = [
  { slug: 'caminatas-y-tours', name: 'Caminatas y tours', description: 'Senderos, cascadas y recorridos guiados.', icon: 'mountain', sortOrder: 1 },
  { slug: 'aventura', name: 'Aventura', description: 'Experiencias con adrenalina y deportes de naturaleza.', icon: 'waves', sortOrder: 2 },
  { slug: 'cultura-y-gastronomia', name: 'Cultura y gastronomía', description: 'Trapiches, cocina tradicional e historia local.', icon: 'utensils', sortOrder: 3 },
  { slug: 'fincas-y-turismo-rural', name: 'Fincas y turismo rural', description: 'Días de campo y vida en finca.', icon: 'trees', sortOrder: 4 },
  { slug: 'naturaleza-y-aves', name: 'Naturaleza y aves', description: 'Avistamiento de aves y ecoturismo.', icon: 'bird', sortOrder: 5 },
];

interface DemoService {
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  priceCop: number;
  durationMinutes: number;
  maxPerBooking: number;
  meetingPoint: string;
  includes: string[];
  excludes: string[];
  requirements: string[];
  policy: CancellationPolicy;
  minAge: number | null;
  illustration: string;
  hour: number;
  capacity: number;
}

const DEMO_NOTE =
  '\n\n> Experiencia de DEMOSTRACIÓN creada para probar la plataforma. No corresponde a un proveedor real; el precio es ilustrativo y no es una tarifa de mercado.';

const demoServices: DemoService[] = [
  {
    slug: 'demo-caminata-salto-de-los-micos',
    title: 'Caminata guiada al Salto de los Micos',
    summary: 'Sendero entre bosque húmedo y quebradas hasta una de las cascadas más conocidas de Villeta.',
    description:
      'Recorrido a pie por senderos rurales de Villeta hasta el Salto de los Micos. Durante la caminata conocerás la vegetación del bosque húmedo premontano, las quebradas de la zona y la historia del municipio, conocido como la capital panelera de Cundinamarca. Incluye pausas para hidratación y tiempo libre en la cascada.' +
      DEMO_NOTE,
    category: 'caminatas-y-tours',
    priceCop: 65_000,
    durationMinutes: 240,
    maxPerBooking: 8,
    meetingPoint: 'Parque principal de Villeta, frente a la iglesia',
    includes: ['Guía local', 'Hidratación', 'Acompañamiento durante el recorrido'],
    excludes: ['Almuerzo', 'Transporte desde Bogotá'],
    requirements: ['Calzado de suela antideslizante', 'Condición física básica', 'Protector solar y repelente'],
    policy: 'MODERATE',
    minAge: 8,
    illustration: '/illustrations/cascada.svg',
    hour: 8,
    capacity: 12,
  },
  {
    slug: 'demo-ruta-del-trapiche-panelero',
    title: 'Ruta del trapiche panelero',
    summary: 'Conoce cómo se elabora la panela, desde la caña hasta el bloque, y prueba melao recién hecho.',
    description:
      'Visita a una finca panelera para conocer el proceso tradicional de molienda de caña, cocción del guarapo y moldeo de la panela. Una experiencia cultural y gastronómica para todas las edades, con degustación de productos derivados.' +
      DEMO_NOTE,
    category: 'cultura-y-gastronomia',
    priceCop: 48_000,
    durationMinutes: 180,
    maxPerBooking: 10,
    meetingPoint: 'Terminal de transporte de Villeta',
    includes: ['Recorrido guiado', 'Degustación de panela y melao', 'Bebida de aguapanela'],
    excludes: ['Transporte a la finca'],
    requirements: ['Ropa cómoda'],
    policy: 'FLEXIBLE',
    minAge: null,
    illustration: '/illustrations/trapiche.svg',
    hour: 9,
    capacity: 15,
  },
  {
    slug: 'demo-descenso-en-cascada',
    title: 'Descenso en cuerda por cascada',
    summary: 'Aventura de torrentismo con instructores, equipo de seguridad y charla previa.',
    description:
      'Experiencia de descenso controlado en cuerda junto a una caída de agua. Antes de iniciar recibirás una charla de seguridad y práctica en terreno seco. El equipo y la logística corren por cuenta del operador.' +
      DEMO_NOTE,
    category: 'aventura',
    priceCop: 120_000,
    durationMinutes: 210,
    maxPerBooking: 6,
    meetingPoint: 'Punto de encuentro vía a Quebrada Cune (se envía ubicación al confirmar)',
    includes: ['Instructores', 'Arnés, casco y cuerdas', 'Charla de seguridad'],
    excludes: ['Fotografías', 'Alimentación'],
    requirements: ['Mayores de 14 años', 'Saber nadar', 'No apto para embarazadas'],
    policy: 'STRICT',
    minAge: 14,
    illustration: '/illustrations/aventura.svg',
    hour: 10,
    capacity: 8,
  },
  {
    slug: 'demo-dia-de-finca-rural',
    title: 'Día de finca con piscina natural',
    summary: 'Un día de campo con almuerzo típico, caminata corta y baño en pozo natural.',
    description:
      'Pasa un día completo en una finca de clima cálido: recorrido por cultivos, almuerzo típico de la región y tarde de descanso junto a un pozo natural de agua cristalina. Ideal para familias.' +
      DEMO_NOTE,
    category: 'fincas-y-turismo-rural',
    priceCop: 95_000,
    durationMinutes: 420,
    maxPerBooking: 10,
    meetingPoint: 'Parque principal de Villeta',
    includes: ['Almuerzo típico', 'Recorrido por la finca', 'Acceso al pozo natural'],
    excludes: ['Bebidas alcohólicas'],
    requirements: ['Traje de baño', 'Toalla'],
    policy: 'MODERATE',
    minAge: null,
    illustration: '/illustrations/finca.svg',
    hour: 9,
    capacity: 20,
  },
  {
    slug: 'demo-avistamiento-de-aves-al-amanecer',
    title: 'Avistamiento de aves al amanecer',
    summary: 'Salida temprana con binoculares para observar aves de bosque andino y piedemonte.',
    description:
      'Caminata lenta al amanecer para observar e identificar aves de la región con apoyo de un intérprete ambiental. Grupos pequeños para no perturbar la fauna.' +
      DEMO_NOTE,
    category: 'naturaleza-y-aves',
    priceCop: 75_000,
    durationMinutes: 180,
    maxPerBooking: 4,
    meetingPoint: 'Entrada a la vereda Bagazal (se envía ubicación al confirmar)',
    includes: ['Intérprete ambiental', 'Préstamo de binoculares', 'Lista de especies'],
    excludes: ['Desayuno'],
    requirements: ['Ropa de colores neutros', 'Puntualidad: inicia 5:30 a. m.'],
    policy: 'FLEXIBLE',
    minAge: 10,
    illustration: '/illustrations/aves.svg',
    hour: 5,
    capacity: 6,
  },
  {
    slug: 'demo-recorrido-historico-villeta',
    title: 'Recorrido histórico por Villeta',
    summary: 'Historia del Camino Real, la arquitectura del centro y las tradiciones del pueblo.',
    description:
      'Caminata urbana por el centro de Villeta para conocer su historia como paso del Camino Real entre Bogotá y el río Magdalena, su arquitectura y sus tradiciones, como el Reinado Nacional de la Panela.' +
      DEMO_NOTE,
    category: 'cultura-y-gastronomia',
    priceCop: 35_000,
    durationMinutes: 120,
    maxPerBooking: 12,
    meetingPoint: 'Parque principal de Villeta',
    includes: ['Guía local'],
    excludes: ['Entradas a museos'],
    requirements: ['Calzado cómodo'],
    policy: 'FLEXIBLE',
    minAge: null,
    illustration: '/illustrations/pueblo.svg',
    hour: 15,
    capacity: 20,
  },
];

async function main() {
  if (isProd && seedDemo && process.env.SEED_ALLOW_DEMO_IN_PRODUCTION !== 'true') {
    throw new Error('SEED_DEMO=true no está permitido en producción');
  }

  // ---- Documentos legales (borradores versionados) ----
  for (const doc of legalDocs) {
    await prisma.legalDocumentVersion.upsert({
      where: { type_version: { type: doc.type, version: '0.1-borrador' } },
      create: { ...doc, version: '0.1-borrador', publishedAt: new Date('2026-01-01T00:00:00Z') },
      update: { title: doc.title, content: doc.content },
    });
  }

  // ---- Destino piloto y categorías ----
  const villeta = await prisma.destination.upsert({
    where: { slug: 'villeta' },
    create: {
      slug: 'villeta',
      name: 'Villeta',
      department: 'Cundinamarca',
      isPilot: true,
      summary: 'Clima cálido a unas dos horas de Bogotá: cascadas, trapiches paneleros y senderos rurales.',
      description:
        'Villeta es un municipio de Cundinamarca conocido como la capital panelera del departamento. Su clima cálido, sus quebradas y cascadas, y su tradición rural lo convierten en el destino piloto de TravelCol.online.',
    },
    update: {},
  });
  const catIds = new Map<string, string>();
  for (const c of categories) {
    const row = await prisma.serviceCategory.upsert({ where: { slug: c.slug }, create: c, update: { name: c.name, description: c.description, icon: c.icon, sortOrder: c.sortOrder } });
    catIds.set(c.slug, row.id);
  }

  await prisma.platformSetting.upsert({
    where: { key: 'commission_bps' },
    create: { key: 'commission_bps', value: { bps: Number(process.env.DEFAULT_COMMISSION_BPS ?? 1200) } },
    update: {},
  });

  // ---- Administrador inicial ----
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@travelcol.local').toLowerCase();
  let adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) {
    if (isProd) throw new Error('Define SEED_ADMIN_PASSWORD para crear el administrador inicial');
    adminPassword = seedDemo ? 'Admin-TravelCol-2026' : randomBytes(12).toString('base64url');
  }
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: { email: adminEmail, passwordHash: await hash(adminPassword), fullName: 'Administración TravelCol', role: 'ADMIN', emailVerifiedAt: new Date() },
    });
    console.log(`Administrador creado: ${adminEmail}${process.env.SEED_ADMIN_PASSWORD ? '' : ` / contraseña: ${adminPassword}`}`);
  }

  if (!seedDemo) {
    console.log('Semilla base aplicada (sin datos de demostración).');
    return;
  }

  // ---- DATOS DE DEMOSTRACIÓN ----
  const demoPw = await hash('Demo-TravelCol-2026');
  const support = await prisma.user.upsert({
    where: { email: 'soporte@travelcol.local' },
    create: { email: 'soporte@travelcol.local', passwordHash: demoPw, fullName: 'Soporte (demo)', role: 'SUPPORT', emailVerifiedAt: new Date() },
    update: {},
  });
  void support;
  const providerUser = await prisma.user.upsert({
    where: { email: 'proveedor.demo@travelcol.local' },
    create: { email: 'proveedor.demo@travelcol.local', passwordHash: demoPw, fullName: 'Proveedor Demostración', role: 'PROVIDER', emailVerifiedAt: new Date() },
    update: {},
  });
  await prisma.user.upsert({
    where: { email: 'turista.demo@travelcol.local' },
    create: { email: 'turista.demo@travelcol.local', passwordHash: demoPw, fullName: 'Turista Demostración', role: 'TOURIST', emailVerifiedAt: new Date(), phone: '+573000000000' },
    update: {},
  });
  const provider = await prisma.providerProfile.upsert({
    where: { userId: providerUser.id },
    create: {
      userId: providerUser.id,
      slug: 'experiencias-villeta-demo',
      businessName: 'Experiencias Villeta (DEMO)',
      legalName: 'Proveedor de demostración — no es una empresa real',
      taxId: '000000000-0',
      rntNumber: null,
      contactPhone: '+573000000000',
      description:
        'Perfil de DEMOSTRACIÓN usado para probar la plataforma. No representa a un operador turístico real ni cuenta con RNT. Sus experiencias, precios y cupos son ilustrativos.',
      destinationId: villeta.id,
      status: 'APPROVED',
      isDemo: true,
    },
    update: {},
  });

  const now = new Date();
  for (const s of demoServices) {
    const service = await prisma.tourismService.upsert({
      where: { slug: s.slug },
      create: {
        slug: s.slug,
        providerId: provider.id,
        categoryId: catIds.get(s.category)!,
        destinationId: villeta.id,
        title: s.title,
        summary: s.summary,
        description: s.description,
        priceCop: s.priceCop,
        durationMinutes: s.durationMinutes,
        minParticipants: 1,
        maxParticipantsPerBooking: s.maxPerBooking,
        minAge: s.minAge,
        meetingPoint: s.meetingPoint,
        latitude: 5.0136,
        longitude: -74.4718,
        includes: s.includes,
        excludes: s.excludes,
        requirements: s.requirements,
        cancellationPolicy: s.policy,
        // Publicado directamente por la semilla (sin moderación) por ser dato de demostración.
        status: 'PUBLISHED',
        isDemo: true,
        publishedAt: now,
        media: {
          create: [{ storageKey: `static:${s.illustration}`, alt: `Ilustración: ${s.title}`, credit: 'Ilustración original de TravelCol (demo)', mimeType: 'image/svg+xml', sortOrder: 0 }],
        },
      },
      update: {},
    });
    // Cupos para los próximos 45 días (hora de Colombia, UTC-5).
    const slots = [];
    for (let d = 1; d <= 45; d++) {
      const day = new Date(now.getTime() + d * 86_400_000);
      const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(day);
      slots.push({ serviceId: service.id, startsAt: new Date(`${ymd}T${String(s.hour).padStart(2, '0')}:00:00-05:00`), capacity: s.capacity });
    }
    await prisma.serviceAvailability.createMany({ data: slots, skipDuplicates: true });
  }
  console.log('Datos de demostración aplicados. Contraseña de cuentas demo: Demo-TravelCol-2026 (solo desarrollo).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
