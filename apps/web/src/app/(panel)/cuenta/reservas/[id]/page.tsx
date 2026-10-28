import Link from 'next/link';
import { notFound } from 'next/navigation';
import { describeCancellationPolicy, refundPercentFor, type BookingDto } from '@travelcol/contracts';
import { requestTime } from '@/lib/request-time';
import { apiGetOrNull } from '@/lib/api-server';
import { formatCOP, formatDateTime } from '@/lib/format';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ActionDialog } from '@/components/panel/ActionDialog';

export default async function ReservaDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await apiGetOrNull<BookingDto>(`/bookings/${id}`);
  if (!b) notFound();
  const hours = (new Date(b.startsAt).getTime() - requestTime()) / 3_600_000;
  const refundPct = b.status === 'CONFIRMED' ? refundPercentFor(b.cancellationPolicy, hours) : 0;
  const cancellable = (b.status === 'CONFIRMED' || b.status === 'PENDING_PAYMENT') && hours > 0;
  return (
    <>
      <Link href="/cuenta/reservas" className="text-sm text-tierra-600 hover:underline">← Mis reservas</Link>
      <div className="card mt-3 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-pizarra">{b.code}</p>
            <h1 className="text-2xl font-bold text-selva-900">{b.service.title}</h1>
            <p className="text-sm text-pizarra">Operado por {b.providerName}</p>
          </div>
          <StatusBadge status={b.status} className="text-sm" />
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-arena/60 p-4"><dt className="text-xs text-pizarra uppercase">Fecha y hora</dt><dd className="font-semibold">{formatDateTime(b.startsAt)}</dd></div>
          <div className="rounded-xl bg-arena/60 p-4"><dt className="text-xs text-pizarra uppercase">Personas</dt><dd className="font-semibold">{b.participants}</dd></div>
          <div className="rounded-xl bg-arena/60 p-4"><dt className="text-xs text-pizarra uppercase">Total</dt><dd className="font-semibold">{formatCOP(b.price.totalCop)}</dd></div>
        </dl>
        <p className="mt-4 rounded-xl bg-selva-50 p-3 text-sm text-selva-900">{describeCancellationPolicy(b.cancellationPolicy)}</p>
        {b.latestPayment && (
          <p className="mt-3 text-sm text-pizarra">Pago <span className="font-mono">{b.latestPayment.reference}</span> · <StatusBadge status={b.latestPayment.status} /></p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {b.status === 'PENDING_PAYMENT' && <Link href={`/reservas/${b.id}/pago`} className="btn-sol">Ir a pagar</Link>}
          <Link href={`/experiencias/${b.service.slug}`} className="btn-ghost">Ver experiencia</Link>
          {cancellable && (
            <ActionDialog
              label="Cancelar reserva"
              variant="danger"
              small={false}
              title="Cancelar reserva"
              description={
                b.status === 'CONFIRMED'
                  ? refundPct > 0
                    ? `Según la política, te corresponde un reembolso del ${refundPct} % (${formatCOP(Math.round((b.price.totalCop * refundPct) / 100))} aprox.). El reembolso lo registra el equipo de TravelCol y se procesa por el medio de pago.`
                    : 'Según la política de cancelación, a esta altura no corresponde reembolso.'
                  : 'La reserva aún no está pagada; se liberará el cupo.'
              }
              endpoint={`/bookings/${b.id}/cancel`}
              fields={[{ name: 'reason', label: 'Motivo', type: 'textarea', required: true }]}
              submitLabel="Sí, cancelar"
            />
          )}
          {b.canReview && !b.hasReview && (
            <ActionDialog
              label="Escribir reseña"
              variant="primary"
              small={false}
              title="Tu reseña"
              description="Solo quienes asistieron pueden reseñar. Las reseñas pueden ser moderadas si incumplen las normas."
              endpoint={`/bookings/${b.id}/review`}
              fields={[
                { name: 'rating', label: 'Calificación', type: 'select', required: true, defaultValue: '5', options: [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${'★'.repeat(n)} (${n})` })) },
                { name: 'comment', label: 'Comentario', type: 'textarea', required: true, hint: 'Mínimo 20 caracteres.' },
              ]}
              submitLabel="Publicar reseña"
            />
          )}
        </div>
      </div>
    </>
  );
}
