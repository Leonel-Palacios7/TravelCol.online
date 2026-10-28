import type { Metadata } from 'next';
import { PanelShell, type PanelNavItem } from '@/components/panel/PanelShell';
import { requireSession } from '@/lib/session';

export const metadata: Metadata = { title: 'Panel del proveedor', robots: { index: false } };

const NAV: PanelNavItem[] = [
  { href: '/proveedor', label: 'Resumen', icon: 'dashboard', exact: true },
  { href: '/proveedor/servicios', label: 'Experiencias', icon: 'services' },
  { href: '/proveedor/reservas', label: 'Reservas', icon: 'bookings' },
  { href: '/proveedor/finanzas', label: 'Finanzas', icon: 'money' },
  { href: '/proveedor/documentos', label: 'Documentos', icon: 'docs' },
  { href: '/proveedor/perfil', label: 'Perfil público', icon: 'store' },
];

export default async function ProveedorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession('/proveedor', ['PROVIDER']);
  return (
    <PanelShell title={user.fullName} subtitle="Proveedor" nav={NAV}>
      {children}
    </PanelShell>
  );
}
