import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as jalaali from 'jalaali-js';
import { DayOfWeek } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import {
  BulkRecordStudentAttendanceDto,
  RecordTeacherAttendanceDto,
} from './dto/record-attendance.dto';

export function getDateVariants(dateStr: string): string[] {
  if (!dateStr) return [];
  const clean = dateStr.trim();
  const variants = [clean];
  const parts = clean.split('-').map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    if (parts[0] > 1800) {
      const j = jalaali.toJalaali(parts[0], parts[1], parts[2]);
      variants.push(`${j.jy}-${String(j.jm).padStart(2, '0')}-${String(j.jd).padStart(2, '0')}`);
    } else if (parts[0] > 1300 && parts[0] < 1500) {
      const g = jalaali.toGregorian(parts[0], parts[1], parts[2]);
      variants.push(`${g.gy}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}`);
    }
  }
  return Array.from(new Set(variants));
}

export function getDayOfWeekFromDate(dateStr: string): DayOfWeek {
  let gDate: Date;
  const parts = dateStr.split('-').map(Number);
  if (parts.length === 3 && parts[0] > 1300 && parts[0] < 1500) {
    const g = jalaali.toGregorian(parts[0], parts[1], parts[2]);
    gDate = new Date(g.gy, g.gm - 1, g.gd);
  } else {
    gDate = new Date(dateStr);
  }
  const day = gDate.getDay();
  const map: Record<number, DayOfWeek> = {
    6: DayOfWeek.SATURDAY,
    0: DayOfWeek.SUNDAY,
    1: DayOfWeek.MONDAY,
    2: DayOfWeek.TUESDAY,
    3: DayOfWeek.WEDNESDAY,
    4: DayOfWeek.THURSDAY,
    5: DayOfWeek.FRIDAY,
  };
  return map[day] || DayOfWeek.SATURDAY;
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Bulk record attendance for students in a class
   */
  async recordStudentAttendanceBulk(
    tenantId: string,
    recordedById: string,
    dto: BulkRecordStudentAttendanceDto,
  ) {
    if (!dto.attendances || dto.attendances.length === 0) {
      throw new BadRequestException('لیست حضور و غیاب نمی‌تواند خالی باشد');
    }

    const periodNumber = dto.periodNumber ?? 1;

    let academicYearId = dto.academicYearId;
    if (!academicYearId) {
      const classroom = await this.prisma.classroom.findUnique({
        where: { id: dto.classroomId },
        select: { academicYearId: true },
      });
      academicYearId = classroom?.academicYearId;
    }
    if (!academicYearId) {
      const activeYear = await this.prisma.academicYear.findFirst({
        where: { tenantId },
        orderBy: [{ isCurrent: 'desc' }, { createdAt: 'desc' }],
        select: { id: true },
      });
      academicYearId = activeYear?.id;
    }
    if (!academicYearId) {
      const fallbackYear = await this.prisma.academicYear.upsert({
        where: {
          tenantId_name: {
            tenantId,
            name: 'سال تحصیلی ۱۴۰۴-۱۴۰۵',
          },
        },
        update: {},
        create: {
          tenantId,
          name: 'سال تحصیلی ۱۴۰۴-۱۴۰۵',
          startDate: new Date('2025-09-23'),
          endDate: new Date('2026-06-21'),
          isCurrent: true,
        },
      });
      academicYearId = fallbackYear.id;
    }

    const results = await this.prisma.$transaction(async (tx) => {
      const records: any[] = [];
      for (const item of dto.attendances) {
        const existing = await tx.studentAttendance.findFirst({
          where: {
            tenantId,
            classroomId: dto.classroomId,
            studentId: item.studentId,
            date: dto.date,
            periodNumber,
          },
        });

        let record;
        if (existing) {
          record = await tx.studentAttendance.update({
            where: { id: existing.id },
            data: {
              status: item.status,
              delayMinutes: item.delayMinutes || 0,
              reason: item.reason,
              recordedById,
              lessonId: dto.lessonId,
              scheduleId: dto.scheduleId,
            },
          });
        } else {
          record = await tx.studentAttendance.create({
            data: {
              tenantId,
              academicYearId: academicYearId || '',
              classroomId: dto.classroomId,
              studentId: item.studentId,
              lessonId: dto.lessonId,
              scheduleId: dto.scheduleId,
              date: dto.date,
              periodNumber,
              status: item.status,
              delayMinutes: item.delayMinutes || 0,
              reason: item.reason,
              recordedById,
            },
          });
        }
        records.push(record);

        // Fire event if student is absent or tardy
        if (item.status === 'ABSENT' || item.status === 'TARDY') {
          const studentProfile = await tx.studentProfile.findUnique({
            where: { id: item.studentId },
            include: { user: true },
          });

          this.eventEmitter.emit('attendance.student_absence', {
            tenantId,
            studentId: item.studentId,
            studentName: studentProfile ? `${studentProfile.user.firstName} ${studentProfile.user.lastName}` : '',
            parentPhone: studentProfile?.fatherPhone || studentProfile?.motherPhone,
            date: dto.date,
            periodNumber,
            status: item.status,
            delayMinutes: item.delayMinutes,
            reason: item.reason,
          });
        }
      }
      return records;
    });

    // Invalidate daily stats cache
    await this.redisService.del(`attendance:stats:${tenantId}:${dto.date}`);

    return {
      message: `حضور و غیاب ${results.length} دانش‌آموز با موفقیت ثبت شد`,
      count: results.length,
      records: results,
    };
  }

  /**
   * Get attendance list for a specific classroom and date
   * Resolves ALL active students enrolled in this classroom so teacher always sees full roster!
   */
  async getClassroomAttendance(
    tenantId: string,
    classroomId: string,
    date: string,
    periodNumber?: number,
  ) {
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: classroomId, tenantId },
      include: {
        field: true,
        level: true,
        academicYear: true,
        mentor: true,
      },
    });
    if (!classroom) {
      throw new NotFoundException('کلاس درس مورد نظر یافت نشد');
    }

    // 1. Fetch all active student enrollments for this classroom
    const enrollments = await this.prisma.classEnrollment.findMany({
      where: {
        tenantId,
        classroomId,
        status: 'ACTIVE',
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: [
        { student: { studentCode: 'asc' } },
        { student: { user: { lastName: 'asc' } } },
      ],
    });

    // 2. Fetch existing attendance records for this classroom, date, and period
    const effectivePeriod = periodNumber !== undefined ? periodNumber : 1;
    const dateVariants = getDateVariants(date);
    const recordedAttendances = await this.prisma.studentAttendance.findMany({
      where: {
        tenantId,
        classroomId,
        date: { in: dateVariants },
        periodNumber: effectivePeriod,
      },
      include: {
        lesson: true,
        recordedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const recordedMap = new Map<string, any>(
      recordedAttendances.map((r) => [r.studentId, r]),
    );

    // 3. Map students combining roster with attendance status
    const students = enrollments.map((en) => {
      const rec = recordedMap.get(en.studentId);
      return {
        studentId: en.studentId,
        studentCode: en.student.studentCode,
        nationalCode: en.student.nationalCode,
        fatherPhone: en.student.fatherPhone,
        motherPhone: en.student.motherPhone,
        user: en.student.user,
        status: rec ? rec.status : 'PRESENT',
        delayMinutes: rec ? rec.delayMinutes : 0,
        reason: rec ? rec.reason : '',
        isRecorded: !!rec,
        recordedAt: rec?.updatedAt || rec?.createdAt || null,
        recordedBy: rec?.recordedBy || null,
        attendanceId: rec?.id || null,
      };
    });

    // Summary counts
    const summary = {
      total: students.length,
      present: students.filter((s) => s.status === 'PRESENT').length,
      absent: students.filter((s) => s.status === 'ABSENT').length,
      tardy: students.filter((s) => s.status === 'TARDY').length,
      excused: students.filter((s) => s.status === 'EXCUSED_ABSENT').length,
      expelled: students.filter((s) => s.status === 'EXPELLED').length,
      isFullyRecorded: recordedAttendances.length > 0 && recordedAttendances.length >= students.length,
    };

    return {
      classroom: {
        id: classroom.id,
        name: classroom.name,
        code: classroom.code,
        gradeLevel: classroom.level?.name || '',
        studyField: classroom.field?.name || '',
        academicYear: classroom.academicYear?.name || '',
        mentorTeacherName: classroom.mentor ? `${classroom.mentor.firstName} ${classroom.mentor.lastName}` : null,
      },
      date,
      periodNumber: effectivePeriod,
      summary,
      students,
    };
  }

  /**
   * Get student's overall attendance history
   */
  async getStudentAttendanceHistory(tenantId: string, studentId: string) {
    return this.prisma.studentAttendance.findMany({
      where: { tenantId, studentId },
      include: {
        classroom: true,
        lesson: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Get personal attendance history for logged-in student or parent
   */
  async getMyAttendanceHistory(tenantId: string, userId: string, role: string) {
    if (role === 'STUDENT') {
      const student = await this.prisma.studentProfile.findFirst({
        where: { tenantId, userId },
      });
      if (!student) return [];
      return this.getStudentAttendanceHistory(tenantId, student.id);
    }

    if (role === 'PARENT') {
      const parent = await this.prisma.parentProfile.findFirst({
        where: { tenantId, userId },
        include: {
          studentLinks: {
            include: {
              student: {
                include: { user: true },
              },
            },
          },
        },
      });
      if (!parent || parent.studentLinks.length === 0) return [];
      const studentIds = parent.studentLinks.map((l) => l.studentId);
      return this.prisma.studentAttendance.findMany({
        where: {
          tenantId,
          studentId: { in: studentIds },
        },
        include: {
          classroom: true,
          lesson: true,
          student: {
            include: { user: true },
          },
        },
        orderBy: { date: 'desc' },
      });
    }

    return [];
  }

  /**
   * Get teacher's daily class schedule with attendance status for each period
   */
  async getTeacherDailySchedule(
    tenantId: string,
    userId: string,
    userRole: string,
    dateStr: string,
  ) {
    const dayOfWeek = getDayOfWeekFromDate(dateStr);
    const dateVariants = getDateVariants(dateStr);

    let teacherId: string | undefined;
    if (userRole === 'TEACHER') {
      const teacher = await this.prisma.teacherProfile.findFirst({
        where: { tenantId, userId },
      });
      if (!teacher) {
        return {
          dayOfWeek,
          date: dateStr,
          schedules: [],
        };
      }
      teacherId = teacher.id;
    }

    const whereClause: any = {
      tenantId,
      dayOfWeek,
    };
    if (teacherId) {
      whereClause.OR = [{ teacherId }, { secondTeacherId: teacherId }];
    }

    const schedules = await this.prisma.classSchedule.findMany({
      where: whereClause,
      include: {
        classroom: {
          include: {
            level: true,
            field: true,
          },
        },
        lesson: true,
        secondLesson: true,
        teacher: { include: { user: true } },
      },
      orderBy: [{ periodNumber: 'asc' }],
    });

    // Enrich each slot with attendance statistics
    const enrichedSchedules = await Promise.all(
      schedules.map(async (slot) => {
        const totalStudents = await this.prisma.classEnrollment.count({
          where: {
            tenantId,
            classroomId: slot.classroomId,
            status: 'ACTIVE',
          },
        });

        const attendances = await this.prisma.studentAttendance.findMany({
          where: {
            tenantId,
            classroomId: slot.classroomId,
            periodNumber: slot.periodNumber,
            date: { in: dateVariants },
          },
        });

        const presentCount = attendances.filter((a) => a.status === 'PRESENT').length;
        const absentCount = attendances.filter((a) => a.status === 'ABSENT').length;
        const tardyCount = attendances.filter((a) => a.status === 'TARDY').length;
        const excusedCount = attendances.filter((a) => a.status === 'EXCUSED_ABSENT').length;

        return {
          id: slot.id,
          classroomId: slot.classroomId,
          classroomName: slot.classroom.name,
          classroomGrade: slot.classroom.level?.name || '',
          classroomField: slot.classroom.field?.name || '',
          lessonId: slot.lessonId,
          lessonName: slot.lesson.name,
          periodNumber: slot.periodNumber,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isSplitPeriod: slot.isSplitPeriod,
          stats: {
            totalStudents,
            recordedCount: attendances.length,
            presentCount,
            absentCount,
            tardyCount,
            excusedCount,
            isRecorded: attendances.length > 0,
            isFullyRecorded: totalStudents > 0 && attendances.length >= totalStudents,
          },
        };
      }),
    );

    return {
      dayOfWeek,
      date: dateStr,
      schedules: enrichedSchedules,
    };
  }

  /**
   * Get daily attendance statistics for school dashboard
   */
  async getDailyStats(tenantId: string, date: string) {
    const cacheKey = `attendance:stats:${tenantId}:${date}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }

    const dateVariants = getDateVariants(date);
    const records = await this.prisma.studentAttendance.findMany({
      where: {
        tenantId,
        date: { in: dateVariants },
      },
    });

    const totalEnrolled = await this.prisma.classEnrollment.count({
      where: { tenantId, status: 'ACTIVE' },
    });

    const stats = {
      date,
      totalEnrolled,
      totalRecords: records.length,
      present: records.filter((r) => r.status === 'PRESENT').length,
      absent: records.filter((r) => r.status === 'ABSENT').length,
      tardy: records.filter((r) => r.status === 'TARDY').length,
      excused: records.filter((r) => r.status === 'EXCUSED_ABSENT').length,
      expelled: records.filter((r) => r.status === 'EXPELLED').length,
    };

    await this.redisService.set(cacheKey, JSON.stringify(stats), 180);
    return stats;
  }

  // 2. Teacher Attendance
  async recordTeacherAttendance(
    tenantId: string,
    recordedById: string,
    dto: RecordTeacherAttendanceDto,
  ) {
    return this.prisma.teacherAttendance.upsert({
      where: {
        tenantId_teacherId_date: {
          tenantId,
          teacherId: dto.teacherId,
          date: dto.date,
        },
      },
      update: {
        entryTime: dto.entryTime,
        exitTime: dto.exitTime,
        status: dto.status,
        notes: dto.notes,
        recordedById,
      },
      create: {
        tenantId,
        teacherId: dto.teacherId,
        date: dto.date,
        entryTime: dto.entryTime,
        exitTime: dto.exitTime,
        status: dto.status,
        notes: dto.notes,
        recordedById,
      },
      include: {
        teacher: {
          include: { user: true },
        },
      },
    });
  }

  async listTeacherAttendance(tenantId: string, date: string) {
    return this.prisma.teacherAttendance.findMany({
      where: { tenantId, date },
      include: {
        teacher: {
          include: { user: true },
        },
      },
    });
  }
}
