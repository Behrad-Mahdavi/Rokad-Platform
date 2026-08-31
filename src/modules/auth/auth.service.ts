import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterSchoolDto } from './dto/register-school.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Role, TenantType } from '../../common/constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Register a new school and create its initial administrator
   */
  async registerSchool(dto: RegisterSchoolDto, ipAddress?: string, userAgent?: string) {
    // Check if tenant slug is already taken
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });

    if (existingTenant) {
      throw new ConflictException('شناسه/اسلاگ انتخاب‌شده برای این مدرسه قبلاً ثبت شده است');
    }

    const passwordHash = await argon2.hash(dto.adminPassword);

    // Create Tenant and Admin User inside transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          type: TenantType.SCHOOL as any,
          name: dto.schoolName,
          slug: dto.slug,
          subdomain: dto.subdomain || dto.slug,
          theme: (dto.theme || 'ECOSYSTEM') as any,
          status: 'ACTIVE',
          email: dto.adminEmail,
          phone: dto.adminPhone,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          firstName: dto.adminFirstName,
          lastName: dto.adminLastName,
          phone: dto.adminPhone,
          email: dto.adminEmail,
          passwordHash,
          role: Role.SCHOOL_ADMIN as any,
          status: 'ACTIVE',
        },
      });

      return { tenant, user };
    });

    // Issue initial token pair
    const tokens = await this.createTokenPair(
      result.user.id,
      result.tenant.id,
      result.user.role,
      result.user.isPlatformAdmin,
      ipAddress,
      userAgent,
    );

    this.eventEmitter.emit('audit.log', {
      tenantId: result.tenant.id,
      userId: result.user.id,
      action: 'REGISTER_SCHOOL',
      entity: 'Tenant',
      entityId: result.tenant.id,
      newValues: { schoolName: dto.schoolName, slug: dto.slug },
      ipAddress,
      userAgent,
    });

    return {
      message: 'مدرسه و کاربر مدیر با موفقیت ثبت شدند',
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        theme: result.tenant.theme,
      },
      user: {
        id: result.user.id,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        phone: result.user.phone,
        email: result.user.email,
        role: result.user.role,
      },
      ...tokens,
    };
  }

  /**
   * Tenant-aware login with phone/email/username + password
   */
  async login(dto: LoginDto, currentTenantId?: string, ipAddress?: string, userAgent?: string) {
    let tenantId = currentTenantId;

    if (!tenantId && dto.tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug: dto.tenantSlug },
      });
      if (tenant) {
        tenantId = tenant.id;
      }
    }

    // Look for user matching identifier in this tenant
    const user = await this.prisma.user.findFirst({
      where: {
        ...(tenantId ? { tenantId } : {}),
        OR: [
          { phone: dto.identifier },
          { email: dto.identifier },
          { username: dto.identifier },
        ],
      },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('اطلاعات ورود (نام کاربری یا رمز عبور) اشتباه است');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('حساب کاربری شما غیرفعال یا معلق شده است');
    }

    if (user.tenant && user.tenant.status !== 'ACTIVE' && !user.isPlatformAdmin) {
      throw new UnauthorizedException('مرکز آموزشی مربوطه غیرفعال یا معلق است');
    }

    // Verify Password with Argon2
    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('اطلاعات ورود (نام کاربری یا رمز عبور) اشتباه است');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Issue Token Pair with new Token Family
    const tokens = await this.createTokenPair(
      user.id,
      user.tenantId,
      user.role,
      user.isPlatformAdmin,
      ipAddress,
      userAgent,
    );

    this.eventEmitter.emit('audit.log', {
      tenantId: user.tenantId,
      userId: user.id,
      action: 'LOGIN',
      entity: 'Auth',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return {
      message: 'ورود موفقیت‌آمیز بود',
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        theme: user.tenant.theme,
      },
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isPlatformAdmin: user.isPlatformAdmin,
      },
      ...tokens,
    };
  }

  /**
   * Refresh Token Rotation with Token Family Reuse Detection
   */
  async refreshToken(dto: RefreshTokenDto, ipAddress?: string, userAgent?: string) {
    const rawToken = dto.refreshToken;
    const tokenHash = this.hashToken(rawToken);

    // Look up token with its family and user
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        family: {
          include: {
            user: {
              include: { tenant: true },
            },
          },
        },
      },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('توکن رفرش نامعتبر است');
    }

    const { family } = tokenRecord;

    // 1. Check if token family was already revoked
    if (family.isRevoked) {
      throw new UnauthorizedException('سشن منقضی یا باطل شده است. لطفاً دوباره وارد شوید');
    }

    // 2. REUSE DETECTION: If token was already used, this indicates theft/replay attack!
    if (tokenRecord.isUsed) {
      this.logger.warn(
        `SECURITY ALERT: Refresh token reuse detected for userId: ${family.userId}, familyId: ${family.id}`,
      );

      // Invalidate the ENTIRE token family immediately
      await this.prisma.refreshTokenFamily.update({
        where: { id: family.id },
        data: {
          isRevoked: true,
          revokedReason: 'TOKEN_REUSE_DETECTED',
        },
      });

      this.eventEmitter.emit('audit.log', {
        tenantId: family.tenantId,
        userId: family.userId,
        action: 'SECURITY_ALERT_TOKEN_REUSE',
        entity: 'Auth',
        entityId: family.id,
        ipAddress,
        userAgent,
      });

      throw new UnauthorizedException(
        'فعالیت مشکوک در سشن امنیتی شما شناسایی شد. تمام سشن‌های این دستگاه لغو شدند. لطفاً مجدداً لاگین کنید.',
      );
    }

    // 3. Check expiration
    if (new Date() > tokenRecord.expiresAt) {
      throw new UnauthorizedException('توکن رفرش منقضی شده است');
    }

    // 4. Valid Rotation: Mark current token as used
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isUsed: true },
    });

    // 5. Generate new Refresh Token within the SAME family
    const newRawRefreshToken = this.generateSecureRandomToken();
    const newTokenHash = this.hashToken(newRawRefreshToken);

    const refreshExpiryDays = 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshExpiryDays);

    await this.prisma.refreshToken.create({
      data: {
        familyId: family.id,
        tokenHash: newTokenHash,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    // 6. Generate new Access Token
    const user = family.user;
    const accessToken = this.signAccessToken(
      user.id,
      user.tenantId,
      user.role,
      user.isPlatformAdmin,
    );

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    };
  }

  /**
   * Invalidate session / Logout
   */
  async logout(refreshToken?: string, userId?: string) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      const tokenRecord = await this.prisma.refreshToken.findUnique({
        where: { tokenHash },
      });

      if (tokenRecord) {
        await this.prisma.refreshTokenFamily.update({
          where: { id: tokenRecord.familyId },
          data: { isRevoked: true, revokedReason: 'USER_LOGOUT' },
        });
      }
    } else if (userId) {
      // Invalidate all families for user
      await this.prisma.refreshTokenFamily.updateMany({
        where: { userId },
        data: { isRevoked: true, revokedReason: 'USER_LOGOUT_ALL' },
      });
    }

    return { message: 'خروج از حساب کاربری با موفقیت انجام شد' };
  }

  /**
   * Helper: create Access + Refresh Token pair with new Family
   */
  private async createTokenPair(
    userId: string,
    tenantId: string,
    role: string,
    isPlatformAdmin: boolean,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const accessToken = this.signAccessToken(userId, tenantId, role, isPlatformAdmin);

    // Create a new Token Family
    const family = await this.prisma.refreshTokenFamily.create({
      data: {
        userId,
        tenantId,
      },
    });

    const rawRefreshToken = this.generateSecureRandomToken();
    const tokenHash = this.hashToken(rawRefreshToken);

    const refreshExpiryDays = 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshExpiryDays);

    await this.prisma.refreshToken.create({
      data: {
        familyId: family.id,
        tokenHash,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    };
  }

  private signAccessToken(
    userId: string,
    tenantId: string,
    role: string,
    isPlatformAdmin: boolean,
  ): string {
    const payload = {
      sub: userId,
      tenantId,
      role,
      isPlatformAdmin,
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>(
        'JWT_ACCESS_SECRET',
        'rokad_super_secret_access_jwt_key_2026_x99!secure',
      ),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    });
  }

  private generateSecureRandomToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
