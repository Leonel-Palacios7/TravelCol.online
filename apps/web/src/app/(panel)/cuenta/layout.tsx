import type { Metadata } from 'next';
import { PanelShell, type PanelNavItem } from '@/components/panel/PanelShell';
import { requireSession } from '@/lib/session';

export const metadata: Metadata = { title: 'Mi cuenta', robots: { index: false } };

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession('/cuenta');
  const nav: PanelNavItem[] = [
    { href: '/cuenta', label: 'Resumen', icon: 'dashboard', exact: true },
    { href: '/cuenta/reservas', label: 'Mis reservas', icon: 'bookings' },
    { href: '/cuenta/favoritos', label: 'Favoritos', icon: 'heart' },
    { href: '/cuenta/notificaciones', label: 'Notificaciones', icon: 'bell' },
    { href: '/cuenta/perfil', label: 'Perfil y datos', icon: 'user' },
  ];
  if (user.role === 'TOURIST') nav.push({ href: '/cuenta/ser-proveedor', label: 'Ser proveedor', icon: 'store' });
  return (
    <PanelShell title={user.fullName} subtitle="Mi cuenta" nav={nav}>
      {children}
    </PanelShell>
  );
}
