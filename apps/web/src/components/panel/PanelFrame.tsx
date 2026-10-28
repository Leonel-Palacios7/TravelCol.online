import type { ReactNode } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';

/** Marco de las áreas privadas: cabecera del sitio y pie compacto. */
export function PanelFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main id="contenido" className="min-h-[70vh]">{children}</main>
      <footer className="border-t border-selva-900/10 py-6 text-center text-xs text-pizarra">
        <div className="tricolor mx-auto mb-3 h-1 w-24 rounded-full" />
        TravelCol.online · <Link href="/legal/terminos" className="hover:underline">Términos</Link> · <Link href="/legal/privacidad" className="hover:underline">Privacidad</Link> · <Link href="/contacto" className="hover:underline">PQR y ayuda</Link>
      </footer>
    </>
  );
}
