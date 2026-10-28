import Link from 'next/link';
import { Plus, ShieldAlert } from 'lucide-react';
import { LABELS, type ServiceStatus } from '@travelcol/contracts';
import { apiGet } from '@/lib/api-server';
import { formatCOP } from '@/lib/format';
import { PanelTitle, Section, StatCard } from '@/components/panel/PanelShell';
import type { ProviderMe } from '@/lib/types';

interface Dashboard {
  provider: { businessName: string; status: string; slug: string };
  upcomingBookings: number; monthBookings: number; monthGrossCop: number; monthNetCop: number;
  servicesByStatus: Partial<Record<ServiceStatus, number>>; pendingSettlementCop: number;
}

export default async function ProveedorPage() {
  const [d, me] = await Promise.all([apiGet<Dashboard>('/providers/me/dashboard'), apiGet<ProviderMe>('/providers/me')]);
  return (
    <>
      <PanelTitle title={d.provider.businessName} actions={<Link href="/proveedor/servicios/nueva" className="btn-sol"><Plus className="h-4 w-4" aria-hidden />Nueva experiencia</Link>}>
        Resumen de tu operación en TravelCol. Montos en pesos colombianos.
      </PanelTitle>
      {!me.rntVerified && (
        <div className="mb-6 flex gap-3 rounded-xl2 bg-sol-100 p-4 text-sm text-[#5c4100]">
          <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden />
          <p>Tu RNT aún no está verificado. Sube el certificado en <Link href="/proveedor/documentos" className="font-semibold underline">Documentos</Link>; la verificación es requisito para mantener tus experiencias publicadas.</p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Próximas reservas" value={d.upcomingBookings} />
        <StatCard label="Reservas del mes" value={d.monthBookings} tone="sol" />
        <StatCard label="Ventas del mes" value={formatCOP(d.monthGrossCop)} hint={`Neto para ti: ${formatCOP(d.monthNetCop)}`} tone="tierra" />
        <StatCard label="Saldo por liquidar" value={formatCOP(d.pendingSettlementCop)} hint="Se paga en la próxima liquidación" tone="neutral" />
      </div>
      <Section title="Tus experiencias" actions={<Link href="/proveedor/servicios" className="text-sm font-medium text-tierra-600 hover:underline">Administrar</Link>}>
        <div className="flex flex-wrap gap-3">
          {Object.entries(d.servicesByStatus).map(([s, n]) => (
            <div key={s} className="card px-5 py-3 text-sm"><span className="font-bold text-selva-900">{n}</span> · {LABELS.serviceStatus[s as ServiceStatus]}</div>
          ))}
          {!Object.keys(d.servicesByStatus).length && <p className="text-sm text-pizarra">Aún no tienes experiencias. Crea la primera y envíala a revisión.</p>}
        </div>
      </Section>
      <Section title="Tu perfil público">
        <div className="card flex flex-wrap items-center justify-between gap-3 p-5 text-sm">
          <p className="text-pizarra">Los turistas ven tu información en <span className="font-mono">/operadores/{d.provider.slug}</span>.</p>
          <Link href={`/operadores/${d.provider.slug}`} className="btn-ghost">Ver perfil</Link>
        </div>
      </Section>
    </>
  );
}
