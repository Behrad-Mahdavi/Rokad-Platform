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
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import {
  SubmitExamAnswersDto,
  GradeExamParticipationDto,
} from './dto/participate-exam.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';

@ApiTags('LMS — Exam Engine (موتور آزمون و آزمون آنلاین)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'طراحی و تعریف آزمون جدید' })
  async createExam(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateExamDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.examsService.createExam(effectiveTenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'لیست آزمون‌های تعریف‌شده مدرسه' })
  async listExams(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('classroomId') classroomId?: string,
    @Query('lessonId') lessonId?: string,
    @Query('teacherId') teacherId?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.examsService.listExams(effectiveTenantId, {
      classroomId,
      lessonId,
      teacherId,
    });
  }

  @Post(':id/start')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'ورود دانش‌آموز به آزمون آنلاین، تولید برگه اختصاصی و شروع تایمر سرور' })
  async startExam(
    @CurrentUser('id') studentUserId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') examId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.examsService.startExam(effectiveTenantId, examId, studentUserId);
  }

  @Post(':id/submit')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'ثبت و ارسال پاسخ‌های آزمون آنلاین با تصحیح خودکار تستی' })
  async submitExamAnswers(
    @CurrentUser('id') studentUserId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') examId: string,
    @Body() dto: SubmitExamAnswersDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.examsService.submitExamAnswers(
      effectiveTenantId,
      examId,
      studentUserId,
      dto,
    );
  }

  @Patch('participations/:id/grade')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'تصحیح دستی سوالات تشریحی و ثبت نمره نهایی توسط دبیر' })
  async gradeDescriptiveAnswers(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') participationId: string,
    @Body() dto: GradeExamParticipationDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.examsService.gradeDescriptiveAnswers(
      effectiveTenantId,
      participationId,
      dto,
    );
  }

  @Get(':id/results')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'مشاهده کارنامه، نتایج کلاسی و سیگنال‌های تعویض تب آزمون' })
  async getExamResults(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') examId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.examsService.getExamResults(effectiveTenantId, examId);
  }
}
