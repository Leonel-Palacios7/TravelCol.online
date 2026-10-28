'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { api } from '@/lib/api-client';

export function FavoriteButton({ serviceId, initial, loggedIn }: { serviceId: string; initial: boolean; loggedIn: boolean }) {
  const [fav, setFav] = useState(initial);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <button
      type="button"
      aria-pressed={fav}
      disabled={busy}
      onClick={async () => {
        if (!loggedIn) return router.push('/ingresar');
        setBusy(true);
        try {
          await api(`/users/me/favorites/${serviceId}`, { method: fav ? 'DELETE' : 'PUT' });
          setFav(!fav);
        } finally {
          setBusy(false);
        }
      }}
      className="btn-ghost"
    >
      <Heart className={`h-4 w-4 ${fav ? 'fill-bandera-rojo text-bandera-rojo' : ''}`} aria-hidden />
      {fav ? 'Guardado' : 'Guardar'}
    </button>
  );
}
