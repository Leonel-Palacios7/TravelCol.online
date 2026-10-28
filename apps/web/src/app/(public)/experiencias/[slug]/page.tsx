import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, Check, Clock, MapPin, ShieldCheck, Star, Users, X } from 'lucide-react';
import { LABELS, describeCancellationPolicy, type Paginated, type ServiceCardDto, type ServiceDetailDto } from '@travelcol/contracts';
import { apiGetOrNull } from '@/lib/api-server';
import { getSession } from '@/lib/session';
import { formatCOP, formatDate, formatDuration } from '@/lib/format';
import type { ReviewRow } from '@/lib/types';
import { BookingWidget } from '@/components/booking/BookingWidget';
import { FavoriteButton } from '@/components/booking/FavoriteButton';
import { DemoBadge } from '@/components/ui/DemoBadge';

type Params = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  if (!/^[a-z0-9-]{3,140}$/.test(slug)) return null;
  return apiGetOrNull<ServiceDetailDto>(`/services/${slug}`, { auth: false, revalidate: 30 });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const s = await load((await params).slug);
  if (!s) return { title: 'Experiencia no encontrada' };
  return {
    title: `${s.title} en ${s.destination.name}`,
    description: s.summary,
    alternates: { canonical: `/experiencias/${s.slug}` },
    openGraph: { title: s.title, description: s.summary, images: s.cover ? [s.cover.url] : [] },
    robots: s.isDemo ? { index: false } : undefined,
  };
}

