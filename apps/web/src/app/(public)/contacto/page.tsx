import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/PageHeader';
import { ContactForm } from '@/components/forms/ContactForm';

export const metadata: Metadata = { title: 'Contacto y PQR', description: 'Radica peticiones, quejas, reclamos o solicitudes sobre tus datos personales.' };

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  return (
    <>
      <PageHeader eyebrow="Estamos para ayudarte" title="Contacto y PQR">
        Recibirás un número de radicado para hacer seguimiento a tu solicitud.
      </PageHeader>
      <section className="container-tc grid gap-10 py-10 lg:grid-cols-[1fr_1.3fr]">
        <div className="relative overflow-hidden rounded-3xl bg-selva-800 p-8 text-white">
          <p className="script text-3xl text-sol-400">¡Hola!</p>
          <p className="mt-1 text-2xl font-bold">¿En qué podemos ayudarte hoy?</p>
          <p className="mt-4 text-white/80">Peticiones, quejas, reclamos, sugerencias y solicitudes de titulares de datos personales (Ley 1581 de 2012).</p>
          { }
          <img src="/illustrations/aves.svg" alt="" className="mt-8 aspect-[4/3] w-full rounded-2xl object-cover" />
        </div>
        <ContactForm initialType={tipo} />
      </section>
    </>
  );
}
