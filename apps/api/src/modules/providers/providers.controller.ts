import {
  Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Res, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { z } from 'zod';
import {
  cancelBookingSchema, paginationSchema, providerApplicationSchema, providerDocumentTypeSchema, updateProviderSchema,
} from '@travelcol/contracts';
import { AuthUser, CurrentUser, Roles } from '../../common/auth.decorators';
import { ApiZodBody, ZodPipe } from '../../common/zod';
import { BookingsService } from '../bookings/bookings.service';
import { ProvidersService } from './providers.service';

const uuid = new ParseUUIDPipe();
const scopeQuery = z.object({ scope: z.enum(['upcoming', 'past', 'all']).default('upcoming') }).strict();

@ApiTags('Proveedores')
@Controller()
export class ProvidersController {
  constructor(
    private readonly providers: ProvidersService,
    private readonly bookings: BookingsService,
  ) {}

  @Post('provider-applications')
  @ApiOperation({ summary: 'Solicitud para ser proveedor (queda en revisión; no otorga permisos)' })
  @ApiZodBody(providerApplicationSchema)
  apply(@CurrentUser() u: AuthUser, @Body(new ZodPipe(providerApplicationSchema)) body: z.output<typeof providerApplicationSchema>) {
    return this.providers.apply(u, body);
  }

  @Get('provider-applications/me')
  myApplications(@CurrentUser() u: AuthUser) {
    return this.providers.myApplications(u.id);
  }

  @Roles('PROVIDER')
  @Get('providers/me')
  me(@CurrentUser() u: AuthUser) {
    return this.providers.me(u.id);
  }

  @Roles('PROVIDER')
  @Patch('providers/me')
  @ApiZodBody(updateProviderSchema)
  update(@CurrentUser() u: AuthUser, @Body(new ZodPipe(updateProviderSchema)) body: z.output<typeof updateProviderSchema>) {
    return this.providers.update(u.id, body);
  }

  @Roles('PROVIDER')
  @Get('providers/me/dashboard')
  dashboard(@CurrentUser() u: AuthUser) {
    return this.providers.dashboard(u.id);
  }

  @Roles('PROVIDER')
  @Get('providers/me/bookings')
  myBookings(@CurrentUser() u: AuthUser, @Query(new ZodPipe(scopeQuery)) q: z.output<typeof scopeQuery>) {
    return this.providers.bookings(u.id, q.scope);
  }

  @Roles('PROVIDER')
  @Post('providers/me/bookings/:id/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancelación por el proveedor (reembolso del 100 % al turista)' })
  @ApiZodBody(cancelBookingSchema)
  cancelBooking(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string, @Body(new ZodPipe(cancelBookingSchema)) body: { reason: string }) {
    return this.bookings.cancel(u, id, body.reason, 'PROVIDER');
  }

  @Roles('PROVIDER')
  @Get('providers/me/settlements')
  finance(@CurrentUser() u: AuthUser) {
    return this.providers.financeSummary(u.id);
  }

  @Roles('PROVIDER')
  @Get('providers/me/ledger')
  ledger(@CurrentUser() u: AuthUser, @Query(new ZodPipe(paginationSchema)) q: z.output<typeof paginationSchema>) {
    return this.providers.ledger(u.id, q.page, q.pageSize);
  }

  @Roles('PROVIDER')
  @Post('providers/me/documents')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  upload(
    @CurrentUser() u: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('type', new ZodPipe(providerDocumentTypeSchema)) type: z.output<typeof providerDocumentTypeSchema>,
  ) {
    return this.providers.uploadDocument(u.id, type, file);
  }

  @Roles('PROVIDER')
  @Get('providers/me/documents/:id/file')
  async file(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string, @Res() res: Response) {
    const { doc, data } = await this.providers.documentFile(u.id, id);
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', 'attachment');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(data);
  }
}
