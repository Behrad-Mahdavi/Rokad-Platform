import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AcademicService } from './academic.service';
import {
  CreateAcademicYearDto,
  CreateTermDto,
  CreateEducationalLevelDto,
  CreateStudyFieldDto,
} from './dto/create-academic-year.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';
import { AppPermission } from '../../common/constants/permissions';

@ApiTags('Academic Structure')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('academic')
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  // Academic Years
  @Get('years')
  @ApiOperation({ summary: 'لیست سال‌های تحصیلی مدرسه' })
  async listYears(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.academicService.listAcademicYears(effectiveTenantId);
  }

  @Post('years')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.ACADEMIC_YEAR_WRITE)
  @ApiOperation({ summary: 'ایجاد سال تحصیلی جدید' })
  async createYear(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateAcademicYearDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.academicService.createAcademicYear(effectiveTenantId, dto);
  }

  // Terms
  @Post('terms')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.ACADEMIC_YEAR_WRITE)
  @ApiOperation({ summary: 'ایجاد ترم / نیم‌سال تحصیلی' })
  async createTerm(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateTermDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.academicService.createTerm(effectiveTenantId, dto);
  }

  // Educational Levels
  @Get('levels')
  @ApiOperation({ summary: 'لیست مقاطع تحصیلی مدرسه' })
  async listLevels(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.academicService.listLevels(effectiveTenantId);
  }

  @Post('levels')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.ACADEMIC_LEVEL_WRITE)
  @ApiOperation({ summary: 'ایجاد مقطع تحصیلی جدید (ابتدایی، متوسطه اول، متوسطه دوم، کالج)' })
  async createLevel(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateEducationalLevelDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.academicService.createLevel(effectiveTenantId, dto);
  }

  // Study Fields
  @Get('fields')
  @ApiOperation({ summary: 'لیست رشته‌های تحصیلی' })
  async listFields(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('levelId') levelId?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.academicService.listFields(effectiveTenantId, levelId);
  }

  @Post('fields')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.ACADEMIC_FIELD_WRITE)
  @ApiOperation({ summary: 'ایجاد رشته تحصیلی جدید' })
  async createField(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateStudyFieldDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.academicService.createField(effectiveTenantId, dto);
  }
}
