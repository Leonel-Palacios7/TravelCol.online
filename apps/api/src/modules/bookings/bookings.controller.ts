import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { cancelBookingSchema, createBookingSchema, reviewCreateSchema } from '@travelcol/contracts';
import { AuthUser, CurrentUser } from '../../common/auth.decorators';
import { ApiZodBody, ZodPipe } from '../../common/zod';
import { BookingsService } from './bookings.service';
import { ReviewsService } from '../reviews/reviews.service';

const uuid = new ParseUUIDPipe();

@ApiTags('Reservas')
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly reviews: ReviewsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crea una reserva pendiente de pago; precio calculado en el servidor' })
  @ApiZodBody(createBookingSchema)
  create(@CurrentUser() u: AuthUser, @Body(new ZodPipe(createBookingSchema)) body: z.output<typeof createBookingSchema>) {
    return this.bookings.create(u.id, body);
  }

  @Get('me')
  mine(@CurrentUser() u: AuthUser) {
    return this.bookings.listMine(u.id);
  }

  @Get(':id')
  get(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string) {
    return this.bookings.getForUser(u, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @ApiZodBody(cancelBookingSchema)
  cancel(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string, @Body(new ZodPipe(cancelBookingSchema)) body: { reason: string }) {
    return this.bookings.cancel(u, id, body.reason, 'TOURIST');
  }

  @Post(':id/review')
  @ApiZodBody(reviewCreateSchema)
  review(
    @CurrentUser() u: AuthUser,
    @Param('id', uuid) id: string,
    @Body(new ZodPipe(reviewCreateSchema)) body: z.output<typeof reviewCreateSchema>,
  ) {
    return this.reviews.create(u, id, body);
  }
}
