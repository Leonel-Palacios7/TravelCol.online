'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { contactSchema, LABELS, PQR_TYPES, type ContactInput, type PqrType } from '@travelcol/contracts';
import { api } from '@/lib/api-client';
import { Field, FormAlert } from './Field';

export function ContactForm({ initialType }: { initialType?: string }) {
  const [radicado, setRadicado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const type = (PQR_TYPES as readonly string[]).includes(initialType ?? '') ? (initialType as PqrType) : 'PETICION';
  const { register, handleSubmit, formState, reset } = useForm<ContactInput>({ resolver: zodResolver(contactSchema), defaultValues: { type } });
  const e = formState.errors;

  if (radicado) {
    return (
      <div className="card p-8">
        <FormAlert kind="success">Recibimos tu solicitud. Tu número de radicado es <strong>{radicado}</strong>. Te escribiremos al correo indicado.</FormAlert>
        <button className="btn-ghost mt-4" onClick={() => { setRadicado(null); reset(); }}>Enviar otra solicitud</button>
      </div>
    );
  }
  return (
    <form
      noValidate
      className="card space-y-4 p-6 sm:p-8"
      onSubmit={handleSubmit(async (v) => {
        setError(null);
        try {
          const r = await api<{ radicado: string }>('/support/tickets', { body: v });
          setRadicado(r.radicado);
        } catch (err) {
          setError((err as Error).message);
        }
      })}
    >
      <h2 className="text-xl font-semibold text-selva-900">Escríbenos</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="fullName" label="Nombre completo" error={e.fullName?.message}><input id="fullName" autoComplete="name" className="input" aria-invalid={!!e.fullName} {...register('fullName')} /></Field>
        <Field id="email" label="Correo electrónico" error={e.email?.message}><input id="email" type="email" autoComplete="email" className="input" aria-invalid={!!e.email} {...register('email')} /></Field>
      </div>
      <Field id="type" label="Tipo de solicitud" error={e.type?.message}>
        <select id="type" className="input" {...register('type')}>{PQR_TYPES.map((t) => <option key={t} value={t}>{LABELS.pqrType[t]}</option>)}</select>
      </Field>
      <Field id="subject" label="Asunto" error={e.subject?.message}><input id="subject" className="input" aria-invalid={!!e.subject} {...register('subject')} /></Field>
      <Field id="message" label="Mensaje" error={e.message?.message}><textarea id="message" rows={5} className="input" aria-invalid={!!e.message} {...register('message')} /></Field>
      <label className="flex gap-2 text-sm text-pizarra">
        <input type="checkbox" className="mt-1" {...register('acceptPrivacy')} />
        <span>Autorizo el tratamiento de mis datos para atender esta solicitud, según la <Link className="underline" href="/legal/privacidad">política de datos</Link>.</span>
      </label>
      {e.acceptPrivacy && <p className="field-error">{e.acceptPrivacy.message}</p>}
      {error && <FormAlert>{error}</FormAlert>}
      <button type="submit" className="btn-primary" disabled={formState.isSubmitting}>{formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}Enviar solicitud</button>
    </form>
  );
}
