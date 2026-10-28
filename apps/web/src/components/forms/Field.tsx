import type { ReactNode } from 'react';

export function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-pizarra">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="field-error">{error}</p>}
    </div>
  );
}

export function FormAlert({ kind = 'error', children }: { kind?: 'error' | 'success'; children: ReactNode }) {
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-xl px-4 py-3 text-sm ${kind === 'error' ? 'bg-red-50 text-bandera-rojo' : 'bg-selva-100 text-selva-800'}`}>
      {children}
    </div>
  );
}
