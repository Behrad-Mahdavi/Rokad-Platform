import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMatterDto } from './dto/create-matter.dto';

@Injectable()
export class MattersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createMatter(
    tenantId: string,
    reportedById: string,
    dto: CreateMatterDto,
  ) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: dto.studentId, tenantId },
    });
    if (!student) {
      throw new NotFoundException('پروفایل دانش‌آموز یافت نشد');
    }

    const matter = await this.prisma.disciplinaryMatter.create({
      data: {
        tenantId,
        studentId: dto.studentId,
        academicYearId: dto.academicYearId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        points: dto.points || 0,
        actionTaken: dto.actionTaken,
        notifiedParents: dto.notifiedParents || false,
        reportedById,
      },
      include: {
        student: { include: { user: true } },
        reportedBy: { select: { firstName: true, lastName: true, role: true } },
      },
    });

    this.eventEmitter.emit('matter.recorded', {
      tenantId,
      studentId: dto.studentId,
      matterType: dto.type,
      points: dto.points,
    });

    return matter;
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
