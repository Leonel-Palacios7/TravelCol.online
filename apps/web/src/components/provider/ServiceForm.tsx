'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { CANCELLATION_POLICIES, LABELS, describeCancellationPolicy, serviceUpsertSchema, type CancellationPolicy } from '@travelcol/contracts';
import { api } from '@/lib/api-client';
import { Field, FormAlert } from '@/components/forms/Field';

export interface ServiceFormValues {
  title: string; summary: string; description: string; categorySlug: string; destinationSlug: string;
  priceCop: number; durationMinutes: number; minParticipants: number; maxParticipantsPerBooking: number;
  meetingPoint: string; latitude: number | null; longitude: number | null;
  includes: string[]; excludes: string[]; requirements: string[]; cancellationPolicy: CancellationPolicy; minAge: number | null;
}

const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
const num = (s: FormDataEntryValue | null) => (s === null || String(s).trim() === '' ? null : Number(s));

/** Editor de experiencias. Valida con el mismo esquema Zod que la API y muestra los errores por campo. */
export function ServiceForm({ serviceId, initial, categories, destinations }: {
  serviceId?: string;
  initial?: ServiceFormValues;
  categories: Array<{ slug: string; name: string }>;
  destinations: Array<{ slug: string; name: string }>;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [policy, setPolicy] = useState<CancellationPolicy>(initial?.cancellationPolicy ?? 'MODERATE');

  async function onSubmit(form: HTMLFormElement) {
    const fd = new FormData(form);
    const raw = {
      title: String(fd.get('title') ?? ''),
      summary: String(fd.get('summary') ?? ''),
      description: String(fd.get('description') ?? ''),
      categorySlug: String(fd.get('categorySlug') ?? ''),
      destinationSlug: String(fd.get('destinationSlug') ?? ''),
      priceCop: num(fd.get('priceCop')),
      durationMinutes: num(fd.get('durationMinutes')),
      minParticipants: num(fd.get('minParticipants')) ?? 1,
      maxParticipantsPerBooking: num(fd.get('maxParticipantsPerBooking')) ?? 10,
      meetingPoint: String(fd.get('meetingPoint') ?? ''),
      latitude: num(fd.get('latitude')),
      longitude: num(fd.get('longitude')),
      includes: lines(String(fd.get('includes') ?? '')),
      excludes: lines(String(fd.get('excludes') ?? '')),
      requirements: lines(String(fd.get('requirements') ?? '')),
      cancellationPolicy: policy,
      minAge: num(fd.get('minAge')),
    };
    const parsed = serviceUpsertSchema.safeParse(raw);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[String(issue.path[0])] ??= issue.message;
      setErrors(errs);
      setMsg({ kind: 'error', text: 'Revisa los campos marcados.' });
      return;
    }
    setErrors({});
    setMsg(null);
    setBusy(true);
    try {
      if (serviceId) {
        const r = await api<{ status: string }>(`/provider/services/${serviceId}`, { method: 'PATCH', body: raw });
        setMsg({ kind: 'success', text: r.status === 'IN_REVIEW' ? 'Cambios guardados. Como estaba publicada, vuelve a revisión antes de mostrarse.' : 'Cambios guardados.' });
        router.refresh();
      } else {
        const r = await api<{ id: string }>('/provider/services', { body: raw });
        router.push(`/proveedor/servicios/${r.id}?nuevo=1`);
      }
    } catch (e) {
      setMsg({ kind: 'error', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const v = initial;
  const err = (k: string) => errors[k];
  return (
    <form noValidate className="card grid gap-4 p-6 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void onSubmit(e.currentTarget); }}>
      <div className="sm:col-span-2">
        <Field id="title" label="Título" error={err('title')}><input id="title" name="title" className="input" defaultValue={v?.title} aria-invalid={!!err('title')} /></Field>
      </div>
      <div className="sm:col-span-2">
        <Field id="summary" label="Resumen corto" error={err('summary')} hint="Se muestra en las tarjetas (20 a 240 caracteres)."><input id="summary" name="summary" className="input" defaultValue={v?.summary} aria-invalid={!!err('summary')} /></Field>
      </div>
      <div className="sm:col-span-2">
        <Field id="description" label="Descripción" error={err('description')} hint="Itinerario, nivel de dificultad, qué esperar. Mínimo 80 caracteres."><textarea id="description" name="description" rows={7} className="input" defaultValue={v?.description} aria-invalid={!!err('description')} /></Field>
      </div>
      <Field id="categorySlug" label="Categoría" error={err('categorySlug')}>
        <select id="categorySlug" name="categorySlug" className="input" defaultValue={v?.categorySlug}>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
      </Field>
      <Field id="destinationSlug" label="Destino" error={err('destinationSlug')}>
        <select id="destinationSlug" name="destinationSlug" className="input" defaultValue={v?.destinationSlug}>{destinations.map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}</select>
      </Field>
      <Field id="priceCop" label="Precio por persona (COP)" error={err('priceCop')} hint="Pesos enteros, impuestos incluidos."><input id="priceCop" name="priceCop" type="number" min={5000} step={1000} className="input" defaultValue={v?.priceCop} aria-invalid={!!err('priceCop')} /></Field>
      <Field id="durationMinutes" label="Duración (minutos)" error={err('durationMinutes')}><input id="durationMinutes" name="durationMinutes" type="number" min={30} className="input" defaultValue={v?.durationMinutes ?? 120} /></Field>
      <Field id="minParticipants" label="Mínimo de personas por reserva" error={err('minParticipants')}><input id="minParticipants" name="minParticipants" type="number" min={1} className="input" defaultValue={v?.minParticipants ?? 1} /></Field>
      <Field id="maxParticipantsPerBooking" label="Máximo de personas por reserva" error={err('maxParticipantsPerBooking')}><input id="maxParticipantsPerBooking" name="maxParticipantsPerBooking" type="number" min={1} className="input" defaultValue={v?.maxParticipantsPerBooking ?? 10} /></Field>
      <div className="sm:col-span-2">
        <Field id="meetingPoint" label="Punto de encuentro" error={err('meetingPoint')}><input id="meetingPoint" name="meetingPoint" className="input" defaultValue={v?.meetingPoint} /></Field>
      </div>
      <Field id="latitude" label="Latitud (opcional)" error={err('latitude')}><input id="latitude" name="latitude" type="number" step="any" className="input" defaultValue={v?.latitude ?? ''} /></Field>
      <Field id="longitude" label="Longitud (opcional)" error={err('longitude')}><input id="longitude" name="longitude" type="number" step="any" className="input" defaultValue={v?.longitude ?? ''} /></Field>
      <Field id="includes" label="Incluye (uno por línea)" error={err('includes')}><textarea id="includes" name="includes" rows={4} className="input" defaultValue={v?.includes.join('\n')} /></Field>
      <Field id="excludes" label="No incluye (uno por línea)" error={err('excludes')}><textarea id="excludes" name="excludes" rows={4} className="input" defaultValue={v?.excludes.join('\n')} /></Field>
      <Field id="requirements" label="Requisitos y recomendaciones (uno por línea)" error={err('requirements')}><textarea id="requirements" name="requirements" rows={4} className="input" defaultValue={v?.requirements.join('\n')} /></Field>
      <Field id="minAge" label="Edad mínima (opcional)" error={err('minAge')}><input id="minAge" name="minAge" type="number" min={0} className="input" defaultValue={v?.minAge ?? ''} /></Field>
      <fieldset className="sm:col-span-2">
        <legend className="label">Política de cancelación</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {CANCELLATION_POLICIES.map((p) => (
            <label key={p} className={`cursor-pointer rounded-xl border p-3 text-sm ${policy === p ? 'border-selva-600 bg-selva-50' : 'border-selva-900/15 bg-white'}`}>
              <input type="radio" name="cancellationPolicy" value={p} checked={policy === p} onChange={() => setPolicy(p)} className="sr-only" />
              <span className="block font-semibold text-selva-900">{LABELS.cancellationPolicy[p]}</span>
              <span className="text-xs text-pizarra">{describeCancellationPolicy(p)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {msg && <div className="sm:col-span-2"><FormAlert kind={msg.kind}>{msg.text}</FormAlert></div>}
      <div className="sm:col-span-2">
        <button type="submit" className="btn-primary" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{serviceId ? 'Guardar cambios' : 'Crear borrador'}</button>
      </div>
    </form>
  );
}
