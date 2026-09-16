import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto, UpdateEventDto } from './dto/create-event.dto';

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
        coverUrl: dto.coverUrl,
        tags: dto.tags || [],
        createdById,
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true, role: true, avatarUrl: true },
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

  async getEventById(tenantId: string, eventId: string): Promise<any> {
    const event = await this.prisma.schoolEvent.findFirst({
      where: { id: eventId, tenantId },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true, role: true, avatarUrl: true, phone: true },
        },
        tenant: {
          select: { id: true, name: true, slug: true, theme: true, logoUrl: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('رویداد مورد نظر یافت نشد');
    }

    return event;
  }

  async updateEvent(
    tenantId: string,
    eventId: string,
    dto: UpdateEventDto,
  ): Promise<any> {
    const existing = await this.prisma.schoolEvent.findFirst({
      where: { id: eventId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('رویداد مورد نظر یافت نشد');
    }

    return this.prisma.schoolEvent.update({
      where: { id: eventId },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.eventType ? { eventType: dto.eventType } : {}),
        ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
        ...(dto.isAllDay !== undefined ? { isAllDay: dto.isAllDay } : {}),
        ...(dto.targetAudience ? { targetAudience: dto.targetAudience } : {}),
        ...(dto.targetClassIds ? { targetClassIds: dto.targetClassIds } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.coverUrl !== undefined ? { coverUrl: dto.coverUrl } : {}),
        ...(dto.tags ? { tags: dto.tags } : {}),
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true, role: true, avatarUrl: true },
        },
      },
    });
  }

  async listRoadmapEvents(
    tenantId: string,
    eventType?: string,
    audience?: string,
    search?: string,
  ): Promise<any> {
    const where: any = { tenantId };

    if (eventType && eventType !== 'ALL') {
      where.eventType = eventType;
    }

    if (audience && audience !== 'ALL') {
      where.OR = [
        { targetAudience: 'ALL' },
        { targetAudience: audience },
      ];
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.schoolEvent.findMany({
      where,
      include: {
        createdBy: {
          select: { firstName: true, lastName: true, role: true, avatarUrl: true },
        },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async deleteEvent(tenantId: string, eventId: string): Promise<any> {
    const event = await this.prisma.schoolEvent.findFirst({
      where: { id: eventId, tenantId },
    });
    if (!event) {
      throw new NotFoundException('رویداد مورد نظر یافت نشد');
    }

    await this.prisma.schoolEvent.update({
      where: { id: eventId },
      data: { deletedAt: new Date() },
    });
    return { message: 'رویداد با موفقیت حذف گردید' };
  }

  async restoreEvent(tenantId: string, eventId: string): Promise<any> {
    const event = await this.prisma.schoolEvent.findFirst({
      where: { id: eventId, tenantId, deletedAt: { not: null } },
    });
    if (!event) {
      throw new NotFoundException('رویداد حذف‌شده مورد نظر یافت نشد');
    }

    const restored = await this.prisma.schoolEvent.update({
      where: { id: eventId },
      data: { deletedAt: null },
    });
    return { message: 'رویداد با موفقیت بازگردانده شد', data: restored };
  }
}
