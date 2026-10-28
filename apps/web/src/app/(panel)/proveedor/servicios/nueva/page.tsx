import Link from 'next/link';
import { apiGet } from '@/lib/api-server';
import type { CategoryRow, DestinationRow } from '@/lib/types';
import { PanelTitle } from '@/components/panel/PanelShell';
import { ServiceForm } from '@/components/provider/ServiceForm';

export default async function NuevaPage() {
  const [categories, destinations] = await Promise.all([
    apiGet<CategoryRow[]>('/categories', { auth: false, revalidate: 300 }),
    apiGet<DestinationRow[]>('/destinations', { auth: false, revalidate: 300 }),
  ]);
  return (
    <>
      <Link href="/proveedor/servicios" className="text-sm text-tierra-600 hover:underline">← Experiencias</Link>
      <PanelTitle title="Nueva experiencia">Se guarda como borrador. Luego podrás subir fotos, agregar fechas y enviarla a revisión.</PanelTitle>
      <ServiceForm categories={categories} destinations={destinations} />
    </>
  );
}
