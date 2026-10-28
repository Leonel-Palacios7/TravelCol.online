'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export function MobileMenu({
  nav,
  panel,
  loggedIn,
  light,
}: {
  nav: Array<{ href: string; label: string }>;
  panel: { href: string; label: string } | null;
  loggedIn: boolean;
  light: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="menu-movil"
        className={`rounded-full p-2 ${light ? 'text-white hover:bg-white/10' : 'text-selva-900 hover:bg-selva-50'}`}
      >
        {open ? <X aria-hidden /> : <Menu aria-hidden />}
        <span className="sr-only">{open ? 'Cerrar menú' : 'Abrir menú'}</span>
      </button>
      {open && (
        <div id="menu-movil" className="absolute inset-x-3 top-18 z-40 rounded-2xl bg-white p-4 shadow-suave">
          <nav aria-label="Menú móvil" className="flex flex-col">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 font-medium text-selva-900 hover:bg-selva-50">
                {n.label}
              </Link>
            ))}
            <div className="mt-3 flex gap-2 border-t border-selva-900/10 pt-3">
              {loggedIn && panel ? (
                <Link href={panel.href} onClick={() => setOpen(false)} className="btn-primary flex-1">
                  {panel.label}
                </Link>
              ) : (
                <>
                  <Link href="/ingresar" onClick={() => setOpen(false)} className="btn-ghost flex-1">
                    Ingresar
                  </Link>
                  <Link href="/registro" onClick={() => setOpen(false)} className="btn-sol flex-1">
                    Crear cuenta
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
