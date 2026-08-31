import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { HomeworkService } from './homework.service';
import {
  CreateHomeworkDto,
  SubmitHomeworkDto,
  GradeSubmissionDto,
} from './dto/create-homework.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';
import { AppPermission } from '../../common/constants/permissions';

@ApiTags('Daily Operations — Homework')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('homework')
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'آپلود مستقیم پیوست تکلیف با سرویس یکپارچه MinIO' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async uploadAttachment(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('فایلی برای آپلود انتخاب نشده است');
    }
    const effectiveTenantId = tenantId || userTenantId;
    return this.homeworkService.uploadAttachment(effectiveTenantId, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER)
  @RequirePermissions(AppPermission.HOMEWORK_WRITE)
  @ApiOperation({ summary: 'تعریف تکلیف جدید توسط دبیر' })
  async createHomework(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateHomeworkDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.homeworkService.createHomework(effectiveTenantId, dto);
  }

  @Get('classroom/:classroomId')
  @RequirePermissions(AppPermission.HOMEWORK_READ)
  @ApiOperation({ summary: 'لیست تکالیف یک کلاس درس' })
  async listClassHomeworks(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('classroomId') classroomId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.homeworkService.listClassHomeworks(effectiveTenantId, classroomId);
  }

  @Get(':id')
  @RequirePermissions(AppPermission.HOMEWORK_READ)
  @ApiOperation({ summary: 'مشاهده جزئیات تکلیف و لیست پاسخ‌های ارسالی' })
  async getHomeworkDetails(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') homeworkId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.homeworkService.getHomeworkDetails(effectiveTenantId, homeworkId);
  }

  @Post(':id/submit')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'ارسال پاسخ تکلیف توسط دانش‌آموز' })
  async submitHomework(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') homeworkId: string,
    @Body() dto: SubmitHomeworkDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.homeworkService.submitHomework(effectiveTenantId, homeworkId, dto);
  }

  @Patch('submissions/:submissionId/grade')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER)
  @RequirePermissions(AppPermission.HOMEWORK_WRITE)
  @ApiOperation({ summary: 'تصحیح، نمره‌دهی و ثبت بازخورد روی پاسخ تکلیف توسط دبیر' })
  async gradeSubmission(
    @CurrentUser('id') teacherUserId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('submissionId') submissionId: string,
    @Body() dto: GradeSubmissionDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.homeworkService.gradeSubmission(
      effectiveTenantId,
      submissionId,
      teacherUserId,
      dto,
    );
  }
}
