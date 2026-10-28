import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RegisterForm } from '@/components/forms/AuthForms';

export const metadata: Metadata = { title: 'Crear cuenta', robots: { index: false } };

export default function Page() {
  return (
    <>
      <p className="eyebrow">Bienvenido</p>
      <h1 className="mt-1 text-3xl font-bold text-selva-900">Crear cuenta</h1>
      <p className="mt-2 mb-8 text-pizarra">Regístrate como turista. Si ofreces experiencias, luego podrás solicitar ser proveedor.</p>
      <Suspense>
        <RegisterForm />
      </Suspense>
    </>
  );
}
