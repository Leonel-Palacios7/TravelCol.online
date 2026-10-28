import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="contenido" className="container-tc flex flex-col items-center py-24 text-center">
        <p className="script text-6xl text-tierra-500">¡Uy!</p>
        <h1 className="mt-2 text-3xl font-bold text-selva-900">No encontramos esta página</h1>
        <p className="mt-2 max-w-md text-pizarra">Puede que el enlace esté incompleto o que la experiencia ya no esté disponible.</p>
        <div className="mt-8 flex gap-3">
          <Link href="/" className="btn-ghost">Ir al inicio</Link>
          <Link href="/experiencias" className="btn-sol">Ver experiencias</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
