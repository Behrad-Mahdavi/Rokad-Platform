import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to parse simple user-agent details (OS, Browser, Device)
   */
  parseUserAgent(userAgent?: string): { browser: string; os: string; deviceType: string } {
    if (!userAgent) {
      return { browser: 'مرورگر نامشخص', os: 'نامشخص', deviceType: 'DESKTOP' };
    }

    const ua = userAgent.toLowerCase();

    let os = 'سایر';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) os = 'iOS';
    else if (ua.includes('linux')) os = 'Linux';

    let browser = 'مرورگر وب';
    if (ua.includes('edg')) browser = 'Microsoft Edge';
    else if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Google Chrome';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('firefox')) browser = 'Mozilla Firefox';
    else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';

    let deviceType = 'DESKTOP';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      deviceType = 'MOBILE';
    } else if (ua.includes('ipad') || ua.includes('tablet')) {
      deviceType = 'TABLET';
    }

    return { browser, os, deviceType };
  }

  /**
   * Hash a refresh token to create a unique session fingerprint
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Record or update an active session upon successful login or token issuance.
   * Follows Telegram's session model:
   * - Deduplicates by device fingerprint (userId + browser + os + deviceType).
   * - If an active session for the same device exists, updates its token hash, IP, and lastActiveAt.
   * - Ensures only 1 active session entry per unique client device.
   */
  async createSession(
    userId: string,
    tenantId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const sessionTokenHash = this.hashToken(refreshToken);
    const { browser, os, deviceType } = this.parseUserAgent(userAgent);
    const cleanIp =
      ipAddress && ipAddress !== '::1' && ipAddress !== '::ffff:127.0.0.1' && ipAddress !== 'unknown'
        ? ipAddress
        : '127.0.0.1';

    try {
      // Check if an existing active session already exists for this exact device (same browser, OS, deviceType)
      const existingSession = await this.prisma.userSession.findFirst({
        where: {
          userId,
          browser,
          os,
          deviceType,
          isRevoked: false,
        },
        orderBy: { lastActiveAt: 'desc' },
      });

      if (existingSession) {
        // Update existing active device session with the latest token, IP, and activity time
        const updated = await this.prisma.userSession.update({
          where: { id: existingSession.id },
          data: {
            sessionTokenHash,
            ipAddress: cleanIp,
            userAgent: userAgent ? userAgent.slice(0, 255) : existingSession.userAgent,
            lastActiveAt: new Date(),
            isRevoked: false,
          },
        });

        // Revoke any older duplicate active rows for this device if any exist
        await this.prisma.userSession.updateMany({
          where: {
            userId,
            browser,
            os,
            deviceType,
            id: { not: existingSession.id },
            isRevoked: false,
          },
          data: { isRevoked: true },
        });

        return updated;
      }

      // New unique device login: create a fresh active session
      return await this.prisma.userSession.create({
        data: {
          userId,
          tenantId,
          sessionTokenHash,
          ipAddress: cleanIp,
          userAgent: userAgent ? userAgent.slice(0, 255) : null,
          browser,
          os,
          deviceType,
          isRevoked: false,
          lastActiveAt: new Date(),
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to create or update user session: ${err?.message || err}`);
    }
  }

  /**
   * Rotate session token hash and update last activity on token refresh
   */
  async rotateSessionToken(
    oldTokenHash: string,
    newTokenHash: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const cleanIp =
      ipAddress && ipAddress !== '::1' && ipAddress !== '::ffff:127.0.0.1' && ipAddress !== 'unknown'
        ? ipAddress
        : undefined;

    const updateData: any = {
      sessionTokenHash: newTokenHash,
      lastActiveAt: new Date(),
    };
    if (cleanIp) updateData.ipAddress = cleanIp;
    if (userAgent) {
      const { browser, os, deviceType } = this.parseUserAgent(userAgent);
      updateData.browser = browser;
      updateData.os = os;
      updateData.deviceType = deviceType;
      updateData.userAgent = userAgent.slice(0, 255);
    }

    try {
      await this.prisma.userSession.updateMany({
        where: { sessionTokenHash: oldTokenHash, isRevoked: false },
        data: updateData,
      });
    } catch (err: any) {
      this.logger.warn(`Failed to rotate session token: ${err?.message || err}`);
    }
  }

  /**
   * Update last activity on a session
   */
  async touchSession(refreshToken: string) {
    const sessionTokenHash = this.hashToken(refreshToken);
    await this.prisma.userSession.updateMany({
      where: { sessionTokenHash, isRevoked: false },
      data: { lastActiveAt: new Date() },
    });
  }

  /**
   * Get all active sessions for a user (Deduplicated Telegram-style per device)
   */
  async getUserSessions(userId: string, currentRefreshToken?: string) {
    const currentHash = currentRefreshToken ? this.hashToken(currentRefreshToken) : null;

    // Retrieve only non-revoked active sessions for this user
    const sessions = await this.prisma.userSession.findMany({
      where: {
        userId,
        isRevoked: false,
      },
      orderBy: { lastActiveAt: 'desc' },
    });

    // Deduplicate by device fingerprint (deviceType + os + browser)
    const deviceMap = new Map<string, typeof sessions[0]>();
    const isCurrentMap = new Map<string, boolean>();

    for (const s of sessions) {
      const deviceKey = `${s.deviceType || 'DESKTOP'}_${s.os || 'UNKNOWN'}_${s.browser || 'BROWSER'}`;
      const isThisTokenCurrent = Boolean(currentHash && s.sessionTokenHash === currentHash);

      if (!deviceMap.has(deviceKey)) {
        deviceMap.set(deviceKey, s);
        isCurrentMap.set(deviceKey, isThisTokenCurrent);
      } else {
        const existing = deviceMap.get(deviceKey)!;
        if (isThisTokenCurrent) {
          deviceMap.set(deviceKey, s);
          isCurrentMap.set(deviceKey, true);
        } else if (
          !isCurrentMap.get(deviceKey) &&
          new Date(s.lastActiveAt).getTime() > new Date(existing.lastActiveAt).getTime()
        ) {
          deviceMap.set(deviceKey, s);
        }
      }
    }

    const uniqueSessions = Array.from(deviceMap.entries()).map(([deviceKey, s]) => {
      const isCurrent =
        isCurrentMap.get(deviceKey) ||
        (currentHash ? s.sessionTokenHash === currentHash : false);

      const cleanIp =
        s.ipAddress === '::1' ||
        s.ipAddress === '::ffff:127.0.0.1' ||
        s.ipAddress === '127.0.0.1' ||
        !s.ipAddress ||
        s.ipAddress === 'unknown'
          ? '127.0.0.1 (لوکال)'
          : s.ipAddress;

      return {
        id: s.id,
        ipAddress: cleanIp,
        browser: s.browser || 'مرورگر وب',
        os: s.os || 'نامشخص',
        deviceType: s.deviceType || 'DESKTOP',
        createdAt: s.createdAt,
        lastActiveAt: s.lastActiveAt,
        isCurrent,
      };
    });

    // Sort so current active device is first, then by lastActiveAt descending
    return uniqueSessions.sort((a, b) => {
      if (a.isCurrent && !b.isCurrent) return -1;
      if (!a.isCurrent && b.isCurrent) return 1;
      return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
    });
  }

  /**
   * Revoke a single specific session
   */
  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.userSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('نشست مورد نظر یافت نشد');
    }

    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { isRevoked: true },
    });

    this.logger.log(`Session ${sessionId} revoked for user ${userId}`);

    return {
      success: true,
      message: 'نشست دستگاه با موفقیت خاتمه یافت',
    };
  }

  /**
   * Requirement 4: Revoke all other sessions (called on password change or emergency signout)
   */
  async revokeAllOtherSessions(userId: string, currentRefreshToken?: string) {
    const currentHash = currentRefreshToken ? this.hashToken(currentRefreshToken) : null;

    const where: any = {
      userId,
      isRevoked: false,
    };

    if (currentHash) {
      where.sessionTokenHash = { not: currentHash };
    }

    const result = await this.prisma.userSession.updateMany({
      where,
      data: { isRevoked: true },
    });

    // Also revoke token families in database
    await this.prisma.refreshTokenFamily.updateMany({
      where: { userId, isRevoked: false },
      data: {
        isRevoked: true,
        revokedReason: 'PASS_CHANGE_OR_ALL_SESSIONS_REVOKED',
      },
    });

    this.logger.log(`Revoked ${result.count} other sessions for user ${userId}`);

    return {
      success: true,
      revokedCount: result.count,
      message: 'تمام نشست‌های فعال در سایر دستگاه‌ها با موفقیت خاتمه یافتند',
    };
  }

  /**
   * Check if a session token is revoked
   */
  async isSessionRevoked(refreshToken: string): Promise<boolean> {
    const sessionTokenHash = this.hashToken(refreshToken);
    const session = await this.prisma.userSession.findUnique({
      where: { sessionTokenHash },
      select: { isRevoked: true },
    });

    return !session || session.isRevoked;
  }
}
