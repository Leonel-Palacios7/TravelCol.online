import Link from 'next/link';
import { Logo } from '@/components/layout/Logo';

/** Diseño dividido: formulario a la izquierda e ilustración original de Villeta a la derecha. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <main id="contenido" className="flex flex-col px-4 py-6 sm:px-10">
        <Logo />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
        <p className="text-center text-xs text-pizarra">
          <Link href="/legal/terminos" className="hover:underline">Términos</Link> ·{' '}
          <Link href="/legal/privacidad" className="hover:underline">Privacidad</Link> ·{' '}
          <Link href="/" className="hover:underline">Volver al inicio</Link>
        </p>
      </main>
      <aside className="relative hidden overflow-hidden bg-selva-800 lg:block" aria-hidden>
        <img src="/illustrations/heroe.svg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-selva-950/80 to-transparent p-12 text-white">
          <p className="script text-5xl text-sol-400">Villeta te espera</p>
          <p className="mt-2 max-w-sm text-white/85">Reserva experiencias con operadores locales verificados y paga de forma segura.</p>
        </div>
      </aside>
    </div>
  );
}
