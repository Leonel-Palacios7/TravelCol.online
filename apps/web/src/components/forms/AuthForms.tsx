'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import {
  forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema,
  type LoginInput, type RegisterInput, type SessionUserDto,
} from '@travelcol/contracts';
import { api } from '@/lib/api-client';
import { Field, FormAlert } from './Field';

/** Solo se permiten redirecciones internas (evita open redirect). */
function safeNext(next: string | null, fallback: string) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}

function homeFor(user: SessionUserDto) {
  if (user.role === 'ADMIN' || user.role === 'SUPPORT') return '/admin';
  if (user.role === 'PROVIDER') return '/proveedor';
  return '/cuenta';
}

export function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit(async (v) => {
        setError(null);
        try {
          const user = await api<SessionUserDto>('/auth/login', { body: v });
          router.push(safeNext(sp.get('next'), homeFor(user)));
          router.refresh();
        } catch (e) {
          setError((e as Error).message);
        }
      })}
    >
      <Field id="email" label="Correo electrónico" error={formState.errors.email?.message}>
        <input id="email" type="email" autoComplete="email" className="input" aria-invalid={!!formState.errors.email} {...register('email')} />
      </Field>
      <Field id="password" label="Contraseña" error={formState.errors.password?.message}>
        <input id="password" type="password" autoComplete="current-password" className="input" aria-invalid={!!formState.errors.password} {...register('password')} />
      </Field>
      {error && <FormAlert>{error}</FormAlert>}
      <button type="submit" className="btn-primary w-full py-3" disabled={formState.isSubmitting}>
        {formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}Ingresar
      </button>
      <div className="flex justify-between text-sm">
        <Link href="/recuperar-contrasena" className="text-tierra-600 hover:underline">¿Olvidaste tu contraseña?</Link>
        <Link href={`/registro${sp.get('next') ? `?next=${encodeURIComponent(sp.get('next')!)}` : ''}`} className="font-medium text-selva-800 hover:underline">Crear cuenta</Link>
      </div>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema), defaultValues: { marketingOptIn: false } });
  const e = formState.errors;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit(async (v) => {
        setError(null);
        try {
          await api<SessionUserDto>('/auth/register', { body: { ...v, phone: v.phone || undefined } });
          router.push(safeNext(sp.get('next'), '/cuenta?bienvenida=1'));
          router.refresh();
        } catch (err) {
          setError((err as Error).message);
        }
      })}
    >
      <Field id="fullName" label="Nombre completo" error={e.fullName?.message}><input id="fullName" autoComplete="name" className="input" aria-invalid={!!e.fullName} {...register('fullName')} /></Field>
      <Field id="email" label="Correo electrónico" error={e.email?.message}><input id="email" type="email" autoComplete="email" className="input" aria-invalid={!!e.email} {...register('email')} /></Field>
      <Field id="phone" label="Celular (opcional)" error={e.phone?.message}><input id="phone" type="tel" autoComplete="tel" placeholder="300 123 4567" className="input" aria-invalid={!!e.phone} {...register('phone', { setValueAs: (v: string) => (v ? v : undefined) })} /></Field>
      <Field id="password" label="Contraseña" error={e.password?.message} hint="Mínimo 10 caracteres, con letras y números.">
        <input id="password" type="password" autoComplete="new-password" className="input" aria-invalid={!!e.password} {...register('password')} />
      </Field>
      <label className="flex gap-2 text-sm text-pizarra">
        <input type="checkbox" className="mt-1" {...register('acceptTerms')} />
        <span>Acepto los <Link className="underline" href="/legal/terminos" target="_blank">términos y condiciones</Link> y autorizo el tratamiento de mis datos según la <Link className="underline" href="/legal/privacidad" target="_blank">política de datos</Link>.</span>
      </label>
      {e.acceptTerms && <p className="field-error">{e.acceptTerms.message}</p>}
      <label className="flex gap-2 text-sm text-pizarra">
        <input type="checkbox" className="mt-1" {...register('marketingOptIn')} />
        <span>Quiero recibir novedades y ofertas (opcional).</span>
      </label>
      {error && <FormAlert>{error}</FormAlert>}
      <button type="submit" className="btn-sol w-full py-3" disabled={formState.isSubmitting}>{formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}Crear mi cuenta</button>
      <p className="text-center text-sm text-pizarra">¿Ya tienes cuenta? <Link className="font-medium text-selva-800 underline" href="/ingresar">Ingresa</Link></p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [done, setDone] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<{ email: string }>({ resolver: zodResolver(forgotPasswordSchema) });
  if (done) return <FormAlert kind="success">{done}</FormAlert>;
  return (
    <form noValidate className="space-y-4" onSubmit={handleSubmit(async (v) => {
      const r = await api<{ message: string }>('/auth/forgot-password', { body: v }).catch((e: Error) => ({ message: e.message }));
      setDone(r.message);
    })}>
      <Field id="email" label="Correo electrónico" error={formState.errors.email?.message}><input id="email" type="email" autoComplete="email" className="input" {...register('email')} /></Field>
      <button className="btn-primary w-full py-3" disabled={formState.isSubmitting}>Enviar enlace</button>
    </form>
  );
}

