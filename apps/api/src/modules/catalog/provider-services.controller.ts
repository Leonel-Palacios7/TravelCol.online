import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { availabilityCreateSchema, availabilityUpdateSchema, serviceUpsertSchema } from '@travelcol/contracts';
import { AuthUser, CurrentUser, Roles } from '../../common/auth.decorators';
import { ApiZodBody, ZodPipe } from '../../common/zod';
import { ProviderServicesService } from './provider-services.service';

const uuid = new ParseUUIDPipe();
const uploadLimits = { limits: { fileSize: 5 * 1024 * 1024, files: 1 } };

@ApiTags('Proveedor · Catálogo')
@Roles('PROVIDER')
@Controller('provider')
export class ProviderServicesController {
  constructor(private readonly services: ProviderServicesService) {}

  @Get('services')
  list(@CurrentUser() u: AuthUser) {
    return this.services.list(u.id);
  }

  @Get('services/:id')
  get(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string) {
    return this.services.get(u.id, id);
  }

  @Post('services')
  @ApiZodBody(serviceUpsertSchema)
  create(@CurrentUser() u: AuthUser, @Body(new ZodPipe(serviceUpsertSchema)) body: z.output<typeof serviceUpsertSchema>) {
    return this.services.create(u.id, body);
  }

  @Patch('services/:id')
  @ApiZodBody(serviceUpsertSchema)
  update(
    @CurrentUser() u: AuthUser,
    @Param('id', uuid) id: string,
    @Body(new ZodPipe(serviceUpsertSchema)) body: z.output<typeof serviceUpsertSchema>,
  ) {
    return this.services.update(u.id, id, body);
  }

  @Post('services/:id/submit-for-review')
  @HttpCode(200)
  submit(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string) {
    return this.services.submitForReview(u.id, id);
  }

  @Post('services/:id/archive')
  @HttpCode(200)
  archive(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string) {
    return this.services.archive(u.id, id);
  }

  @Post('services/:id/media')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', uploadLimits))
  addMedia(
    @CurrentUser() u: AuthUser,
    @Param('id', uuid) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('alt') alt?: string,
  ) {
    return this.services.addMedia(u.id, id, file, typeof alt === 'string' ? alt : undefined);
  }

  @Delete('services/:id/media/:mediaId')
  removeMedia(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string, @Param('mediaId', uuid) mediaId: string) {
    return this.services.removeMedia(u.id, id, mediaId);
  }

  @Get('services/:id/availability')
  availability(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string) {
    return this.services.listAvailability(u.id, id);
  }

  @Post('services/:id/availability')
  @ApiZodBody(availabilityCreateSchema)
  createAvailability(
    @CurrentUser() u: AuthUser,
    @Param('id', uuid) id: string,
    @Body(new ZodPipe(availabilityCreateSchema)) body: z.output<typeof availabilityCreateSchema>,
  ) {
    return this.services.createAvailability(u.id, id, body);
  }

  @Patch('availability/:slotId')
  @ApiZodBody(availabilityUpdateSchema)
  updateAvailability(
    @CurrentUser() u: AuthUser,
    @Param('slotId', uuid) slotId: string,
    @Body(new ZodPipe(availabilityUpdateSchema)) body: z.output<typeof availabilityUpdateSchema>,
  ) {
    return this.services.updateAvailability(u.id, slotId, body);
  }
}
