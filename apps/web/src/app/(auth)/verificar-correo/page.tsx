import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VerifyEmail } from '@/components/forms/AuthForms';

export const metadata: Metadata = { title: 'Verificar correo', robots: { index: false } };

export default function Page() {
  return (
    <>
      <p className="eyebrow">Un paso más</p>
      <h1 className="mt-1 text-3xl font-bold text-selva-900">Verificar correo</h1>
      <p className="mt-2 mb-8 text-pizarra">Estamos confirmando tu dirección de correo.</p>
      <Suspense>
        <VerifyEmail />
      </Suspense>
    </>
  );
}
