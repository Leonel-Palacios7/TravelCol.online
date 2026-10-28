'use client';

import { useRouter } from 'next/navigation';
import { useId, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { api } from '@/lib/api-client';
import { FormAlert } from '@/components/forms/Field';

export interface ActionField {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'select' | 'date';
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  defaultValue?: string;
  hint?: string;
  placeholder?: string;
}

type Variant = 'primary' | 'danger' | 'ghost' | 'sol';
const BTN: Record<Variant, string> = { primary: 'btn-primary', danger: 'btn-danger', ghost: 'btn-ghost', sol: 'btn-sol' };

/**
 * Acción con confirmación: abre un diálogo, envía la operación a la API y refresca la vista.
 * La API valida y autoriza; el diálogo solo recoge datos y muestra el resultado real.
 */
export function ActionDialog({
  label, title, description, endpoint, method = 'POST', fields = [], fixed = {}, submitLabel = 'Confirmar',
  variant = 'ghost', small = true, redirectTo,
}: {
  label: string;
  title: string;
  description?: string;
  endpoint: string;
  method?: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  fields?: ActionField[];
  fixed?: Record<string, unknown>;
  submitLabel?: string;
  variant?: Variant;
  small?: boolean;
  redirectTo?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const uid = useId();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(form: HTMLFormElement) {
    setError(null);
    setBusy(true);
    const fd = new FormData(form);
    const body: Record<string, unknown> = { ...fixed };
    for (const f of fields) {
      const raw = String(fd.get(f.name) ?? '').trim();
      if (!raw) continue;
      body[f.name] = f.type === 'number' ? Number(raw) : raw;
    }
    try {
      await api(endpoint, { method, body: method === 'DELETE' ? undefined : body });
      ref.current?.close();
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={`${BTN[variant]} ${small ? 'px-3.5 py-1.5 text-xs' : ''}`} onClick={() => { setError(null); ref.current?.showModal(); }}>
        {label}
      </button>
      <dialog ref={ref} aria-labelledby={`${uid}-t`} className="m-auto w-[min(92vw,30rem)] rounded-xl2 bg-white p-0 shadow-suave backdrop:bg-selva-950/50">
        <form
          className="space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(e.currentTarget);
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <h2 id={`${uid}-t`} className="text-lg font-bold text-selva-900">{title}</h2>
            <button type="button" aria-label="Cerrar" className="rounded-full p-1 text-pizarra hover:bg-arena" onClick={() => ref.current?.close()}>
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          {description && <p className="text-sm text-pizarra">{description}</p>}
          {fields.map((f) => {
            const id = `${uid}-${f.name}`;
            return (
              <div key={f.name}>
                <label htmlFor={id} className="label">{f.label}{f.required && <span className="text-bandera-rojo"> *</span>}</label>
                {f.type === 'textarea' ? (
                  <textarea id={id} name={f.name} rows={4} required={f.required} defaultValue={f.defaultValue} placeholder={f.placeholder} className="input" />
                ) : f.type === 'select' ? (
                  <select id={id} name={f.name} required={f.required} defaultValue={f.defaultValue} className="input">
                    {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input id={id} name={f.name} type={f.type ?? 'text'} required={f.required} defaultValue={f.defaultValue} placeholder={f.placeholder} className="input" />
                )}
                {f.hint && <p className="mt-1 text-xs text-pizarra">{f.hint}</p>}
              </div>
            );
          })}
          {error && <FormAlert>{error}</FormAlert>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => ref.current?.close()}>Volver</button>
            <button type="submit" className={variant === 'danger' ? 'btn bg-bandera-rojo text-white hover:bg-bandera-rojo/90' : 'btn-primary'} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{submitLabel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
