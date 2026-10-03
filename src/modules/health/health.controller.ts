import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Health Check')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'بررسی زنده و واقعی سلامت سرور، دیتابیس و حافظه ذخیره‌سازی' })
  async check() {
    let dbStatus = 'ok';
    let redisStatus = 'ok';
    let storageStatus = 'ok';

    // 1. Check PostgreSQL Database
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (err: any) {
      dbStatus = `error: ${err.message}`;
    }

    // 2. Check Redis Service
    try {
      const redisClient = this.redisService.getClient();
      if (!redisClient || redisClient.status !== 'ready') {
        redisStatus = 'disconnected';
      } else {
        const pong = await redisClient.ping();
        if (pong !== 'PONG') {
          redisStatus = `unexpected response: ${pong}`;
        }
      }
    } catch (err: any) {
      redisStatus = `error: ${err.message}`;
    }

    // 3. Check Storage (Disk or MinIO)
    const storageDriver = this.configService.get<string>('STORAGE_DRIVER', 'disk').toLowerCase();
    if (storageDriver === 'minio') {
      try {
        const minioEndpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
        const minioPort = this.configService.get<number>('MINIO_PORT', 9000);
        const minioUrl = `http://${minioEndpoint}:${minioPort}/minio/health/live`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(minioUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) {
          storageStatus = `minio_http_${res.status}`;
        }
      } catch (err: any) {
        storageStatus = `minio_error: ${err.message}`;
      }
    } else {
      // Local disk check
      try {
        const configuredUploadDir = this.configService.get<string>('UPLOAD_DIR', 'uploads');
        const uploadDir = path.isAbsolute(configuredUploadDir)
          ? configuredUploadDir
          : path.resolve(process.cwd(), configuredUploadDir);

        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        storageStatus = 'disk_ok';
      } catch (err: any) {
        storageStatus = `disk_error: ${err.message}`;
      }
    }

    const isHealthy =
      dbStatus === 'ok' &&
      redisStatus === 'ok' &&
      (storageStatus === 'ok' || storageStatus === 'disk_ok');

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      version: '1.0.1',
      services: {
        database: dbStatus,
        redis: redisStatus,
        storage: storageStatus,
      },
      memory: {
        rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    };
  }
}
