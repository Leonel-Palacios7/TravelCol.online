import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiGet, apiGetOrNull } from '@/lib/api-server';
import type { CategoryRow, DestinationRow } from '@/lib/types';
import { PanelTitle, Section } from '@/components/panel/PanelShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FormAlert } from '@/components/forms/Field';
import { ActionDialog } from '@/components/panel/ActionDialog';
import { ServiceForm, type ServiceFormValues } from '@/components/provider/ServiceForm';
import { MediaManager } from '@/components/provider/MediaManager';
import { AvailabilityManager } from '@/components/provider/AvailabilityManager';

type Detail = ServiceFormValues & { id: string; slug: string; status: string; rejectionReason: string | null; media: Array<{ id: string; url: string; alt: string }> };

export default async function EditarServicio({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nuevo?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const s = await apiGetOrNull<Detail>(`/provider/services/${id}`);
  if (!s) notFound();
  const [slots, categories, destinations] = await Promise.all([
    apiGet<Array<{ id: string; startsAt: string; capacity: number; reserved: number; status: string }>>(`/provider/services/${id}/availability`),
    apiGet<CategoryRow[]>('/categories', { auth: false, revalidate: 300 }),
    apiGet<DestinationRow[]>('/destinations', { auth: false, revalidate: 300 }),
  ]);
  const editable = s.status !== 'ARCHIVED';
  return (
    <>
      <Link href="/proveedor/servicios" className="text-sm text-tierra-600 hover:underline">← Experiencias</Link>
      <PanelTitle
        title={s.title}
        actions={
          <>
            <StatusBadge status={s.status} className="self-center text-sm" />
            {s.status === 'PUBLISHED' && <Link href={`/experiencias/${s.slug}`} className="btn-ghost">Ver publicada</Link>}
            {(s.status === 'DRAFT' || s.status === 'REJECTED') && (
              <ActionDialog label="Enviar a revisión" variant="sol" small={false} title="Enviar a revisión" description="El equipo de TravelCol revisará la información, las fotos y tu RNT antes de publicar." endpoint={`/provider/services/${id}/submit-for-review`} submitLabel="Enviar" />
            )}
            {editable && (
              <ActionDialog label="Archivar" variant="danger" small={false} title="Archivar experiencia" description="Dejará de mostrarse y no admitirá nuevas reservas. Las reservas existentes se mantienen." endpoint={`/provider/services/${id}/archive`} submitLabel="Archivar" />
            )}
          </>
        }
      >
        {s.status === 'IN_REVIEW' ? 'En revisión: puedes seguir editando; los cambios se revisarán antes de publicarse.' : 'Edita la información, las fotos y las fechas disponibles.'}
      </PanelTitle>
      {sp.nuevo && <div className="mb-4"><FormAlert kind="success">Borrador creado. Ahora agrega fotos y fechas.</FormAlert></div>}
      {s.rejectionReason && <div className="mb-4"><FormAlert>Motivo del último rechazo: {s.rejectionReason}</FormAlert></div>}
      <Section title="Fotografías"><MediaManager serviceId={id} media={s.media} editable={editable} /></Section>
      <Section title="Fechas y cupos"><AvailabilityManager serviceId={id} slots={slots} editable={editable} /></Section>
      <Section title="Información">
        {editable ? <ServiceForm serviceId={id} initial={s} categories={categories} destinations={destinations} /> : <p className="text-sm text-pizarra">La experiencia está archivada.</p>}
      </Section>
    </>
  );
}
