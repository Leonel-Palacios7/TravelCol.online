import { LABELS, USER_ROLES } from '@travelcol/contracts';
import { apiGet } from '@/lib/api-server';
import { requireSession } from '@/lib/session';
import { formatDate, formatDateTime } from '@/lib/format';
import { PanelTitle, TableCard } from '@/components/panel/PanelShell';
import { Pager } from '@/components/panel/Pager';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ActionDialog } from '@/components/panel/ActionDialog';

interface Row { id: string; email: string; fullName: string; role: string; status: string; emailVerifiedAt: string | null; lastLoginAt: string | null; createdAt: string }

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const me = await requireSession('/admin/usuarios', ['ADMIN']);
  const sp = await searchParams;
  const q = new URLSearchParams({ page: sp.page ?? '1', ...(sp.q ? { q: sp.q } : {}) });
  const data = await apiGet<{ items: Row[]; total: number; page: number; pageSize: number }>(`/admin/users?${q}`);
  // PROVIDER solo se asigna aprobando una solicitud (con verificación); no se ofrece aquí.
  const roleOptions = USER_ROLES.filter((r) => r !== 'PROVIDER').map((r) => ({ value: r, label: LABELS.role[r] }));
  return (
    <>
      <PanelTitle title="Usuarios">Suspender revoca las sesiones activas de inmediato. Todos los cambios quedan en auditoría con su motivo.</PanelTitle>
      <form className="mb-4 flex gap-2" action="/admin/usuarios">
        <input name="q" defaultValue={sp.q} placeholder="Buscar por nombre o correo" className="input max-w-xs" aria-label="Buscar usuario" />
        <button className="btn-ghost">Buscar</button>
      </form>
      <TableCard>
        <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Último ingreso</th><th className="text-right">Acciones</th></tr></thead>
        <tbody>
          {data.items.map((u) => (
            <tr key={u.id}>
              <td><span className="font-medium">{u.fullName}</span><span className="block text-xs text-pizarra">{u.email} · desde {formatDate(u.createdAt)}{!u.emailVerifiedAt && ' · sin verificar'}</span></td>
              <td>{LABELS.role[u.role as keyof typeof LABELS.role] ?? u.role}</td>
              <td><StatusBadge status={u.status} /></td>
              <td className="whitespace-nowrap">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : '—'}</td>
              <td className="text-right">
                {u.id !== me.id && (
                  <div className="flex justify-end gap-2">
                    {u.status === 'ACTIVE' ? (
                      <ActionDialog label="Suspender" variant="danger" title={`Suspender a ${u.fullName}`} endpoint={`/admin/users/${u.id}/status`} method="PATCH" fixed={{ status: 'SUSPENDED' }} fields={[{ name: 'reason', label: 'Motivo', type: 'textarea', required: true }]} submitLabel="Suspender" />
                    ) : (
                      <ActionDialog label="Reactivar" variant="primary" title={`Reactivar a ${u.fullName}`} endpoint={`/admin/users/${u.id}/status`} method="PATCH" fixed={{ status: 'ACTIVE' }} fields={[{ name: 'reason', label: 'Motivo', type: 'textarea', required: true }]} submitLabel="Reactivar" />
                    )}
                    {u.role !== 'PROVIDER' && (
                      <ActionDialog label="Cambiar rol" title={`Rol de ${u.fullName}`} endpoint={`/admin/users/${u.id}/role`} method="PATCH" fields={[{ name: 'role', label: 'Nuevo rol', type: 'select', options: roleOptions, defaultValue: u.role, required: true }, { name: 'reason', label: 'Motivo', type: 'textarea', required: true }]} submitLabel="Guardar" />
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </TableCard>
      <Pager page={data.page} pageSize={data.pageSize} total={data.total} basePath="/admin/usuarios" params={{ q: sp.q }} />
    </>
  );
}
