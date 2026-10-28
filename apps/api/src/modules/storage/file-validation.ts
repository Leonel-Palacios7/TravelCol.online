import { BadRequestException } from '@nestjs/common';

export type AllowedKind = 'image' | 'document';

interface Detected {
  mime: string;
  ext: string;
}

/**
 * Detecta el tipo REAL del archivo por su firma (magic bytes), ignorando el nombre y el
 * Content-Type enviados por el cliente.
 */
export function detectFileType(buf: Buffer): Detected | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') {
    return { mime: 'image/webp', ext: 'webp' };
  }
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return { mime: 'application/pdf', ext: 'pdf' };
  return null;
}

const LIMITS: Record<AllowedKind, { maxBytes: number; mimes: string[] }> = {
  image: { maxBytes: 5 * 1024 * 1024, mimes: ['image/jpeg', 'image/png', 'image/webp'] },
  document: { maxBytes: 10 * 1024 * 1024, mimes: ['application/pdf', 'image/jpeg', 'image/png'] },
};

export function validateUpload(file: Express.Multer.File | undefined, kind: AllowedKind): Detected {
  if (!file || !file.buffer?.length) throw new BadRequestException('Adjunta un archivo');
  const limit = LIMITS[kind];
  if (file.size > limit.maxBytes) {
    throw new BadRequestException(`El archivo supera el máximo de ${limit.maxBytes / 1024 / 1024} MB`);
  }
  const detected = detectFileType(file.buffer);
  if (!detected || !limit.mimes.includes(detected.mime)) {
    throw new BadRequestException(
      kind === 'image' ? 'Solo se permiten imágenes JPG, PNG o WebP' : 'Solo se permiten documentos PDF, JPG o PNG',
    );
  }
  if (detected.mime === 'application/pdf') {
    // Rechaza PDF con JavaScript o acciones automáticas (vector común de contenido malicioso).
    const text = file.buffer.toString('latin1');
    if (/\/JavaScript|\/JS\s|\/OpenAction|\/Launch|\/EmbeddedFile/.test(text)) {
      throw new BadRequestException('El PDF contiene elementos activos no permitidos');
    }
  }
  return detected;
}
