'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Solo el identificador; el detalle queda en los registros del servidor.
    console.error('Error de interfaz', error.digest);
  }, [error]);
  return (
    <main id="contenido" className="container-tc flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="script text-5xl text-tierra-500">Algo salió mal</p>
      <h1 className="mt-2 text-2xl font-bold text-selva-900">No pudimos cargar esta sección</h1>
      <p className="mt-2 max-w-md text-pizarra">Inténtalo de nuevo en unos segundos. Si el problema continúa, escríbenos desde Contacto{error.digest ? ` indicando el código ${error.digest}` : ''}.</p>
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={reset} className="btn-primary">Reintentar</button>
        <Link href="/" className="btn-ghost">Ir al inicio</Link>
      </div>
    </main>
  );
}
