'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock, Loader2, Lock, ShieldCheck, XCircle } from 'lucide-react';
import { describeCancellationPolicy, type BookingDto, type CheckoutDto } from '@travelcol/contracts';
import { api } from '@/lib/api-client';
import { formatCOP, formatDateTime } from '@/lib/format';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FormAlert } from '@/components/forms/Field';

interface PaymentView {
  id: string;
  status: string;
  reference: string;
  statusMessage: string | null;
}

const FINAL = new Set(['APPROVED', 'DECLINED', 'VOIDED', 'ERROR']);
const POLL_MS = 3000;
const POLL_MAX = 40; // ~2 minutos; después se invita a revisar "Mis reservas"

function useCountdown(until: string | null) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!until) return;
    const tick = () => setLeft(Math.max(0, new Date(until).getTime() - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [until]);
  return left;
}

/** Envía al navegador a Wompi con un formulario GET (Web Checkout); los parámetros vienen firmados del backend. */
function redirectToWompi(co: CheckoutDto) {
  const form = document.createElement('form');
  form.method = 'GET';
  form.action = co.checkoutUrl;
  for (const [k, v] of Object.entries(co.params)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = k;
    input.value = v;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

export function PaymentPanel({ initialBooking, returnedPaymentId, wompiTransactionId }: { initialBooking: BookingDto; returnedPaymentId: string | null; wompiTransactionId: string | null }) {
  const [booking, setBooking] = useState(initialBooking);
  const [payment, setPayment] = useState<PaymentView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [polls, setPolls] = useState(0);
  const synced = useRef(false);
  const left = useCountdown(booking.status === 'PENDING_PAYMENT' ? booking.holdExpiresAt : null);
  const verifying = !!returnedPaymentId && booking.status === 'PENDING_PAYMENT' && (!payment || !FINAL.has(payment.status)) && polls < POLL_MAX;

  const refresh = useCallback(async () => {
    const [b, p] = await Promise.all([
      api<BookingDto>(`/bookings/${booking.id}`),
      returnedPaymentId ? api<PaymentView>(`/payments/${returnedPaymentId}`).catch(() => null) : Promise.resolve(null),
    ]);
    setBooking(b);
    if (p) setPayment(p);
  }, [booking.id, returnedPaymentId]);

  // Al volver de Wompi: pedir al backend que consulte la transacción (reconciliación) y luego sondear.
  useEffect(() => {
    if (!returnedPaymentId || synced.current) return;
    synced.current = true;
    (async () => {
      if (wompiTransactionId && /^[A-Za-z0-9-]{3,64}$/.test(wompiTransactionId)) {
        try {
          await api(`/payments/${returnedPaymentId}/sync?transactionId=${encodeURIComponent(wompiTransactionId)}`, { method: 'POST' });
        } catch {
          // Si la consulta falla, el webhook firmado sigue siendo la fuente de verdad.
        }
      }
      await refresh().catch(() => undefined);
    })();
  }, [returnedPaymentId, wompiTransactionId, refresh]);

  useEffect(() => {
    if (!verifying) return;
    const t = setTimeout(() => {
      setPolls((n) => n + 1);
      refresh().catch(() => undefined);
    }, POLL_MS);
    return () => clearTimeout(t);
  }, [verifying, polls, refresh]);

  async function pay() {
    setError(null);
    setStarting(true);
    try {
      const co = await api<CheckoutDto>(`/bookings/${booking.id}/checkout`, { method: 'POST' });
      redirectToWompi(co);
    } catch (e) {
      setError((e as Error).message);
      setStarting(false);
    }
  }

  const expired = booking.status === 'EXPIRED' || (booking.status === 'PENDING_PAYMENT' && left === 0);
  const mm = left !== null ? String(Math.floor(left / 60000)).padStart(2, '0') : '--';
  const ss = left !== null ? String(Math.floor((left % 60000) / 1000)).padStart(2, '0') : '--';

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <section className="card p-6 sm:p-8" aria-live="polite">
        <p className="eyebrow">Tu reserva</p>
        <h1 className="mt-1 text-2xl font-bold text-selva-900 sm:text-3xl">{booking.service.title}</h1>
        <p className="mt-1 text-sm text-pizarra">
          Código <span className="font-mono font-semibold text-tinta">{booking.code}</span> · {booking.providerName}
        </p>

        {booking.status === 'CONFIRMED' && (
          <div className="mt-8 rounded-xl2 bg-selva-50 p-6 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-selva-600" aria-hidden />
            <h2 className="mt-3 text-xl font-bold text-selva-900">¡Pago aprobado y reserva confirmada!</h2>
            <p className="mt-1 text-sm text-pizarra">Te enviamos la confirmación por correo. El operador ya conoce tu reserva.</p>
            <Link href={`/cuenta/reservas/${booking.id}`} className="btn-primary mt-5">Ver detalle de la reserva</Link>
          </div>
        )}

        {verifying && (
          <div className="mt-8 rounded-xl2 bg-sol-100 p-6 text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-tierra-600" aria-hidden />
            <h2 className="mt-3 text-lg font-bold text-selva-900">Estamos verificando tu pago con Wompi</h2>
            <p className="mt-1 text-sm text-pizarra">La confirmación llega directamente desde Wompi a nuestro servidor. No cierres esta página.</p>
          </div>
        )}

        {returnedPaymentId && !verifying && booking.status === 'PENDING_PAYMENT' && (
          <div className="mt-8 rounded-xl2 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <XCircle className="h-6 w-6 shrink-0 text-bandera-rojo" aria-hidden />
              <div>
                <h2 className="font-bold text-bandera-rojo">
                  {payment && FINAL.has(payment.status) ? `El pago quedó en estado: ${payment.status === 'DECLINED' ? 'rechazado' : payment.status === 'VOIDED' ? 'anulado' : 'error'}` : 'Aún no recibimos la confirmación del pago'}
                </h2>
                <p className="mt-1 text-sm text-pizarra">
                  {payment?.statusMessage ?? 'Si Wompi te mostró un pago exitoso, la confirmación puede tardar unos minutos. Revisa "Mis reservas" más tarde.'}
                  {!expired && ' Puedes intentar de nuevo mientras tu cupo siga reservado.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {booking.status === 'PENDING_PAYMENT' && !verifying && !expired && (
          <div className="mt-8">
            <div className="flex items-center gap-3 rounded-xl bg-arena px-4 py-3 text-sm">
              <Clock className="h-5 w-5 text-tierra-600" aria-hidden />
              <span>
                Guardamos tu cupo por <strong className="font-mono text-base">{mm}:{ss}</strong>. Si no pagas a tiempo, se libera automáticamente.
              </span>
            </div>
            {error && <div className="mt-4"><FormAlert>{error}</FormAlert></div>}
            <button type="button" onClick={pay} disabled={starting} className="btn-sol mt-6 w-full py-3.5 text-base">
              {starting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Lock className="h-5 w-5" aria-hidden />}
              Pagar {formatCOP(booking.price.totalCop)} con Wompi
            </button>
            <p className="mt-3 flex items-center justify-center gap-2 text-xs text-pizarra">
              <ShieldCheck className="h-4 w-4" aria-hidden />Serás redirigido a Wompi. TravelCol no recibe ni guarda los datos de tu tarjeta.
            </p>
          </div>
        )}

        {expired && booking.status !== 'CONFIRMED' && (
          <div className="mt-8 rounded-xl2 bg-arena p-6">
            <h2 className="font-bold text-selva-900">El tiempo para pagar expiró</h2>
            <p className="mt-1 text-sm text-pizarra">Liberamos el cupo para otros viajeros. Puedes crear una nueva reserva si aún hay disponibilidad.</p>
            <Link href={`/experiencias/${booking.service.slug}`} className="btn-primary mt-4">Volver a la experiencia</Link>
          </div>
        )}

        {booking.status === 'CANCELLED' && (
          <div className="mt-8 rounded-xl2 bg-arena p-6">
            <h2 className="font-bold text-selva-900">Esta reserva fue cancelada</h2>
            <Link href="/cuenta/reservas" className="btn-ghost mt-4">Ir a mis reservas</Link>
          </div>
        )}
      </section>

      <aside className="card h-fit p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-selva-900">Resumen</h2>
          <StatusBadge status={booking.status} />
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-pizarra">Fecha y hora</dt><dd className="text-right font-medium">{formatDateTime(booking.startsAt)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-pizarra">Personas</dt><dd className="font-medium">{booking.participants}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-pizarra">{formatCOP(booking.price.unitPriceCop)} × {booking.participants}</dt><dd className="font-medium">{formatCOP(booking.price.subtotalCop)}</dd></div>
          {booking.price.feesCop > 0 && <div className="flex justify-between gap-4"><dt className="text-pizarra">Cargos</dt><dd className="font-medium">{formatCOP(booking.price.feesCop)}</dd></div>}
          <div className="flex justify-between gap-4 border-t border-selva-900/10 pt-3 text-base"><dt className="font-semibold">Total</dt><dd className="font-bold text-selva-900">{formatCOP(booking.price.totalCop)}</dd></div>
        </dl>
        <p className="mt-4 rounded-xl bg-selva-50 p-3 text-xs text-selva-900">{describeCancellationPolicy(booking.cancellationPolicy)}</p>
        <p className="mt-3 text-xs text-pizarra">Precios en pesos colombianos (COP), impuestos incluidos según lo informado por el operador.</p>
      </aside>
    </div>
  );
}
