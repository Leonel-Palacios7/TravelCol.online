import { apiGet } from '@/lib/api-server';
import { requireSession } from '@/lib/session';
import { formatDate, formatPhone } from '@/lib/format';
import { PanelTitle } from '@/components/panel/PanelShell';
import { StatusTabs } from '@/components/panel/Pager';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActionDialog } from '@/components/panel/ActionDialog';

interface Row {
  id: string; businessName: string; legalName: string; taxId: string; rntNumber: string | null; contactPhone: string; description: string;
  status: string; reviewNotes: string | null; createdAt: string;
  user: { email: string; fullName: string; emailVerifiedAt: string | null }; destination: { name: string };
}

export default async function SolicitudesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireSession('/admin/solicitudes', ['ADMIN', 'SUPPORT']);
  const status = (await searchParams).status ?? 'PENDING';
  const rows = await apiGet<Row[]>(`/admin/provider-applications?status=${encodeURIComponent(status)}`);
  return (
    <>
      <PanelTitle title="Solicitudes de proveedor">Verifica identidad, NIT y RNT en fuentes oficiales antes de aprobar. Aprobar crea el perfil y otorga el rol de proveedor.</PanelTitle>
      <StatusTabs basePath="/admin/solicitudes" current={status} options={[{ value: 'PENDING', label: 'Pendientes' }, { value: 'APPROVED', label: 'Aprobadas' }, { value: 'REJECTED', label: 'Rechazadas' }]} />
      {rows.length ? (
        <div className="space-y-3">
          {rows.map((a) => (
            <article key={a.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-selva-900">{a.businessName}</p>
                  <p className="text-sm text-pizarra">{a.legalName} · NIT {a.taxId} · RNT {a.rntNumber ?? 'no informado'} · {a.destination.name}</p>
                  <p className="text-sm text-pizarra">{a.user.fullName} · {a.user.email} {a.user.emailVerifiedAt ? '(correo verificado)' : '(correo sin verificar)'} · {formatPhone(a.contactPhone)}</p>
                </div>
                <div className="text-right"><StatusBadge status={a.status} /><p className="mt-1 text-xs text-pizarra">{formatDate(a.createdAt)}</p></div>
              </div>
              <p className="mt-3 text-sm whitespace-pre-line">{a.description}</p>
              {a.reviewNotes && <p className="mt-2 text-sm text-pizarra">Notas: {a.reviewNotes}</p>}
              {a.status === 'PENDING' && user.role === 'ADMIN' && (
                <div className="mt-4 flex gap-2 border-t border-selva-900/10 pt-4">
                  <ActionDialog label="Aprobar" variant="primary" title={`Aprobar a ${a.businessName}`} description="Confirma que verificaste el RNT en el registro oficial (rnt.confecamaras.co) y la identidad del solicitante." endpoint={`/admin/provider-applications/${a.id}/decision`} fixed={{ decision: 'APPROVE' }} fields={[{ name: 'notes', label: 'Notas de verificación', type: 'textarea', required: true }]} submitLabel="Aprobar" />
                  <ActionDialog label="Rechazar" variant="danger" title={`Rechazar a ${a.businessName}`} endpoint={`/admin/provider-applications/${a.id}/decision`} fixed={{ decision: 'REJECT' }} fields={[{ name: 'notes', label: 'Motivo (se envía al solicitante)', type: 'textarea', required: true }]} submitLabel="Rechazar" />
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
