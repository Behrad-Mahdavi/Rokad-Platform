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
    const where: any = { tenantId, deletedAt: null };

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

    const schoolEvents = await this.prisma.schoolEvent.findMany({
      where,
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    let homeworkEvents: any[] = [];
    try {
      const hwWhere: any = { tenantId };
      if (startDate && endDate) {
        hwWhere.dueDate = {
          gte: new Date(startDate),
          lte: new Date(endDate),
        };
      }
      const homeworks = await this.prisma.homework.findMany({
        where: hwWhere,
        include: {
          lesson: { select: { id: true, name: true } },
          classroom: { select: { id: true, name: true } },
          teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: { dueDate: 'asc' },
      });

      homeworkEvents = homeworks.map((hw) => ({
        id: `hw-${hw.id}`,
        tenantId: hw.tenantId,
        title: `مهلت تکلیف: ${hw.title}`,
        description: hw.description || '',
        eventType: 'HOMEWORK',
        type: 'HOMEWORK',
        startDate: hw.dueDate,
        endDate: hw.dueDate,
        isAllDay: false,
        targetAudience: 'SPECIFIC_CLASSES',
        targetClassIds: [hw.classroomId],
        location: hw.classroom?.name ? `کلاس ${hw.classroom.name}` : undefined,
        tags: ['HOMEWORK', `lesson:${hw.lessonId}`],
        homeworkId: hw.id,
        lessonName: hw.lesson?.name,
        classroomName: hw.classroom?.name,
        createdBy: hw.teacher?.user
          ? {
              firstName: hw.teacher.user.firstName,
              lastName: hw.teacher.user.lastName,
              role: 'TEACHER',
            }
          : undefined,
        createdAt: hw.createdAt,
      }));
    } catch {
      // Non-blocking fallback
    }

    const allEvents = [...schoolEvents, ...homeworkEvents];
    allEvents.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    return allEvents;
  }

  async listAnnouncements(
    tenantId: string,
    audience?: string,
    classroomId?: string,
  ) {
    const where: any = { tenantId, deletedAt: null };

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
      where: { id: eventId, tenantId, deletedAt: null },
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
      where: { id: eventId, tenantId, deletedAt: null },
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
    const where: any = { tenantId, deletedAt: null };

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

    let schoolEvents: any[] = [];
    if (!eventType || eventType === 'ALL' || eventType !== 'HOMEWORK') {
      schoolEvents = await this.prisma.schoolEvent.findMany({
        where,
        include: {
          createdBy: {
            select: { firstName: true, lastName: true, role: true, avatarUrl: true },
          },
        },
        orderBy: { startDate: 'asc' },
      });
    }

    let homeworkEvents: any[] = [];
    if (!eventType || eventType === 'ALL' || eventType === 'HOMEWORK') {
      try {
        const hwWhere: any = { tenantId };
        if (search) {
          hwWhere.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ];
        }
        const homeworks = await this.prisma.homework.findMany({
          where: hwWhere,
          include: {
            lesson: { select: { id: true, name: true } },
            classroom: { select: { id: true, name: true } },
            teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
          orderBy: { dueDate: 'asc' },
        });

        homeworkEvents = homeworks.map((hw) => ({
          id: `hw-${hw.id}`,
          tenantId: hw.tenantId,
          title: `مهلت تکلیف: ${hw.title}`,
          description: hw.description || '',
          eventType: 'HOMEWORK',
          type: 'HOMEWORK',
          startDate: hw.dueDate,
          endDate: hw.dueDate,
          isAllDay: false,
          targetAudience: 'SPECIFIC_CLASSES',
          targetClassIds: [hw.classroomId],
          location: hw.classroom?.name ? `کلاس ${hw.classroom.name}` : undefined,
          tags: ['HOMEWORK', `lesson:${hw.lessonId}`],
          homeworkId: hw.id,
          lessonName: hw.lesson?.name,
          classroomName: hw.classroom?.name,
          createdBy: hw.teacher?.user
            ? {
                firstName: hw.teacher.user.firstName,
                lastName: hw.teacher.user.lastName,
                role: 'TEACHER',
              }
            : undefined,
          createdAt: hw.createdAt,
        }));
      } catch {
        // Non-blocking fallback
      }
    }

    const allEvents = [...schoolEvents, ...homeworkEvents];
    allEvents.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    return allEvents;
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

  async getEventTypes(tenantId: string) {
    const defaultTypes = [
      { code: 'ACADEMIC', titleFa: 'رویداد عمومی / آموزشی', color: 'emerald', baseType: 'ACADEMIC', isDefault: true },
      { code: 'EXAM', titleFa: 'آزمون و امتحان هماهنگ', color: 'amber', baseType: 'EXAM', isDefault: true },
      { code: 'HOMEWORK', titleFa: 'مهلت تحویل تکالیف', color: 'orange', baseType: 'HOMEWORK', isDefault: true },
      { code: 'MEETING', titleFa: 'جلسه اولیاء و مربیان', color: 'purple', baseType: 'MEETING', isDefault: true },
      { code: 'CULTURAL', titleFa: 'جشن و مراسم مدرسه', color: 'rose', baseType: 'CULTURAL', isDefault: true },
      { code: 'SPORTS', titleFa: 'مسابقات و رویداد ورزشی', color: 'blue', baseType: 'SPORTS', isDefault: true },
      { code: 'EXCURSION', titleFa: 'اردو و بازدید علمی', color: 'teal', baseType: 'EXCURSION', isDefault: true },
    ];

    if (!tenantId) return defaultTypes;

    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
      });

      const settings = (tenant?.settings as Record<string, any>) || {};
      if (Array.isArray(settings.eventTypes) && settings.eventTypes.length > 0) {
        return settings.eventTypes;
      }
    } catch {
      // Fallback to default types
    }

    return defaultTypes;
  }

  async updateEventTypes(tenantId: string, eventTypes: any[]) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    const currentSettings = (tenant?.settings as Record<string, any>) || {};
    const updatedSettings = {
      ...currentSettings,
      eventTypes,
    };

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: updatedSettings },
    });

    return { success: true, eventTypes };
  }
}
