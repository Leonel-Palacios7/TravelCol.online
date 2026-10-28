import Link from 'next/link';
import type { ServiceCardDto } from '@travelcol/contracts';
import { apiGet } from '@/lib/api-server';
import { PanelTitle } from '@/components/panel/PanelShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { ServiceCard } from '@/components/catalog/ServiceCard';
import { FavoriteButton } from '@/components/booking/FavoriteButton';

export default async function FavoritosPage() {
  const favs = await apiGet<ServiceCardDto[]>('/users/me/favorites');
  return (
    <>
      <PanelTitle title="Favoritos">Las experiencias que guardaste para más tarde.</PanelTitle>
      {favs.length ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {favs.map((s) => (
            <div key={s.id} className="relative">
              <ServiceCard service={s} />
              <div className="absolute top-3 right-3 z-10"><FavoriteButton serviceId={s.id} initial loggedIn /></div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Aún no tienes favoritos" action={<Link href="/experiencias" className="btn-sol">Explorar experiencias</Link>}>
          Toca el corazón en una experiencia para guardarla aquí.
        </EmptyState>
      )}
    </>
  );
}
