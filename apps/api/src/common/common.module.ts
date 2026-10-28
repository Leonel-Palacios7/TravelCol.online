import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuditService } from './audit.service';
import { SettingsService } from './settings.service';

@Global()
@Module({ providers: [PrismaService, AuditService, SettingsService], exports: [PrismaService, AuditService, SettingsService] })
export class CommonModule {}
