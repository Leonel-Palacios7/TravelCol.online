'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BadgeCheck, Banknote, BarChart3, Bell, BookOpen, CalendarCheck, ClipboardList, CreditCard, FileText, Heart,
  LayoutDashboard, MessageSquare, Receipt, RotateCcw, ScrollText, Settings, Star, Store, User, Users, Webhook,
} from 'lucide-react';
import { cn } from '@/lib/cn';

const ICONS = {
  dashboard: LayoutDashboard, bookings: CalendarCheck, heart: Heart, bell: Bell, user: User, store: Store,
  services: BookOpen, money: Banknote, docs: FileText, applications: ClipboardList, verified: BadgeCheck,
  payments: CreditCard, webhook: Webhook, refund: RotateCcw, receipt: Receipt, users: Users, settings: Settings,
  audit: ScrollText, star: Star, pqr: MessageSquare, chart: BarChart3,
} as const;
export type IconName = keyof typeof ICONS;

export function NavLink({ href, label, icon, exact }: { href: string; label: string; icon: IconName; exact?: boolean }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(`${href}/`);
  const Icon = ICONS[icon];
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex shrink-0 items-center gap-2.5 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors',
        active ? 'bg-selva-800 text-white' : 'text-selva-900 hover:bg-selva-50',
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </Link>
  );
}
