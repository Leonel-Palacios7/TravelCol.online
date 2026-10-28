import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../common/auth.decorators';
import { StorageService } from './storage.service';
import { detectFileType } from './file-validation';

@ApiTags('Medios')
@Controller('media')
export class MediaController {
  constructor(private readonly storage: StorageService) {}

  /** Sirve únicamente archivos de la zona pública. Los documentos privados nunca pasan por aquí. */
  @Public()
  @Get('public/*path')
  async get(@Param('path') parts: string[] | string, @Res() res: Response) {
    const rel = Array.isArray(parts) ? parts.join('/') : parts;
    const data = await this.storage.get(`public/${rel}`);
    const type = detectFileType(data);
    res.setHeader('Content-Type', type?.mime ?? 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.send(data);
  }
}
