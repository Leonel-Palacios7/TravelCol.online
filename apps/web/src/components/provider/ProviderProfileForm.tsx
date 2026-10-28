'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { updateProviderSchema } from '@travelcol/contracts';
import { api } from '@/lib/api-client';
import { Field, FormAlert } from '@/components/forms/Field';

export function ProviderProfileForm({ initial }: { initial: { businessName: string; description: string; contactPhone: string; rntNumber: string | null } }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      noValidate
      className="card grid gap-4 p-6 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const body = {
          businessName: String(fd.get('businessName') ?? ''),
          description: String(fd.get('description') ?? ''),
          contactPhone: String(fd.get('contactPhone') ?? ''),
          rntNumber: String(fd.get('rntNumber') ?? '').trim() || undefined,
        };
        const parsed = updateProviderSchema.safeParse(body);
        if (!parsed.success) {
          const errs: Record<string, string> = {};
          for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
          return setErrors(errs);
        }
        setErrors({});
        setBusy(true);
        setMsg(null);
        try {
          await api('/providers/me', { method: 'PATCH', body });
          setMsg({ kind: 'success', text: 'Perfil actualizado. Si cambiaste el RNT, deberá verificarse de nuevo.' });
          router.refresh();
        } catch (err) {
          setMsg({ kind: 'error', text: (err as Error).message });
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field id="businessName" label="Nombre comercial" error={errors.businessName}><input id="businessName" name="businessName" className="input" defaultValue={initial.businessName} /></Field>
      <Field id="contactPhone" label="Celular de contacto" error={errors.contactPhone}><input id="contactPhone" name="contactPhone" className="input" defaultValue={initial.contactPhone} /></Field>
      <Field id="rntNumber" label="Número de RNT" error={errors.rntNumber}><input id="rntNumber" name="rntNumber" className="input" defaultValue={initial.rntNumber ?? ''} /></Field>
      <div className="sm:col-span-2"><Field id="description" label="Descripción pública" error={errors.description}><textarea id="description" name="description" rows={5} className="input" defaultValue={initial.description} /></Field></div>
      {msg && <div className="sm:col-span-2"><FormAlert kind={msg.kind}>{msg.text}</FormAlert></div>}
      <div className="sm:col-span-2"><button type="submit" className="btn-primary" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}Guardar</button></div>
    </form>
  );
}
