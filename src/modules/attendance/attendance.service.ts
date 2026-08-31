import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import {
  BulkRecordStudentAttendanceDto,
  RecordTeacherAttendanceDto,
} from './dto/record-attendance.dto';

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

    const results = await this.prisma.$transaction(async (tx) => {
      const records: any[] = [];
      for (const item of dto.attendances) {
        const record = await tx.studentAttendance.upsert({
          where: {
            tenantId_classroomId_studentId_date_periodNumber: {
              tenantId,
              classroomId: dto.classroomId,
              studentId: item.studentId,
              date: dto.date,
              periodNumber: dto.periodNumber ?? (null as any),
            },
          },
          update: {
            status: item.status,
            delayMinutes: item.delayMinutes || 0,
            reason: item.reason,
            recordedById,
            lessonId: dto.lessonId,
            scheduleId: dto.scheduleId,
          },
          create: {
            tenantId,
            academicYearId: dto.academicYearId,
            classroomId: dto.classroomId,
            studentId: item.studentId,
            lessonId: dto.lessonId,
            scheduleId: dto.scheduleId,
            date: dto.date,
            periodNumber: dto.periodNumber,
            status: item.status,
            delayMinutes: item.delayMinutes || 0,
            reason: item.reason,
            recordedById,
          },
        });
        records.push(record);

        // Fire event if student is absent or tardy (for future SMS/notification engine)
        if (item.status === 'ABSENT' || item.status === 'TARDY') {
          this.eventEmitter.emit('attendance.student_absence', {
            tenantId,
            studentId: item.studentId,
            date: dto.date,
            periodNumber: dto.periodNumber,
            status: item.status,
            delayMinutes: item.delayMinutes,
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
   */
  async getClassroomAttendance(
    tenantId: string,
    classroomId: string,
    date: string,
    periodNumber?: number,
  ) {
    return this.prisma.studentAttendance.findMany({
      where: {
        tenantId,
        classroomId,
        date,
        ...(periodNumber !== undefined ? { periodNumber } : {}),
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
              },
            },
          },
        },
        lesson: true,
      },
      orderBy: { student: { studentCode: 'asc' } },
    });
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

    const records = await this.prisma.studentAttendance.findMany({
      where: { tenantId, date },
    });

    const stats = {
      date,
      totalRecords: records.length,
      present: records.filter((r) => r.status === 'PRESENT').length,
      absent: records.filter((r) => r.status === 'ABSENT').length,
      tardy: records.filter((r) => r.status === 'TARDY').length,
      excused: records.filter((r) => r.status === 'EXCUSED_ABSENT').length,
      expelled: records.filter((r) => r.status === 'EXPELLED').length,
    };

    await this.redisService.set(cacheKey, JSON.stringify(stats), 300); // 5 min TTL
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
