import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/forms/AuthForms';

export const metadata: Metadata = { title: 'Nueva contraseña', robots: { index: false } };

export default function Page() {
  return (
    <>
      <p className="eyebrow">Casi listo</p>
      <h1 className="mt-1 text-3xl font-bold text-selva-900">Nueva contraseña</h1>
      <p className="mt-2 mb-8 text-pizarra">Elige una contraseña de al menos 10 caracteres con letras y números.</p>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </>
  );
}
