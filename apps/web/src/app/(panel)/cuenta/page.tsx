import Link from 'next/link';
import type { BookingDto } from '@travelcol/contracts';
import { requestTime } from '@/lib/request-time';
import { apiGet } from '@/lib/api-server';
import { requireSession } from '@/lib/session';
import { PanelTitle, Section } from '@/components/panel/PanelShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { BookingRow } from '@/components/account/BookingRow';
import { ResendVerification } from '@/components/account/ResendVerification';
import { FormAlert } from '@/components/forms/Field';

export default async function CuentaPage({ searchParams }: { searchParams: Promise<{ acceso?: string }> }) {
  const sp = await searchParams;
  const user = await requireSession('/cuenta');
  const bookings = await apiGet<BookingDto[]>('/bookings/me');
  const now = requestTime();
  const upcoming = bookings.filter((b) => ['CONFIRMED', 'PENDING_PAYMENT'].includes(b.status) && new Date(b.startsAt).getTime() > now).slice(0, 3);
  return (
    <>
      {sp.acceso === 'denegado' && <div className="mb-6"><FormAlert>No tienes permisos para ver esa sección.</FormAlert></div>}
      {!user.emailVerified && <ResendVerification />}
      <PanelTitle title={`¡Hola, ${user.fullName.split(' ')[0]}!`}>Aquí encuentras tus próximas experiencias y el estado de tus pagos.</PanelTitle>
      <Section title="Próximas experiencias" actions={<Link href="/cuenta/reservas" className="text-sm font-medium text-tierra-600 hover:underline">Ver todas</Link>}>
        {upcoming.length ? (
          <div className="space-y-3">{upcoming.map((b) => <BookingRow key={b.id} b={b} />)}</div>
        ) : (
          <EmptyState title="Aún no tienes experiencias próximas" action={<Link href="/experiencias" className="btn-sol">Explorar experiencias</Link>}>
            Descubre caminatas, cascadas y fincas en Villeta.
          </EmptyState>
        )}
      </Section>
      {user.role === 'TOURIST' && (
        <Section title="¿Ofreces experiencias turísticas?">
          <div className="card flex flex-wrap items-center justify-between gap-4 bg-selva-800 p-6 text-white">
            <p className="max-w-lg text-white/85">Si eres operador o prestador de servicios turísticos en Villeta, solicita tu habilitación como proveedor.</p>
            <Link href="/cuenta/ser-proveedor" className="btn-sol">{user.hasPendingProviderApplication ? 'Ver mi solicitud' : 'Solicitar habilitación'}</Link>
          </div>
        </Section>
      )}
    </>
  );
}
