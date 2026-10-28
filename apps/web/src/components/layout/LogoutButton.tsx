'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { api } from '@/lib/api-client';

export function LogoutButton({ light = false }: { light?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api('/auth/logout', { method: 'POST' });
        } finally {
          router.push('/');
          router.refresh();
        }
      }}
      className={`btn ${light ? 'text-white hover:bg-white/10' : 'text-selva-900 hover:bg-selva-50'}`}
    >
      <LogOut className="h-4 w-4" aria-hidden />
      Salir
    </button>
  );
}
