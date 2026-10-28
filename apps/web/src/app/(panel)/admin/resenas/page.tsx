import { apiGet } from '@/lib/api-server';
import { formatDate } from '@/lib/format';
import { PanelTitle } from '@/components/panel/PanelShell';
import { StatusTabs } from '@/components/panel/Pager';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActionDialog } from '@/components/panel/ActionDialog';

interface Row { id: string; rating: number; comment: string; status: string; moderationNote: string | null; createdAt: string; service: { title: string }; user: { fullName: string } }

export default async function ResenasPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const status = (await searchParams).status;
  const rows = await apiGet<Row[]>(`/admin/reviews${status ? `?status=${encodeURIComponent(status)}` : ''}`);
  return (
    <>
      <PanelTitle title="Reseñas">Solo turistas con reserva completada pueden reseñar. Oculta únicamente contenido que incumpla las normas (datos personales, ofensas, spam), nunca opiniones negativas legítimas.</PanelTitle>
      <StatusTabs basePath="/admin/resenas" current={status} options={[{ label: 'Todas' }, { value: 'PUBLISHED', label: 'Publicadas' }, { value: 'HIDDEN', label: 'Ocultas' }]} />
      {rows.length ? (
        <div className="space-y-3">
          {rows.map((r) => (
            <article key={r.id} className="card flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="max-w-2xl">
                <p className="text-sol-500" aria-label={`${r.rating} de 5`}>{'★'.repeat(r.rating)}<span className="text-arena">{'★'.repeat(5 - r.rating)}</span></p>
                <p className="text-sm">{r.comment}</p>
                <p className="mt-1 text-xs text-pizarra">{r.user.fullName} · {r.service.title} · {formatDate(r.createdAt)}</p>
                {r.moderationNote && <p className="text-xs text-pizarra">Moderación: {r.moderationNote}</p>}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={r.status} />
                {r.status === 'PUBLISHED' ? (
                  <ActionDialog label="Ocultar" variant="danger" title="Ocultar reseña" endpoint={`/admin/reviews/${r.id}`} method="PATCH" fixed={{ status: 'HIDDEN' }} fields={[{ name: 'reason', label: 'Norma incumplida', type: 'textarea', required: true }]} submitLabel="Ocultar" />
                ) : (
                  <ActionDialog label="Publicar" variant="primary" title="Volver a publicar" endpoint={`/admin/reviews/${r.id}`} method="PATCH" fixed={{ status: 'PUBLISHED' }} fields={[{ name: 'reason', label: 'Motivo', type: 'textarea', required: true }]} submitLabel="Publicar" />
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No hay reseñas" />
      )}
    </>
  );
}
