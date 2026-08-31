import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
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
  @ApiOperation({ summary: 'بررسی زنده و واقعی سلامت سرور، PostgreSQL، Redis و MinIO' })
  async check() {
    let dbStatus = 'ok';
    let redisStatus = 'ok';
    let minioStatus = 'ok';

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

    // 3. Check MinIO Object Storage
    try {
      const minioEndpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
      const minioPort = this.configService.get<number>('MINIO_PORT', 9000);
      const minioUrl = `http://${minioEndpoint}:${minioPort}/minio/health/live`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(minioUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        minioStatus = `http_${res.status}`;
      }
    } catch (err: any) {
      minioStatus = `error: ${err.message}`;
    }

    const isHealthy =
      dbStatus === 'ok' && redisStatus === 'ok' && minioStatus === 'ok';

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      version: '1.0.0',
      services: {
        database: dbStatus,
        redis: redisStatus,
        storageMinio: minioStatus,
      },
      memory: {
        rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    };
  }
}
