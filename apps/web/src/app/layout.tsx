import type { Metadata, Viewport } from 'next';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@fontsource/caveat/700.css';
import './globals.css';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'TravelCol.online · Experiencias auténticas en Colombia', template: '%s · TravelCol.online' },
  description:
    'Reserva experiencias turísticas auténticas en Colombia con pago seguro y proveedores verificados. Programa piloto en Villeta, Cundinamarca.',
  applicationName: 'TravelCol.online',
  openGraph: { type: 'website', locale: 'es_CO', siteName: 'TravelCol.online', images: ['/illustrations/heroe.svg'] },
  alternates: { canonical: '/' },
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = { themeColor: '#0b4a41', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
