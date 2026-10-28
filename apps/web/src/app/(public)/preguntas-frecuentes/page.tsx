import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/PageHeader';

export const metadata: Metadata = { title: 'Preguntas frecuentes' };

const FAQ: Array<[string, string]> = [
  ['¿Cuándo queda confirmada mi reserva?', 'Cuando Wompi nos notifica que el pago fue aprobado y nuestro sistema verifica la firma del evento, el valor y la referencia. Verás el estado “Confirmada” en tu cuenta.'],
  ['¿Cuánto tiempo tengo para pagar?', 'Apartamos tus cupos durante unos minutos (20 por defecto). Si el pago no se completa en ese tiempo, la reserva expira y los cupos se liberan.'],
  ['¿Qué medios de pago aceptan?', 'Los que el comercio tenga habilitados en Wompi (por ejemplo tarjetas, PSE o Nequi). Los verás en el checkout de Wompi.'],
  ['¿Puedo cancelar?', 'Sí. El reembolso depende de la política de cada experiencia (flexible, moderada o estricta), que se muestra antes de pagar. Si el proveedor cancela, recibes el 100 %.'],
  ['¿Cómo recibo el reembolso?', 'Nuestro equipo lo ejecuta por el medio de pago o por transferencia y lo registra con su referencia. Los tiempos dependen de tu entidad financiera.'],
  ['¿Los proveedores están verificados?', 'Revisamos documentos como el Registro Nacional de Turismo (RNT) antes de publicar. La ficha de cada proveedor indica si su RNT fue verificado.'],
  ['¿Qué significa “DEMO”?', 'Son experiencias de demostración usadas en entornos de prueba. No corresponden a proveedores reales.'],
  ['¿Cómo ejerzo mis derechos sobre mis datos personales?', 'Desde “Mi cuenta” puedes descargar tus datos o solicitar su supresión. También puedes radicar una solicitud en la página de contacto (Ley 1581 de 2012).'],
];

export default function FaqPage() {
  return (
    <>
      <PageHeader eyebrow="Ayuda" title="Preguntas frecuentes" />
      <section className="container-tc max-w-3xl space-y-3 py-10">
        {FAQ.map(([q, a]) => (
          <details key={q} className="card group p-5">
            <summary className="cursor-pointer list-none font-semibold text-selva-900 marker:hidden">
              <span className="flex items-center justify-between gap-4">{q}<span className="text-tierra-500 transition-transform group-open:rotate-45" aria-hidden>+</span></span>
            </summary>
            <p className="mt-3 text-pizarra">{a}</p>
          </details>
        ))}
      </section>
    </>
  );
}
