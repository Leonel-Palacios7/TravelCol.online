import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { env } from '../../config/env';

/**
 * Almacenamiento de archivos. Driver actual: disco local (STORAGE_DIR), separado en
 * "public/" (fotos de servicios publicadas vía /api/v1/media) y "private/" (documentos
 * de proveedores, solo vía endpoints autorizados). En producción debe reemplazarse por un
 * almacenamiento de objetos (S3, GCS, R2) implementando la misma interfaz — ver ADR-0006.
 */
@Injectable()
export class StorageService {
  private root() {
    return path.resolve(env().STORAGE_DIR);
  }

  private resolveKey(key: string) {
    if (!/^(public|private)\/[a-z0-9/_-]+\.[a-z0-9]{2,5}$/i.test(key) || key.includes('..')) {
      throw new NotFoundException('Archivo no encontrado');
    }
    const full = path.resolve(this.root(), key);
    if (!full.startsWith(this.root() + path.sep)) throw new NotFoundException('Archivo no encontrado');
    return full;
  }

  async put(key: string, data: Buffer) {
    const full = this.resolveKey(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data, { mode: 0o640 });
    return { key, sha256: createHash('sha256').update(data).digest('hex') };
  }

  async get(key: string): Promise<Buffer> {
    try {
      return await fs.readFile(this.resolveKey(key));
    } catch {
      throw new NotFoundException('Archivo no encontrado');
    }
  }

  async delete(key: string) {
    await fs.rm(this.resolveKey(key), { force: true });
  }
}
