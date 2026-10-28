import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { env, isProduction } from './config/env';
import { AppModule } from './app.module';

export function buildOpenApi(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('TravelCol.online API')
    .setDescription('API REST v1 del marketplace turístico TravelCol.online. Autenticación por cookie de sesión HttpOnly (tc_session) y encabezado X-CSRF-Token en operaciones que modifican estado.')
    .setVersion('1.0.0')
    .addCookieAuth('tc_session')
    .build();
  return SwaggerModule.createDocument(app, config);
}

/** Configuración común a producción y pruebas: prefijo, seguridad de cabeceras, CORS y cookies. */
export function configureApp(app: NestExpressApplication) {
  const e = env();
  app.setGlobalPrefix('api/v1');
  app.disable('x-powered-by');
  if (e.TRUST_PROXY) app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'same-site' },
      hsts: isProduction() ? { maxAge: 31_536_000, includeSubDomains: true } : false,
    }),
  );
  app.use(cookieParser());
  app.useBodyParser('json', { limit: '200kb' });
  app.enableCors({
    origin: e.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Request-Id'],
  });
  app.enableShutdownHooks();
  const swagger = e.SWAGGER_ENABLED ?? !isProduction();
  if (swagger) {
    SwaggerModule.setup('api/docs', app, buildOpenApi(app), { jsonDocumentUrl: 'api/docs-json' });
  }
  return app;
}

export async function createApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true, bodyParser: false });
  app.useLogger(app.get(Logger));
  return configureApp(app);
}
