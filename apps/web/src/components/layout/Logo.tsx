import Link from 'next/link';
import { cn } from '@/lib/cn';

/** Logotipo: sol andino sobre montañas + palabra TravelCol. */
export function Logo({ light = false, className }: { light?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn('group inline-flex items-center gap-2', className)} aria-label="TravelCol.online, ir al inicio">
      <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden="true">
        <circle cx="26" cy="13" r="7" fill="#f6b40e" />
        <path d="M2 34 L14 16 L21 25 L26 19 L38 34 Z" fill={light ? '#ffffff' : '#0b4a41'} />
        <path d="M2 34 L38 34" stroke="#c8102e" strokeWidth="2.5" />
        <path d="M2 31 L38 31" stroke="#1f4e9e" strokeWidth="2" opacity=".9" />
      </svg>
      <span className={cn('text-xl font-bold tracking-tight', light ? 'text-white' : 'text-selva-900')}>
        Travel<span className="text-sol-500">Col</span>
        <span className={cn('text-sm font-medium', light ? 'text-white/70' : 'text-pizarra')}>.online</span>
      </span>
    </Link>
  );
}
