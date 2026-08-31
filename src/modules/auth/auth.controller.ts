import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Ip,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterSchoolDto } from './dto/register-school.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register-school')
  @ApiOperation({ summary: 'ثبت‌نام مدرسه جدید و ساخت مدیر اولیه (Onboarding)' })
  async registerSchool(
    @Body() dto: RegisterSchoolDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.registerSchool(dto, ip, userAgent);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'ورود چندمستأجری کاربران (مدیر، معلم، دانش‌آموز، والدین)' })
  async login(
    @Body() dto: LoginDto,
    @CurrentTenant('id') tenantId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.login(dto, tenantId, ip, userAgent);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'نوسازی توکن با مکانیزم Token Family Rotation' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.refreshToken(dto, ip, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({ summary: 'خروج از حساب و باطل‌سازی سشن امنیتی' })
  async logout(
    @Body() dto: RefreshTokenDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.authService.logout(dto?.refreshToken, userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'دریافت مشخصات کاربر لاگین‌شده و مدرسه جاری' })
  async getProfile(
    @CurrentUser() user: any,
    @CurrentTenant() tenant: any,
  ) {
    return {
      user,
      tenant,
    };
  }
}
