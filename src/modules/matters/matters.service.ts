import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMatterDto } from './dto/create-matter.dto';

import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MattersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createMatter(
    tenantId: string,
    reportedById: string,
    dto: CreateMatterDto,
  ) {
    let student = await this.prisma.studentProfile.findFirst({
      where: { id: dto.studentId, tenantId },
      include: { user: true },
    });
    if (!student) {
      const enrollment = await this.prisma.classEnrollment.findUnique({
        where: { id: dto.studentId },
        include: { student: { include: { user: true } } },
      });
      if (enrollment?.student) {
        student = enrollment.student;
      } else {
        student = await this.prisma.studentProfile.findFirst({
          where: { userId: dto.studentId, tenantId },
          include: { user: true },
        });
      }
    }
    if (!student) {
      throw new NotFoundException('پروفایل دانش‌آموز یافت نشد');
    }

    let academicYearId = dto.academicYearId;
    if (!academicYearId) {
      const currentYear = await this.prisma.academicYear.findFirst({
        where: { tenantId, isCurrent: true },
      });
      academicYearId = currentYear ? currentYear.id : (await this.prisma.academicYear.findFirst({ where: { tenantId } }))?.id || '';
    }

    const shouldNotifyParents = dto.notifiedParents !== undefined ? dto.notifiedParents : true;

    const matter = await this.prisma.disciplinaryMatter.create({
      data: {
        tenantId,
        studentId: student.id,
        academicYearId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        points: dto.points || 0,
        actionTaken: dto.actionTaken,
        notifiedParents: shouldNotifyParents,
        reportedById,
      },
      include: {
        student: { include: { user: true } },
        reportedBy: { select: { firstName: true, lastName: true, role: true } },
      },
    });

    this.eventEmitter.emit('matter.recorded', {
      tenantId,
      studentId: student.id,
      matterType: dto.type,
      points: dto.points,
    });

    // 1. Push notification to student
    const isPositive = dto.type === 'POSITIVE';
    const studentTitle = isPositive ? '🌟 ثبت مورد تشویقی جدید' : '⚠️ ثبت مورد انضباطی در پرونده';
    const pointsStr = dto.points !== undefined && dto.points !== 0 ? ` (${dto.points > 0 ? `+${dto.points}` : dto.points} امتیاز)` : '';
    const studentBody = isPositive
      ? `مورد تشویقی «${dto.title}»${pointsStr} در کارنامه انضباطی شما ثبت گردید.`
      : `مورد انضباطی «${dto.title}»${pointsStr} در پرونده رفتاری شما ثبت شد.`;

    if (student.userId) {
      this.notificationsService
        .sendPushToUser(student.userId, {
          title: studentTitle,
          body: studentBody,
          url: '/app/student/matters',
          tag: `matter-${matter.id}`,
        })
        .catch(() => {});
    }

    // 2. Push notification to linked parent(s)
    if (shouldNotifyParents) {
      const studentName = `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim() || 'فرزند شما';
      const parentLinks = await this.prisma.parentStudentLink.findMany({
        where: { studentId: student.id },
        include: { parent: true },
      });

      const parentTitle = isPositive
        ? `🌟 تشویق ثبت‌شده برای ${studentName}`
        : `⚠️ گزارش انضباطی فرزند: ${studentName}`;
      const parentBody = isPositive
        ? `مورد تشویقی «${dto.title}»${pointsStr} برای ${studentName} در سامانه مدرسه ثبت گردید.`
        : `مورد انضباطی «${dto.title}»${pointsStr} برای ${studentName} به اولیا گزارش گردید.`;

      for (const link of parentLinks) {
        if (link.parent?.userId) {
          this.notificationsService
            .sendPushToUser(link.parent.userId, {
              title: parentTitle,
              body: parentBody,
              url: '/app/student/matters',
              tag: `matter-parent-${matter.id}`,
            })
            .catch(() => {});
        }
      }
    }

    return matter;
  }

  async deleteMatter(tenantId: string, matterId: string) {
    const matter = await this.prisma.disciplinaryMatter.findFirst({
      where: { id: matterId, tenantId },
    });
    if (!matter) {
      throw new NotFoundException('مورد انضباطی مورد نظر یافت نشد');
    }

    return this.prisma.disciplinaryMatter.delete({
      where: { id: matterId },
    });
  }

  async getMyMatters(tenantId: string, user: any) {
    if (user.role === 'STUDENT') {
      const student = await this.prisma.studentProfile.findFirst({
        where: { userId: user.id, tenantId },
      });
      if (!student) return { matters: [], totalPoints: 0, positiveCount: 0, negativeCount: 0 };
      return this.getStudentMatters(tenantId, student.id);
    } else if (user.role === 'PARENT') {
      const parent = await this.prisma.parentProfile.findFirst({
        where: { userId: user.id, tenantId },
        include: { studentLinks: { include: { student: true } } },
      });
      if (!parent || parent.studentLinks.length === 0) {
        return { matters: [], totalPoints: 0, positiveCount: 0, negativeCount: 0 };
      }
      const studentId = parent.studentLinks[0].studentId;
      return this.getStudentMatters(tenantId, studentId);
    } else {
      return this.listMatters(tenantId);
    }
  }

  async getStudentMatters(tenantId: string, studentId: string) {
    const matters = await this.prisma.disciplinaryMatter.findMany({
      where: { tenantId, studentId },
      include: {
        reportedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { reportedAt: 'desc' },
    });

    const totalPoints = matters.reduce((sum, m) => sum + m.points, 0);

    return {
      matters,
      totalPoints,
      positiveCount: matters.filter((m) => m.type === 'POSITIVE').length,
      negativeCount: matters.filter(
        (m) => m.type === 'NEGATIVE' || m.type === 'WARNING' || m.type === 'SUSPENSION',
      ).length,
    };
  }

  async listMatters(tenantId: string, type?: string) {
    return this.prisma.disciplinaryMatter.findMany({
      where: {
        tenantId,
        ...(type ? { type: type as any } : {}),
      },
      include: {
        student: { include: { user: true } },
        reportedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { reportedAt: 'desc' },
    });
  }
}
