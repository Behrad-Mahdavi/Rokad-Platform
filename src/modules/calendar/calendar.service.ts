import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto, UpdateEventDto } from './dto/create-event.dto';

const VALID_PRISMA_EVENT_TYPES: string[] = [
  'ACADEMIC',
  'HOLIDAY',
  'EXAM',
  'MEETING',
  'CULTURAL',
  'SPORTS',
  'EXCURSION',
  'STARTUP_WEEKEND',
];

const DEFAULT_STARTUP_WEEKEND_MODULES = [
  { key: 'IDEA_SUBMISSION', step: 1, enabled: true },
  { key: 'IDEA_HALL', step: 2, enabled: true },
  { key: 'VOTING', step: 3, enabled: true },
  { key: 'TEAM_FORMATION', step: 4, enabled: true },
  { key: 'EVENT_CANVAS', step: 5, enabled: true },
  { key: 'TASK_DEFINITION', step: 6, enabled: true },
  { key: 'PRESENTATION_UPLOAD', step: 7, enabled: true },
  { key: 'LEADERBOARD', step: 8, enabled: true },
];

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async createEvent(
    tenantId: string,
    createdById: string,
    dto: CreateEventDto,
  ) {
    const tags = [...(dto.tags || [])];
    const categoryKey =
      dto.categoryKey ||
      (dto.eventType && !VALID_PRISMA_EVENT_TYPES.includes(dto.eventType)
        ? dto.eventType
        : undefined);

    if (categoryKey) {
      const marker = `categoryKey:${categoryKey}`;
      if (!tags.includes(marker)) tags.push(marker);
    }

    let finalEventType: any = 'ACADEMIC';
    if (dto.eventType && VALID_PRISMA_EVENT_TYPES.includes(dto.eventType)) {
      finalEventType = dto.eventType;
    } else if (categoryKey && VALID_PRISMA_EVENT_TYPES.includes(categoryKey)) {
      finalEventType = categoryKey;
    }

    let workflowModules = dto.workflowModules;
    if (
      (finalEventType === 'STARTUP_WEEKEND' || categoryKey === 'STARTUP_WEEKEND') &&
      (!workflowModules || (Array.isArray(workflowModules) && workflowModules.length === 0))
    ) {
      workflowModules = DEFAULT_STARTUP_WEEKEND_MODULES as any;
    }

    const createData: any = {
      tenantId,
      title: dto.title,
      description: dto.description,
      eventType: finalEventType,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      isAllDay: dto.isAllDay || false,
      targetAudience: dto.targetAudience || 'ALL',
      targetClassIds: dto.targetClassIds || [],
      location: dto.location,
      coverUrl: dto.coverUrl,
      tags,
      workflowModules: workflowModules
        ? (workflowModules as any)
        : undefined,
      createdById,
    };

    return this.prisma.schoolEvent.create({
      data: createData,
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
    await this.ensureDefaultStartupWeekendEvent(tenantId);
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
          select: { firstName: true, lastName: true, role: true, avatarUrl: true },
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
          teacher: { include: { user: { select: { firstName: true, lastName: true, role: true, avatarUrl: true } } } },
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
        location: hw.lesson?.name || (hw.classroom?.name ? (hw.classroom.name.startsWith('کلاس') ? hw.classroom.name : `کلاس ${hw.classroom.name}`) : undefined),
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

  async ensureDefaultStartupWeekendEvent(tenantId: string) {
    if (!tenantId) return null;
    try {
      let event = await this.prisma.schoolEvent.findFirst({
        where: {
          tenantId,
          OR: [
            { id: 'evt_startup_weekend_2026' },
            { eventType: 'STARTUP_WEEKEND' },
            { tags: { has: 'categoryKey:STARTUP_WEEKEND' } },
          ],
        },
        include: {
          createdBy: {
            select: { firstName: true, lastName: true, role: true, avatarUrl: true },
          },
        },
      });

      if (!event) {
        const user = await this.prisma.user.findFirst({
          where: { tenantId },
          orderBy: { createdAt: 'asc' },
        });

        if (user) {
          event = await this.prisma.schoolEvent.create({
            data: {
              id: 'evt_startup_weekend_2026',
              tenantId,
              title: 'استارت‌آپ ویکند نوآوری و طراحی نرم‌افزار',
              description: 'رویداد ایده‌پردازی، رای‌گیری، تشکیل تیم و بوم مدل کسب‌وکار ویژه هنرجویان و دانش‌آموزان نوآور',
              eventType: 'STARTUP_WEEKEND',
              startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
              endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
              isAllDay: true,
              targetAudience: 'ALL',
              location: 'سالن همایش و آمفی‌تئاتر هنرستان',
              tags: ['استارت‌آپ ویکند', 'ایده‌پردازی', 'تیم‌سازی', 'نوآوری', 'categoryKey:STARTUP_WEEKEND'],
              workflowModules: DEFAULT_STARTUP_WEEKEND_MODULES as any,
              createdById: user.id,
            },
            include: {
              createdBy: {
                select: { firstName: true, lastName: true, role: true, avatarUrl: true },
              },
            },
          });
        }
      }
      return event;
    } catch {
      return null;
    }
  }

  async getEventById(tenantId: string, eventId: string): Promise<any> {
    if (eventId.startsWith('hw-')) {
      const hwId = eventId.replace('hw-', '');
      const hw = await this.prisma.homework.findFirst({
        where: { id: hwId, tenantId },
        include: {
          lesson: { select: { id: true, name: true } },
          classroom: { select: { id: true, name: true } },
          teacher: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  role: true,
                  avatarUrl: true,
                  phone: true,
                },
              },
            },
          },
          tenant: {
            select: { id: true, name: true, slug: true, theme: true, logoUrl: true },
          },
        },
      });

      if (hw) {
        return {
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
          location:
            hw.lesson?.name ||
            (hw.classroom?.name
              ? hw.classroom.name.startsWith('کلاس')
                ? hw.classroom.name
                : `کلاس ${hw.classroom.name}`
              : undefined),
          tags: ['HOMEWORK', `lesson:${hw.lessonId}`],
          homeworkId: hw.id,
          lessonName: hw.lesson?.name,
          classroomName: hw.classroom?.name,
          createdBy: hw.teacher?.user || undefined,
          tenant: hw.tenant,
          createdAt: hw.createdAt,
        };
      }
    }

    let event = await this.prisma.schoolEvent.findFirst({
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

    if (!event && eventId === 'evt_startup_weekend_2026') {
      await this.ensureDefaultStartupWeekendEvent(tenantId);
      event = await this.prisma.schoolEvent.findFirst({
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
    }

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
    let existing = await this.prisma.schoolEvent.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });

    if (!existing && eventId === 'evt_startup_weekend_2026') {
      await this.ensureDefaultStartupWeekendEvent(tenantId);
      existing = await this.prisma.schoolEvent.findFirst({
        where: { id: eventId, tenantId, deletedAt: null },
      });
    }

    if (!existing) {
      throw new NotFoundException('رویداد مورد نظر یافت نشد');
    }

    let nextTags: string[] | undefined;
    const categoryKey =
      dto.categoryKey ||
      (dto.eventType && !VALID_PRISMA_EVENT_TYPES.includes(dto.eventType)
        ? dto.eventType
        : undefined);

    if (dto.tags || categoryKey) {
      const base = dto.tags || (existing.tags as string[]) || [];
      nextTags = [...base];
      if (categoryKey) {
        nextTags = nextTags.filter((t) => !String(t).startsWith('categoryKey:'));
        nextTags.push(`categoryKey:${categoryKey}`);
      }
    }

    let finalEventType: any = undefined;
    if (dto.eventType) {
      if (VALID_PRISMA_EVENT_TYPES.includes(dto.eventType)) {
        finalEventType = dto.eventType;
      } else {
        finalEventType = 'ACADEMIC';
      }
    }

    let nextWorkflowModules = dto.workflowModules;
    if (
      (finalEventType === 'STARTUP_WEEKEND' || categoryKey === 'STARTUP_WEEKEND') &&
      (!existing.workflowModules ||
        (Array.isArray(existing.workflowModules) && (existing.workflowModules as any).length === 0)) &&
      (!nextWorkflowModules ||
        (Array.isArray(nextWorkflowModules) && nextWorkflowModules.length === 0))
    ) {
      nextWorkflowModules = DEFAULT_STARTUP_WEEKEND_MODULES as any;
    }

    return this.prisma.schoolEvent.update({
      where: { id: eventId },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(finalEventType ? { eventType: finalEventType } : {}),
        ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
        ...(dto.isAllDay !== undefined ? { isAllDay: dto.isAllDay } : {}),
        ...(dto.targetAudience ? { targetAudience: dto.targetAudience } : {}),
        ...(dto.targetClassIds ? { targetClassIds: dto.targetClassIds } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.coverUrl !== undefined ? { coverUrl: dto.coverUrl } : {}),
        ...(nextTags ? { tags: nextTags } : {}),
        ...(nextWorkflowModules !== undefined
          ? { workflowModules: nextWorkflowModules as any }
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
    await this.ensureDefaultStartupWeekendEvent(tenantId);
    const where: any = { tenantId, deletedAt: null };
    const conditions: any[] = [];

    if (eventType && eventType !== 'ALL') {
      if (eventType === 'HOMEWORK') {
        // Will only fetch homeworks
      } else if (VALID_PRISMA_EVENT_TYPES.includes(eventType)) {
        conditions.push({
          OR: [
            { eventType: eventType as any },
            { tags: { has: `categoryKey:${eventType}` } },
          ],
        });
      } else {
        conditions.push({
          tags: { has: `categoryKey:${eventType}` },
        });
      }
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

    let schoolEvents: any[] = [];
    if (!eventType || eventType !== 'HOMEWORK') {
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
          location: hw.lesson?.name || (hw.classroom?.name ? (hw.classroom.name.startsWith('کلاس') ? hw.classroom.name : `کلاس ${hw.classroom.name}`) : undefined),
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
    let event = await this.prisma.schoolEvent.findFirst({
      where: { id: eventId, tenantId },
    });
    if (!event && eventId === 'evt_startup_weekend_2026') {
      await this.ensureDefaultStartupWeekendEvent(tenantId);
      event = await this.prisma.schoolEvent.findFirst({
        where: { id: eventId, tenantId },
      });
    }
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
      { code: 'STARTUP_WEEKEND', titleFa: 'استارت‌آپ ویکند', color: 'violet', baseType: 'STARTUP_WEEKEND', isDefault: true },
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

  private static readonly DEFAULT_EVENT_CATEGORIES = [
    { key: 'STARTUP_WEEKEND', label: 'استارت‌آپ ویکند', icon: 'Rocket', color: '', removable: true },
    { key: 'ACADEMIC', label: 'آموزشی و مهارت', icon: 'BookOpen', color: '', removable: true },
    { key: 'CULTURAL', label: 'فرهنگی و جشن‌ها', icon: 'PartyPopper', color: '', removable: true },
    { key: 'SPORTS', label: 'مسابقات و ورزش', icon: 'Trophy', color: '', removable: true },
    { key: 'EXAM', label: 'آزمون‌ها و سنجش', icon: 'Flame', color: '', removable: true },
    { key: 'EXCURSION', label: 'اردو و بازدید علمی', icon: 'Compass', color: '', removable: true },
    { key: 'MEETING', label: 'جلسات و شورا', icon: 'Users', color: '', removable: true },
    { key: 'HOLIDAY', label: 'تعطیلی و مناسبت', icon: 'CalendarDays', color: '', removable: true },
  ];

  private getEventCategoriesFromSettings(settings: any): any[] | null {
    if (settings && typeof settings === 'object' && Array.isArray(settings.eventCategories)) {
      return settings.eventCategories;
    }
    return null;
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
    const existing = this.getEventCategoriesFromSettings(tenant?.settings);

    // Seed defaults only on first initialization. Never re-add deleted defaults.
    if (existing !== null) {
      const hasStartup = existing.some((c) => c.key === 'STARTUP_WEEKEND');
      if (!hasStartup) {
        const startupDefault = CalendarService.DEFAULT_EVENT_CATEGORIES.find((d) => d.key === 'STARTUP_WEEKEND');
        if (startupDefault) {
          const merged = [startupDefault, ...existing];
          await this.saveEventCategories(tenantId, merged);
          return merged;
        }
      }
      return existing;
    }

    const next = CalendarService.DEFAULT_EVENT_CATEGORIES.map((d) => ({ ...d }));
    await this.saveEventCategories(tenantId, next);
    return next;
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
    const next = existing.filter((c) => c.key !== key);
    await this.saveEventCategories(tenantId, next);
    return { message: 'دسته‌بندی با موفقیت حذف شد' };
  }
}
