import Link from 'next/link';
import { apiGet } from '@/lib/api-server';
import { formatDateTime } from '@/lib/format';
import { PanelTitle } from '@/components/panel/PanelShell';
import { Pager } from '@/components/panel/Pager';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActionDialog } from '@/components/panel/ActionDialog';

interface NotificationRow { id: string; type: string; title: string; body: string; link: string | null; readAt: string | null; createdAt: string }

export default async function NotificacionesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Number((await searchParams).page ?? 1) || 1;
  const data = await apiGet<{ items: NotificationRow[]; unread: number; page: number; pageSize: number; total: number }>(`/users/me/notifications?page=${page}`);
  return (
    <>
      <PanelTitle
        title="Notificaciones"
        actions={data.unread > 0 ? <ActionDialog label="Marcar todas como leídas" title="Marcar como leídas" description={`Tienes ${data.unread} sin leer.`} endpoint="/users/me/notifications/read-all" /> : undefined}
      >
        Avisos sobre tus reservas, pagos y cuenta. También te llegan por correo.
      </PanelTitle>
      {data.items.length ? (
        <ul className="space-y-2">
          {data.items.map((n) => (
            <li key={n.id} className={`card flex gap-3 p-4 ${n.readAt ? 'opacity-75' : ''}`}>
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.readAt ? 'bg-pizarra/30' : 'bg-tierra-500'}`} aria-label={n.readAt ? 'Leída' : 'Sin leer'} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-selva-900">{n.title}</p>
                <p className="text-sm text-pizarra">{n.body}</p>
                <p className="mt-1 text-xs text-pizarra">{formatDateTime(n.createdAt)}</p>
              </div>
              {n.link && n.link.startsWith('/') && <Link href={n.link} className="self-center text-sm font-medium text-tierra-600 hover:underline">Ver</Link>}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No tienes notificaciones" />
      )}
      <Pager page={data.page} pageSize={data.pageSize} total={data.total} basePath="/cuenta/notificaciones" />
    </>
  );
}
