import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, CalendarRange, LineChart, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { getSession } from '@/lib/session';

export const metadata: Metadata = { title: 'Para proveedores', description: 'Publica tus experiencias turísticas en TravelCol.online.' };

const ITEMS = [
  { icon: CalendarRange, t: 'Tu calendario y tus cupos', d: 'Define fechas, horarios y capacidad. El sistema evita la sobreventa automáticamente.' },
  { icon: Wallet, t: 'Cobro con Wompi', d: 'El turista paga en línea. Ves en tu panel el valor bruto, la comisión y tu saldo por liquidar.' },
  { icon: LineChart, t: 'Panel de ventas', d: 'Reservas próximas, ventas del mes y liquidaciones con su referencia de pago.' },
  { icon: BadgeCheck, t: 'Confianza verificada', d: 'Tu RNT verificado aparece en tu perfil y en tus experiencias.' },
];

export default async function ProvidersLanding() {
  const user = await getSession();
  return (
    <>
      <PageHeader eyebrow="Crece con nosotros" title="Publica tus experiencias en TravelCol">
        Para operadores, guías, fincas y negocios turísticos de Villeta y sus alrededores.
      </PageHeader>
      <section className="container-tc grid gap-6 py-12 sm:grid-cols-2">
        {ITEMS.map((i) => (
          <div key={i.t} className="card flex gap-4 p-6">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sol-100"><i.icon className="h-6 w-6 text-selva-800" aria-hidden /></span>
            <div><h2 className="font-semibold text-selva-900">{i.t}</h2><p className="mt-1 text-sm text-pizarra">{i.d}</p></div>
          </div>
        ))}
      </section>
      <section className="container-tc">
        <div className="rounded-3xl bg-sol-400 p-8 sm:p-10">
          <h2 className="text-2xl font-bold text-selva-950">Requisitos para publicar</h2>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-selva-950/90">
            <li>Cuenta en TravelCol con correo verificado.</li>
            <li>NIT o cédula, y Registro Nacional de Turismo (RNT) vigente cuando aplique a tu actividad.</li>
            <li>Documentos de soporte (RUT, cámara de comercio, pólizas si aplican).</li>
            <li>Aceptar las <Link className="underline" href="/legal/proveedores">condiciones para proveedores</Link>, incluida la comisión por reserva.</li>
          </ul>
          <div className="mt-6">
            {user ? (
              <Link href="/cuenta/ser-proveedor" className="btn-primary px-6 py-3">Enviar mi solicitud</Link>
            ) : (
              <Link href="/registro?next=/cuenta/ser-proveedor" className="btn-primary px-6 py-3">Crear cuenta y postularme</Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
