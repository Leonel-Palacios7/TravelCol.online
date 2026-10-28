import Link from 'next/link';
import { apiGet } from '@/lib/api-server';
import { formatDate } from '@/lib/format';
import { PanelTitle, TableCard } from '@/components/panel/PanelShell';
import { Pager, StatusTabs } from '@/components/panel/Pager';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DemoBadge } from '@/components/ui/DemoBadge';

interface Row { id: string; businessName: string; taxId: string; rntNumber: string | null; rntVerifiedAt: string | null; status: string; isDemo: boolean; createdAt: string; user: { email: string }; _count: { services: number; documents: number } }

export default async function ProveedoresPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = new URLSearchParams({ page: sp.page ?? '1', ...(sp.status ? { status: sp.status } : {}), ...(sp.q ? { q: sp.q } : {}) });
  const data = await apiGet<{ items: Row[]; total: number; page: number; pageSize: number }>(`/admin/providers?${q}`);
  return (
    <>
      <PanelTitle title="Proveedores">Perfiles aprobados o suspendidos, estado del RNT y documentos.</PanelTitle>
      <form className="mb-4 flex gap-2" action="/admin/proveedores">
        <input name="q" defaultValue={sp.q} placeholder="Buscar por nombre o NIT" className="input max-w-xs" aria-label="Buscar proveedor" />
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <button className="btn-ghost">Buscar</button>
      </form>
      <StatusTabs basePath="/admin/proveedores" current={sp.status} options={[{ label: 'Todos' }, { value: 'APPROVED', label: 'Aprobados' }, { value: 'SUSPENDED', label: 'Suspendidos' }]} />
      <TableCard>
        <thead><tr><th>Proveedor</th><th>NIT</th><th>RNT</th><th>Servicios</th><th>Documentos</th><th>Estado</th></tr></thead>
        <tbody>
          {data.items.map((p) => (
            <tr key={p.id}>
              <td><Link href={`/admin/proveedores/${p.id}`} className="font-semibold text-selva-900 hover:underline">{p.businessName}</Link> {p.isDemo && <DemoBadge />}<p className="text-xs text-pizarra">{p.user.email} · desde {formatDate(p.createdAt)}</p></td>
              <td className="font-mono text-xs">{p.taxId}</td>
              <td>{p.rntNumber ?? '—'} {p.rntVerifiedAt ? <StatusBadge status="VERIFIED" /> : <StatusBadge status="PENDING" />}</td>
              <td>{p._count.services}</td>
              <td>{p._count.documents}</td>
              <td><StatusBadge status={p.status} /></td>
            </tr>
          ))}
          {!data.items.length && <tr><td colSpan={6} className="text-pizarra">Sin resultados.</td></tr>}
        </tbody>
      </TableCard>
      <Pager page={data.page} pageSize={data.pageSize} total={data.total} basePath="/admin/proveedores" params={{ status: sp.status, q: sp.q }} />
    </>
  );
}
