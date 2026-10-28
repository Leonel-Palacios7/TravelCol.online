import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { paginationSchema, serviceSearchSchema } from '@travelcol/contracts';
import { Public } from '../../common/auth.decorators';
import { ApiZodQuery, ZodPipe } from '../../common/zod';
import { CatalogService } from './catalog.service';

const availabilityQuery = z.object({ from: z.iso.date().optional(), days: z.coerce.number().int().min(1).max(120).default(60) }).strict();

@ApiTags('Catálogo')
@Public()
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('destinations')
  destinations() {
    return this.catalog.destinations();
  }

  @Get('destinations/:slug')
  destination(@Param('slug') slug: string) {
    return this.catalog.destination(slug);
  }

  @Get('categories')
  categories() {
    return this.catalog.categories();
  }

  @Get('services')
  @ApiOperation({ summary: 'Búsqueda paginada de experiencias publicadas' })
  @ApiZodQuery(serviceSearchSchema)
  search(@Query(new ZodPipe(serviceSearchSchema)) q: z.output<typeof serviceSearchSchema>) {
    return this.catalog.search(q);
  }

  @Get('services/featured')
  featured() {
    return this.catalog.featured();
  }

  @Get('services/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.catalog.bySlug(slug);
  }

  @Get('services/:id/availability')
  @ApiOperation({ summary: 'Cupos abiertos con disponibilidad (desde hoy, hora de Colombia)' })
  availability(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query(new ZodPipe(availabilityQuery)) q: z.output<typeof availabilityQuery>,
  ) {
    return this.catalog.availability(id, q.from, q.days);
  }

  @Get('services/:id/reviews')
  reviews(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query(new ZodPipe(paginationSchema)) q: z.output<typeof paginationSchema>,
  ) {
    return this.catalog.reviews(id, q.page, q.pageSize);
  }

  @Get('providers/:slug')
  provider(@Param('slug') slug: string) {
    return this.catalog.providerPublic(slug);
  }

  @Get('sitemap-entries')
  sitemap() {
    return this.catalog.sitemapEntries();
  }
}
