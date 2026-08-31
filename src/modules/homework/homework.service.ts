import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateHomeworkDto,
  SubmitHomeworkDto,
  GradeSubmissionDto,
} from './dto/create-homework.dto';

@Injectable()
export class HomeworkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new homework assignment
   */
  async createHomework(tenantId: string, dto: CreateHomeworkDto) {
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: dto.classroomId, tenantId },
    });
    if (!classroom) {
      throw new NotFoundException('کلاس درس مورد نظر یافت نشد');
    }

    const homework = await this.prisma.homework.create({
      data: {
        tenantId,
        classroomId: dto.classroomId,
        lessonId: dto.lessonId,
        teacherId: dto.teacherId,
        title: dto.title,
        description: dto.description,
        attachmentUrls: dto.attachmentUrls || [],
        dueDate: new Date(dto.dueDate),
        maxScore: dto.maxScore || 20,
        isGraded: dto.isGraded !== undefined ? dto.isGraded : true,
        allowLateSubmissions: dto.allowLateSubmissions || false,
      },
      include: {
        lesson: true,
        teacher: { include: { user: true } },
      },
    });

    this.eventEmitter.emit('homework.created', {
      tenantId,
      homeworkId: homework.id,
      classroomId: dto.classroomId,
      title: dto.title,
    });

    return homework;
  }

  /**
   * List homeworks for a classroom
   */
  async listClassHomeworks(tenantId: string, classroomId: string) {
    return this.prisma.homework.findMany({
      where: { tenantId, classroomId },
      include: {
        lesson: true,
        teacher: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Get homework details with submission summary
   */
  async getHomeworkDetails(tenantId: string, homeworkId: string) {
    const homework = await this.prisma.homework.findFirst({
      where: { id: homeworkId, tenantId },
      include: {
        lesson: true,
        classroom: true,
        teacher: { include: { user: true } },
        submissions: {
          include: {
            student: {
              include: {
                user: {
                  select: { firstName: true, lastName: true, avatarUrl: true },
                },
              },
            },
          },
        },
      },
    });

    if (!homework) {
      throw new NotFoundException('تکلیف مورد نظر یافت نشد');
    }
    return homework;
  }

  /**
   * Submit homework response by student
   */
  async submitHomework(
    tenantId: string,
    homeworkId: string,
    dto: SubmitHomeworkDto,
  ) {
    const homework = await this.prisma.homework.findFirst({
      where: { id: homeworkId, tenantId },
    });
    if (!homework) {
      throw new NotFoundException('تکلیف یافت نشد');
    }

    const now = new Date();
    const isLate = now > homework.dueDate;

    if (isLate && !homework.allowLateSubmissions) {
      throw new BadRequestException('مهلت تحویل این تکلیف به پایان رسیده و امکان ارسال با تاخیر فعال نیست');
    }

    const status = isLate ? 'LATE' : 'SUBMITTED';

    return this.prisma.homeworkSubmission.upsert({
      where: {
        homeworkId_studentId: {
          homeworkId,
          studentId: dto.studentId,
        },
      },
      update: {
        content: dto.content,
        attachmentUrls: dto.attachmentUrls || [],
        submittedAt: now,
        status,
      },
      create: {
        tenantId,
        homeworkId,
        studentId: dto.studentId,
        content: dto.content,
        attachmentUrls: dto.attachmentUrls || [],
        submittedAt: now,
        status,
      },
      include: {
        student: { include: { user: true } },
      },
    });
  }

  /**
   * Grade a student submission
   */
  async gradeSubmission(
    tenantId: string,
    submissionId: string,
    gradedById: string,
    dto: GradeSubmissionDto,
  ) {
    const submission = await this.prisma.homeworkSubmission.findFirst({
      where: { id: submissionId, tenantId },
      include: { homework: true },
    });
    if (!submission) {
      throw new NotFoundException('پاسخ ارسالی یافت نشد');
    }

    if (dto.score > submission.homework.maxScore) {
      throw new BadRequestException(
        `نمره نمی‌تواند بیشتر از سقف نمره (${submission.homework.maxScore}) باشد`,
      );
    }

    const status = dto.resubmitRequired ? 'RESUBMIT_REQUIRED' : 'GRADED';

    const graded = await this.prisma.homeworkSubmission.update({
      where: { id: submissionId },
      data: {
        score: dto.score,
        feedback: dto.feedback,
        status,
        gradedAt: new Date(),
        gradedById,
      },
      include: {
        student: { include: { user: true } },
        homework: true,
      },
    });

    this.eventEmitter.emit('homework.graded', {
      tenantId,
      studentId: submission.studentId,
      homeworkTitle: submission.homework.title,
      score: dto.score,
    });

    return graded;
  }
}
