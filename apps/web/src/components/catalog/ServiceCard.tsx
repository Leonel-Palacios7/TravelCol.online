import Link from 'next/link';
import { Clock, MapPin, ShieldCheck, Star } from 'lucide-react';
import { LABELS, type ServiceCardDto } from '@travelcol/contracts';
import { formatCOP, formatDuration } from '@/lib/format';
import { DemoBadge } from '../ui/DemoBadge';

export function ServiceCard({ service }: { service: ServiceCardDto }) {
  return (
    <article className="group card relative flex flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1">
      <div className="relative aspect-[4/3] overflow-hidden bg-selva-50">
        {service.cover ? (
           
          <img src={service.cover.url} alt={service.cover.alt} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : null}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-semibold text-selva-900">{service.category.name}</span>
          {service.isDemo && <DemoBadge />}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="flex items-center gap-1 text-xs font-medium text-pizarra">
          <MapPin className="h-3.5 w-3.5 text-tierra-500" aria-hidden />
          {service.destination.name}, {service.destination.department}
        </p>
        <h3 className="mt-1.5 text-lg leading-snug font-semibold text-selva-900">
          <Link href={`/experiencias/${service.slug}`} className="after:absolute after:inset-0 focus:outline-none">
            {service.title}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-pizarra">{service.summary}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-pizarra">
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden />{formatDuration(service.durationMinutes)}</span>
          <span>Cancelación {LABELS.cancellationPolicy[service.cancellationPolicy].toLowerCase()}</span>
          {service.provider.rntVerified && (
            <span className="inline-flex items-center gap-1 text-selva-700"><ShieldCheck className="h-3.5 w-3.5" aria-hidden />RNT verificado</span>
          )}
        </div>
        <div className="mt-auto flex items-end justify-between pt-4">
          <p>
            <span className="text-xs text-pizarra">Desde</span>
            <span className="block text-xl font-bold text-selva-900">{formatCOP(service.priceCop)}</span>
            <span className="text-xs text-pizarra">por persona</span>
          </p>
          {service.reviewCount > 0 && service.ratingAverage !== null ? (
            <p className="inline-flex items-center gap-1 rounded-full bg-sol-100 px-2.5 py-1 text-xs font-semibold text-selva-900">
              <Star className="h-3.5 w-3.5 fill-sol-500 text-sol-500" aria-hidden />
              {service.ratingAverage.toFixed(1)} <span className="font-normal text-pizarra">({service.reviewCount})</span>
            </p>
          ) : (
            <p className="text-xs text-pizarra">Sin reseñas aún</p>
          )}
        </div>
      </div>
    </article>
  );
}
