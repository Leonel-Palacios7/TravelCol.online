import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AlertTriangle, BadgeCheck } from 'lucide-react';
import type { ServiceCardDto } from '@travelcol/contracts';
import { apiGetOrNull } from '@/lib/api-server';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { ServiceCard } from '@/components/catalog/ServiceCard';
import { EmptyState } from '@/components/ui/EmptyState';

interface ProviderPublic {
  slug: string; businessName: string; description: string; rntNumber: string | null; rntVerified: boolean; isDemo: boolean; createdAt: string;
  destination: { name: string; department: string }; services: ServiceCardDto[];
}
type Params = { params: Promise<{ slug: string }> };
const load = (slug: string) => (/^[a-z0-9-]{2,140}$/.test(slug) ? apiGetOrNull<ProviderPublic>(`/providers/${slug}`, { auth: false, revalidate: 120 }) : null);

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = await load((await params).slug);
  return p ? { title: p.businessName, description: p.description.slice(0, 160), robots: p.isDemo ? { index: false } : undefined } : { title: 'Proveedor no encontrado' };
}

export default async function ProviderProfilePage({ params }: Params) {
  const p = await load((await params).slug);
  if (!p) notFound();
  return (
    <>
      <PageHeader eyebrow="Operador local" title={p.businessName}>{p.destination.name}, {p.destination.department} · En TravelCol desde {formatDate(p.createdAt)}</PageHeader>
      <section className="container-tc grid gap-8 py-10 lg:grid-cols-[1fr_320px]">
        <div>
          {p.isDemo && (
            <p role="note" className="mb-4 flex gap-2 rounded-2xl bg-blue-50 p-4 text-sm text-bandera-azul"><AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />Perfil de demostración: no representa a un operador real.</p>
          )}
          <h2 className="text-xl font-semibold text-selva-900">Sobre nosotros</h2>
          <p className="mt-3 whitespace-pre-line text-pizarra">{p.description}</p>
        </div>
        <aside className="card h-fit p-5">
          <h2 className="font-semibold text-selva-900">Verificaciones</h2>
          {p.rntVerified ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-selva-800"><BadgeCheck className="h-5 w-5" aria-hidden />RNT {p.rntNumber} verificado</p>
          ) : (
            <p className="mt-2 text-sm text-pizarra">Registro Nacional de Turismo pendiente de verificación por TravelCol.</p>
          )}
        </aside>
      </section>
      <section className="container-tc">
        <h2 className="text-2xl font-bold text-selva-900">Experiencias</h2>
        {p.services.length ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{p.services.map((s) => <ServiceCard key={s.id} service={s} />)}</div>
        ) : (
          <div className="mt-6"><EmptyState title="Sin experiencias publicadas" /></div>
        )}
      </section>
    </>
  );
}
