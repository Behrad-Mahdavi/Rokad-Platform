import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD', '');

    try {
      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        retryStrategy: (times) => {
          if (times > 5) {
            this.logger.warn('Redis reconnection limit reached');
            return null;
          }
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      });

      await this.client.connect();
      this.logger.log(`Connected to Redis on ${host}:${port}`);
    } catch (err: any) {
      this.logger.warn(`Redis connection failed: ${err?.message}. Operating in fallback mode.`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    try {
      if (!this.client || this.client.status !== 'ready') return null;
      return await this.client.get(key);
    } catch (err) {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (!this.client || this.client.status !== 'ready') return;
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (err) {
      // Non-blocking catch
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (!this.client || this.client.status !== 'ready') return;
      await this.client.del(key);
    } catch (err) {
      // Non-blocking catch
    }
  }
}
