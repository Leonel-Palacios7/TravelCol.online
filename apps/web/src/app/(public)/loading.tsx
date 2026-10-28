export default function Loading() {
  return (
    <div className="container-tc py-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      <div className="h-8 w-64 animate-pulse rounded-full bg-arena" />
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl2 bg-arena" />)}
      </div>
      <div className="mt-6 h-64 animate-pulse rounded-xl2 bg-arena" />
    </div>
  );
}
