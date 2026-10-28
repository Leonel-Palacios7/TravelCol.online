import Link from 'next/link';
import { BOOKING_STATUSES, LABELS } from '@travelcol/contracts';
import { apiGet } from '@/lib/api-server';
import { requireSession } from '@/lib/session';
import { formatCOP, formatDateTime } from '@/lib/format';
import { PanelTitle, TableCard } from '@/components/panel/PanelShell';
import { Pager } from '@/components/panel/Pager';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ActionDialog } from '@/components/panel/ActionDialog';

interface Row {
  id: string; code: string; status: string; serviceTitle: string; startsAt: string; participantsCount: number; totalCop: number; commissionCop: number;
  needsAttention: boolean; createdAt: string; user: { email: string; fullName: string }; provider: { businessName: string }; payments: Array<{ status: string; reference: string }>;
}

export default async function ReservasAdmin({ searchParams }: { searchParams: Promise<{ status?: string; attention?: string; page?: string }> }) {
  const user = await requireSession('/admin/reservas', ['ADMIN', 'SUPPORT']);
  const sp = await searchParams;
  const q = new URLSearchParams({ page: sp.page ?? '1' });
  if (sp.status && (BOOKING_STATUSES as readonly string[]).includes(sp.status)) q.set('status', sp.status);
  if (sp.attention === 'true') q.set('attention', 'true');
  const data = await apiGet<{ items: Row[]; total: number; page: number; pageSize: number }>(`/admin/bookings?${q}`);
  return (
    <>
      <PanelTitle title="Reservas">“Requiere atención” marca pagos aprobados que llegaron tarde o con inconsistencias; resuélvelos manualmente.</PanelTitle>
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/reservas" className={`rounded-full px-3.5 py-1.5 text-sm ${!sp.status && !sp.attention ? 'bg-selva-800 text-white' : 'bg-white shadow-tarjeta'}`}>Todas</Link>
        <Link href="/admin/reservas?attention=true" className={`rounded-full px-3.5 py-1.5 text-sm ${sp.attention === 'true' ? 'bg-selva-800 text-white' : 'bg-white shadow-tarjeta'}`}>Requieren atención</Link>
        {BOOKING_STATUSES.map((s) => (
          <Link key={s} href={`/admin/reservas?status=${s}`} className={`rounded-full px-3.5 py-1.5 text-sm ${sp.status === s ? 'bg-selva-800 text-white' : 'bg-white shadow-tarjeta'}`}>{LABELS.bookingStatus[s]}</Link>
        ))}
      </div>
      <TableCard>
        <thead><tr><th>Código</th><th>Experiencia</th><th>Turista</th><th>Fecha</th><th>Total</th><th>Pago</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          {data.items.map((b) => (
            <tr key={b.id} className={b.needsAttention ? 'bg-sol-100/60' : undefined}>
              <td className="font-mono text-xs">{b.code}{b.needsAttention && <span className="block font-sans font-semibold text-tierra-600">Requiere atención</span>}</td>
              <td>{b.serviceTitle}<span className="block text-xs text-pizarra">{b.provider.businessName}</span></td>
              <td>{b.user.fullName}<span className="block text-xs text-pizarra">{b.user.email}</span></td>
              <td className="whitespace-nowrap">{formatDateTime(b.startsAt)}<span className="block text-xs text-pizarra">{b.participantsCount} pers.</span></td>
              <td>{formatCOP(b.totalCop)}<span className="block text-xs text-pizarra">Com. {formatCOP(b.commissionCop)}</span></td>
              <td>{b.payments[0] ? <StatusBadge status={b.payments[0].status} /> : '—'}</td>
              <td><StatusBadge status={b.status} /></td>
              <td>
                {user.role === 'ADMIN' && (b.status === 'CONFIRMED' || b.status === 'PENDING_PAYMENT') && (
                  <ActionDialog label="Cancelar" variant="danger" title={`Cancelar ${b.code}`} description="Cancelación administrativa con reembolso del 100 % si hay pago aprobado. Queda en auditoría." endpoint={`/admin/bookings/${b.id}/cancel`} fields={[{ name: 'reason', label: 'Motivo', type: 'textarea', required: true }]} submitLabel="Cancelar reserva" />
                )}
              </td>
            </tr>
          ))}
          {!data.items.length && <tr><td colSpan={8} className="text-pizarra">Sin reservas.</td></tr>}
        </tbody>
      </TableCard>
      <Pager page={data.page} pageSize={data.pageSize} total={data.total} basePath="/admin/reservas" params={{ status: sp.status, attention: sp.attention }} />
    </>
  );
}
