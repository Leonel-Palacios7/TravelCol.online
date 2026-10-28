import type { ReactNode } from 'react';

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl2 border border-dashed border-selva-900/20 bg-white/60 px-6 py-12 text-center">
      <svg viewBox="0 0 120 70" className="mb-4 h-16 w-28" aria-hidden>
        <circle cx="86" cy="20" r="11" fill="#ffd866" />
        <path d="M0 70 L35 25 L55 45 L72 30 L120 70Z" fill="#9fd3c6" />
        <path d="M0 70 L50 40 L80 70Z" fill="#127065" />
      </svg>
      <h3 className="text-lg font-semibold text-selva-900">{title}</h3>
      {children && <div className="mt-1 max-w-md text-sm text-pizarra">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
