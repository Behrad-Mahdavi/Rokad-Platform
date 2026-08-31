import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import {
  UpdateStaffPayrollProfileDto,
  GeneratePayrollSlipDto,
  ApproveAndPaySlipDto,
} from './dto/create-payroll.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';
import { AppPermission } from '../../common/constants/permissions';

@ApiTags('Finance — Payroll & Salaries (حقوق و دستمزد کادر مدرسه)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('finance/payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('profiles/:userId')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_PAYROLL_WRITE)
  @ApiOperation({ summary: 'ثبت و ویرایش پروفایل حقوق و دستمزد پرسنل/معلم' })
  async upsertProfile(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateStaffPayrollProfileDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.payrollService.upsertStaffProfile(effectiveTenantId, userId, dto);
  }

  @Get('profiles/:userId')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_PAYROLL_READ)
  @ApiOperation({ summary: 'مشاهده اطلاعات حقوقی و شماره حساب پرسنل' })
  async getProfile(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('userId') userId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.payrollService.getStaffProfile(effectiveTenantId, userId);
  }

  @Post('slips')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_PAYROLL_WRITE)
  @ApiOperation({ summary: 'صدور فیش حقوقی ماهانه برای پرسنل/معلم' })
  async generateSlip(
    @CurrentUser('id') createdById: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: GeneratePayrollSlipDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.payrollService.generatePayrollSlip(
      effectiveTenantId,
      createdById,
      dto,
    );
  }

  @Get('slips')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_PAYROLL_READ)
  @ApiOperation({ summary: 'لیست فیش‌های حقوقی صادر شده با فیلتر سال و ماه' })
  async listSlips(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.payrollService.listPayrollSlips(effectiveTenantId, {
      year: year ? parseInt(year, 10) : undefined,
      month: month ? parseInt(month, 10) : undefined,
      status,
      userId,
    });
  }

  @Get('my-slips')
  @ApiOperation({ summary: 'مشاهده فیش‌های حقوقی توسط خود کارمند/معلم' })
  async getMySlips(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.payrollService.getMyPayrollSlips(effectiveTenantId, userId);
  }

  @Patch('slips/:id/disburse')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_PAYROLL_WRITE)
  @ApiOperation({ summary: 'ثبت تسویه حساب بانکی و پرداخت فیش حقوقی' })
  async disburseSlip(
    @CurrentUser('id') approverId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') slipId: string,
    @Body() dto: ApproveAndPaySlipDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.payrollService.approveAndDisburse(
      effectiveTenantId,
      slipId,
      approverId,
      dto,
    );
  }
}
