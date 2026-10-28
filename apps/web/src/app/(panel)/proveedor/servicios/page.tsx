import Link from 'next/link';
import { Plus } from 'lucide-react';
import { apiGet } from '@/lib/api-server';
import { formatCOP, formatDate } from '@/lib/format';
import { PanelTitle, TableCard } from '@/components/panel/PanelShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';

interface Row { id: string; slug: string; title: string; status: string; priceCop: number; rejectionReason: string | null; updatedAt: string; upcomingSlots: number }

export default async function ServiciosPage() {
  const rows = await apiGet<Row[]>('/provider/services');
  return (
    <>
      <PanelTitle title="Experiencias" actions={<Link href="/proveedor/servicios/nueva" className="btn-sol"><Plus className="h-4 w-4" aria-hidden />Nueva experiencia</Link>}>
        Crea borradores, agrega fotos y fechas, y envíalos a revisión. El equipo de TravelCol publica después de verificar.
      </PanelTitle>
      {rows.length ? (
        <TableCard>
          <thead><tr><th>Experiencia</th><th>Estado</th><th>Precio</th><th>Fechas futuras</th><th>Actualizada</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/proveedor/servicios/${r.id}`} className="font-semibold text-selva-900 hover:underline">{r.title}</Link>
                  {r.rejectionReason && <p className="text-xs text-bandera-rojo">Motivo de rechazo: {r.rejectionReason}</p>}
                </td>
                <td><StatusBadge status={r.status} /></td>
                <td>{formatCOP(r.priceCop)}</td>
                <td>{r.upcomingSlots}</td>
                <td>{formatDate(r.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      ) : (
        <EmptyState title="Aún no tienes experiencias" action={<Link href="/proveedor/servicios/nueva" className="btn-primary">Crear la primera</Link>} />
      )}
    </>
  );
}
