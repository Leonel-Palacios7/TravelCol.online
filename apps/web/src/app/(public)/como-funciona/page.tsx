import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';

export const metadata: Metadata = { title: 'Cómo funciona', description: 'Cómo reservar y pagar experiencias en TravelCol.online.' };

const STEPS = [
  ['Busca', 'Filtra por destino, tipo de experiencia, fecha y número de personas. Cada ficha muestra precio, duración, requisitos y política de cancelación.'],
  ['Reserva', 'Elige fecha y horario. Calculamos el total en nuestro servidor y apartamos tus cupos durante unos minutos mientras completas el pago.'],
  ['Paga con Wompi', 'Te llevamos al checkout seguro de Wompi. TravelCol nunca recibe ni guarda los datos de tu tarjeta.'],
  ['Confirmación verificada', 'Tu reserva se confirma solo cuando Wompi nos notifica el pago aprobado y verificamos su firma, el valor y la referencia. Volver del checkout no basta.'],
  ['Vive la experiencia', 'El proveedor recibe tu reserva en su panel. Después de la experiencia puedes dejar una reseña verificada.'],
];

export default function HowItWorks() {
  return (
    <>
      <PageHeader eyebrow="Paso a paso" title="Cómo funciona TravelCol" />
      <section className="container-tc max-w-3xl py-10">
        <ol className="space-y-6">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="card flex gap-5 p-6">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-selva-800 text-xl font-bold text-white">{i + 1}</span>
              <div><h2 className="text-lg font-semibold text-selva-900">{t}</h2><p className="mt-1 text-pizarra">{d}</p></div>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex gap-3"><Link href="/experiencias" className="btn-primary">Ver experiencias</Link><Link href="/preguntas-frecuentes" className="btn-ghost">Preguntas frecuentes</Link></div>
      </section>
    </>
  );
}