const resetForm = resetPasswordSchema.pick({ password: true }).extend({ confirm: z.string() }).refine((v) => v.password === v.confirm, { message: 'Las contraseñas no coinciden', path: ['confirm'] });

export function ResetPasswordForm() {
  const sp = useSearchParams();
  const token = sp.get('token') ?? '';
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof resetForm>>({ resolver: zodResolver(resetForm) });
  if (!token) return <FormAlert>El enlace no es válido. Solicita uno nuevo.</FormAlert>;
  if (msg?.kind === 'success') return <div className="space-y-4"><FormAlert kind="success">{msg.text}</FormAlert><Link href="/ingresar" className="btn-primary">Ingresar</Link></div>;
  return (
    <form noValidate className="space-y-4" onSubmit={handleSubmit(async (v) => {
      try {
        const r = await api<{ message: string }>('/auth/reset-password', { body: { token, password: v.password } });
        setMsg({ kind: 'success', text: r.message });
      } catch (e) {
        setMsg({ kind: 'error', text: (e as Error).message });
      }
    })}>
      <Field id="password" label="Nueva contraseña" error={formState.errors.password?.message}><input id="password" type="password" autoComplete="new-password" className="input" {...register('password')} /></Field>
      <Field id="confirm" label="Confirmar contraseña" error={formState.errors.confirm?.message}><input id="confirm" type="password" autoComplete="new-password" className="input" {...register('confirm')} /></Field>
      {msg && <FormAlert>{msg.text}</FormAlert>}
      <button className="btn-primary w-full py-3" disabled={formState.isSubmitting}>Guardar contraseña</button>
    </form>
  );
}

export function VerifyEmail() {
  const sp = useSearchParams();
  const token = sp.get('token');
  const [state, setState] = useState<{ kind: 'loading' | 'error' | 'success'; text: string }>(() =>
    token ? { kind: 'loading', text: 'Verificando…' } : { kind: 'error', text: 'El enlace no es válido.' },
  );
  const once = useRef(false);
  useEffect(() => {
    if (once.current || !token) return;
    once.current = true;
    api<{ message: string }>('/auth/verify-email', { body: { token } })
      .then((r) => setState({ kind: 'success', text: r.message }))
      .catch((e: Error) => setState({ kind: 'error', text: e.message }));
  }, [token]);
  if (state.kind === 'loading') return <p className="flex items-center gap-2 text-pizarra"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{state.text}</p>;
  return <div className="space-y-4"><FormAlert kind={state.kind}>{state.text}</FormAlert><Link href="/cuenta" className="btn-primary">Ir a mi cuenta</Link></div>;
}
