import type { ReactNode } from 'react';
import { NavLink, type IconName } from './NavLink';

export interface PanelNavItem {
  href: string;
  label: string;
  icon: IconName;
  exact?: boolean;
}

/** Estructura común de los paneles: navegación lateral (horizontal en móvil) y contenido. */
export function PanelShell({ title, subtitle, nav, children }: { title: string; subtitle?: string; nav: PanelNavItem[]; children: ReactNode }) {
  return (
    <div className="container-tc grid gap-6 py-6 lg:grid-cols-[240px_1fr] lg:gap-10 lg:py-10">
      <aside className="min-w-0">
        <div className="mb-4 hidden lg:block">
          <p className="script text-2xl text-tierra-500">{subtitle}</p>
          <p className="text-lg font-bold text-selva-900">{title}</p>
        </div>
        <nav aria-label={title} className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
          {nav.map((n) => (
            <NavLink key={n.href} {...n} />
          ))}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function PanelTitle({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-selva-900 sm:text-3xl">{title}</h1>
        {children && <div className="mt-1 max-w-2xl text-sm text-pizarra">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, tone = 'selva' }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'selva' | 'sol' | 'tierra' | 'neutral' }) {
  const tones = {
    selva: 'border-l-selva-600',
    sol: 'border-l-sol-500',
    tierra: 'border-l-tierra-500',
    neutral: 'border-l-pizarra/40',
  };
  return (
    <div className={`card border-l-4 p-5 ${tones[tone]}`}>
      <p className="text-xs font-semibold tracking-wide text-pizarra uppercase">{label}</p>
      <p className="mt-1 text-2xl font-bold text-selva-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-pizarra">{hint}</p>}
    </div>
  );
}

export function TableCard({ children }: { children: ReactNode }) {
  return (
    <div className="card overflow-x-auto p-2 sm:p-4">
      <table className="table-tc">{children}</table>
    </div>
  );
}

export function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-selva-900">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}
