import { LABELS, type ProviderDocumentType } from '@travelcol/contracts';
import { apiGet } from '@/lib/api-server';
import { formatDate } from '@/lib/format';
import type { ProviderMe } from '@/lib/types';
import { PanelTitle, Section, TableCard } from '@/components/panel/PanelShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DocumentUpload } from '@/components/provider/DocumentUpload';

export default async function DocumentosPage() {
  const me = await apiGet<ProviderMe>('/providers/me');
  return (
    <>
      <PanelTitle title="Documentos de verificación">
        Sube el certificado de RNT vigente, RUT, Cámara de Comercio y pólizas. Estado del RNT: <strong>{me.rntVerified ? 'verificado' : 'pendiente de verificación'}</strong>.
      </PanelTitle>
      <DocumentUpload />
      <Section title="Documentos enviados">
        <TableCard>
          <thead><tr><th>Tipo</th><th>Archivo</th><th>Enviado</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {me.documents.map((d) => (
              <tr key={d.id}>
                <td>{LABELS.documentType[d.type as ProviderDocumentType] ?? d.type}</td>
                <td className="max-w-48 truncate">{d.originalName}</td>
                <td>{formatDate(d.createdAt)}</td>
                <td><StatusBadge status={d.status} />{d.reviewNotes && <p className="mt-1 text-xs text-pizarra">{d.reviewNotes}</p>}</td>
                <td><a className="text-sm text-tierra-600 hover:underline" href={`/api/v1/providers/me/documents/${d.id}/file`}>Descargar</a></td>
              </tr>
            ))}
            {!me.documents.length && <tr><td colSpan={5} className="text-pizarra">Aún no has subido documentos.</td></tr>}
          </tbody>
        </TableCard>
      </Section>
    </>
  );
}
