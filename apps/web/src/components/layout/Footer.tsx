import Link from 'next/link';
import { Logo } from './Logo';
import { TornEdge } from '../ui/TornEdge';

export function Footer() {
  return (
    <footer className="relative mt-24 bg-selva-900 text-white/85">
      <TornEdge position="top" color="#083a33" />
      <div className="container-tc grid gap-10 pt-16 pb-10 md:grid-cols-4">
        <div className="space-y-4">
          <Logo light />
          <p className="text-sm leading-relaxed text-white/70">
            Conectamos viajeros con experiencias auténticas y a los negocios locales con nuevas oportunidades de venta. Programa piloto en Villeta, Cundinamarca.
          </p>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold text-sol-400">Explora</h2>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/experiencias">Experiencias</Link></li>
            <li><Link className="hover:text-white" href="/destinos/villeta">Villeta</Link></li>
            <li><Link className="hover:text-white" href="/como-funciona">Cómo funciona</Link></li>
            <li><Link className="hover:text-white" href="/preguntas-frecuentes">Preguntas frecuentes</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold text-sol-400">Empresa</h2>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/proveedores">Para proveedores</Link></li>
            <li><Link className="hover:text-white" href="/contacto">Contacto y PQR</Link></li>
            <li><Link className="hover:text-white" href="/contacto?tipo=DATOS_PERSONALES">Tus datos personales</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold text-sol-400">Legal</h2>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/legal/terminos">Términos y condiciones</Link></li>
            <li><Link className="hover:text-white" href="/legal/privacidad">Tratamiento de datos</Link></li>
            <li><Link className="hover:text-white" href="/legal/cancelaciones">Cancelaciones y reembolsos</Link></li>
          </ul>
          <p className="mt-4 text-xs text-white/50">Pagos procesados por Wompi. TravelCol no almacena datos de tarjetas.</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-tc flex flex-col items-center justify-between gap-3 py-5 text-xs text-white/55 sm:flex-row">
          <p>© {new Date().getFullYear()} TravelCol.online · Hecho en Colombia</p>
          <div className="tricolor h-1.5 w-24 rounded-full" aria-hidden />
        </div>
      </div>
    </footer>
  );
}
