'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CalendarDays, Compass, MapPin, Search, Users } from 'lucide-react';

interface Option {
  slug: string;
  name: string;
}

/** Buscador principal (inspirado en la barra Location/Themes/Traveler de la referencia). */
export function SearchBar({
  destinations,
  categories,
  initial = {},
  compact = false,
}: {
  destinations: Option[];
  categories: Option[];
  initial?: { destination?: string; category?: string; date?: string; participants?: string; q?: string };
  compact?: boolean;
}) {
  const router = useRouter();
  const [destination, setDestination] = useState(initial.destination ?? '');
  const [category, setCategory] = useState(initial.category ?? '');
  const [date, setDate] = useState(initial.date ?? '');
  const [participants, setParticipants] = useState(initial.participants ?? '');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (destination) params.set('destination', destination);
    if (category) params.set('category', category);
    if (date) params.set('date', date);
    if (participants) params.set('participants', participants);
    if (initial.q) params.set('q', initial.q);
    router.push(`/experiencias${params.size ? `?${params}` : ''}`);
  }

  const field = 'flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-selva-50 focus-within:bg-selva-50';
  const control = 'w-full bg-transparent text-sm font-medium text-selva-900 focus:outline-none';
  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label="Buscar experiencias"
      className={`grid gap-1 rounded-3xl bg-white p-2 shadow-suave sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_0.8fr_auto] ${compact ? '' : 'lg:p-3'}`}
    >
      <label className={field}>
        <MapPin className="h-5 w-5 shrink-0 text-tierra-500" aria-hidden />
        <span className="flex-1">
          <span className="block text-xs text-pizarra">Destino</span>
          <select value={destination} onChange={(e) => setDestination(e.target.value)} className={control}>
            <option value="">Todos</option>
            {destinations.map((d) => (
              <option key={d.slug} value={d.slug}>{d.name}</option>
            ))}
          </select>
        </span>
      </label>
      <label className={field}>
        <Compass className="h-5 w-5 shrink-0 text-tierra-500" aria-hidden />
        <span className="flex-1">
          <span className="block text-xs text-pizarra">Tipo de experiencia</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={control}>
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </span>
      </label>
      <label className={field}>
        <CalendarDays className="h-5 w-5 shrink-0 text-tierra-500" aria-hidden />
        <span className="flex-1">
          <span className="block text-xs text-pizarra">Fecha</span>
          <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className={control} />
        </span>
      </label>
      <label className={field}>
        <Users className="h-5 w-5 shrink-0 text-tierra-500" aria-hidden />
        <span className="flex-1">
          <span className="block text-xs text-pizarra">Personas</span>
          <select value={participants} onChange={(e) => setParticipants(e.target.value)} className={control}>
            <option value="">Cualquiera</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n} {n === 1 ? 'persona' : 'personas'}</option>
            ))}
          </select>
        </span>
      </label>
      <button type="submit" className="btn-primary h-full min-h-12 rounded-2xl px-6 sm:col-span-2 lg:col-span-1">
        <Search className="h-4 w-4" aria-hidden />
        Buscar
      </button>
    </form>
  );
}
