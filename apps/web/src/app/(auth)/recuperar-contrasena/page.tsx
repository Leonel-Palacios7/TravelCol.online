import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ForgotPasswordForm } from '@/components/forms/AuthForms';

export const metadata: Metadata = { title: 'Recuperar contraseña', robots: { index: false } };

export default function Page() {
  return (
    <>
      <p className="eyebrow">Tranquilo</p>
      <h1 className="mt-1 text-3xl font-bold text-selva-900">Recuperar contraseña</h1>
      <p className="mt-2 mb-8 text-pizarra">Te enviaremos un enlace para restablecerla si el correo está registrado.</p>
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
    </>
  );
}
