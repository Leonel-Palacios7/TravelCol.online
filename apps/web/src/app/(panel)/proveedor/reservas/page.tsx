import { apiGet } from '@/lib/api-server';
import { formatCOP, formatDateTime, formatPhone } from '@/lib/format';
import type { ProviderBookingRow } from '@/lib/types';
import { PanelTitle } from '@/components/panel/PanelShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActionDialog } from '@/components/panel/ActionDialog';
import Link from 'next/link';

const SCOPES = [
  { value: 'upcoming', label: 'Próximas' },
  { value: 'past', label: 'Pasadas' },
  { value: 'all', label: 'Todas' },
];

export default async function ProveedorReservas({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const sp = await searchParams;
  const scope = SCOPES.some((s) => s.value === sp.scope) ? sp.scope! : 'upcoming';
  const rows = await apiGet<ProviderBookingRow[]>(`/providers/me/bookings?scope=${scope}`);
  return (
    <>
      <PanelTitle title="Reservas">Solo verás datos de contacto de reservas confirmadas de tus propias experiencias.</PanelTitle>
      <div className="mb-4 flex gap-2">
        {SCOPES.map((s) => (
          <Link key={s.value} href={`/proveedor/reservas?scope=${s.value}`} className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${s.value === scope ? 'bg-selva-800 text-white' : 'bg-white text-selva-900 shadow-tarjeta'}`}>{s.label}</Link>
        ))}
      </div>
      {rows.length ? (
        <div className="space-y-3">
          {rows.map((b) => (
            <article key={b.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-selva-900">{b.serviceTitle}</p>
                  <p className="text-sm text-pizarra">{formatDateTime(b.startsAt)} · <span className="font-mono">{b.code}</span></p>
                </div>
                <StatusBadge status={b.status} />
              </div>
              <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                <div><p className="text-xs text-pizarra uppercase">Cliente</p><p className="font-medium">{b.customerName}</p><p>{formatPhone(b.contactPhone)}</p></div>
                <div><p className="text-xs text-pizarra uppercase">Participantes ({b.participants})</p><p>{b.participantNames.join(', ')}</p>{b.notes && <p className="mt-1 text-pizarra">Nota: {b.notes}</p>}</div>
                <div>
                  <p className="text-xs text-pizarra uppercase">Liquidación</p>
                  <p>Venta {formatCOP(b.subtotalCop)}</p>
                  <p>Comisión −{formatCOP(b.commissionCop)}</p>
                  <p className="font-semibold">Neto {formatCOP(b.providerNetCop)}</p>
                </div>
              </div>
              {b.status === 'CONFIRMED' && new Date(b.startsAt) > new Date() && (
                <div className="mt-4 border-t border-selva-900/10 pt-4">
                  <ActionDialog
                    label="Cancelar por fuerza mayor"
                    variant="danger"
                    title="Cancelar la reserva"
                    description="Al cancelar como operador, el turista recibe reembolso del 100 % y se revierte tu comisión. Úsalo solo si no puedes prestar el servicio."
                    endpoint={`/providers/me/bookings/${b.id}/cancel`}
                    fields={[{ name: 'reason', label: 'Motivo (se informa al turista)', type: 'textarea', required: true }]}
                    submitLabel="Cancelar reserva"
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No hay reservas en esta vista" />
      )}
    </>
  );
}
