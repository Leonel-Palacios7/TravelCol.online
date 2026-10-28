import { LABELS, type PqrType } from '@travelcol/contracts';
import { apiGet } from '@/lib/api-server';
import { formatDateTime } from '@/lib/format';
import { PanelTitle } from '@/components/panel/PanelShell';
import { StatusTabs } from '@/components/panel/Pager';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActionDialog } from '@/components/panel/ActionDialog';

interface Row { id: string; radicado: string; fullName: string; email: string; type: string; subject: string; message: string; status: string; response: string | null; closedAt: string | null; createdAt: string }

export default async function PqrPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const status = (await searchParams).status ?? 'OPEN';
  const rows = await apiGet<Row[]>(`/admin/tickets?status=${encodeURIComponent(status)}`);
  return (
    <>
      <PanelTitle title="Peticiones, quejas y reclamos">Cada solicitud tiene un radicado. Verifica los plazos legales de respuesta aplicables con el área jurídica.</PanelTitle>
      <StatusTabs basePath="/admin/pqr" current={status} options={[{ value: 'OPEN', label: 'Abiertas' }, { value: 'IN_PROGRESS', label: 'En gestión' }, { value: 'CLOSED', label: 'Cerradas' }]} />
      {rows.length ? (
        <div className="space-y-3">
          {rows.map((t) => (
            <article key={t.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-pizarra">{t.radicado} · {LABELS.pqrType[t.type as PqrType] ?? t.type}</p>
                  <p className="font-semibold text-selva-900">{t.subject}</p>
                  <p className="text-sm text-pizarra">{t.fullName} · {t.email} · {formatDateTime(t.createdAt)}</p>
                </div>
                <StatusBadge status={t.status} />
              </div>
              <p className="mt-3 text-sm whitespace-pre-line">{t.message}</p>
              {t.response && <p className="mt-3 rounded-xl bg-selva-50 p-3 text-sm"><strong>Respuesta:</strong> {t.response}</p>}
              {t.status !== 'CLOSED' && (
                <div className="mt-4 flex gap-2 border-t border-selva-900/10 pt-4">
                  {t.status === 'OPEN' && <ActionDialog label="Tomar caso" title="Marcar en gestión" endpoint={`/admin/tickets/${t.id}`} method="PATCH" fixed={{ status: 'IN_PROGRESS' }} submitLabel="Confirmar" />}
                  <ActionDialog label="Responder y cerrar" variant="primary" title={`Responder ${t.radicado}`} description="La respuesta se envía al correo del solicitante." endpoint={`/admin/tickets/${t.id}`} method="PATCH" fixed={{ status: 'CLOSED' }} fields={[{ name: 'response', label: 'Respuesta', type: 'textarea', required: true }]} submitLabel="Enviar y cerrar" />
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No hay solicitudes en este estado" />
      )}
    </>
  );
}
