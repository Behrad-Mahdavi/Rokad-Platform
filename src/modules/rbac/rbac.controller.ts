import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RbacService } from './rbac.service';
import { CreateSchoolRoleDto, AssignRoleDto } from './dto/create-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';

@ApiTags('RBAC & Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rbac')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('permissions')
  @ApiOperation({ summary: 'دریافت فهرست تمام پرمیشن‌های سیستمی سامانه' })
  async listPermissions() {
    return this.rbacService.listPermissions();
  }

  @Get('roles')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'دریافت فهرست تمام نقش‌های تعریف‌شده در مدرسه جاری' })
  async listSchoolRoles(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست مدرسه مشخص نیست');
    }
    return this.rbacService.listRoles(effectiveTenantId);
  }

  @Post('roles')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'ایجاد نقش جدید در مدرسه با تعیین پرمیشن‌های دانه‌ای' })
  async createSchoolRole(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateSchoolRoleDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست مدرسه مشخص نیست');
    }
    return this.rbacService.createRole(effectiveTenantId, dto);
  }

  @Post('assign')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'تخصیص نقش سازمانی به یک کاربر در مدرسه' })
  async assignRole(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: AssignRoleDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست مدرسه مشخص نیست');
    }
    return this.rbacService.assignRole(effectiveTenantId, dto);
  }

  @Delete('revoke/:userId/:roleId')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'سلب نقش سازمانی از یک کاربر' })
  async revokeRole(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست مدرسه مشخص نیست');
    }
    return this.rbacService.revokeRole(effectiveTenantId, userId, roleId);
  }

  @Get('my-permissions')
  @ApiOperation({ summary: 'دریافت لیست تمام پرمیشن‌های فعال کاربر جاری در این مدرسه' })
  async getMyPermissions(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.rbacService.getUserPermissions(effectiveTenantId, userId);
  }
}
