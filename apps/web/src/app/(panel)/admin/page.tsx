import Link from 'next/link';
import { LABELS, type BookingStatus, type UserRole } from '@travelcol/contracts';
import { apiGet } from '@/lib/api-server';
import { formatCOP } from '@/lib/format';
import { PanelTitle, Section, StatCard } from '@/components/panel/PanelShell';

interface Dash {
  periodDays: number; bookingsByStatus: Partial<Record<BookingStatus, number>>; confirmedBookings30d: number; gmvCop30d: number;
  averageBookingCop30d: number; commissionCop30d: number; paymentAttempts30d: number; paymentApprovalRate30d: number | null;
  pendingProviderApplications: number; servicesInReview: number; bookingsNeedingAttention: number; refundsPending: number; openTickets: number;
  usersByRole: Partial<Record<UserRole, number>>;
}

function Todo({ href, n, label }: { href: string; n: number; label: string }) {
  return (
    <Link href={href} className={`card flex items-center justify-between p-4 transition-shadow hover:shadow-suave ${n ? 'ring-2 ring-sol-400' : ''}`}>
      <span className="text-sm font-medium text-selva-900">{label}</span>
      <span className={`grid h-8 min-w-8 place-items-center rounded-full px-2 text-sm font-bold ${n ? 'bg-sol-400 text-selva-950' : 'bg-arena text-pizarra'}`}>{n}</span>
    </Link>
  );
}

export default async function AdminPage() {
  const d = await apiGet<Dash>('/admin/dashboard');
  return (
    <>
      <PanelTitle title="Resumen de la operación">Indicadores de los últimos {d.periodDays} días. GMV = valor bruto de reservas confirmadas.</PanelTitle>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="GMV 30 días" value={formatCOP(d.gmvCop30d)} hint={`${d.confirmedBookings30d} reservas confirmadas`} />
        <StatCard label="Comisión 30 días" value={formatCOP(d.commissionCop30d)} tone="tierra" />
        <StatCard label="Ticket promedio" value={formatCOP(d.averageBookingCop30d)} tone="sol" />
        <StatCard label="Aprobación de pagos" value={d.paymentApprovalRate30d === null ? '—' : `${d.paymentApprovalRate30d} %`} hint={`${d.paymentAttempts30d} intentos`} tone="neutral" />
      </div>
      <Section title="Pendientes">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Todo href="/admin/solicitudes" n={d.pendingProviderApplications} label="Solicitudes de proveedor" />
          <Todo href="/admin/servicios" n={d.servicesInReview} label="Experiencias en revisión" />
          <Todo href="/admin/reservas?attention=true" n={d.bookingsNeedingAttention} label="Reservas que requieren atención" />
          <Todo href="/admin/reembolsos" n={d.refundsPending} label="Reembolsos por ejecutar" />
          <Todo href="/admin/pqr" n={d.openTickets} label="PQR abiertas" />
        </div>
      </Section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Reservas por estado">
          <ul className="card divide-y divide-selva-900/5 p-2">
            {Object.entries(d.bookingsByStatus).map(([s, n]) => (
              <li key={s} className="flex justify-between px-3 py-2 text-sm"><span>{LABELS.bookingStatus[s as BookingStatus]}</span><span className="font-semibold">{n}</span></li>
            ))}
            {!Object.keys(d.bookingsByStatus).length && <li className="px-3 py-2 text-sm text-pizarra">Sin reservas.</li>}
          </ul>
        </Section>
        <Section title="Usuarios por rol">
          <ul className="card divide-y divide-selva-900/5 p-2">
            {Object.entries(d.usersByRole).map(([r, n]) => (
              <li key={r} className="flex justify-between px-3 py-2 text-sm"><span>{LABELS.role[r as UserRole]}</span><span className="font-semibold">{n}</span></li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}
