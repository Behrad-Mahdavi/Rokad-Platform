import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async createEvent(
    tenantId: string,
    createdById: string,
    dto: CreateEventDto,
  ) {
    return this.prisma.schoolEvent.create({
      data: {
        tenantId,
        title: dto.title,
        description: dto.description,
        eventType: dto.eventType || 'ACADEMIC',
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isAllDay: dto.isAllDay || false,
        targetAudience: dto.targetAudience || 'ALL',
        targetClassIds: dto.targetClassIds || [],
        location: dto.location,
        createdById,
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true, role: true },
        },
      },
    });
  }

  async listEvents(
    tenantId: string,
    startDate?: string,
    endDate?: string,
    audience?: string,
  ) {
    const where: any = { tenantId };

    if (startDate && endDate) {
      where.AND = [
        { startDate: { lte: new Date(endDate) } },
        { endDate: { gte: new Date(startDate) } },
      ];
    }

    if (audience && audience !== 'ALL') {
      where.OR = [
        { targetAudience: 'ALL' },
        { targetAudience: audience },
      ];
    }

    return this.prisma.schoolEvent.findMany({
      where,
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async listAnnouncements(
    tenantId: string,
    audience?: string,
    classroomId?: string,
  ) {
    const where: any = { tenantId };

    const conditions: any[] = [];
    if (audience && audience !== 'ALL') {
      conditions.push({
        OR: [{ targetAudience: 'ALL' }, { targetAudience: audience }],
      });
    }

    if (classroomId) {
      conditions.push({
        OR: [
          { targetAudience: { not: 'SPECIFIC_CLASSES' } },
          { targetClassIds: { has: classroomId } },
        ],
      });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    return this.prisma.schoolEvent.findMany({
      where,
      include: {
        createdBy: {
          select: { firstName: true, lastName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteEvent(tenantId: string, eventId: string) {
    const event = await this.prisma.schoolEvent.findFirst({
      where: { id: eventId, tenantId },
    });
    if (!event) {
      throw new NotFoundException('رویداد مورد نظر یافت نشد');
    }

    await this.prisma.schoolEvent.delete({
      where: { id: eventId },
    });
    return { message: 'رویداد با موفقیت حذف گردید' };
  }
}
