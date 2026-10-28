import { Bird, Mountain, Trees, Utensils, Waves, Compass } from 'lucide-react';

const ICONS = { mountain: Mountain, waves: Waves, utensils: Utensils, trees: Trees, bird: Bird } as const;

export function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICONS[icon as keyof typeof ICONS] ?? Compass;
  return <Icon className={className} aria-hidden />;
}

export const CATEGORY_ART: Record<string, string> = {
  'caminatas-y-tours': '/illustrations/cascada.svg',
  aventura: '/illustrations/aventura.svg',
  'cultura-y-gastronomia': '/illustrations/trapiche.svg',
  'fincas-y-turismo-rural': '/illustrations/finca.svg',
  'naturaleza-y-aves': '/illustrations/aves.svg',
};
