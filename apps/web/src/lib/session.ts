import 'server-only';
import { redirect } from 'next/navigation';
import type { SessionUserDto, UserRole } from '@travelcol/contracts';
import { apiGetOrNull } from './api-server';

export async function getSession(): Promise<SessionUserDto | null> {
  return apiGetOrNull<SessionUserDto>('/users/me');
}

/** Protección de páginas privadas. La autorización real ocurre en la API; esto solo evita mostrar UI vacía. */
export async function requireSession(next: string, roles?: UserRole[]) {
  const user = await getSession();
  if (!user) redirect(`/ingresar?next=${encodeURIComponent(next)}`);
  if (roles && !roles.includes(user.role)) redirect('/cuenta?acceso=denegado');
  return user;
}