export default async function ServiceDetail({ params }: Params) {
  const { slug } = await params;
  const s = await load(slug);
  if (!s) notFound();
  const [user, reviews] = await Promise.all([
    getSession(),
    apiGetOrNull<Paginated<ReviewRow>>(`/services/${s.id}/reviews?pageSize=10`, { auth: false, revalidate: 60 }),
  ]);
  const favorites = user ? await apiGetOrNull<ServiceCardDto[]>('/users/me/favorites') : null;
  const isFav = !!favorites?.some((f) => f.id === s.id);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: s.title,
    description: s.summary,
    touristType: s.category.name,
    provider: { '@type': 'Organization', name: s.provider.businessName },
    offers: { '@type': 'Offer', price: s.priceCop, priceCurrency: 'COP', availability: 'https://schema.org/InStock' },
    ...(s.reviewCount > 0 && s.ratingAverage ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: s.ratingAverage, reviewCount: s.reviewCount } } : {}),
  };

  return (
    <div className="container-tc py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Ruta de navegación" className="mb-4 text-sm text-pizarra">
        <Link href="/experiencias" className="hover:underline">Experiencias</Link> /{' '}
        <Link href={`/destinos/${s.destination.slug}`} className="hover:underline">{s.destination.name}</Link> /{' '}
        <span className="text-selva-900">{s.title}</span>
      </nav>

      {s.isDemo && (
        <div role="note" className="mb-6 flex gap-3 rounded-2xl border border-bandera-azul/20 bg-blue-50 p-4 text-sm text-bandera-azul">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
          <p><strong>Experiencia de demostración.</strong> Publicada para probar la plataforma: el proveedor no es real y el precio es ilustrativo. No uses datos de pago reales.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4 sm:grid-rows-2">
        {s.media.slice(0, 3).map((m, i) => (
           
          <img key={m.id} src={m.url} alt={m.alt} className={`h-full w-full rounded-3xl object-cover ${i === 0 ? 'aspect-[4/3] sm:col-span-3 sm:row-span-2' : 'hidden aspect-square sm:block'}`} />
        ))}
        {s.media.length === 1 && (
          <div className="hidden flex-col justify-center rounded-3xl bg-selva-800 p-6 text-white sm:row-span-2 sm:flex">
            <p className="script text-3xl text-sol-400">{s.destination.name}</p>
            <p className="mt-2 text-sm text-white/80">{s.summary}</p>
          </div>
        )}
      </div>
      {s.media[0]?.credit && <p className="mt-2 text-xs text-pizarra">{s.media[0].credit}</p>}

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-selva-100 px-3 py-1 text-xs font-semibold text-selva-800">{s.category.name}</span>
            {s.isDemo && <DemoBadge />}
          </div>
          <h1 className="mt-3 text-3xl font-bold text-selva-900 sm:text-4xl">{s.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-pizarra">
            <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4 text-tierra-500" aria-hidden />{s.destination.name}, {s.destination.department}</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4 text-tierra-500" aria-hidden />{formatDuration(s.durationMinutes)}</span>
            <span className="inline-flex items-center gap-1"><Users className="h-4 w-4 text-tierra-500" aria-hidden />Hasta {s.maxParticipantsPerBooking} por reserva</span>
            {s.reviewCount > 0 && s.ratingAverage && (
              <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-sol-500 text-sol-500" aria-hidden />{s.ratingAverage.toFixed(1)} ({s.reviewCount} reseñas verificadas)</span>
            )}
          </div>
          <div className="mt-4"><FavoriteButton serviceId={s.id} initial={isFav} loggedIn={!!user} /></div>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-selva-900">Sobre la experiencia</h2>
            <div className="mt-3 space-y-3 whitespace-pre-line text-pizarra">{s.description}</div>
          </section>

          <section className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="card p-5">
              <h2 className="font-semibold text-selva-900">Incluye</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {s.includes.length ? s.includes.map((i) => <li key={i} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-selva-700" aria-hidden />{i}</li>) : <li className="text-pizarra">Sin información</li>}
              </ul>
            </div>
            <div className="card p-5">
              <h2 className="font-semibold text-selva-900">No incluye</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {s.excludes.length ? s.excludes.map((i) => <li key={i} className="flex gap-2"><X className="h-4 w-4 shrink-0 text-bandera-rojo" aria-hidden />{i}</li>) : <li className="text-pizarra">Sin información</li>}
              </ul>
            </div>
          </section>

          <section className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="text-xl font-semibold text-selva-900">Requisitos</h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-pizarra">
                {s.minAge ? <li>Edad mínima: {s.minAge} años</li> : null}
                {s.requirements.map((r) => <li key={r}>{r}</li>)}
                {!s.minAge && s.requirements.length === 0 && <li>Sin requisitos especiales</li>}
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-selva-900">Punto de encuentro</h2>
              <p className="mt-3 text-sm text-pizarra">{s.meetingPoint}</p>
            </div>
          </section>

          <section className="mt-8 rounded-2xl bg-sol-100 p-5">
            <h2 className="flex items-center gap-2 font-semibold text-selva-900"><ShieldCheck className="h-5 w-5" aria-hidden />Política de cancelación: {LABELS.cancellationPolicy[s.cancellationPolicy]}</h2>
            <p className="mt-2 text-sm text-selva-900/80">{describeCancellationPolicy(s.cancellationPolicy)}</p>
            <Link href="/legal/cancelaciones" className="mt-2 inline-block text-sm font-medium underline">Ver política completa</Link>
          </section>

          <section className="mt-8 card p-5">
            <h2 className="font-semibold text-selva-900">Ofrecido por</h2>
            <Link href={`/operadores/${s.provider.slug}`} className="mt-2 inline-block text-lg font-semibold text-tierra-600 hover:underline">{s.provider.businessName}</Link>
            <p className="mt-1 text-sm text-pizarra">
              {s.provider.rntVerified ? 'Registro Nacional de Turismo verificado por TravelCol.' : 'RNT pendiente de verificación.'}
            </p>
          </section>

          <section className="mt-10" aria-labelledby="resenas">
            <h2 id="resenas" className="text-xl font-semibold text-selva-900">Reseñas verificadas</h2>
            {reviews && reviews.items.length > 0 ? (
              <ul className="mt-4 space-y-4">
                {reviews.items.map((r) => (
                  <li key={r.id} className="card p-5">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-selva-900">{r.authorName}</p>
                      <p className="flex" aria-label={`${r.rating} de 5 estrellas`}>
                        {Array.from({ length: 5 }, (_, i) => <Star key={i} className={`h-4 w-4 ${i < r.rating ? 'fill-sol-500 text-sol-500' : 'text-selva-900/20'}`} aria-hidden />)}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-pizarra">{r.comment}</p>
                    <p className="mt-2 text-xs text-pizarra">{formatDate(r.createdAt)} · Reserva verificada</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-pizarra">Aún no hay reseñas. Solo quienes completan una reserva pueden opinar.</p>
            )}
          </section>
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <BookingWidget
            serviceId={s.id}
            slug={s.slug}
            priceCop={s.priceCop}
            minParticipants={s.minParticipants}
            maxParticipants={s.maxParticipantsPerBooking}
            policy={s.cancellationPolicy}
            loggedIn={!!user}
          />
          <p className="mt-3 text-center text-xs text-pizarra">Desde {formatCOP(s.priceCop)} por persona · Precios en COP</p>
        </aside>
      </div>
    </div>
  );
}
