import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiGet } from '@/lib/api-server';
import { requireSession } from '@/lib/session';
import { formatDate } from '@/lib/format';
import type { DestinationRow } from '@/lib/types';
import { PanelTitle, Section } from '@/components/panel/PanelShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProviderApplicationForm } from '@/components/account/ProviderApplicationForm';

interface ApplicationRow { id: string; businessName: string; status: string; reviewNotes: string | null; createdAt: string; reviewedAt: string | null }

export default async function SerProveedorPage() {
  const user = await requireSession('/cuenta/ser-proveedor');
  if (user.role === 'PROVIDER') redirect('/proveedor');
  const [apps, destinations] = await Promise.all([
    apiGet<ApplicationRow[]>('/provider-applications/me'),
    apiGet<DestinationRow[]>('/destinations', { auth: false, revalidate: 300 }),
  ]);
  const pending = apps.some((a) => a.status === 'PENDING');
  return (
    <>
      <PanelTitle title="Solicitud para ser proveedor">
        Revisamos cada solicitud manualmente: identidad, RNT y documentos. Mientras está en revisión no puedes publicar experiencias.{' '}
        <Link href="/proveedores" className="text-tierra-600 hover:underline">¿Cómo funciona?</Link>
      </PanelTitle>
      {!user.emailVerified && <p className="mb-4 rounded-xl bg-sol-100 px-4 py-3 text-sm">Debes verificar tu correo antes de enviar la solicitud.</p>}
      {apps.length > 0 && (
        <Section title="Tus solicitudes">
          <ul className="space-y-2">
            {apps.map((a) => (
              <li key={a.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{a.businessName}</p>
                  <p className="text-xs text-pizarra">Enviada el {formatDate(a.createdAt)}{a.reviewedAt ? ` · revisada el ${formatDate(a.reviewedAt)}` : ''}</p>
                  {a.reviewNotes && <p className="mt-1 text-sm text-pizarra">Nota del equipo: {a.reviewNotes}</p>}
                </div>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        </Section>
      )}
      {!pending && (
        <Section title={apps.length ? 'Enviar una nueva solicitud' : 'Datos de tu empresa'}>
          <ProviderApplicationForm destinations={destinations.map((d) => ({ slug: d.slug, name: `${d.name}, ${d.department}` }))} />
        </Section>
      )}
    </>
  );
}
