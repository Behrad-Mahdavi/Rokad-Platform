import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
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
    const tags = [...(dto.tags || [])];
    if (dto.categoryKey) {
      const marker = `categoryKey:${dto.categoryKey}`;
      if (!tags.includes(marker)) tags.push(marker);
    }

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
        tags,
        workflowModules: dto.workflowModules
          ? (dto.workflowModules as any)
          : undefined,
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
      where: { id: eventId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('رویداد مورد نظر یافت نشد');
    }

    let nextTags: string[] | undefined;
    if (dto.tags || dto.categoryKey) {
      const base = dto.tags || (existing.tags as string[]) || [];
      nextTags = [...base];
      if (dto.categoryKey) {
        nextTags = nextTags.filter((t) => !String(t).startsWith('categoryKey:'));
        nextTags.push(`categoryKey:${dto.categoryKey}`);
      } else {
        nextTags = nextTags.filter((t) => !String(t).startsWith('categoryKey:'));
      }
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
        ...(nextTags ? { tags: nextTags } : {}),
        ...(dto.workflowModules !== undefined
          ? { workflowModules: dto.workflowModules as any }
          : {}),
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
    const conditions: any[] = [];

    if (eventType && eventType !== 'ALL') {
      where.eventType = eventType;
    }

    if (audience && audience !== 'ALL') {
      conditions.push({
        OR: [
          { targetAudience: 'ALL' },
          { targetAudience: audience },
        ],
      });
    }

    if (search) {
      conditions.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
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

  private getEventCategoriesFromSettings(settings: any): any[] {
    if (settings && typeof settings === 'object' && Array.isArray(settings.eventCategories)) {
      return settings.eventCategories;
    }
    return [];
  }

  private async saveEventCategories(tenantId: string, categories: any[]) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const settings = tenant?.settings && typeof tenant.settings === 'object' ? { ...(tenant.settings as any) } : {};
    settings.eventCategories = categories;
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: settings as any },
    });
    return categories;
  }

  async listEventCategories(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    return this.getEventCategoriesFromSettings(tenant?.settings);
  }

  async createEventCategory(tenantId: string, category: any) {
    const existing = await this.listEventCategories(tenantId);
    if (existing.some((c) => c.key === category.key)) {
      throw new ConflictException('کلید این دسته‌بندی قبلاً ثبت شده است');
    }
    const next = [...existing, { removable: true, ...category }];
    await this.saveEventCategories(tenantId, next);
    return { message: 'دسته‌بندی با موفقیت ایجاد شد', data: next[next.length - 1] };
  }

  async updateEventCategory(tenantId: string, key: string, dto: any) {
    const existing = await this.listEventCategories(tenantId);
    const idx = existing.findIndex((c) => c.key === key);
    if (idx === -1) {
      throw new NotFoundException('دسته‌بندی مورد نظر یافت نشد');
    }
    const updated = { ...existing[idx], ...(dto.label ? { label: dto.label } : {}), ...(dto.icon !== undefined ? { icon: dto.icon } : {}), ...(dto.color !== undefined ? { color: dto.color } : {}) };
    const next = existing.map((c, i) => (i === idx ? updated : c));
    await this.saveEventCategories(tenantId, next);
    return { message: 'دسته‌بندی با موفقیت ویرایش شد', data: updated };
  }

  async deleteEventCategory(tenantId: string, key: string) {
    const existing = await this.listEventCategories(tenantId);
    const target = existing.find((c) => c.key === key);
    if (!target) {
      throw new NotFoundException('دسته‌بندی مورد نظر یافت نشد');
    }
    if (target.removable === false) {
      throw new BadRequestException('این دسته‌بندی پیش‌فرض قابل حذف نیست');
    }
    const next = existing.filter((c) => c.key !== key);
    await this.saveEventCategories(tenantId, next);
    return { message: 'دسته‌بندی با موفقیت حذف شد' };
  }
}
