import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { ProviderServicesController } from './provider-services.controller';
import { ProviderServicesService } from './provider-services.service';
import { ProviderAccessService } from '../providers/provider-access.service';

@Module({
  controllers: [ProviderServicesController, CatalogController],
  providers: [CatalogService, ProviderServicesService, ProviderAccessService],
  exports: [CatalogService],
})
export class CatalogModule {}
