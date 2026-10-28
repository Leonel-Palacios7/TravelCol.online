import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { paginationSchema, updateProfileSchema } from '@travelcol/contracts';
import { AuthUser, CurrentUser } from '../../common/auth.decorators';
import { ApiZodBody, ZodPipe } from '../../common/zod';
import { AuthService } from '../auth/auth.service';
import { UsersService } from './users.service';

const uuid = new ParseUUIDPipe();

@ApiTags('Usuario')
@Controller('users/me')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  me(@CurrentUser() u: AuthUser) {
    return this.auth.me(u.id);
  }

  @Patch()
  @ApiZodBody(updateProfileSchema)
  update(@CurrentUser() u: AuthUser, @Body(new ZodPipe(updateProfileSchema)) body: z.output<typeof updateProfileSchema>) {
    return this.users.update(u.id, body);
  }

  @Get('favorites')
  favorites(@CurrentUser() u: AuthUser) {
    return this.users.favorites(u.id);
  }

  @Put('favorites/:serviceId')
  addFavorite(@CurrentUser() u: AuthUser, @Param('serviceId', uuid) serviceId: string) {
    return this.users.addFavorite(u.id, serviceId);
  }

  @Delete('favorites/:serviceId')
  removeFavorite(@CurrentUser() u: AuthUser, @Param('serviceId', uuid) serviceId: string) {
    return this.users.removeFavorite(u.id, serviceId);
  }

  @Get('notifications')
  notifications(@CurrentUser() u: AuthUser, @Query(new ZodPipe(paginationSchema)) q: z.output<typeof paginationSchema>) {
    return this.users.notifications(u.id, q.page, q.pageSize);
  }

  @Post('notifications/read-all')
  @HttpCode(200)
  readAll(@CurrentUser() u: AuthUser) {
    return this.users.readAll(u.id);
  }

  @Get('data-export')
  @ApiOperation({ summary: 'Derecho de acceso (Ley 1581): exporta los datos personales del titular' })
  export(@CurrentUser() u: AuthUser) {
    return this.users.exportData(u.id);
  }

  @Post('deletion-request')
  @ApiOperation({ summary: 'Solicitud de supresión de datos: crea un radicado para gestión controlada' })
  deletion(@CurrentUser() u: AuthUser) {
    return this.users.requestDeletion(u.id);
  }
}
