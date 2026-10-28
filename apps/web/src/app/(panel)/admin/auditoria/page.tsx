import { apiGet } from '@/lib/api-server';
import { formatDateTime } from '@/lib/format';
import { PanelTitle, TableCard } from '@/components/panel/PanelShell';
import { Pager } from '@/components/panel/Pager';

interface Row { id: string; action: string; entityType: string; entityId: string | null; metadata: unknown; requestId: string | null; createdAt: string; actor: { email: string } | null }

export default async function AuditoriaPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = new URLSearchParams({ page: sp.page ?? '1', pageSize: '50', ...(sp.q ? { q: sp.q } : {}) });
  const data = await apiGet<{ items: Row[]; total: number; page: number; pageSize: number }>(`/admin/audit-logs?${q}`);
  return (
    <>
      <PanelTitle title="Auditoría">Registro de acciones sensibles. Las IP se guardan como hash con sal; los secretos se omiten de los metadatos.</PanelTitle>
      <form className="mb-4 flex gap-2" action="/admin/auditoria">
        <input name="q" defaultValue={sp.q} placeholder="Filtrar por acción (p. ej. LOGIN_FAILED)" className="input max-w-xs" aria-label="Filtrar por acción" />
        <button className="btn-ghost">Filtrar</button>
      </form>
      <TableCard>
        <thead><tr><th>Fecha</th><th>Acción</th><th>Actor</th><th>Entidad</th><th>Detalle</th></tr></thead>
        <tbody>
          {data.items.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
              <td className="font-mono text-xs">{r.action}</td>
              <td className="text-xs">{r.actor?.email ?? 'sistema'}</td>
              <td className="text-xs">{r.entityType}<span className="block font-mono text-pizarra">{r.entityId?.slice(0, 8)}</span></td>
              <td className="max-w-72"><code className="block truncate text-xs text-pizarra" title={r.metadata ? JSON.stringify(r.metadata) : ''}>{r.metadata ? JSON.stringify(r.metadata) : '—'}</code></td>
            </tr>
          ))}
        </tbody>
      </TableCard>
      <Pager page={data.page} pageSize={data.pageSize} total={data.total} basePath="/admin/auditoria" params={{ q: sp.q }} />
    </>
  );
}
