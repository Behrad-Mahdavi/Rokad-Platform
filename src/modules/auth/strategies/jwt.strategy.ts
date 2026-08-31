import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: string;
  isPlatformAdmin: boolean;
  email?: string;
  phone?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_ACCESS_SECRET',
        'rokad_super_secret_access_jwt_key_2026_x99!secure',
      ),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        tenant: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('حساب کاربری معتبر نیست یا غیرفعال شده است');
    }

    if (user.tenant && user.tenant.status !== 'ACTIVE' && !user.isPlatformAdmin) {
      throw new UnauthorizedException('مرکز آموزشی مربوطه غیرفعال یا معلق است');
    }

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isPlatformAdmin: user.isPlatformAdmin,
      firstName: user.firstName,
      lastName: user.lastName,
      tenant: user.tenant,
    };
  }
}
