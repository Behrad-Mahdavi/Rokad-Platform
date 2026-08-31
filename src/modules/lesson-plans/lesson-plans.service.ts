import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateLessonPlanDto,
  CreateSessionItemDto,
  UpdateSessionStatusDto,
} from './dto/create-lesson-plan.dto';

@Injectable()
export class LessonPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async createLessonPlan(tenantId: string, dto: CreateLessonPlanDto) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: dto.lessonId, tenantId },
    });
    if (!lesson) {
      throw new NotFoundException('درس مورد نظر یافت نشد');
    }

    return this.prisma.lessonPlan.create({
      data: {
        tenantId,
        academicYearId: dto.academicYearId,
        termId: dto.termId,
        lessonId: dto.lessonId,
        teacherId: dto.teacherId,
        title: dto.title,
        description: dto.description,
        totalHoursPlanned: dto.totalHoursPlanned || 30,
        sessions: {
          create: dto.sessions?.map((s) => ({
            sessionNumber: s.sessionNumber,
            topic: s.topic,
            objectives: s.objectives,
            activities: s.activities,
            plannedDate: s.plannedDate ? new Date(s.plannedDate) : undefined,
            status: 'PLANNED',
          })) || [],
        },
      },
      include: {
        lesson: true,
        teacher: { include: { user: true } },
        sessions: { orderBy: { sessionNumber: 'asc' } },
      },
    });
  }

  async listLessonPlans(tenantId: string, lessonId?: string, teacherId?: string) {
    return this.prisma.lessonPlan.findMany({
      where: {
        tenantId,
        ...(lessonId ? { lessonId } : {}),
        ...(teacherId ? { teacherId } : {}),
      },
      include: {
        lesson: true,
        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
        _count: { select: { sessions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLessonPlanDetails(tenantId: string, planId: string) {
    const plan = await this.prisma.lessonPlan.findFirst({
      where: { id: planId, tenantId },
      include: {
        lesson: true,
        academicYear: true,
        teacher: { include: { user: true } },
        sessions: { orderBy: { sessionNumber: 'asc' } },
      },
    });

    if (!plan) {
      throw new NotFoundException('طرح درس یافت نشد');
    }

    const totalSessions = plan.sessions.length;
    const completedSessions = plan.sessions.filter((s) => s.status === 'COMPLETED').length;
    const progressPercentage = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    return {
      plan,
      progress: {
        totalSessions,
        completedSessions,
        progressPercentage,
      },
    };
  }

  async addSession(tenantId: string, planId: string, dto: CreateSessionItemDto) {
    const plan = await this.prisma.lessonPlan.findFirst({
      where: { id: planId, tenantId },
    });
    if (!plan) {
      throw new NotFoundException('طرح درس یافت نشد');
    }

    const existing = await this.prisma.lessonPlanSession.findUnique({
      where: {
        lessonPlanId_sessionNumber: {
          lessonPlanId: planId,
          sessionNumber: dto.sessionNumber,
        },
      },
    });
    if (existing) {
      throw new ConflictException(`جلسه شماره ${dto.sessionNumber} قبلاً در این طرح درس ثبت شده است`);
    }

    return this.prisma.lessonPlanSession.create({
      data: {
        lessonPlanId: planId,
        sessionNumber: dto.sessionNumber,
        topic: dto.topic,
        objectives: dto.objectives,
        activities: dto.activities,
        plannedDate: dto.plannedDate ? new Date(dto.plannedDate) : undefined,
        status: 'PLANNED',
      },
    });
  }

  async updateSessionStatus(
    tenantId: string,
    sessionId: string,
    dto: UpdateSessionStatusDto,
  ) {
    const session = await this.prisma.lessonPlanSession.findFirst({
      where: { id: sessionId, lessonPlan: { tenantId } },
    });
    if (!session) {
      throw new NotFoundException('جلسه طرح درس یافت نشد');
    }

    return this.prisma.lessonPlanSession.update({
      where: { id: sessionId },
      data: {
        status: dto.status,
        actualDate: dto.actualDate ? new Date(dto.actualDate) : undefined,
        notes: dto.notes,
      },
    });
  }
}
