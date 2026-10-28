import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Paginated, ServiceCardDto } from '@travelcol/contracts';
import { apiGetOrNull } from '@/lib/api-server';
import { PageHeader } from '@/components/ui/PageHeader';
import { ServiceCard } from '@/components/catalog/ServiceCard';
import { EmptyState } from '@/components/ui/EmptyState';

interface Destination { slug: string; name: string; department: string; summary: string; description: string; isPilot: boolean }
type Params = { params: Promise<{ slug: string }> };

const load = (slug: string) => (/^[a-z0-9-]{2,80}$/.test(slug) ? apiGetOrNull<Destination>(`/destinations/${slug}`, { auth: false, revalidate: 300 }) : null);

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const d = await load((await params).slug);
  return d ? { title: `${d.name}, ${d.department}`, description: d.summary, alternates: { canonical: `/destinos/${d.slug}` } } : { title: 'Destino no encontrado' };
}

export default async function DestinationPage({ params }: Params) {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) notFound();
  const services = await apiGetOrNull<Paginated<ServiceCardDto>>(`/services?destination=${d.slug}&pageSize=24`, { auth: false, revalidate: 60 });
  return (
    <>
      <PageHeader eyebrow={d.isPilot ? 'Destino piloto' : 'Destino'} title={`${d.name}, ${d.department}`}>{d.summary}</PageHeader>
      <section className="container-tc grid gap-10 py-12 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-2xl font-bold text-selva-900">Conoce {d.name}</h2>
          <p className="mt-3 whitespace-pre-line text-pizarra">{d.description}</p>
          <div className="mt-6 rounded-2xl bg-sol-100 p-5 text-sm text-selva-900">
            <p className="font-semibold">Consejos de viaje</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Clima cálido: lleva protector solar, repelente e hidratación.</li>
              <li>Usa calzado antideslizante para senderos y cascadas.</li>
              <li>Las condiciones de cada experiencia aparecen en su ficha antes de pagar.</li>
            </ul>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          { }
          <img src="/illustrations/pueblo.svg" alt="Ilustración de la plaza del pueblo" className="col-span-2 aspect-[2/1] w-full rounded-3xl object-cover" />
          { }
          <img src="/illustrations/cascada.svg" alt="Ilustración de una cascada" className="aspect-square w-full rounded-[999px] object-cover" />
          { }
          <img src="/illustrations/finca.svg" alt="Ilustración de una finca" className="aspect-square w-full rounded-3xl object-cover" />
        </div>
      </section>
      <section className="container-tc">
        <h2 className="text-2xl font-bold text-selva-900">Experiencias en {d.name}</h2>
        {services && services.items.length ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{services.items.map((s) => <ServiceCard key={s.id} service={s} />)}</div>
        ) : (
          <div className="mt-6"><EmptyState title="Aún no hay experiencias publicadas">Estamos verificando a los primeros proveedores.</EmptyState></div>
        )}
      </section>
    </>
  );
}
