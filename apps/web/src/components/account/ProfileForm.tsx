'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { updateProfileSchema, type SessionUserDto } from '@travelcol/contracts';
import { api } from '@/lib/api-client';
import { Field, FormAlert } from '@/components/forms/Field';

type Values = z.input<typeof updateProfileSchema>;

export function ProfileForm({ user }: { user: SessionUserDto }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const { register, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { fullName: user.fullName, phone: user.phone ?? undefined, marketingOptIn: user.marketingOptIn },
  });
  return (
    <form
      noValidate
      className="card space-y-4 p-6"
      onSubmit={handleSubmit(async (v) => {
        setMsg(null);
        try {
          await api('/users/me', { method: 'PATCH', body: { ...v, phone: v.phone ? v.phone : null } });
          setMsg({ kind: 'success', text: 'Datos actualizados.' });
          router.refresh();
        } catch (e) {
          setMsg({ kind: 'error', text: (e as Error).message });
        }
      })}
    >
      <Field id="fullName" label="Nombre completo" error={formState.errors.fullName?.message}>
        <input id="fullName" className="input" autoComplete="name" {...register('fullName')} />
      </Field>
      <Field id="email" label="Correo electrónico" hint="Para cambiar tu correo escríbenos desde Contacto.">
        <input id="email" className="input bg-arena/50" value={user.email} readOnly />
      </Field>
      <Field id="phone" label="Celular" error={formState.errors.phone?.message} hint="Ejemplo: 300 123 4567">
        <input id="phone" className="input" autoComplete="tel" inputMode="tel" {...register('phone')} />
      </Field>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-selva-700" {...register('marketingOptIn')} />
        <span>Acepto recibir novedades y promociones de TravelCol por correo (opcional, puedes retirarlo cuando quieras).</span>
      </label>
      {msg && <FormAlert kind={msg.kind}>{msg.text}</FormAlert>}
      <button type="submit" className="btn-primary" disabled={formState.isSubmitting}>
        {formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}Guardar cambios
      </button>
    </form>
  );
}
