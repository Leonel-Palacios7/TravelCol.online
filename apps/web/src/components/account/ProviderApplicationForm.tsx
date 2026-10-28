'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { providerApplicationSchema, type ProviderApplicationInput } from '@travelcol/contracts';
import { api } from '@/lib/api-client';
import { Field, FormAlert } from '@/components/forms/Field';

export function ProviderApplicationForm({ destinations }: { destinations: Array<{ slug: string; name: string }> }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<ProviderApplicationInput>({
    resolver: zodResolver(providerApplicationSchema),
    defaultValues: { destinationSlug: destinations[0]?.slug },
  });
  const e = formState.errors;
  return (
    <form
      noValidate
      className="card grid gap-4 p-6 sm:grid-cols-2"
      onSubmit={handleSubmit(async (v) => {
        setError(null);
        try {
          await api('/provider-applications', { body: { ...v, rntNumber: v.rntNumber || undefined } });
          router.refresh();
        } catch (err) {
          setError((err as Error).message);
        }
      })}
    >
      <Field id="businessName" label="Nombre comercial" error={e.businessName?.message}>
        <input id="businessName" className="input" {...register('businessName')} />
      </Field>
      <Field id="legalName" label="Razón social o nombre del titular" error={e.legalName?.message}>
        <input id="legalName" className="input" {...register('legalName')} />
      </Field>
      <Field id="taxId" label="NIT o cédula" error={e.taxId?.message} hint="Sin puntos. Ej.: 900123456-7">
        <input id="taxId" className="input" {...register('taxId')} />
      </Field>
      <Field id="rntNumber" label="Número de RNT" error={e.rntNumber?.message} hint="Registro Nacional de Turismo. Lo verificaremos antes de publicar.">
        <input id="rntNumber" className="input" inputMode="numeric" {...register('rntNumber', { setValueAs: (v: string) => v || undefined })} />
      </Field>
      <Field id="contactPhone" label="Celular de contacto" error={e.contactPhone?.message}>
        <input id="contactPhone" className="input" inputMode="tel" {...register('contactPhone')} />
      </Field>
      <Field id="destinationSlug" label="Destino donde operas" error={e.destinationSlug?.message}>
        <select id="destinationSlug" className="input" {...register('destinationSlug')}>
          {destinations.map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field id="description" label="Cuéntanos sobre tu operación" error={e.description?.message} hint="Experiencias que ofreces, experiencia del equipo, seguros y permisos.">
          <textarea id="description" rows={5} className="input" {...register('description')} />
        </Field>
      </div>
      <label className="flex items-start gap-3 text-sm sm:col-span-2">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-selva-700" {...register('acceptProviderTerms')} />
        <span>
          Acepto las <Link href="/legal/proveedores" target="_blank" className="font-medium text-tierra-600 underline">condiciones para proveedores</Link>, incluida la comisión de la plataforma y la obligación de mantener vigente el RNT.
        </span>
      </label>
      {e.acceptProviderTerms && <p className="field-error sm:col-span-2">{e.acceptProviderTerms.message}</p>}
      {error && <div className="sm:col-span-2"><FormAlert>{error}</FormAlert></div>}
      <div className="sm:col-span-2">
        <button type="submit" className="btn-primary" disabled={formState.isSubmitting}>
          {formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}Enviar solicitud
        </button>
      </div>
    </form>
  );
}
