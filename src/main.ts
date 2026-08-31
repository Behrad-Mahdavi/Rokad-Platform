import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-tenant-id',
        'x-tenant-slug',
        'Accept',
      ],
    },
  });

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disabled for Swagger UI compatibility
    }),
  );

  app.use(cookieParser());

  // Global Prefix
  app.setGlobalPrefix('api/v1');

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
    .setTitle('پلتفرم رُکاد — سامانه چندمستأجری مدارس (Rokad Platform API)')
    .setDescription(
      `مستندات کامل APIهای فاز ۱: پایه و چندمستأجری (Foundation & Multi-Tenancy)\n\n` +
      `این پلتفرم از ساختار Multi-Tenant با احراز هویت JWT و توکن‌های رفرش چرخشی (Token Family Rotation) پشتیبانی می‌کند.\n\n` +
      `**هدرهای شناسایی مدرسه (اختیاری در صورت ساب‌دامین):**\n` +
      `- \`x-tenant-slug\`: اسلاگ مدرسه (مانند \`rokad-boys\` یا \`rokad-girls\`)\n` +
      `- \`x-tenant-id\`: شناسه UUID تننت`,
    )
    .setVersion('1.0.0')
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

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`🚀 سرور پلتفرم رُکاد با موفقیت راه‌اندازی شد: http://localhost:${port}/api/v1`);
  logger.log(`📚 مستندات Swagger API در دسترس است: http://localhost:${port}/api/docs`);
}

bootstrap();
