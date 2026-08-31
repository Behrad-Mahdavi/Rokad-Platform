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
import { MembersService } from './members.service';
import {
  CreateStudentDto,
  CreateTeacherDto,
  CreateCoachDto,
  CreateStaffDto,
  CreateParentDto,
  LinkParentStudentDto,
} from './dto/create-student.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';
import { AppPermission } from '../../common/constants/permissions';

@ApiTags('Members & Directory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  // 1. Students
  @Get('students')
  @ApiOperation({ summary: 'لیست دانش‌آموزان مدرسه' })
  async listStudents(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('search') search?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.membersService.listStudents(effectiveTenantId, search);
  }

  @Post('students')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.STUDENT_WRITE)
  @ApiOperation({ summary: 'ثبت‌نام دانش‌آموز جدید' })
  async createStudent(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateStudentDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.membersService.createStudent(effectiveTenantId, dto);
  }

  // 2. Teachers
  @Get('teachers')
  @ApiOperation({ summary: 'لیست اساتید و معلمان مدرسه' })
  async listTeachers(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.membersService.listTeachers(effectiveTenantId);
  }

  @Post('teachers')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.TEACHER_WRITE)
  @ApiOperation({ summary: 'ثبت دبیر یا استاد جدید' })
  async createTeacher(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateTeacherDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.membersService.createTeacher(effectiveTenantId, dto);
  }

  // 3. Coaches
  @Get('coaches')
  @ApiOperation({ summary: 'لیست مربیان و مشاوران مدرسه' })
  async listCoaches(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.membersService.listCoaches(effectiveTenantId);
  }

  @Post('coaches')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.COACH_WRITE)
  @ApiOperation({ summary: 'ثبت مربی / مشاور جدید' })
  async createCoach(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateCoachDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.membersService.createCoach(effectiveTenantId, dto);
  }

  // 4. Staff
  @Get('staff')
  @ApiOperation({ summary: 'لیست پرسنل اداری و اجرایی مدرسه' })
  async listStaff(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.membersService.listStaff(effectiveTenantId);
  }

  @Post('staff')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  @RequirePermissions(AppPermission.STAFF_WRITE)
  @ApiOperation({ summary: 'ثبت پرسنل اداری جدید' })
  async createStaff(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateStaffDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.membersService.createStaff(effectiveTenantId, dto);
  }

  // 5. Parents
  @Get('parents')
  @ApiOperation({ summary: 'لیست والدین ثبت‌شده' })
  async listParents(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.membersService.listParents(effectiveTenantId);
  }

  @Post('parents')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.PARENT_WRITE)
  @ApiOperation({ summary: 'ثبت ولی جدید' })
  async createParent(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateParentDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.membersService.createParent(effectiveTenantId, dto);
  }

  // 6. Parent-Student Link
  @Post('link-parent-student')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.PARENT_STUDENT_LINK)
  @ApiOperation({ summary: 'اتصال ولی به دانش‌آموز (تعیین پدر، مادر، سرپرست)' })
  async linkParentStudent(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: LinkParentStudentDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.membersService.linkParentStudent(effectiveTenantId, dto);
  }

  @Get('my-children')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'مشاهده لیست فرزندان دانش‌آموز والد لاگین‌شده' })
  async getMyChildren(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.membersService.getParentStudents(effectiveTenantId, userId);
  }
}
