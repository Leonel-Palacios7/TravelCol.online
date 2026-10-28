import { apiGet } from '@/lib/api-server';
import { formatCOP, formatDateTime } from '@/lib/format';
import { PanelTitle } from '@/components/panel/PanelShell';
import { StatusTabs } from '@/components/panel/Pager';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActionDialog } from '@/components/panel/ActionDialog';

interface Row {
  id: string; amountCop: number; refundPercent: number; status: string; reason: string; externalReference: string | null; notes: string | null; executedAt: string | null; createdAt: string;
  booking: { code: string; serviceTitle: string; user: { email: string } }; payment: { reference: string; providerTransactionId: string | null };
}

export default async function ReembolsosPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const status = (await searchParams).status ?? 'REQUESTED';
  const rows = await apiGet<Row[]>(`/admin/refunds?status=${encodeURIComponent(status)}`);
  return (
    <>
      <PanelTitle title="Reembolsos">
        Ejecuta el reembolso en el panel de Wompi (o por transferencia) y registra aquí su referencia. TravelCol no ejecuta reembolsos automáticos en esta versión.
      </PanelTitle>
      <StatusTabs basePath="/admin/reembolsos" current={status} options={[{ value: 'REQUESTED', label: 'Por ejecutar' }, { value: 'EXECUTED', label: 'Ejecutados' }, { value: 'REJECTED', label: 'Rechazados' }]} />
      {rows.length ? (
        <div className="space-y-3">
          {rows.map((r) => (
            <article key={r.id} className="card flex flex-wrap items-start justify-between gap-4 p-5">
              <div>
                <p className="font-semibold text-selva-900">{formatCOP(r.amountCop)} <span className="text-sm font-normal text-pizarra">({r.refundPercent} %)</span></p>
                <p className="text-sm text-pizarra">Reserva <span className="font-mono">{r.booking.code}</span> · {r.booking.serviceTitle} · {r.booking.user.email}</p>
                <p className="text-sm text-pizarra">Pago <span className="font-mono">{r.payment.reference}</span> · Transacción Wompi <span className="font-mono">{r.payment.providerTransactionId ?? '—'}</span></p>
                <p className="mt-1 text-sm">Motivo: {r.reason}</p>
                {r.externalReference && <p className="text-sm">Referencia de reembolso: <span className="font-mono">{r.externalReference}</span> · {r.executedAt && formatDateTime(r.executedAt)}</p>}
                {r.notes && <p className="text-sm text-pizarra">Notas: {r.notes}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={r.status} />
                {r.status === 'REQUESTED' && (
                  <>
                    <ActionDialog label="Registrar ejecución" variant="primary" title="Registrar reembolso ejecutado" description="Usa la referencia que entrega Wompi o el banco. Se registra en el libro contable del proveedor." endpoint={`/admin/refunds/${r.id}/decision`} fixed={{ decision: 'MARK_EXECUTED' }} fields={[{ name: 'externalReference', label: 'Referencia del reembolso', required: true }, { name: 'notes', label: 'Notas', type: 'textarea', required: true }]} submitLabel="Registrar" />
                    <ActionDialog label="Rechazar" variant="danger" title="Rechazar reembolso" endpoint={`/admin/refunds/${r.id}/decision`} fixed={{ decision: 'REJECT' }} fields={[{ name: 'notes', label: 'Motivo', type: 'textarea', required: true }]} submitLabel="Rechazar" />
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No hay reembolsos en este estado" />
      )}
    </>
  );
}
