import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LABELS, type ProviderDocumentType } from '@travelcol/contracts';
import { apiGetOrNull } from '@/lib/api-server';
import { requireSession } from '@/lib/session';
import { formatDate, formatPhone } from '@/lib/format';
import { PanelTitle, Section, TableCard } from '@/components/panel/PanelShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DemoBadge } from '@/components/ui/DemoBadge';
import { ActionDialog } from '@/components/panel/ActionDialog';

interface Detail {
  id: string; slug: string; businessName: string; legalName: string; taxId: string; rntNumber: string | null; rntVerifiedAt: string | null;
  contactPhone: string; description: string; status: string; isDemo: boolean;
  user: { email: string; fullName: string; phone: string | null };
  documents: Array<{ id: string; type: string; originalName: string; status: string; reviewNotes: string | null; createdAt: string; sizeBytes: number }>;
  services: Array<{ id: string; title: string; status: string; slug: string }>;
}

export default async function ProveedorDetalle({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSession('/admin/proveedores', ['ADMIN', 'SUPPORT']);
  const { id } = await params;
  const p = await apiGetOrNull<Detail>(`/admin/providers/${id}`);
  if (!p) notFound();
  const isAdmin = user.role === 'ADMIN';
  return (
    <>
      <Link href="/admin/proveedores" className="text-sm text-tierra-600 hover:underline">← Proveedores</Link>
      <PanelTitle
        title={p.businessName}
        actions={
          <>
            <StatusBadge status={p.status} className="self-center text-sm" />
            {isAdmin && p.status === 'APPROVED' && <ActionDialog label="Suspender" variant="danger" small={false} title="Suspender proveedor" description="Sus experiencias dejarán de admitir reservas. Las reservas confirmadas no se cancelan automáticamente." endpoint={`/admin/providers/${p.id}/status`} method="PATCH" fixed={{ status: 'SUSPENDED' }} fields={[{ name: 'reason', label: 'Motivo', type: 'textarea', required: true }]} submitLabel="Suspender" />}
            {isAdmin && p.status === 'SUSPENDED' && <ActionDialog label="Reactivar" variant="primary" small={false} title="Reactivar proveedor" endpoint={`/admin/providers/${p.id}/status`} method="PATCH" fixed={{ status: 'APPROVED' }} fields={[{ name: 'reason', label: 'Motivo', type: 'textarea' }]} submitLabel="Reactivar" />}
          </>
        }
      >
        {p.isDemo && <DemoBadge />} {p.legalName} · NIT {p.taxId}
      </PanelTitle>
      <div className="card grid gap-4 p-6 text-sm sm:grid-cols-3">
        <div><p className="text-xs text-pizarra uppercase">Titular de la cuenta</p><p className="font-medium">{p.user.fullName}</p><p>{p.user.email}</p></div>
        <div><p className="text-xs text-pizarra uppercase">Contacto</p><p>{formatPhone(p.contactPhone)}</p></div>
        <div><p className="text-xs text-pizarra uppercase">RNT</p><p className="font-medium">{p.rntNumber ?? 'No informado'}</p><p>{p.rntVerifiedAt ? `Verificado el ${formatDate(p.rntVerifiedAt)}` : 'Sin verificar'}</p></div>
        <p className="text-pizarra sm:col-span-3">{p.description}</p>
      </div>
      <Section title="Documentos">
        <TableCard>
          <thead><tr><th>Tipo</th><th>Archivo</th><th>Enviado</th><th>Estado</th><th className="text-right">Acciones</th></tr></thead>
          <tbody>
            {p.documents.map((d) => (
              <tr key={d.id}>
                <td>{LABELS.documentType[d.type as ProviderDocumentType] ?? d.type}</td>
                <td className="max-w-48 truncate"><a href={`/api/v1/admin/documents/${d.id}/file`} className="text-tierra-600 hover:underline">{d.originalName}</a><span className="block text-xs text-pizarra">{Math.round(d.sizeBytes / 1024)} KB</span></td>
                <td>{formatDate(d.createdAt)}</td>
                <td><StatusBadge status={d.status} />{d.reviewNotes && <p className="text-xs text-pizarra">{d.reviewNotes}</p>}</td>
                <td className="text-right">
                  {d.status === 'PENDING' && (
                    <div className="flex justify-end gap-2">
                      <ActionDialog label="Verificar" variant="primary" title="Verificar documento" description={d.type === 'RNT' ? 'Al verificar el RNT, el proveedor queda marcado con RNT verificado. Confírmalo en el registro oficial.' : undefined} endpoint={`/admin/documents/${d.id}`} method="PATCH" fixed={{ status: 'VERIFIED' }} fields={[{ name: 'notes', label: 'Notas', type: 'textarea' }]} submitLabel="Verificar" />
                      <ActionDialog label="Rechazar" variant="danger" title="Rechazar documento" endpoint={`/admin/documents/${d.id}`} method="PATCH" fixed={{ status: 'REJECTED' }} fields={[{ name: 'notes', label: 'Motivo (se informa al proveedor)', type: 'textarea', required: true }]} submitLabel="Rechazar" />
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!p.documents.length && <tr><td colSpan={5} className="text-pizarra">El proveedor no ha subido documentos.</td></tr>}
          </tbody>
        </TableCard>
      </Section>
      <Section title="Experiencias">
        <ul className="card divide-y divide-selva-900/5 p-2">
          {p.services.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-3 py-2 text-sm"><span>{s.title}</span><StatusBadge status={s.status} /></li>
          ))}
          {!p.services.length && <li className="px-3 py-2 text-sm text-pizarra">Sin experiencias.</li>}
        </ul>
      </Section>
    </>
  );
}
