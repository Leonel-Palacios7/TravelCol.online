import type { Metadata } from 'next';
import { PanelShell, type PanelNavItem } from '@/components/panel/PanelShell';
import { requireSession } from '@/lib/session';

export const metadata: Metadata = { title: 'Administración', robots: { index: false } };

// La API aplica la autorización real; aquí solo se ocultan secciones que SUPPORT no puede usar.
const NAV: Array<PanelNavItem & { adminOnly?: boolean }> = [
  { href: '/admin', label: 'Resumen', icon: 'dashboard', exact: true },
  { href: '/admin/solicitudes', label: 'Solicitudes', icon: 'applications' },
  { href: '/admin/proveedores', label: 'Proveedores', icon: 'verified' },
  { href: '/admin/servicios', label: 'Experiencias', icon: 'services' },
  { href: '/admin/reservas', label: 'Reservas', icon: 'bookings' },
  { href: '/admin/pagos', label: 'Pagos y webhooks', icon: 'payments' },
  { href: '/admin/reembolsos', label: 'Reembolsos', icon: 'refund', adminOnly: true },
  { href: '/admin/liquidaciones', label: 'Liquidaciones', icon: 'receipt', adminOnly: true },
  { href: '/admin/resenas', label: 'Reseñas', icon: 'star' },
  { href: '/admin/pqr', label: 'PQR', icon: 'pqr' },
  { href: '/admin/usuarios', label: 'Usuarios', icon: 'users', adminOnly: true },
  { href: '/admin/reportes', label: 'Reportes', icon: 'chart', adminOnly: true },
  { href: '/admin/configuracion', label: 'Configuración', icon: 'settings', adminOnly: true },
  { href: '/admin/auditoria', label: 'Auditoría', icon: 'audit', adminOnly: true },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession('/admin', ['ADMIN', 'SUPPORT']);
  const nav = NAV.filter((n) => !n.adminOnly || user.role === 'ADMIN').map((n) => ({ href: n.href, label: n.label, icon: n.icon, exact: n.exact }));
  return (
    <PanelShell title={user.fullName} subtitle={user.role === 'ADMIN' ? 'Administración' : 'Soporte'} nav={nav}>
      {children}
    </PanelShell>
  );
}
