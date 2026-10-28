import { Module } from '@nestjs/common';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { ProviderAccessService } from './provider-access.service';

@Module({ controllers: [ProvidersController], providers: [ProvidersService, ProviderAccessService] })
export class ProvidersModule {}
