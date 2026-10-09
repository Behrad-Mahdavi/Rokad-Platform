import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-tenant-id',
        'x-tenant-slug',
        'x-app-version',
        'X-App-Version',
        'Accept',
        'Range',
        'range',
        'Origin',
      ],
      exposedHeaders: [
        'Content-Range',
        'Accept-Ranges',
        'Content-Length',
        'Content-Type',
      ],
    },
  });

  // Security Headers Hardening (Defense in Depth)
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disabled for Swagger UI compatibility in development
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // Critical for media streaming across domains
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: {
        action: 'sameorigin',
      },
      noSniff: true,
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
    }),
  );

  app.use(cookieParser());

  // Prevent proxies, CDNs, and browsers from caching authenticated API responses
  app.use((req: any, res: any, next: any) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Vary', 'Authorization, Origin, x-tenant-id');
    next();
  });

  app.use(json({ limit: '150mb' }));
  // Support both /health and /api/v1/health transparently for external monitors and load balancers
  app.use((req: any, res: any, next: any) => {
    if (req.url === '/health' || req.url.startsWith('/health/')) {
      req.url = '/api/v1' + req.url;
    }
    next();
  });

  // Global Prefix (exclude root '/' for status/landing)
  app.setGlobalPrefix('api/v1', { exclude: ['/'] });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Redis-backed WebSocket Adapter for multi-instance horizontal scaling
  const configService = app.get(ConfigService);
  const redisIoAdapter = new RedisIoAdapter(app, configService);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('پلتفرم رکاد — سامانه چندمستأجری مدارس (Rokad Platform API)')
    .setDescription(
      `مستندات کامل APIهای فاز ۱: پایه و چندمستأجری (Foundation & Multi-Tenancy)\n\n` +
      `این پلتفرم از ساختار Multi-Tenant با احراز هویت JWT و توکن‌های رفرش چرخشی (Token Family Rotation) پشتیبانی می‌کند.\n\n` +
      `**هدرهای شناسایی مدرسه (اختیاری در صورت ساب‌دامین):**\n` +
      `- \`x-tenant-slug\`: اسلاگ مدرسه (مانند \`rokad-boys\` یا \`rokad-girls\`)\n` +
      `- \`x-tenant-id\`: شناسه UUID تننت`,
    )
    .setVersion('1.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'توکن دسترسی JWT دریافت شده از لاگین را وارد کنید',
        in: 'header',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
    },
    customSiteTitle: 'Rokad School API Docs',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 سرور پلتفرم رکاد با موفقیت راه‌اندازی شد: http://0.0.0.0:${port}/api/v1`);
  logger.log(`📚 مستندات Swagger API در دسترس است: http://0.0.0.0:${port}/api/docs`);
}

bootstrap();
