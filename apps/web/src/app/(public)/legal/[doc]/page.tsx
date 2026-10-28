import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { apiGetOrNull } from '@/lib/api-server';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { SimpleMarkdown } from '@/components/ui/SimpleMarkdown';

const DOCS = { terminos: 'TERMS', privacidad: 'PRIVACY', cancelaciones: 'CANCELLATION', proveedores: 'PROVIDER_TERMS' } as const;
interface LegalDoc { title: string; version: string; content: string; publishedAt: string }
type Params = { params: Promise<{ doc: string }> };

export function generateStaticParams() {
  return Object.keys(DOCS).map((doc) => ({ doc }));
}

const load = (doc: string) => {
  const type = DOCS[doc as keyof typeof DOCS];
  return type ? apiGetOrNull<LegalDoc>(`/legal/current?type=${type}`, { auth: false, revalidate: 600 }) : null;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const d = await load((await params).doc);
  return { title: d?.title ?? 'Documento legal' };
}

export default async function LegalPage({ params }: Params) {
  const d = await load((await params).doc);
  if (!d) notFound();
  return (
    <>
      <PageHeader eyebrow="Legal" title={d.title}>Versión {d.version} · vigente desde {formatDate(d.publishedAt)}</PageHeader>
      <article className="container-tc max-w-3xl py-10"><SimpleMarkdown source={d.content} /></article>
    </>
  );
}
