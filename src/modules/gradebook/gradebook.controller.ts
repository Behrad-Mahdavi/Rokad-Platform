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
import { GradebookService } from './gradebook.service';
import { BulkRecordGradeDto } from './dto/record-grade.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';

@ApiTags('LMS — Gradebook & Report Card (دفتر نمرات و کارنامه)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('gradebook')
export class GradebookController {
  constructor(private readonly gradebookService: GradebookService) {}

  @Post('bulk')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'ثبت سریع و گروهی نمرات کلاسی دانش‌آموزان' })
  async recordBulkGrades(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: BulkRecordGradeDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.gradebookService.recordBulkGrades(
      effectiveTenantId,
      userId,
      dto,
    );
  }

  @Get('classroom/:classroomId')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF)
  @ApiOperation({ summary: 'مشاهده ماتریس دفتر نمرات یک کلاس درس' })
  async getClassGradebook(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('classroomId') classroomId: string,
    @Query('lessonId') lessonId?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.gradebookService.getClassGradebook(
      effectiveTenantId,
      classroomId,
      lessonId,
    );
  }

  @Get('student/:studentId/report-card')
  @ApiOperation({ summary: 'محاسبه کارنامه تحصیلی و معدل وزنی (GPA) دانش‌آموز' })
  async getStudentReportCard(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('studentId') studentId: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.gradebookService.getStudentReportCard(
      effectiveTenantId,
      studentId,
      academicYearId,
    );
  }
}
