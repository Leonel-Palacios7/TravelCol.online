import type { Metadata } from 'next';
import Link from 'next/link';
import type { Paginated, ServiceCardDto } from '@travelcol/contracts';
import { apiGet } from '@/lib/api-server';
import type { CategoryRow, DestinationRow } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchBar } from '@/components/catalog/SearchBar';
import { ServiceCard } from '@/components/catalog/ServiceCard';
import { EmptyState } from '@/components/ui/EmptyState';

export const metadata: Metadata = {
  title: 'Experiencias turísticas',
  description: 'Busca y reserva experiencias turísticas en Colombia: caminatas, aventura, cultura, fincas y naturaleza.',
  alternates: { canonical: '/experiencias' },
};

type SP = Record<string, string | string[] | undefined>;
const ALLOWED = ['q', 'destination', 'category', 'minPrice', 'maxPrice', 'date', 'participants', 'sort', 'page'] as const;

export default async function ExperiencesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const k of ALLOWED) {
    const v = sp[k];
    if (typeof v === 'string' && v) params.set(k, v);
  }
  params.set('pageSize', '12');

  let result: Paginated<ServiceCardDto> | null = null;
  let failed = false;
  const [destinations, categories] = await Promise.all([
    apiGet<DestinationRow[]>('/destinations', { auth: false, revalidate: 300 }).catch(() => []),
    apiGet<CategoryRow[]>('/categories', { auth: false, revalidate: 300 }).catch(() => []),
  ]);
  try {
    result = await apiGet<Paginated<ServiceCardDto>>(`/services?${params}`, { auth: false, revalidate: 30 });
  } catch {
    failed = true;
  }
  const page = result?.page ?? 1;
  const pages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
  const link = (overrides: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    p.delete('pageSize');
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    return `/experiencias${p.size ? `?${p}` : ''}`;
  };
  const sort = typeof sp.sort === 'string' ? sp.sort : 'relevance';

  return (
    <>
      <PageHeader eyebrow="Explora" title="Experiencias en Colombia">
        Precios en pesos colombianos (COP) por persona. Disponibilidad confirmada al reservar.
      </PageHeader>
      <div className="container-tc -mt-6 relative z-10">
        <SearchBar
          compact
          destinations={destinations}
          categories={categories}
          initial={{
            destination: typeof sp.destination === 'string' ? sp.destination : '',
            category: typeof sp.category === 'string' ? sp.category : '',
            date: typeof sp.date === 'string' ? sp.date : '',
            participants: typeof sp.participants === 'string' ? sp.participants : '',
            q: typeof sp.q === 'string' ? sp.q : '',
          }}
        />
      </div>
      <section className="container-tc py-10">
        <div className="flex flex-col gap-4 lg:flex-row">
          <aside className="lg:w-60 lg:shrink-0" aria-label="Filtros">
            <form action="/experiencias" className="card space-y-4 p-5">
              {(['destination', 'category', 'date', 'participants'] as const).map((k) =>
                typeof sp[k] === 'string' && sp[k] ? <input key={k} type="hidden" name={k} value={sp[k] as string} /> : null,
              )}
              <div>
                <label htmlFor="q" className="label">Palabra clave</label>
                <input id="q" name="q" defaultValue={typeof sp.q === 'string' ? sp.q : ''} placeholder="Cascada, panela…" className="input" maxLength={80} />
              </div>
              <fieldset>
                <legend className="label">Precio por persona (COP)</legend>
                <div className="flex gap-2">
                  <input aria-label="Precio mínimo" name="minPrice" type="number" min={0} step={1000} defaultValue={typeof sp.minPrice === 'string' ? sp.minPrice : ''} placeholder="Mín." className="input" />
                  <input aria-label="Precio máximo" name="maxPrice" type="number" min={0} step={1000} defaultValue={typeof sp.maxPrice === 'string' ? sp.maxPrice : ''} placeholder="Máx." className="input" />
                </div>
              </fieldset>
              <div>
                <label htmlFor="sort" className="label">Ordenar por</label>
                <select id="sort" name="sort" defaultValue={sort} className="input">
                  <option value="relevance">Recomendadas</option>
                  <option value="price_asc">Menor precio</option>
                  <option value="price_desc">Mayor precio</option>
                  <option value="newest">Más recientes</option>
                </select>
              </div>
              <button className="btn-primary w-full" type="submit">Aplicar filtros</button>
              <Link href="/experiencias" className="block text-center text-sm text-pizarra underline">Limpiar todo</Link>
            </form>
          </aside>
          <div className="flex-1">
            {failed ? (
              <EmptyState title="No pudimos cargar las experiencias">Revisa tu conexión o inténtalo de nuevo en unos minutos.</EmptyState>
            ) : result && result.items.length > 0 ? (
              <>
                <p className="mb-4 text-sm text-pizarra" aria-live="polite">
                  {result.total} {result.total === 1 ? 'experiencia encontrada' : 'experiencias encontradas'}
                </p>
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {result.items.map((s) => (
                    <ServiceCard key={s.id} service={s} />
                  ))}
                </div>
                {pages > 1 && (
                  <nav aria-label="Paginación" className="mt-8 flex items-center justify-center gap-2">
                    {page > 1 && <Link className="btn-ghost" href={link({ page: String(page - 1) })}>Anterior</Link>}
                    <span className="text-sm text-pizarra">Página {page} de {pages}</span>
                    {page < pages && <Link className="btn-ghost" href={link({ page: String(page + 1) })}>Siguiente</Link>}
                  </nav>
                )}
              </>
            ) : (
              <EmptyState title="No hay experiencias con esos filtros" action={<Link href="/experiencias" className="btn-primary">Ver todas</Link>}>
                Prueba otra fecha, otra categoría o quita el filtro de precio.
              </EmptyState>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
