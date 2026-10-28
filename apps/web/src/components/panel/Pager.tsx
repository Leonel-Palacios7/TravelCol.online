import Link from 'next/link';

/** Paginación basada en la URL (?page=N); conserva el resto de filtros. */
export function Pager({ page, pageSize, total, basePath, params = {} }: { page: number; pageSize: number; total: number; basePath: string; params?: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    q.set('page', String(p));
    return `${basePath}?${q.toString()}`;
  };
  return (
    <nav aria-label="Paginación" className="mt-4 flex items-center justify-between text-sm">
      <span className="text-pizarra">Página {page} de {pages} · {total} registros</span>
      <div className="flex gap-2">
        {page > 1 && <Link className="btn-ghost px-4 py-1.5" href={href(page - 1)}>Anterior</Link>}
        {page < pages && <Link className="btn-ghost px-4 py-1.5" href={href(page + 1)}>Siguiente</Link>}
      </div>
    </nav>
  );
}

/** Filtro de estado como pestañas (enlaces). */
export function StatusTabs({ basePath, current, options }: { basePath: string; current?: string; options: Array<{ value?: string; label: string }> }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2" role="tablist">
      {options.map((o) => {
        const active = (o.value ?? '') === (current ?? '');
        return (
          <Link
            key={o.label}
            role="tab"
            aria-selected={active}
            href={o.value ? `${basePath}?status=${o.value}` : basePath}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${active ? 'bg-selva-800 text-white' : 'bg-white text-selva-900 shadow-tarjeta hover:bg-selva-50'}`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
