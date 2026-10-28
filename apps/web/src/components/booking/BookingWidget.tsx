'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarDays, Loader2, Minus, Plus, ShieldCheck } from 'lucide-react';
import { createBookingSchema, describeCancellationPolicy, type AvailabilitySlotDto, type CancellationPolicy, type CreateBookingInput, type BookingDto } from '@travelcol/contracts';
import { api, ClientApiError } from '@/lib/api-client';
import { dayKey, formatCOP, formatDate, formatTime } from '@/lib/format';

interface Props {
  serviceId: string;
  slug: string;
  priceCop: number;
  minParticipants: number;
  maxParticipants: number;
  policy: CancellationPolicy;
  loggedIn: boolean;
}

export function BookingWidget({ serviceId, slug, priceCop, minParticipants, maxParticipants, policy, loggedIn }: Props) {
  const router = useRouter();
  const [slots, setSlots] = useState<AvailabilitySlotDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [day, setDay] = useState<string>('');
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<CreateBookingInput>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: { availabilityId: '', participants: Array.from({ length: minParticipants }, () => ({ fullName: '' })), contactPhone: '' },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'participants' });
  const selectedId = useWatch({ control: form.control, name: 'availabilityId' });

  useEffect(() => {
    let alive = true;
    fetch(`/api/v1/services/${serviceId}/availability?days=90`)
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const data = (await r.json()) as AvailabilitySlotDto[];
        if (alive) {
          setSlots(data);
          if (data[0]) setDay(dayKey(data[0].startsAt));
        }
      })
      .catch(() => alive && setLoadError('No pudimos consultar la disponibilidad. Recarga la página.'));
    return () => {
      alive = false;
    };
  }, [serviceId]);

  const days = useMemo(() => {
    const map = new Map<string, AvailabilitySlotDto[]>();
    for (const s of slots ?? []) {
      const k = dayKey(s.startsAt);
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return map;
  }, [slots]);

  const selected = slots?.find((s) => s.id === selectedId);
  const maxForSlot = Math.min(maxParticipants, selected?.remaining ?? maxParticipants);
  const count = fields.length;
  const estimated = priceCop * count;

  async function onSubmit(values: CreateBookingInput) {
    setServerError(null);
    if (!loggedIn) {
      router.push(`/ingresar?next=${encodeURIComponent(`/experiencias/${slug}`)}`);
      return;
    }
    try {
      const booking = await api<BookingDto>('/bookings', { body: values });
      router.push(`/reservas/${booking.id}/pago`);
    } catch (e) {
      if (e instanceof ClientApiError && e.status === 401) {
        router.push(`/ingresar?next=${encodeURIComponent(`/experiencias/${slug}`)}`);
        return;
      }
      setServerError(e instanceof Error ? e.message : 'No fue posible crear la reserva');
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="card space-y-5 p-6" noValidate aria-labelledby="reserva-titulo">
      <div>
        <p className="text-sm text-pizarra">Precio por persona</p>
        <p className="text-3xl font-bold text-selva-900">{formatCOP(priceCop)}</p>
      </div>
      <h2 id="reserva-titulo" className="sr-only">Reservar</h2>

      <fieldset>
        <legend className="label flex items-center gap-2"><CalendarDays className="h-4 w-4 text-tierra-500" aria-hidden />Fecha</legend>
        {loadError && <p role="alert" className="field-error">{loadError}</p>}
        {!slots && !loadError && (
          <p className="flex items-center gap-2 text-sm text-pizarra"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Consultando disponibilidad…</p>
        )}
        {slots && slots.length === 0 && <p className="rounded-xl bg-arena px-3 py-2 text-sm text-pizarra">No hay fechas disponibles por ahora.</p>}
        {slots && slots.length > 0 && (
          <select
            className="input"
            aria-label="Elige la fecha"
            value={day}
            onChange={(e) => {
              setDay(e.target.value);
              form.setValue('availabilityId', '');
            }}
          >
            {[...days.keys()].map((d) => (
              <option key={d} value={d}>{formatDate(`${d}T12:00:00-05:00`)}</option>
            ))}
          </select>
        )}
      </fieldset>

      {day && days.get(day) && (
        <fieldset>
          <legend className="label">Horario</legend>
          <div className="grid grid-cols-2 gap-2">
            {days.get(day)!.map((s) => (
              <label key={s.id} className={`cursor-pointer rounded-xl border px-3 py-2 text-sm has-[:checked]:border-selva-700 has-[:checked]:bg-selva-50 ${s.remaining < count ? 'opacity-50' : ''}`}>
                <input type="radio" value={s.id} className="sr-only" disabled={s.remaining < count} {...form.register('availabilityId')} />
                <span className="block font-semibold text-selva-900">{formatTime(s.startsAt)}</span>
                <span className="text-xs text-pizarra">{s.remaining} {s.remaining === 1 ? 'cupo' : 'cupos'}</span>
              </label>
            ))}
          </div>
          {form.formState.errors.availabilityId && <p className="field-error">Elige un horario</p>}
        </fieldset>
      )}

      <fieldset>
        <legend className="label">Participantes</legend>
        <div className="mb-3 flex items-center gap-3">
          <button type="button" className="btn-ghost h-9 w-9 p-0" onClick={() => count > minParticipants && remove(count - 1)} disabled={count <= minParticipants} aria-label="Quitar participante">
            <Minus className="h-4 w-4" aria-hidden />
          </button>
          <span className="w-8 text-center text-lg font-semibold" aria-live="polite">{count}</span>
          <button type="button" className="btn-ghost h-9 w-9 p-0" onClick={() => count < maxForSlot && append({ fullName: '' })} disabled={count >= maxForSlot} aria-label="Agregar participante">
            <Plus className="h-4 w-4" aria-hidden />
          </button>
          <span className="text-xs text-pizarra">Máx. {maxForSlot}</span>
        </div>
        <div className="space-y-2">
          {fields.map((f, i) => (
            <div key={f.id}>
              <label htmlFor={`p-${i}`} className="sr-only">Nombre completo del participante {i + 1}</label>
              <input id={`p-${i}`} className="input" placeholder={`Nombre completo participante ${i + 1}`} autoComplete={i === 0 ? 'name' : 'off'}
                aria-invalid={!!form.formState.errors.participants?.[i]?.fullName} {...form.register(`participants.${i}.fullName`)} />
              {form.formState.errors.participants?.[i]?.fullName && <p className="field-error">{form.formState.errors.participants[i]?.fullName?.message}</p>}
            </div>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="contactPhone" className="label">Celular de contacto</label>
        <input id="contactPhone" type="tel" inputMode="tel" autoComplete="tel" placeholder="300 123 4567" className="input" aria-invalid={!!form.formState.errors.contactPhone} {...form.register('contactPhone')} />
        {form.formState.errors.contactPhone && <p className="field-error">{form.formState.errors.contactPhone.message}</p>}
      </div>

      <dl className="space-y-1 rounded-xl bg-crema p-4 text-sm">
        <div className="flex justify-between"><dt>{formatCOP(priceCop)} × {count}</dt><dd>{formatCOP(estimated)}</dd></div>
        <div className="flex justify-between text-pizarra"><dt>Cargos adicionales</dt><dd>{formatCOP(0)}</dd></div>
        <div className="flex justify-between border-t border-selva-900/10 pt-2 text-base font-bold text-selva-900"><dt>Total</dt><dd>{formatCOP(estimated)}</dd></div>
        <p className="pt-1 text-xs text-pizarra">El total definitivo lo calcula nuestro sistema al crear la reserva.</p>
      </dl>

      <p className="flex gap-2 text-xs text-pizarra"><ShieldCheck className="h-4 w-4 shrink-0 text-selva-700" aria-hidden />{describeCancellationPolicy(policy)}</p>

      {serverError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-bandera-rojo">{serverError}</p>}
      <button type="submit" className="btn-primary w-full py-3 text-base" disabled={form.formState.isSubmitting || !slots?.length}>
        {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {loggedIn ? 'Reservar y continuar al pago' : 'Inicia sesión para reservar'}
      </button>
      <p className="text-center text-xs text-pizarra">Apartamos tus cupos durante unos minutos mientras pagas.</p>
    </form>
  );
}
