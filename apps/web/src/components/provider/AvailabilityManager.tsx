'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CalendarPlus, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatDateTime } from '@/lib/format';
import { FormAlert } from '@/components/forms/Field';

interface Slot { id: string; startsAt: string; capacity: number; reserved: number; status: string }

export function AvailabilityManager({ serviceId, slots, editable }: { serviceId: string; slots: Slot[]; editable: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(form: HTMLFormElement) {
    const fd = new FormData(form);
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const r = await api<{ created: number; skipped?: number }>(`/provider/services/${serviceId}/availability`, {
        body: { startsAtLocal: String(fd.get('startsAtLocal')), capacity: Number(fd.get('capacity')), repeatDays: Number(fd.get('repeatDays') || 0) },
      });
      setInfo(`Se crearon ${r.created ?? 'los'} cupos.`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function update(slotId: string, body: { capacity?: number; closed?: boolean }) {
    setError(null);
    try {
      await api(`/provider/availability/${slotId}`, { method: 'PATCH', body });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="card p-6">
      {editable && (
        <form className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); void create(e.currentTarget); }}>
          <div><label className="label" htmlFor="startsAtLocal">Fecha y hora (hora de Colombia)</label><input id="startsAtLocal" name="startsAtLocal" type="datetime-local" required className="input" /></div>
          <div><label className="label" htmlFor="capacity">Cupos</label><input id="capacity" name="capacity" type="number" min={1} max={500} defaultValue={10} required className="input" /></div>
          <div><label className="label" htmlFor="repeatDays">Repetir días</label><input id="repeatDays" name="repeatDays" type="number" min={0} max={90} defaultValue={0} className="input" /></div>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CalendarPlus className="h-4 w-4" aria-hidden />}Agregar</button>
          <p className="text-xs text-pizarra sm:col-span-4">“Repetir días” crea el mismo horario en los días siguientes (0 = solo esa fecha).</p>
        </form>
      )}
      {error && <div className="mt-3"><FormAlert>{error}</FormAlert></div>}
      {info && <div className="mt-3"><FormAlert kind="success">{info}</FormAlert></div>}
      <div className="mt-5 max-h-[28rem] overflow-auto">
        <table className="table-tc">
          <thead><tr><th>Fecha</th><th>Reservados</th><th>Capacidad</th><th>Estado</th>{editable && <th className="text-right">Acciones</th>}</tr></thead>
          <tbody>
            {slots.map((s) => (
              <tr key={s.id}>
                <td>{formatDateTime(s.startsAt)}</td>
                <td>{s.reserved}</td>
                <td>
                  {editable ? (
                    <input
                      aria-label={`Capacidad del ${formatDateTime(s.startsAt)}`}
                      type="number"
                      min={s.reserved}
                      defaultValue={s.capacity}
                      className="input w-24 py-1"
                      onBlur={(e) => { const n = Number(e.target.value); if (n !== s.capacity) void update(s.id, { capacity: n }); }}
                    />
                  ) : s.capacity}
                </td>
                <td>{s.status === 'OPEN' ? 'Abierto' : 'Cerrado'}</td>
                {editable && (
                  <td className="text-right">
                    <button type="button" className="btn-ghost px-3 py-1 text-xs" onClick={() => update(s.id, { closed: s.status === 'OPEN' })}>
                      {s.status === 'OPEN' ? 'Cerrar' : 'Reabrir'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {!slots.length && <tr><td colSpan={5} className="text-pizarra">Sin cupos futuros. Agrega fechas para que los turistas puedan reservar.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
