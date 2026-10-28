import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { env } from './config/env';
import { CommonModule } from './common/common.module';
import { CsrfGuard, RolesGuard, SessionGuard } from './common/guards';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { AuthModule } from './modules/auth/auth.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StorageModule } from './modules/storage/storage.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { UsersModule } from './modules/users/users.module';
import { AdminModule } from './modules/admin/admin.module';
import { SupportModule } from './modules/support/support.module';
import { HealthModule } from './modules/health/health.module';
import { JobsModule } from './modules/jobs/jobs.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: env().LOG_LEVEL,
        genReqId: (req: IncomingMessage) => {
          const header = req.headers['x-request-id'];
          return typeof header === 'string' && /^[\w-]{8,64}$/.test(header) ? header : randomUUID();
        },
        // Nunca registrar cookies, credenciales ni firmas.
        redact: {
          paths: ['req.headers.cookie', 'req.headers.authorization', 'req.headers["x-csrf-token"]', 'req.headers["x-event-checksum"]', 'res.headers["set-cookie"]'],
          censor: '[REDACTADO]',
        },
        autoLogging: { ignore: (req) => (req.url ?? '').startsWith('/api/v1/health') },
        transport: env().NODE_ENV === 'development' ? { target: 'pino-pretty', options: { singleLine: true } } : undefined,
      },
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: env().THROTTLE_TTL_MS, limit: env().THROTTLE_LIMIT }]),
    CommonModule,
    NotificationsModule,
    StorageModule,
    AuthModule,
    FinanceModule,
    ReviewsModule,
    BookingsModule,
    // ProvidersModule antes que CatalogModule: /providers/me debe registrarse antes de /providers/:slug.
    ProvidersModule,
    CatalogModule,
    PaymentsModule,
    UsersModule,
    AdminModule,
    SupportModule,
    HealthModule,
    JobsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
