import Link from 'next/link';
import { getSession } from '@/lib/session';
import { Logo } from './Logo';
import { MobileMenu } from './MobileMenu';
import { LogoutButton } from './LogoutButton';

const NAV = [
  { href: '/experiencias', label: 'Experiencias' },
  { href: '/destinos/villeta', label: 'Villeta' },
  { href: '/como-funciona', label: 'Cómo funciona' },
  { href: '/proveedores', label: 'Para proveedores' },
  { href: '/contacto', label: 'Contacto' },
];

export function panelFor(role: string) {
  if (role === 'ADMIN' || role === 'SUPPORT') return { href: '/admin', label: 'Administración' };
  if (role === 'PROVIDER') return { href: '/proveedor', label: 'Panel proveedor' };
  return { href: '/cuenta', label: 'Mi cuenta' };
}

export async function Header({ overlay = false }: { overlay?: boolean }) {
  const user = await getSession();
  const panel = user ? panelFor(user.role) : null;
  return (
    <header className={overlay ? 'absolute inset-x-0 top-0 z-30' : 'sticky top-0 z-30 border-b border-selva-900/10 bg-crema/90 backdrop-blur'}>
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2">
        Saltar al contenido
      </a>
      <div className="container-tc flex h-18 items-center justify-between gap-4 py-3">
        <Logo light={overlay} />
        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${overlay ? 'text-white/90 hover:bg-white/10 hover:text-white' : 'text-selva-900 hover:bg-selva-50'}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {user && panel ? (
            <>
              <Link href={panel.href} className={overlay ? 'btn bg-white/15 text-white hover:bg-white/25' : 'btn-ghost'}>
                {panel.label}
              </Link>
              <LogoutButton light={overlay} />
            </>
          ) : (
            <>
              <Link href="/ingresar" className={`btn ${overlay ? 'text-white hover:bg-white/10' : 'text-selva-900 hover:bg-selva-50'}`}>
                Ingresar
              </Link>
              <Link href="/registro" className="btn-sol">
                Crear cuenta
              </Link>
            </>
          )}
        </div>
        <MobileMenu nav={NAV} panel={panel} loggedIn={!!user} light={overlay} />
      </div>
    </header>
  );
}
