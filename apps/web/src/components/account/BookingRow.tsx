import Link from 'next/link';
import type { BookingDto } from '@travelcol/contracts';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCOP, formatDateTime, formatDay, formatMonthShort } from '@/lib/format';

export function BookingRow({ b }: { b: BookingDto }) {
  return (
    <Link href={`/cuenta/reservas/${b.id}`} className="card flex flex-wrap items-center gap-4 p-4 transition-shadow hover:shadow-suave sm:p-5">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-selva-50 text-center leading-tight text-selva-800">
        <span className="text-lg font-bold">{formatDay(b.startsAt)}</span>
        <span className="text-[10px] font-semibold uppercase">{formatMonthShort(b.startsAt)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-selva-900">{b.service.title}</p>
        <p className="text-sm text-pizarra">{formatDateTime(b.startsAt)} · {b.participants} {b.participants === 1 ? 'persona' : 'personas'} · <span className="font-mono">{b.code}</span></p>
      </div>
      <div className="text-right">
        <StatusBadge status={b.status} />
        <p className="mt-1 text-sm font-semibold">{formatCOP(b.price.totalCop)}</p>
      </div>
    </Link>
  );
}
