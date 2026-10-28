import Link from 'next/link';
import { ArrowRight, BadgeCheck, CalendarCheck, CreditCard, HeartHandshake, Map, ShieldCheck, Undo2 } from 'lucide-react';
import type { ServiceCardDto } from '@travelcol/contracts';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SearchBar } from '@/components/catalog/SearchBar';
import { ServiceCard } from '@/components/catalog/ServiceCard';
import { CATEGORY_ART, CategoryIcon } from '@/components/catalog/CategoryIcon';
import { TornEdge } from '@/components/ui/TornEdge';
import { EmptyState } from '@/components/ui/EmptyState';
import { apiGet } from '@/lib/api-server';
import type { CategoryRow, DestinationRow } from '@/lib/types';

export const revalidate = 60;

async function loadHome() {
  try {
    const [destinations, categories, featured] = await Promise.all([
      apiGet<DestinationRow[]>('/destinations', { auth: false, revalidate: 300 }),
      apiGet<CategoryRow[]>('/categories', { auth: false, revalidate: 300 }),
      apiGet<ServiceCardDto[]>('/services/featured', { auth: false, revalidate: 60 }),
    ]);
    return { destinations, categories, featured, error: false };
  } catch {
    return { destinations: [], categories: [], featured: [], error: true };
  }
}

const STEPS = [
  { n: 1, icon: Map, title: 'Elige tu experiencia', text: 'Filtra por destino, tipo de plan, fecha y número de personas. Ves el precio total desde el inicio.' },
  { n: 2, icon: CreditCard, title: 'Reserva y paga seguro', text: 'Apartamos tu cupo mientras pagas con Wompi: tarjeta, PSE, Nequi y otros medios habilitados.' },
  { n: 3, icon: CalendarCheck, title: 'Disfruta tu viaje', text: 'Recibes la confirmación cuando el pago es verificado y el proveedor ve tu reserva al instante.' },
];

const TRUST = [
  { icon: BadgeCheck, title: 'Proveedores revisados', text: 'Verificamos documentos como el Registro Nacional de Turismo antes de publicar.' },
  { icon: ShieldCheck, title: 'Pagos verificados', text: 'Confirmamos cada pago directamente con Wompi; nunca guardamos datos de tu tarjeta.' },
  { icon: Undo2, title: 'Políticas claras', text: 'La política de cancelación de cada experiencia se muestra antes de pagar.' },
  { icon: HeartHandshake, title: 'Turismo local', text: 'Cada reserva apoya a negocios y comunidades de la región.' },
];

