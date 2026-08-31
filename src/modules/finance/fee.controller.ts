import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeeService } from './fee.service';
import { CreateFeeContractDto } from './dto/create-fee-contract.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';
import { AppPermission } from '../../common/constants/permissions';

@ApiTags('Finance — Fee Management (مدیریت شهریه و اقساط)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('finance/contracts')
export class FeeController {
  constructor(private readonly feeService: FeeService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_FEE_WRITE)
  @ApiOperation({ summary: 'ثبت قرارداد شهریه و اقساط‌بندی برای دانش‌آموز' })
  async createContract(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateFeeContractDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.feeService.createContract(effectiveTenantId, dto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_FEE_READ)
  @ApiOperation({ summary: 'لیست قراردادهای شهریه دانش‌آموزان' })
  async listContracts(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('studentId') studentId?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.feeService.listContracts(effectiveTenantId, {
      academicYearId,
      studentId,
    });
  }

  @Get('my-overview')
  @ApiOperation({ summary: 'مشاهده صورت‌حساب و اقساط شهریه توسط دانش‌آموز یا ولی' })
  async getMyFeeOverview(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.feeService.getStudentFeeOverview(effectiveTenantId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'مشاهده جزئیات کامل قرارداد، وضعیت اقساط و مانده بدهی' })
  async getContractDetails(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') contractId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.feeService.getContractDetails(effectiveTenantId, contractId);
  }
}
