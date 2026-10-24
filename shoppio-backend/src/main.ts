import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const appConfig = app.get(AppConfigService);

  // Product sync batches can exceed Express's default 100kb JSON limit.
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { limit: '10mb', extended: true });

  app.enableCors({
    origin: appConfig.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new ResponseTransformInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Shoppio API')
    .setDescription(
      [
        'Shoppio multi-tenant SaaS API for WordPress/WooCommerce plugins and the merchant dashboard.',
        '',
        '**Public** — health, register, login, forgot-password, plugin connect.',
        '**Dashboard** — merchant user JWT (`typ: user`) from register/login.',
        '**Plugin** — site credentials / site JWT (`typ: site`).',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Site-scoped JWT from POST /api/v1/auth/token',
      },
      'site-jwt',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Dashboard user JWT from POST /api/v1/auth/login or /register',
      },
      'user-jwt',
    )
    .addTag('health', 'Public health checks')
    .addTag('auth', 'Plugin connection and credential exchange')
    .addTag('dashboard-auth', 'Merchant dashboard login / registration')
    .addTag('sites', 'Authenticated site endpoints (plugin)')
    .addTag('products', 'Product stubs (plugin) — sync not implemented')
    .addTag('conversations', 'Conversation stubs (plugin)')
    .addTag('usage', 'Usage metering')
    .addTag('billing', 'Plans, subscription, and entitlements')
    .addTag('chat', 'Visitor AI chat (plugin)')
    .addTag('admin', 'Future dashboard endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
}

void bootstrap();
