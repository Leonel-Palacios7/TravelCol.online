import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/components/forms/AuthForms';

export const metadata: Metadata = { title: 'Ingresar', robots: { index: false } };

export default function Page() {
  return (
    <>
      <p className="eyebrow">¡Hola de nuevo!</p>
      <h1 className="mt-1 text-3xl font-bold text-selva-900">Ingresar</h1>
      <p className="mt-2 mb-8 text-pizarra">Accede a tus reservas, favoritos y panel.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  );
}
