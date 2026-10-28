import type { MetadataRoute } from 'next';
import { apiGet } from '@/lib/api-server';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
export const revalidate = 3600;

interface Entries { services: Array<{ slug: string; updatedAt: string }>; destinations: string[]; providers: Array<{ slug: string }> }

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixed = ['', '/experiencias', '/como-funciona', '/preguntas-frecuentes', '/proveedores', '/contacto', '/legal/terminos', '/legal/privacidad', '/legal/cancelaciones', '/legal/proveedores'];
  let e: Entries = { services: [], destinations: [], providers: [] };
  try {
    e = await apiGet<Entries>('/sitemap-entries', { auth: false, revalidate: 3600 });
  } catch {
    // Si la API no responde se publica solo el mapa estático.
  }
  return [
    ...fixed.map((p) => ({ url: `${SITE}${p}` })),
    ...e.destinations.map((slug) => ({ url: `${SITE}/destinos/${slug}` })),
    ...e.services.map((s) => ({ url: `${SITE}/experiencias/${s.slug}`, lastModified: s.updatedAt })),
    ...e.providers.map((p) => ({ url: `${SITE}/operadores/${p.slug}` })),
  ];
}