export default async function HomePage() {
  const { destinations, categories, featured, error } = await loadHome();
  const villeta = destinations.find((d) => d.slug === 'villeta');
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: 'TravelCol.online',
    areaServed: 'CO',
    description: 'Marketplace de experiencias turísticas en Colombia. Piloto en Villeta, Cundinamarca.',
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header overlay />
      <main id="contenido">
        {/* ---------- Héroe: panel selva + panel sol (referencia 1) ---------- */}
        <section className="relative overflow-hidden bg-selva-800 pt-24 pb-28 lg:pb-36">
          <svg aria-hidden viewBox="0 0 600 600" className="absolute -left-40 -top-20 h-[36rem] w-[36rem] opacity-[0.07]">
            <path d="M0 600 L180 200 L280 380 L380 120 L600 600Z" fill="#ffffff" />
          </svg>
          <div className="container-tc relative grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div className="text-white">
              <p className="script text-4xl text-sol-400 sm:text-5xl">Descubre</p>
              <h1 className="mt-1 text-5xl leading-[1.05] font-bold sm:text-6xl lg:text-7xl">
                la Colombia <span className="relative whitespace-nowrap text-sol-400">auténtica</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-white/80">
                Experiencias reales con negocios locales: cascadas, trapiches, fincas y caminos ancestrales. Reserva en minutos y paga de forma segura.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/experiencias" className="btn-sol px-6 py-3 text-base">
                  Explorar experiencias <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link href="/proveedores" className="btn border border-white/30 px-6 py-3 text-base text-white hover:bg-white/10">
                  Soy proveedor
                </Link>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-lg">
              <div className="absolute -inset-4 rotate-3 rounded-[2.5rem] bg-sol-400" aria-hidden />
              <div className="relative overflow-hidden rounded-[2.5rem] border-4 border-white shadow-suave">
                { }
                <img src="/illustrations/heroe.svg" alt="Ilustración de un paisaje andino con palmas de cera y un río" className="aspect-[4/3] w-full object-cover" />
              </div>
              <div className="animate-flotar absolute -bottom-6 -left-4 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-suave sm:-left-10">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-tierra-500 text-lg font-bold text-white">1º</span>
                <span className="text-sm leading-tight">
                  <span className="block font-semibold text-selva-900">Destino piloto</span>
                  <span className="text-pizarra">Villeta, Cundinamarca</span>
                </span>
              </div>
              <div className="absolute -top-5 -right-3 grid h-24 w-24 rotate-12 place-items-center rounded-full bg-tierra-500 text-center text-white shadow-suave">
                <span className="text-[11px] leading-tight font-semibold">
                  Pago
                  <span className="block text-lg font-bold">seguro</span>
                  con Wompi
                </span>
              </div>
            </div>
          </div>
          <TornEdge position="bottom" color="#fbf7f0" />
        </section>

        {/* ---------- Buscador superpuesto ---------- */}
        <div className="container-tc relative z-10 -mt-16 lg:-mt-20">
          <SearchBar destinations={destinations} categories={categories} />
          {error && (
            <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-bandera-rojo">
              No pudimos cargar el catálogo en este momento. Inténtalo de nuevo en unos minutos.
            </p>
          )}
        </div>

        {/* ---------- Pasos ---------- */}
        <section className="container-tc py-20 text-center" aria-labelledby="pasos">
          <p className="eyebrow">Fácil y transparente</p>
          <h2 id="pasos" className="text-3xl font-bold text-selva-900 sm:text-4xl">
            Reserva en <span className="text-tierra-500">3 pasos</span>
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="card relative p-6 text-left">
                <div className="flex items-start justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-selva-800 text-xl font-bold text-white">{s.n}</span>
                  <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-sol-400 bg-sol-100">
                    <s.icon className="h-6 w-6 text-selva-800" aria-hidden />
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-selva-900">{s.title}</h3>
                <p className="mt-2 text-sm text-pizarra">{s.text}</p>
              </div>
            ))}
          </div>
          <div className="relative mt-10 overflow-hidden rounded-3xl bg-sol-400 px-6 py-6 text-left sm:px-10">
            <svg aria-hidden viewBox="0 0 200 100" className="absolute right-0 bottom-0 h-28 w-56 opacity-30">
              <path d="M0 100 L60 30 L95 65 L130 20 L200 100Z" fill="#0b4a41" />
            </svg>
            <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <p className="text-selva-950">
                <span className="script block text-3xl">Programa piloto</span>
                <span className="text-xl font-bold sm:text-2xl">¿Tienes un negocio turístico en Villeta? Publica tus experiencias.</span>
              </p>
              <Link href="/proveedores" className="btn-primary shrink-0 px-6 py-3">
                Conoce cómo <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* ---------- Categorías ovaladas (referencia 2) ---------- */}
        <section className="relative bg-arena/60 py-20" aria-labelledby="categorias">
          <TornEdge position="top" color="#f6efe3" />
          <div className="container-tc">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow">Planea tu viaje</p>
                <h2 id="categorias" className="max-w-md text-3xl font-bold text-selva-900 sm:text-4xl">Elige cómo quieres vivir Colombia</h2>
              </div>
              <Link href="/experiencias" className="btn-ghost self-start sm:self-auto">Ver todas las experiencias</Link>
            </div>
            <ul className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/experiencias?category=${c.slug}`} className="group flex flex-col items-center text-center">
                    <span className="relative block w-full">
                      <span className="block aspect-[3/4] w-full overflow-hidden rounded-[999px] border-4 border-white shadow-tarjeta">
                        { }
                        <img src={CATEGORY_ART[c.slug] ?? '/illustrations/heroe.svg'} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      </span>
                      <span className="absolute -bottom-6 left-1/2 grid h-12 w-12 -translate-x-1/2 place-items-center rounded-full bg-white shadow-tarjeta">
                        <CategoryIcon icon={c.icon} className="h-5 w-5 text-tierra-500" />
                      </span>
                    </span>
                    <span className="mt-9 font-semibold text-selva-900 group-hover:text-tierra-600">{c.name}</span>
                    <span className="text-xs text-pizarra">
                      {c._count.services} {c._count.services === 1 ? 'experiencia' : 'experiencias'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- Destacadas ---------- */}
        <section className="container-tc py-20" aria-labelledby="destacadas">
          <p className="eyebrow">Hazlo memorable</p>
          <h2 id="destacadas" className="text-3xl font-bold text-selva-900 sm:text-4xl">Experiencias para reservar</h2>
          {featured.some((s) => s.isDemo) && (
            <p className="mt-2 max-w-2xl text-sm text-pizarra">
              Las experiencias marcadas como <strong>DEMO</strong> son datos de demostración del entorno de pruebas: no corresponden a proveedores reales y sus precios son ilustrativos.
            </p>
          )}
          {featured.length > 0 ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          ) : (
            <div className="mt-8">
              <EmptyState title="Pronto verás experiencias aquí">Estamos verificando a los primeros proveedores del programa piloto.</EmptyState>
            </div>
          )}
        </section>

        {/* ---------- Villeta ---------- */}
        <section className="relative bg-selva-900 py-20 text-white" aria-labelledby="villeta">
          <TornEdge position="top" color="#083a33" />
          <div className="container-tc grid items-center gap-12 lg:grid-cols-2">
            <div className="relative grid grid-cols-2 gap-4">
              { }
              <img src="/illustrations/cascada.svg" alt="" className="row-span-2 h-full w-full rounded-[2rem] object-cover" />
              { }
              <img src="/illustrations/pueblo.svg" alt="" className="aspect-square w-full rounded-full border-4 border-sol-400 object-cover" />
              { }
              <img src="/illustrations/trapiche.svg" alt="" className="aspect-square w-full rounded-[2rem] object-cover" />
            </div>
            <div>
              <p className="script text-3xl text-sol-400">Destino piloto</p>
              <h2 id="villeta" className="text-3xl font-bold sm:text-4xl">Villeta, la capital panelera de Cundinamarca</h2>
              <p className="mt-4 text-white/80">
                {villeta?.summary ?? 'Clima cálido, cascadas, trapiches y senderos rurales a pocas horas de Bogotá.'} Empezamos aquí para construir, junto con los negocios locales, una forma confiable de reservar turismo rural.
              </p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {['Cascadas y quebradas', 'Trapiches paneleros', 'Fincas de clima cálido', 'Historia del Camino Real'].map((t) => (
                  <li key={t} className="flex items-center gap-2 text-sm"><span className="h-2 w-2 rounded-full bg-sol-400" aria-hidden />{t}</li>
                ))}
              </ul>
              <Link href="/destinos/villeta" className="btn-sol mt-8 px-6 py-3">
                Descubrir Villeta <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
          <TornEdge position="bottom" color="#fbf7f0" />
        </section>

        {/* ---------- Confianza ---------- */}
        <section className="container-tc py-20" aria-labelledby="confianza">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="eyebrow">¿Por qué TravelCol?</p>
              <h2 id="confianza" className="text-3xl font-bold text-selva-900 sm:text-4xl">Creamos los viajes que te gustan, con reglas claras</h2>
              <p className="mt-4 text-pizarra">
                Somos una plataforma nueva y lo decimos con transparencia: preferimos pocas experiencias verificadas a un catálogo lleno de promesas.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {TRUST.map((t) => (
                <div key={t.title} className="card flex gap-4 p-5">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-tierra-100">
                    <t.icon className="h-6 w-6 text-tierra-600" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-semibold text-selva-900">{t.title}</h3>
                    <p className="mt-1 text-sm text-pizarra">{t.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Contacto ---------- */}
        <section className="container-tc">
          <div className="relative overflow-hidden rounded-3xl bg-selva-800 px-6 py-10 text-white sm:px-12">
            <div className="tricolor absolute inset-x-0 top-0 h-1.5" aria-hidden />
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <p className="script text-3xl text-sol-400">¡Hola, viajero!</p>
                <p className="text-2xl font-bold">¿Tienes preguntas o quieres proponer una experiencia?</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/preguntas-frecuentes" className="btn border border-white/30 text-white hover:bg-white/10">Preguntas frecuentes</Link>
                <Link href="/contacto" className="btn-sol">Escríbenos</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
