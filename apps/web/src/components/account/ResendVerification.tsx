'use client';

import { useState } from 'react';
import { MailWarning } from 'lucide-react';
import { api } from '@/lib/api-client';

export function ResendVerification() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl2 bg-sol-100 px-5 py-4 text-sm text-[#5c4100]">
      <MailWarning className="h-5 w-5 shrink-0" aria-hidden />
      <p className="flex-1">Verifica tu correo para publicar reseñas y solicitar ser proveedor. Revisa tu bandeja o pide un nuevo enlace.</p>
      <button
        type="button"
        className="btn-ghost px-3.5 py-1.5 text-xs"
        disabled={state === 'sending' || state === 'sent'}
        onClick={async () => {
          setState('sending');
          try {
            await api('/auth/resend-verification', { method: 'POST' });
            setState('sent');
          } catch {
            setState('error');
          }
        }}
      >
        {state === 'sent' ? 'Enlace enviado' : state === 'error' ? 'Reintentar' : 'Reenviar enlace'}
      </button>
    </div>
  );
}
