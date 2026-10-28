'use client';

/** Errores de la API con mensajes en español listos para mostrar. */
export class ClientApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fieldErrors: Array<{ path: string; message: string }> = [],
  ) {
    super(message);
  }
}

function readCookie(name: string) {
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${name}=`))
    ?.split('=')[1];
}

async function csrfToken(): Promise<string> {
  const existing = readCookie('tc_csrf');
  if (existing) return decodeURIComponent(existing);
  const res = await fetch('/api/v1/auth/csrf', { credentials: 'same-origin' });
  const body = (await res.json()) as { csrfToken: string };
  return body.csrfToken;
}

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const method = init.method ?? (init.body !== undefined || init.form ? 'POST' : 'GET');
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET') headers['X-CSRF-Token'] = await csrfToken();
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
    });
  } catch {
    throw new ClientApiError(0, 'Sin conexión. Revisa tu internet e inténtalo de nuevo.');
  }
  const text = await res.text();
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!res.ok) {
    throw new ClientApiError(
      res.status,
      typeof data.message === 'string' ? data.message : 'No fue posible completar la operación',
      Array.isArray(data.errors) ? (data.errors as Array<{ path: string; message: string }>) : [],
    );
  }
  return data as T;
}
