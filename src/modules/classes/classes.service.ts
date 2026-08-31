import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateLessonDto,
  CreateClassroomDto,
  EnrollStudentDto,
  CreateScheduleDto,
} from './dto/create-lesson.dto';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Lessons
  async listLessons(tenantId: string, levelId?: string, fieldId?: string) {
    return this.prisma.lesson.findMany({
      where: {
        tenantId,
        ...(levelId ? { levelId } : {}),
        ...(fieldId ? { fieldId } : {}),
      },
      include: {
        level: true,
        field: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async createLesson(tenantId: string, dto: CreateLessonDto) {
    const existing = await this.prisma.lesson.findFirst({
      where: { tenantId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`درسی با کد '${dto.code}' قبلاً در این مدرسه ثبت شده است`);
    }

    return this.prisma.lesson.create({
      data: {
        tenantId,
        levelId: dto.levelId,
        fieldId: dto.fieldId,
        name: dto.name,
        code: dto.code,
        unitCount: dto.unitCount || 1,
        type: dto.type || 'GENERAL',
        description: dto.description,
      },
      include: {
        level: true,
        field: true,
      },
    });
  }

  // 2. Classrooms
  async listClassrooms(tenantId: string, academicYearId?: string) {
    return this.prisma.classroom.findMany({
      where: {
        tenantId,
        ...(academicYearId ? { academicYearId } : {}),
      },
      include: {
        level: true,
        field: true,
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            schedules: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createClassroom(tenantId: string, dto: CreateClassroomDto) {
    const existing = await this.prisma.classroom.findFirst({
      where: {
        tenantId,
        academicYearId: dto.academicYearId,
        OR: [{ name: dto.name }, { code: dto.code }],
      },
    });
    if (existing) {
      throw new ConflictException('کلاسی با این نام یا کد در این سال تحصیلی قبلاً ثبت شده است');
    }

    return this.prisma.classroom.create({
      data: {
        tenantId,
        academicYearId: dto.academicYearId,
        levelId: dto.levelId,
        fieldId: dto.fieldId,
        mentorId: dto.mentorId,
        name: dto.name,
        code: dto.code,
        capacity: dto.capacity || 30,
        roomNumber: dto.roomNumber,
      },
      include: {
        level: true,
        field: true,
      },
    });
  }

  async getClassroomDetails(tenantId: string, classroomId: string) {
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: classroomId, tenantId },
      include: {
        level: true,
        field: true,
        mentor: true,
        enrollments: {
          include: {
            student: {
              include: {
                user: true,
              },
            },
          },
        },
        schedules: {
          include: {
            lesson: true,
            teacher: {
              include: {
                user: true,
              },
            },
          },
          orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
        },
      },
    });

    if (!classroom) {
      throw new NotFoundException('کلاس درس مورد نظر یافت نشد');
    }
    return classroom;
  }

  // 3. Class Enrollment
  async enrollStudent(tenantId: string, dto: EnrollStudentDto) {
    // Check classroom and capacity
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: dto.classroomId, tenantId },
      include: {
        _count: { select: { enrollments: true } },
      },
    });
    if (!classroom) {
      throw new NotFoundException('کلاس درس یافت نشد');
    }

    if (classroom._count.enrollments >= classroom.capacity) {
      throw new BadRequestException('ظرفیت کلاس تکمیل شده است');
    }

    // Check student
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: dto.studentId, tenantId },
    });
    if (!student) {
      throw new NotFoundException('پروفایل دانش‌آموز یافت نشد');
    }

    // Check if already enrolled in this class
    const existing = await this.prisma.classEnrollment.findFirst({
      where: {
        classroomId: dto.classroomId,
        studentId: dto.studentId,
      },
    });
    if (existing) {
      throw new ConflictException('دانش‌آموز قبلاً در این کلاس ثبت‌نام شده است');
    }

    return this.prisma.classEnrollment.create({
      data: {
        tenantId,
        academicYearId: dto.academicYearId,
        classroomId: dto.classroomId,
        studentId: dto.studentId,
        status: 'ACTIVE',
      },
      include: {
        classroom: true,
        student: {
          include: { user: true },
        },
      },
    });
  }

  async listEnrolledStudents(tenantId: string, classroomId: string) {
    return this.prisma.classEnrollment.findMany({
      where: { tenantId, classroomId },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  // 4. Class Schedules (Timetable with Conflict Detection)
  async createSchedule(tenantId: string, dto: CreateScheduleDto) {
    // 1. Check classroom conflict
    const classroomConflict = await this.prisma.classSchedule.findFirst({
      where: {
        tenantId,
        classroomId: dto.classroomId,
        dayOfWeek: dto.dayOfWeek,
        periodNumber: dto.periodNumber,
      },
      include: { lesson: true },
    });

    if (classroomConflict) {
      throw new ConflictException(
        `تداخل برنامه: در این زنگ (${dto.periodNumber}) از روز ${dto.dayOfWeek} درس '${classroomConflict.lesson.name}' برای این کلاس تعریف شده است`,
      );
    }

    // 2. Check teacher conflict
    const teacherConflict = await this.prisma.classSchedule.findFirst({
      where: {
        tenantId,
        teacherId: dto.teacherId,
        dayOfWeek: dto.dayOfWeek,
        periodNumber: dto.periodNumber,
      },
      include: { classroom: true },
    });

    if (teacherConflict) {
      throw new ConflictException(
        `تداخل برنامه معلم: این استاد در این روز و زنگ کلاسی، در '${teacherConflict.classroom.name}' تدریس دارد`,
      );
    }

    return this.prisma.classSchedule.create({
      data: {
        tenantId,
        classroomId: dto.classroomId,
        lessonId: dto.lessonId,
        teacherId: dto.teacherId,
        dayOfWeek: dto.dayOfWeek,
        periodNumber: dto.periodNumber,
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
      include: {
        lesson: true,
        teacher: {
          include: { user: true },
        },
      },
    });
  }

  async getClassSchedule(tenantId: string, classroomId: string) {
    return this.prisma.classSchedule.findMany({
      where: { tenantId, classroomId },
      include: {
        lesson: true,
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
    });
  }

  async getTeacherSchedule(tenantId: string, teacherId: string) {
    return this.prisma.classSchedule.findMany({
      where: { tenantId, teacherId },
      include: {
        classroom: true,
        lesson: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
    });
  }
}
