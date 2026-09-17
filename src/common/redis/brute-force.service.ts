import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RedisService } from './redis.service';
import { normalizePersianDigits } from '../utils/jalali.util';

@Injectable()
export class BruteForceService {
  private readonly logger = new Logger(BruteForceService.name);

  // In-memory fallback if Redis is offline
  private readonly memoryLocks = new Map<string, number>();
  private readonly memoryAttempts = new Map<string, { count: number; expiresAt: number }>();

  constructor(private readonly redisService: RedisService) {}

  /**
   * Check if login is permitted or currently locked due to previous failed attempts
   */
  async checkLoginAllowed(identifier: string, ipAddress?: string): Promise<void> {
    const cleanId = normalizePersianDigits(identifier.trim().toLowerCase());
    const ip = ipAddress || 'unknown';

    const userLockKey = `brute:lock:user:${cleanId}`;
    const ipLockKey = `brute:lock:ip:${ip}`;

    const [userTtl, ipTtl] = await Promise.all([
      this.redisService.ttl(userLockKey),
      this.redisService.ttl(ipLockKey),
    ]);

    let maxTtl = Math.max(userTtl, ipTtl);

    // Fallback check in memory
    if (maxTtl <= 0) {
      const now = Date.now();
      const memUserLock = this.memoryLocks.get(cleanId);
      const memIpLock = this.memoryLocks.get(ip);
      const memLock = Math.max(memUserLock || 0, memIpLock || 0);

      if (memLock > now) {
        maxTtl = Math.ceil((memLock - now) / 1000);
      }
    }

    if (maxTtl > 0) {
      const minutes = Math.ceil(maxTtl / 60);
      this.logger.warn(`Blocked login attempt for ${cleanId} from ${ip}. Locked for ${maxTtl}s.`);
      throw new HttpException(
        {
          success: false,
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `به دلیل ورودهای ناموفق مکرر، ورود موقتاً مسدود شده است. لطفاً ${minutes} دقیقه دیگر تلاش فرمایید.`,
          remainingSeconds: maxTtl,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Record a failed login attempt and apply lockouts dynamically
   */
  async recordFailedAttempt(identifier: string, ipAddress?: string): Promise<number> {
    const cleanId = normalizePersianDigits(identifier.trim().toLowerCase());
    const ip = ipAddress || 'unknown';

    const userAttemptKey = `brute:attempt:user:${cleanId}`;
    const ipAttemptKey = `brute:attempt:ip:${ip}`;

    // 10-minute tracking window (600 seconds)
    const [userAttempts, ipAttempts] = await Promise.all([
      this.redisService.incr(userAttemptKey, 600),
      this.redisService.incr(ipAttemptKey, 600),
    ]);

    const maxAttempts = Math.max(userAttempts, ipAttempts);

    // Progressive Lockout
    if (maxAttempts >= 10) {
      // 30-minute lockout
      const lockSeconds = 1800;
      await Promise.all([
        this.redisService.set(`brute:lock:user:${cleanId}`, 'locked', lockSeconds),
        this.redisService.set(`brute:lock:ip:${ip}`, 'locked', lockSeconds),
      ]);
      this.memoryLocks.set(cleanId, Date.now() + lockSeconds * 1000);
      this.memoryLocks.set(ip, Date.now() + lockSeconds * 1000);
      this.logger.warn(`User ${cleanId} and IP ${ip} locked out for 30 minutes after ${maxAttempts} failed attempts.`);
    } else if (maxAttempts >= 5) {
      // 5-minute lockout
      const lockSeconds = 300;
      await Promise.all([
        this.redisService.set(`brute:lock:user:${cleanId}`, 'locked', lockSeconds),
        this.redisService.set(`brute:lock:ip:${ip}`, 'locked', lockSeconds),
      ]);
      this.memoryLocks.set(cleanId, Date.now() + lockSeconds * 1000);
      this.memoryLocks.set(ip, Date.now() + lockSeconds * 1000);
      this.logger.warn(`User ${cleanId} and IP ${ip} locked out for 5 minutes after ${maxAttempts} failed attempts.`);
    }

    return maxAttempts;
  }

  /**
   * Clear failed attempt counters and unlock on successful login
   */
  async recordLoginSuccess(identifier: string, ipAddress?: string): Promise<void> {
    const cleanId = normalizePersianDigits(identifier.trim().toLowerCase());
    const ip = ipAddress || 'unknown';

    await Promise.all([
      this.redisService.del(`brute:attempt:user:${cleanId}`),
      this.redisService.del(`brute:lock:user:${cleanId}`),
      this.redisService.del(`brute:attempt:ip:${ip}`),
    ]);

    this.memoryLocks.delete(cleanId);
    this.memoryAttempts.delete(cleanId);
  }

  /**
   * Requirement 3: Enforce strict rate-limiting on Payment Verification to prevent race conditions
   * Max 5 verification attempts per orderId/trackId within 60 seconds
   */
  async checkPaymentVerifyAllowed(orderIdOrTrackId: string, ipAddress?: string): Promise<void> {
    const track = (orderIdOrTrackId || 'unknown').trim();
    const ip = ipAddress || 'unknown';
    const rateKey = `rate:payment_verify:${track}:${ip}`;

    const attempts = await this.redisService.incr(rateKey, 60);

    if (attempts > 5) {
      const ttl = await this.redisService.ttl(rateKey);
      this.logger.warn(`Payment verification rate limit exceeded for ${track} from ${ip}. Attempts: ${attempts}`);
      throw new HttpException(
        {
          success: false,
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: 'تعداد تلاش‌های استعلام و تأیید تراکنش بیش از حد مجاز است. لطفاً یک دقیقه بعد مجدداً بررسی فرمایید.',
          remainingSeconds: Math.max(ttl, 1),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
