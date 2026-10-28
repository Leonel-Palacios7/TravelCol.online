'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { FormAlert } from '@/components/forms/Field';

export function MediaManager({ serviceId, media, editable }: { serviceId: string; media: Array<{ id: string; url: string; alt: string }>; editable: boolean }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return setError('Selecciona una imagen JPG, PNG o WebP (máximo 5 MB).');
    if (alt.trim().length < 5) return setError('Describe la imagen en al menos 5 caracteres (texto alternativo para accesibilidad).');
    setError(null);
    setBusy(true);
    const form = new FormData();
    form.append('file', file);
    form.append('alt', alt.trim());
    try {
      await api(`/provider/services/${serviceId}/media`, { method: 'POST', form });
      setAlt('');
      if (fileRef.current) fileRef.current.value = '';
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {media.map((m) => (
          <figure key={m.id} className="group relative overflow-hidden rounded-xl bg-arena">
            <img src={m.url} alt={m.alt} className="aspect-[4/3] w-full object-cover" />
            {editable && (
              <button
                type="button"
                aria-label={`Eliminar imagen ${m.alt}`}
                className="absolute top-2 right-2 rounded-full bg-white/90 p-1.5 text-bandera-rojo shadow"
                onClick={async () => {
                  if (!confirm('¿Eliminar esta imagen?')) return;
                  try {
                    await api(`/provider/services/${serviceId}/media/${m.id}`, { method: 'DELETE' });
                    router.refresh();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            )}
            <figcaption className="truncate px-2 py-1 text-xs text-pizarra">{m.alt}</figcaption>
          </figure>
        ))}
        {!media.length && <p className="col-span-full text-sm text-pizarra">Aún no hay imágenes. Necesitas al menos una para enviar a revisión.</p>}
      </div>
      {editable && (
        <div className="mt-5 grid gap-3 border-t border-selva-900/10 pt-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="media-file" className="label">Imagen (JPG, PNG o WebP · máx. 5 MB)</label>
            <input id="media-file" ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="input file:mr-3 file:rounded-full file:border-0 file:bg-selva-50 file:px-3 file:py-1 file:text-selva-800" />
          </div>
          <div>
            <label htmlFor="media-alt" className="label">Descripción de la imagen</label>
            <input id="media-alt" className="input" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Ej.: Cascada del Salto de los Micos" />
          </div>
          <button type="button" className="btn-primary" onClick={upload} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ImagePlus className="h-4 w-4" aria-hidden />}Subir
          </button>
          {error && <div className="sm:col-span-3"><FormAlert>{error}</FormAlert></div>}
          <p className="text-xs text-pizarra sm:col-span-3">Sube solo fotografías propias o con licencia. Validamos el tipo real del archivo. Antes de subir, quita la ubicación GPS de tus fotos si no quieres compartirla.</p>
        </div>
      )}
    </div>
  );
}
