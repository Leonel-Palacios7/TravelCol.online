import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { BookingDto } from '@travelcol/contracts';
import { apiGetOrNull } from '@/lib/api-server';
import { requireSession } from '@/lib/session';
import { PaymentPanel } from '@/components/payment/PaymentPanel';

export const metadata: Metadata = { title: 'Pago de la reserva', robots: { index: false } };

export default async function PagoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  await requireSession(`/reservas/${id}/pago`);
  const booking = await apiGetOrNull<BookingDto>(`/bookings/${id}`);
  if (!booking) notFound();
  // `pago` (id interno) y `id` (transacción de Wompi) solo sirven para saber QUÉ verificar.
  // El estado siempre se lee del backend; nunca se confía en parámetros de la URL.
  return (
    <div className="container-tc py-10">
      <PaymentPanel initialBooking={booking} returnedPaymentId={sp.pago ?? null} wompiTransactionId={sp.id ?? null} />
    </div>
  );
}
