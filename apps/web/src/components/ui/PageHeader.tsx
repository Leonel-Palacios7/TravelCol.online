import type { ReactNode } from 'react';
import { TornEdge } from './TornEdge';

/** Encabezado de página con banda selva y borde rasgado. */
export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-selva-800 pt-10 pb-14 text-white">
      <svg aria-hidden viewBox="0 0 400 200" className="absolute -right-10 bottom-0 h-48 w-96 opacity-25">
        <path d="M0 200 L90 80 L150 140 L220 50 L300 130 L340 100 L400 200Z" fill="#ffd866" />
      </svg>
      <div className="container-tc relative">
        {eyebrow && <p className="script text-3xl text-sol-400">{eyebrow}</p>}
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{title}</h1>
        {children && <div className="mt-3 max-w-2xl text-white/80">{children}</div>}
      </div>
      <TornEdge position="bottom" color="#fbf7f0" />
    </section>
  );
}
