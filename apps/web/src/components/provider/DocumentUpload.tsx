'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import { LABELS, PROVIDER_DOCUMENT_TYPES } from '@travelcol/contracts';
import { api } from '@/lib/api-client';
import { FormAlert } from '@/components/forms/Field';

export function DocumentUpload() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  return (
    <form
      className="card grid gap-3 p-6 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        if (!(fd.get('file') instanceof File) || !(fd.get('file') as File).size) return setMsg({ kind: 'error', text: 'Selecciona un archivo PDF, JPG o PNG (máximo 10 MB).' });
        setBusy(true);
        setMsg(null);
        try {
          await api('/providers/me/documents', { method: 'POST', form: fd });
          form.reset();
          setMsg({ kind: 'success', text: 'Documento recibido. Quedó pendiente de verificación.' });
          router.refresh();
        } catch (err) {
          setMsg({ kind: 'error', text: (err as Error).message });
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <label htmlFor="doc-type" className="label">Tipo de documento</label>
        <select id="doc-type" name="type" className="input">
          {PROVIDER_DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{LABELS.documentType[t]}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="doc-file" className="label">Archivo (PDF, JPG o PNG · máx. 10 MB)</label>
        <input id="doc-file" name="file" type="file" accept="application/pdf,image/jpeg,image/png" className="input file:mr-3 file:rounded-full file:border-0 file:bg-selva-50 file:px-3 file:py-1 file:text-selva-800" />
      </div>
      <button type="submit" className="btn-primary" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FileUp className="h-4 w-4" aria-hidden />}Subir</button>
      {msg && <div className="sm:col-span-3"><FormAlert kind={msg.kind}>{msg.text}</FormAlert></div>}
      <p className="text-xs text-pizarra sm:col-span-3">Los documentos se guardan en almacenamiento privado; solo tú y el equipo de verificación pueden descargarlos. Rechazamos PDF con contenido activo (JavaScript, formularios ejecutables).</p>
    </form>
  );
}
