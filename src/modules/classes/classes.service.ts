import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/constants';
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
  async listLessons(
    tenantId: string,
    levelId?: string,
    fieldId?: string,
    user?: any,
    teacherId?: string,
  ) {
    const where: any = {
      tenantId,
      ...(levelId ? { levelId } : {}),
      ...(fieldId ? { fieldId } : {}),
    };

    let effectiveTeacherId = teacherId;
    if (!effectiveTeacherId && user?.role === Role.TEACHER) {
      const teacher = await this.prisma.teacherProfile.findFirst({
        where: { userId: user.id, tenantId },
      });
      if (teacher) {
        effectiveTeacherId = teacher.id;
      }
    }

    if (effectiveTeacherId) {
      where.OR = [
        { teacherLessons: { some: { teacherId: effectiveTeacherId } } },
        { schedules: { some: { teacherId: effectiveTeacherId } } },
      ];
    }

    return this.prisma.lesson.findMany({
      where,
      include: {
        level: true,
        field: true,
        teacherLessons: {
          include: {
            teacher: {
              include: {
                user: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createLesson(tenantId: string, dto: CreateLessonDto) {
    let levelId =
      dto.levelId && typeof dto.levelId === 'string' && dto.levelId.trim() !== ''
        ? dto.levelId.trim()
        : undefined;

    if (!levelId) {
      const defaultLevel = await this.prisma.educationalLevel.findFirst({
        where: { tenantId },
        orderBy: { orderIndex: 'asc' },
      });
      if (defaultLevel) {
        levelId = defaultLevel.id;
      } else {
        const createdLevel = await this.prisma.educationalLevel.create({
          data: {
            tenantId,
            name: 'پایه دهم',
            code: 'LVL-DEFAULT',
            orderIndex: 1,
          },
        });
        levelId = createdLevel.id;
      }
    }

    const existing = await this.prisma.lesson.findFirst({
      where: { tenantId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`درسی با کد '${dto.code}' قبلاً در این مدرسه ثبت شده است`);
    }

    const sanitizedFieldId =
      dto.fieldId && typeof dto.fieldId === 'string' && dto.fieldId.trim() !== ''
        ? dto.fieldId.trim()
        : undefined;

    const unitCount =
      dto.unitCount !== undefined && dto.unitCount !== null
        ? Number(dto.unitCount)
        : (dto as any).units
        ? Number((dto as any).units)
        : 1;

    return this.prisma.lesson.create({
      data: {
        tenantId,
        levelId: levelId!,
        fieldId: sanitizedFieldId,
        name: dto.name,
        code: dto.code,
        unitCount: unitCount > 0 ? unitCount : 1,
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
  async listClassrooms(tenantId: string, academicYearId?: string, user?: any) {
    const whereClause: any = { tenantId };
    if (academicYearId) {
      whereClause.academicYearId = academicYearId;
    }

    if (user?.role === Role.STUDENT) {
      const student = await this.prisma.studentProfile.findFirst({
        where: { userId: user.id, tenantId },
        include: {
          enrollments: {
            where: { status: 'ACTIVE' },
            select: { classroomId: true },
          },
        },
      });
      const classIds = student?.enrollments.map((e) => e.classroomId) || [];
      whereClause.id = { in: classIds };
    } else if (user?.role === Role.PARENT) {
      const parent = await this.prisma.parentProfile.findFirst({
        where: { userId: user.id, tenantId },
        include: {
          studentLinks: {
            include: {
              student: {
                include: {
                  enrollments: {
                    where: { status: 'ACTIVE' },
                    select: { classroomId: true },
                  },
                },
              },
            },
          },
        },
      });
      const classIds =
        parent?.studentLinks.flatMap((link) => link.student.enrollments.map((e) => e.classroomId)) || [];
      whereClause.id = { in: classIds };
    } else if (user?.role === Role.TEACHER) {
      const teacher = await this.prisma.teacherProfile.findFirst({
        where: { userId: user.id, tenantId },
      });
      if (teacher) {
        const teacherClassroomsCount = await this.prisma.classroom.count({
          where: {
            tenantId,
            OR: [
              { schedules: { some: { teacherId: teacher.id } } },
              { mentorId: user.id },
            ],
          },
        });
        if (teacherClassroomsCount > 0) {
          whereClause.OR = [
            { schedules: { some: { teacherId: teacher.id } } },
            { mentorId: user.id },
          ];
        }
      }
    }

    return this.prisma.classroom.findMany({
      where: whereClause,
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
    let academicYearId = dto.academicYearId;
    if (!academicYearId) {
      const currentYear =
        (await this.prisma.academicYear.findFirst({
          where: { tenantId, isCurrent: true },
        })) ||
        (await this.prisma.academicYear.findFirst({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
        }));
      if (!currentYear) {
        throw new BadRequestException('ابتدا باید حداقل یک سال تحصیلی در مدرسه تعریف شود');
      }
      academicYearId = currentYear.id;
    }

    let levelId = dto.levelId;
    if (!levelId) {
      const defaultLevel = await this.prisma.educationalLevel.findFirst({
        where: { tenantId },
        orderBy: { orderIndex: 'asc' },
      });
      if (defaultLevel) {
        levelId = defaultLevel.id;
      } else {
        const createdLevel = await this.prisma.educationalLevel.create({
          data: {
            tenantId,
            name: 'پایه عمومی',
            code: 'LVL-DEFAULT',
            orderIndex: 1,
          },
        });
        levelId = createdLevel.id;
      }
    }

    const existing = await this.prisma.classroom.findFirst({
      where: {
        tenantId,
        academicYearId,
        OR: [{ name: dto.name }, { code: dto.code }],
      },
    });
    if (existing) {
      throw new ConflictException('کلاسی با این نام یا کد در این سال تحصیلی قبلاً ثبت شده است');
    }

    let fieldId = dto.fieldId && dto.fieldId.trim() !== '' ? dto.fieldId : undefined;
    if (!fieldId) {
      const defaultField = await this.prisma.studyField.findFirst({
        where: { tenantId, levelId },
      });
      if (defaultField) {
        fieldId = defaultField.id;
      }
    }

    return this.prisma.classroom.create({
      data: {
        tenantId,
        academicYearId: academicYearId!,
        levelId: levelId!,
        fieldId,
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
    // 1. If slot already has a schedule in this classroom, check for conflict / replacement
    const existingSlot = await this.prisma.classSchedule.findFirst({
      where: {
        tenantId,
        classroomId: dto.classroomId,
        dayOfWeek: dto.dayOfWeek,
        periodNumber: dto.periodNumber,
      },
    });

    if (existingSlot && !dto.replaceExisting) {
      throw new ConflictException(
        `تداخل برنامه: در زنگ ${dto.periodNumber} از روز ${dto.dayOfWeek} قبلاً درسی برای این کلاس تعریف شده است`,
      );
    }

    // 2. Check teacher conflict in another classroom
    const teacherConflict = await this.prisma.classSchedule.findFirst({
      where: {
        tenantId,
        teacherId: dto.teacherId,
        dayOfWeek: dto.dayOfWeek,
        periodNumber: dto.periodNumber,
        ...(existingSlot ? { id: { not: existingSlot.id } } : {}),
      },
      include: { classroom: true },
    });

    if (teacherConflict) {
      throw new ConflictException(
        `تداخل برنامه دبیر: این استاد در این روز و زنگ کلاسی، در کلاس '${teacherConflict.classroom.name}' تدریس دارد`,
      );
    }

    if (existingSlot && dto.replaceExisting) {
      await this.prisma.classSchedule.delete({
        where: { id: existingSlot.id },
      });
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
        lesson: {
          include: {
            level: true,
            field: true,
          },
        },
        teacher: {
          include: { user: true },
        },
      },
    });
  }

  async deleteSchedule(tenantId: string, scheduleId: string) {
    const schedule = await this.prisma.classSchedule.findFirst({
      where: { id: scheduleId, tenantId },
    });
    if (!schedule) {
      throw new NotFoundException('برنامه کلاسی مورد نظر یافت نشد');
    }

    return this.prisma.classSchedule.delete({
      where: { id: scheduleId },
    });
  }

  async getClassSchedule(tenantId: string, classroomId: string, user?: any) {
    if (user?.role === Role.STUDENT) {
      const student = await this.prisma.studentProfile.findFirst({
        where: { userId: user.id, tenantId },
        include: {
          enrollments: {
            where: { status: 'ACTIVE' },
            select: { classroomId: true },
          },
        },
      });
      const isEnrolled = student?.enrollments.some((e) => e.classroomId === classroomId);
      if (!isEnrolled) {
        throw new ForbiddenException('هر دانش‌آموز فقط مجاز به مشاهده برنامه کلاسی کلاس خود می‌باشد');
      }
    } else if (user?.role === Role.PARENT) {
      const parent = await this.prisma.parentProfile.findFirst({
        where: { userId: user.id, tenantId },
        include: {
          studentLinks: {
            include: {
              student: {
                include: {
                  enrollments: {
                    where: { status: 'ACTIVE' },
                    select: { classroomId: true },
                  },
                },
              },
            },
          },
        },
      });
      const isAllowed = parent?.studentLinks.some((link) =>
        link.student.enrollments.some((e) => e.classroomId === classroomId)
      );
      if (!isAllowed) {
        throw new ForbiddenException('شما فقط مجاز به مشاهده برنامه کلاسی فرزندان خود هستید');
      }
    }

    return this.prisma.classSchedule.findMany({
      where: { tenantId, classroomId },
      include: {
        lesson: {
          include: {
            level: true,
            field: true,
          },
        },
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
    });
  }

  async getMySchedule(tenantId: string, user: any) {
    if (user?.role === Role.STUDENT) {
      const student = await this.prisma.studentProfile.findFirst({
        where: { userId: user.id, tenantId },
        include: {
          enrollments: {
            where: { status: 'ACTIVE' },
            include: {
              classroom: {
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
                },
              },
            },
          },
        },
      });

      if (!student || student.enrollments.length === 0) {
        return { classroom: null, schedules: [] };
      }

      const activeEnrollment = student.enrollments[0];
      const classroom = activeEnrollment.classroom;
      const schedules = await this.getClassSchedule(tenantId, classroom.id, user);

      return {
        classroom,
        schedules,
      };
    } else if (user?.role === Role.TEACHER) {
      const teacher = await this.prisma.teacherProfile.findFirst({
        where: { userId: user.id, tenantId },
      });
      if (!teacher) {
        return { teacher: null, schedules: [] };
      }
      const schedules = await this.getTeacherSchedule(tenantId, teacher.id);
      return {
        teacher,
        schedules,
      };
    } else if (user?.role === Role.PARENT) {
      const parent = await this.prisma.parentProfile.findFirst({
        where: { userId: user.id, tenantId },
        include: {
          studentLinks: {
            include: {
              student: {
                include: {
                  user: true,
                  enrollments: {
                    where: { status: 'ACTIVE' },
                    include: {
                      classroom: {
                        include: {
                          level: true,
                          field: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!parent || parent.studentLinks.length === 0) {
        return { classroom: null, schedules: [] };
      }

      const activeStudent = parent.studentLinks[0].student;
      const activeEnrollment = activeStudent.enrollments[0];
      if (!activeEnrollment) {
        return { classroom: null, schedules: [] };
      }

      const classroom = activeEnrollment.classroom;
      const schedules = await this.getClassSchedule(tenantId, classroom.id, user);

      return {
        classroom,
        schedules,
        student: activeStudent,
      };
    } else {
      throw new BadRequestException('این متد فقط برای نقش‌های دانش‌آموز، والد یا دبیر معتبر است');
    }
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
