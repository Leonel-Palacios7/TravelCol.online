import Link from 'next/link';
import type { BookingDto } from '@travelcol/contracts';
import { apiGet } from '@/lib/api-server';
import { PanelTitle } from '@/components/panel/PanelShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { BookingRow } from '@/components/account/BookingRow';

export default async function ReservasPage() {
  const bookings = await apiGet<BookingDto[]>('/bookings/me');
  return (
    <>
      <PanelTitle title="Mis reservas">Consulta el estado, paga reservas pendientes, cancela según la política o deja tu reseña.</PanelTitle>
      {bookings.length ? (
        <div className="space-y-3">{bookings.map((b) => <BookingRow key={b.id} b={b} />)}</div>
      ) : (
        <EmptyState title="Todavía no has hecho reservas" action={<Link href="/experiencias" className="btn-sol">Explorar experiencias</Link>} />
      )}
    </>
  );
}
