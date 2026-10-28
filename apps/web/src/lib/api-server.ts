import 'server-only';
import { cookies } from 'next/headers';

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Lectura desde componentes de servidor. Reenvía la cookie de sesión del visitante a la API.
 * `revalidate` solo se usa en datos públicos sin sesión (catálogo).
 */
export async function apiGet<T>(path: string, opts: { auth?: boolean; revalidate?: number } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.auth !== false) {
    const store = await cookies();
    const session = store.get('tc_session');
    if (session) headers.Cookie = `tc_session=${session.value}`;
  }
  const res = await fetch(`${API}/api/v1${path}`, {
    headers,
    ...(opts.revalidate !== undefined && opts.auth === false ? { next: { revalidate: opts.revalidate } } : { cache: 'no-store' as const }),
  });
  if (!res.ok) {
    let message = 'Error al consultar la API';
    try {
      message = ((await res.json()) as { message?: string }).message ?? message;
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

/** Igual que apiGet pero devuelve null en 404. */
export async function apiGetOrNull<T>(path: string, opts: { auth?: boolean; revalidate?: number } = {}): Promise<T | null> {
  try {
    return await apiGet<T>(path, opts);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 401 || e.status === 403)) return null;
    throw e;
  }
}
