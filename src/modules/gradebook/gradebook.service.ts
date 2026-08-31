import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BulkRecordGradeDto } from './dto/record-grade.dto';

@Injectable()
export class GradebookService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Bulk Record Grades
  async recordBulkGrades(
    tenantId: string,
    recordedById: string,
    dto: BulkRecordGradeDto,
  ) {
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: dto.classroomId, tenantId },
    });
    if (!classroom) {
      throw new NotFoundException('کلاس مورد نظر یافت نشد');
    }

    const lesson = await this.prisma.lesson.findFirst({
      where: { id: dto.lessonId, tenantId },
    });
    if (!lesson) {
      throw new NotFoundException('درس مورد نظر یافت نشد');
    }

    const maxScore = dto.maxScore || 20;

    // Strict boundary validation for every score
    for (const item of dto.grades) {
      if (item.score < 0 || item.score > maxScore) {
        throw new BadRequestException(
          `نمره نامعتبر برای دانش‌آموز ${item.studentId}. نمره باید بین ۰ تا ${maxScore} باشد. نمره ارسالی: ${item.score}`,
        );
      }
    }

    const entryDate = dto.date ? new Date(dto.date) : new Date();

    const createdEntries = await this.prisma.$transaction(async (tx) => {
      const records: any[] = [];
      for (const item of dto.grades) {
        const record = await tx.gradeEntry.create({
          data: {
            tenantId,
            academicYearId: dto.academicYearId,
            termId: dto.termId,
            classroomId: dto.classroomId,
            lessonId: dto.lessonId,
            studentId: item.studentId,
            teacherId: dto.teacherId,
            examId: dto.examId,
            gradeType: dto.gradeType,
            title: dto.title,
            score: item.score,
            maxScore,
            weight: dto.weight || 1.0,
            date: entryDate,
            description: item.description,
            recordedById,
          },
        });
        records.push(record);
      }
      return records;
    });

    return {
      message: `تعداد ${createdEntries.length} نمره با موفقیت در دفتر نمرات ثبت گردید`,
      count: createdEntries.length,
    };
  }

  // 2. Get Class Gradebook Matrix
  async getClassGradebook(
    tenantId: string,
    classroomId: string,
    lessonId?: string,
  ) {
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: classroomId, tenantId },
      include: {
        enrollments: {
          include: {
            student: { include: { user: true } },
          },
        },
      },
    });

    if (!classroom) {
      throw new NotFoundException('کلاس یافت نشد');
    }

    const where: any = { tenantId, classroomId };
    if (lessonId) where.lessonId = lessonId;

    const grades = await this.prisma.gradeEntry.findMany({
      where,
      include: {
        student: { include: { user: true } },
        lesson: true,
      },
      orderBy: { date: 'asc' },
    });

    // Calculate class statistics
    const scores = grades.map((g) => (g.score / g.maxScore) * 20);
    const averageNormalizedScore =
      scores.length > 0
        ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
        : 0;

    return {
      classroom: {
        id: classroom.id,
        name: classroom.name,
        totalStudents: classroom.enrollments.length,
      },
      stats: {
        totalGradesRecorded: grades.length,
        averageScoreOutOf20: averageNormalizedScore,
      },
      grades: grades.map((g) => ({
        id: g.id,
        studentId: g.studentId,
        studentName: `${g.student.user.firstName} ${g.student.user.lastName}`,
        lessonName: g.lesson.name,
        gradeType: g.gradeType,
        title: g.title,
        score: g.score,
        maxScore: g.maxScore,
        weight: g.weight,
        date: g.date,
      })),
    };
  }

  // 3. Get Student Report Card with Weighted GPA
  async getStudentReportCard(
    tenantId: string,
    studentId: string,
    academicYearId?: string,
  ) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: studentId, tenantId },
      include: { user: true },
    });

    if (!student) {
      throw new NotFoundException('دانش‌آموز یافت نشد');
    }

    const where: any = { tenantId, studentId };
    if (academicYearId) where.academicYearId = academicYearId;

    const grades = await this.prisma.gradeEntry.findMany({
      where,
      include: {
        lesson: true,
        academicYear: true,
      },
      orderBy: { date: 'asc' },
    });

    // Group by lesson to calculate weighted average
    const lessonGradesMap: Record<
      string,
      {
        lesson: any;
        grades: any[];
        totalWeightedScore: number;
        totalWeight: number;
      }
    > = {};

    for (const g of grades) {
      if (!lessonGradesMap[g.lessonId]) {
        lessonGradesMap[g.lessonId] = {
          lesson: g.lesson,
          grades: [],
          totalWeightedScore: 0,
          totalWeight: 0,
        };
      }

      const normalizedScoreOutOf20 = (g.score / g.maxScore) * 20;
      lessonGradesMap[g.lessonId].grades.push(g);
      lessonGradesMap[g.lessonId].totalWeightedScore +=
        normalizedScoreOutOf20 * g.weight;
      lessonGradesMap[g.lessonId].totalWeight += g.weight;
    }

    let totalWeightedPoints = 0;
    let totalUnits = 0;
    const lessonReports: any[] = [];

    for (const lessonId in lessonGradesMap) {
      const entry = lessonGradesMap[lessonId];
      const lessonAverage =
        entry.totalWeight > 0
          ? parseFloat((entry.totalWeightedScore / entry.totalWeight).toFixed(2))
          : 0;

      const unitCount = entry.lesson.unitCount || 1;
      totalWeightedPoints += lessonAverage * unitCount;
      totalUnits += unitCount;

      lessonReports.push({
        lessonId,
        lessonName: entry.lesson.name,
        lessonCode: entry.lesson.code,
        unitCount,
        lessonAverageOutOf20: lessonAverage,
        isPassed: lessonAverage >= 10,
        recordedAssessmentsCount: entry.grades.length,
      });
    }

    const weightedGpa =
      totalUnits > 0
        ? parseFloat((totalWeightedPoints / totalUnits).toFixed(2))
        : 0;

    return {
      student: {
        id: student.id,
        studentCode: student.studentCode,
        fullName: `${student.user.firstName} ${student.user.lastName}`,
      },
      transcript: {
        totalUnits,
        passedUnits: lessonReports
          .filter((l) => l.isPassed)
          .reduce((sum, l) => sum + l.unitCount, 0),
        weightedGpaOutOf20: weightedGpa,
        status: weightedGpa >= 12 ? 'PASS' : 'CONDITIONAL',
      },
      lessons: lessonReports,
    };
  }
}
