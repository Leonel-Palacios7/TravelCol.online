import Link from 'next/link';
import { apiGet } from '@/lib/api-server';
import { formatCOP, formatDate } from '@/lib/format';
import { PanelTitle } from '@/components/panel/PanelShell';
import { Pager, StatusTabs } from '@/components/panel/Pager';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DemoBadge } from '@/components/ui/DemoBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActionDialog } from '@/components/panel/ActionDialog';

interface Row {
  id: string; slug: string; title: string; summary: string; status: string; priceCop: number; isDemo: boolean; updatedAt: string; rejectionReason: string | null;
  provider: { businessName: string; rntVerifiedAt: string | null; status: string }; category: { name: string }; _count: { media: number; availability: number };
}

export default async function ServiciosAdmin({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const sp = await searchParams;
  const status = sp.status ?? 'IN_REVIEW';
  const data = await apiGet<{ items: Row[]; total: number; page: number; pageSize: number }>(`/admin/services?status=${status}&page=${sp.page ?? 1}`);
  return (
    <>
      <PanelTitle title="Moderación de experiencias">Revisa veracidad, fotos, precio, política y que el proveedor tenga RNT verificado antes de publicar.</PanelTitle>
      <StatusTabs basePath="/admin/servicios" current={status} options={[{ value: 'IN_REVIEW', label: 'En revisión' }, { value: 'PUBLISHED', label: 'Publicadas' }, { value: 'REJECTED', label: 'Rechazadas' }, { value: 'DRAFT', label: 'Borradores' }, { value: 'ARCHIVED', label: 'Archivadas' }]} />
      {data.items.length ? (
        <div className="space-y-3">
          {data.items.map((s) => (
            <article key={s.id} className="card flex flex-wrap items-start gap-4 p-5">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-selva-900">{s.title} {s.isDemo && <DemoBadge />}</p>
                <p className="text-sm text-pizarra">{s.provider.businessName} · {s.category.name} · {formatCOP(s.priceCop)} · {s._count.media} fotos · {s._count.availability} fechas · {formatDate(s.updatedAt)}</p>
                <p className="mt-1 text-sm">{s.summary}</p>
                {!s.provider.rntVerifiedAt && <p className="mt-1 text-xs font-semibold text-bandera-rojo">El proveedor no tiene RNT verificado.</p>}
                {s.rejectionReason && <p className="mt-1 text-xs text-pizarra">Motivo: {s.rejectionReason}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={s.status} />
                {s.status === 'PUBLISHED' && <Link href={`/experiencias/${s.slug}`} className="btn-ghost px-3.5 py-1.5 text-xs">Ver</Link>}
                {s.status === 'IN_REVIEW' && <ActionDialog label="Publicar" variant="primary" title="Publicar experiencia" description="Quedará visible y reservable en el catálogo." endpoint={`/admin/services/${s.id}/moderation`} fixed={{ decision: 'PUBLISH' }} submitLabel="Publicar" />}
                {s.status === 'IN_REVIEW' && <ActionDialog label="Rechazar" variant="danger" title="Rechazar experiencia" endpoint={`/admin/services/${s.id}/moderation`} fixed={{ decision: 'REJECT' }} fields={[{ name: 'reason', label: 'Motivo (se informa al proveedor)', type: 'textarea', required: true }]} submitLabel="Rechazar" />}
                {s.status === 'PUBLISHED' && <ActionDialog label="Archivar" variant="danger" title="Retirar del catálogo" endpoint={`/admin/services/${s.id}/moderation`} fixed={{ decision: 'ARCHIVE' }} fields={[{ name: 'reason', label: 'Motivo', type: 'textarea', required: true }]} submitLabel="Archivar" />}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No hay experiencias en este estado" />
      )}
      <Pager page={data.page} pageSize={data.pageSize} total={data.total} basePath="/admin/servicios" params={{ status }} />
    </>
  );
}
