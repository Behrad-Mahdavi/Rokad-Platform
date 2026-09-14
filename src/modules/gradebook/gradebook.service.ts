import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BulkRecordGradeDto } from './dto/record-grade.dto';
import { BulkRecordPodmanGradeDto } from './dto/record-podman-grade.dto';

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
    const academicYearId = dto.academicYearId || classroom.academicYearId;

    let teacherId = dto.teacherId;
    if (!teacherId) {
      const teacherProf = await this.prisma.teacherProfile.findFirst({
        where: { userId: recordedById, tenantId },
      });
      teacherId =
        teacherProf?.id ||
        (await this.prisma.teacherProfile.findFirst({ where: { tenantId } }))?.id ||
        '';
    }

    const createdEntries = await this.prisma.$transaction(async (tx) => {
      const records: any[] = [];
      for (const item of dto.grades) {
        const startOfDay = new Date(entryDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(entryDate);
        endOfDay.setHours(23, 59, 59, 999);

        const existing = await tx.gradeEntry.findFirst({
          where: {
            tenantId,
            classroomId: dto.classroomId,
            lessonId: dto.lessonId,
            studentId: item.studentId,
            gradeType: dto.gradeType,
            date: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        });

        if (existing) {
          const updated = await tx.gradeEntry.update({
            where: { id: existing.id },
            data: {
              score: item.score,
              maxScore,
              title: dto.title,
              description: item.description,
              weight: dto.weight || existing.weight || 1.0,
              recordedById,
            },
          });
          records.push(updated);
        } else {
          const record = await tx.gradeEntry.create({
            data: {
              tenantId,
              academicYearId,
              termId: dto.termId,
              classroomId: dto.classroomId,
              lessonId: dto.lessonId,
              studentId: item.studentId,
              teacherId,
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

    const podmanGrades = await this.prisma.podmanGrade.findMany({
      where: {
        tenantId,
        studentId,
        ...(academicYearId ? { academicYearId } : {}),
      },
      include: {
        lesson: true,
        podman: true,
      },
      orderBy: { date: 'asc' },
    });

    // Group regular grades by lesson
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

    // Group podman grades by lesson
    const podmanLessonsMap: Record<
      string,
      {
        lesson: any;
        podmanGrades: Record<number, any>;
      }
    > = {};

    for (const pg of podmanGrades) {
      if (!podmanLessonsMap[pg.lessonId]) {
        podmanLessonsMap[pg.lessonId] = {
          lesson: pg.lesson,
          podmanGrades: {},
        };
      }
      const existingPg = podmanLessonsMap[pg.lessonId].podmanGrades[pg.podman.number];
      if (!existingPg || pg.isPassed || (!existingPg.isPassed && pg.finalScore > existingPg.finalScore)) {
        podmanLessonsMap[pg.lessonId].podmanGrades[pg.podman.number] = pg;
      }
    }

    let totalWeightedPoints = 0;
    let totalUnits = 0;
    const lessonReports: any[] = [];

    // Process non-modular lessons (traditional assessment)
    for (const lessonId in lessonGradesMap) {
      // If this lesson is handled in podmanLessonsMap, skip regular handling
      if (podmanLessonsMap[lessonId] || lessonGradesMap[lessonId].lesson?.isModular) {
        continue;
      }

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
        isModular: false,
        unitCount,
        lessonAverageOutOf20: lessonAverage,
        isPassed: lessonAverage >= 10,
        status: lessonAverage >= 10 ? 'PASSED' : 'FAILED',
        recordedAssessmentsCount: entry.grades.length,
      });
    }

    // Process modular lessons (strict 5-podman competency assessment)
    for (const lessonId in podmanLessonsMap) {
      const entry = podmanLessonsMap[lessonId];
      const podmanCount = entry.lesson.podmanCount || 5;
      let totalPodmanScore = 0;
      let passedCount = 0;
      const unpassedNumbers: number[] = [];
      const podmanDetails: any[] = [];

      for (let num = 1; num <= podmanCount; num++) {
        const pGrade = entry.podmanGrades[num];
        if (pGrade) {
          totalPodmanScore += pGrade.finalScore;
          if (pGrade.isPassed) {
            passedCount++;
          } else {
            unpassedNumbers.push(num);
          }
          podmanDetails.push({
            podmanNumber: num,
            title: pGrade.podman?.title || `پودمان ${num}`,
            continuousScore: pGrade.continuousScore,
            competencyScore: pGrade.competencyScore,
            finalScore: pGrade.finalScore,
            isPassed: pGrade.isPassed,
            attemptType: pGrade.attemptType,
          });
        } else {
          unpassedNumbers.push(num);
          podmanDetails.push({
            podmanNumber: num,
            title: `پودمان ${num}`,
            continuousScore: null,
            competencyScore: null,
            finalScore: null,
            isPassed: false,
            attemptType: null,
          });
        }
      }

      // Golden Rule: To pass a modular lesson, EVERY podman must have score >= 12
      const allPassed = passedCount === podmanCount;
      const lessonAverage = parseFloat((totalPodmanScore / podmanCount).toFixed(2));
      const unitCount = entry.lesson.unitCount || 1;

      // Only add to weighted GPA if completed / all passed
      if (allPassed) {
        totalWeightedPoints += lessonAverage * unitCount;
      }
      totalUnits += unitCount;

      lessonReports.push({
        lessonId,
        lessonName: entry.lesson.name,
        lessonCode: entry.lesson.code,
        isModular: true,
        podmanCount,
        unitCount,
        lessonAverageOutOf20: lessonAverage,
        isPassed: allPassed,
        status: allPassed ? 'PASSED' : 'INCOMPLETE_RETAKE_NEEDED',
        passedPodmanCount: passedCount,
        unpassedPodmanNumbers: unpassedNumbers,
        podmans: podmanDetails,
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

  // 4. Bulk Record Podman Grades
  async recordBulkPodmanGrades(
    tenantId: string,
    recordedById: string,
    dto: BulkRecordPodmanGradeDto,
  ) {
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: dto.classroomId, tenantId },
    });
    if (!classroom) {
      throw new NotFoundException('کلاس مورد نظر یافت نشد');
    }

    const lesson = await this.prisma.lesson.findFirst({
      where: { id: dto.lessonId, tenantId },
      include: { podmans: true },
    });
    if (!lesson) {
      throw new NotFoundException('درس مورد نظر یافت نشد');
    }

    // Find or create Podman record for this lesson & number
    let podman = lesson.podmans.find((p) => p.number === dto.podmanNumber);
    if (!podman) {
      podman = await this.prisma.podman.create({
        data: {
          tenantId,
          lessonId: dto.lessonId,
          number: dto.podmanNumber,
          title: `پودمان ${dto.podmanNumber}`,
        },
      });
    }

    // Validate grades
    for (const item of dto.grades) {
      if (item.continuousScore < 0 || item.continuousScore > 5) {
        throw new BadRequestException(
          `نمره مستمر نامعتبر برای دانش‌آموز ${item.studentId}. نمره مستمر باید بین ۰ تا ۵ باشد. مقدار ارسالی: ${item.continuousScore}`,
        );
      }
      if (![1, 2, 3].includes(item.competencyScore)) {
        throw new BadRequestException(
          `سطح شایستگی نامعتبر برای دانش‌آموز ${item.studentId}. سطح شایستگی باید ۱، ۲ یا ۳ باشد. مقدار ارسالی: ${item.competencyScore}`,
        );
      }
    }

    const entryDate = dto.date ? new Date(dto.date) : new Date();
    const academicYearId = dto.academicYearId || classroom.academicYearId;
    const attemptType = dto.attemptType || 'REGULAR';

    let teacherId = dto.teacherId;
    if (!teacherId) {
      const teacherProf = await this.prisma.teacherProfile.findFirst({
        where: { userId: recordedById, tenantId },
      });
      teacherId =
        teacherProf?.id ||
        (await this.prisma.teacherProfile.findFirst({ where: { tenantId } }))?.id ||
        '';
    }

    const savedRecords = await this.prisma.$transaction(async (tx) => {
      const records: any[] = [];
      for (const item of dto.grades) {
        const continuous = Number(item.continuousScore);
        const competency = Number(item.competencyScore);
        // Formula: continuous (0-5) + competency (1-3) * 5 = total out of 20
        const finalScore = parseFloat((continuous + competency * 5).toFixed(2));
        // Passing threshold: 12
        const isPassed = finalScore >= 12;

        const existing = await tx.podmanGrade.findFirst({
          where: {
            tenantId,
            podmanId: podman!.id,
            studentId: item.studentId,
            attemptType,
          },
        });

        if (existing) {
          const updated = await tx.podmanGrade.update({
            where: { id: existing.id },
            data: {
              continuousScore: continuous,
              competencyScore: competency,
              finalScore,
              isPassed,
              date: entryDate,
              notes: item.notes,
              recordedById,
            },
          });
          records.push(updated);
        } else {
          const created = await tx.podmanGrade.create({
            data: {
              tenantId,
              academicYearId,
              classroomId: dto.classroomId,
              lessonId: dto.lessonId,
              podmanId: podman!.id,
              studentId: item.studentId,
              teacherId,
              continuousScore: continuous,
              competencyScore: competency,
              finalScore,
              isPassed,
              attemptType,
              date: entryDate,
              notes: item.notes,
              recordedById,
            },
          });
          records.push(created);
        }
      }
      return records;
    });

    return {
      message: `تعداد ${savedRecords.length} نمره پودمان ${dto.podmanNumber} با موفقیت در دفتر ارزشیابی ثبت گردید`,
      count: savedRecords.length,
      podmanNumber: dto.podmanNumber,
    };
  }

  // 5. Get Classroom Podman Matrix
  async getClassPodmanMatrix(
    tenantId: string,
    classroomId: string,
    lessonId: string,
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

    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, tenantId },
      include: {
        podmans: {
          orderBy: { number: 'asc' },
        },
      },
    });
    if (!lesson) {
      throw new NotFoundException('درس یافت نشد');
    }

    // Ensure podmans exist if modular
    if (lesson.isModular && lesson.podmans.length === 0) {
      const podmansToCreate: Array<{
        tenantId: string;
        lessonId: string;
        number: number;
        title: string;
      }> = [];
      for (let i = 1; i <= (lesson.podmanCount || 5); i++) {
        podmansToCreate.push({
          tenantId,
          lessonId,
          number: i,
          title: `پودمان ${i}`,
        });
      }
      await this.prisma.podman.createMany({ data: podmansToCreate });
      lesson.podmans = await this.prisma.podman.findMany({
        where: { tenantId, lessonId },
        orderBy: { number: 'asc' },
      });
    }

    // Fetch all podman grades in this classroom and lesson
    const grades = await this.prisma.podmanGrade.findMany({
      where: {
        tenantId,
        classroomId,
        lessonId,
      },
      include: {
        podman: true,
        student: { include: { user: true } },
      },
      orderBy: { date: 'asc' },
    });

    // Map by studentId -> podmanNumber -> grade
    const studentGradesMap: Record<string, Record<number, any>> = {};
    for (const g of grades) {
      if (!studentGradesMap[g.studentId]) {
        studentGradesMap[g.studentId] = {};
      }
      const current = studentGradesMap[g.studentId][g.podman.number];
      if (!current || g.isPassed || (!current.isPassed && g.finalScore > current.finalScore)) {
        studentGradesMap[g.studentId][g.podman.number] = {
          id: g.id,
          continuousScore: g.continuousScore,
          competencyScore: g.competencyScore,
          finalScore: g.finalScore,
          isPassed: g.isPassed,
          attemptType: g.attemptType,
          date: g.date,
          notes: g.notes,
        };
      }
    }

    const totalPodmans = lesson.podmanCount || 5;

    const studentsResult = classroom.enrollments.map((enr) => {
      const st = enr.student;
      const podmanGradesObj = studentGradesMap[st.id] || {};
      let allPassed = true;
      let completedCount = 0;
      let totalScore = 0;
      const unpassedPodmans: number[] = [];

      for (let num = 1; num <= totalPodmans; num++) {
        const pg = podmanGradesObj[num];
        if (pg) {
          totalScore += pg.finalScore;
          completedCount++;
          if (!pg.isPassed) {
            allPassed = false;
            unpassedPodmans.push(num);
          }
        } else {
          allPassed = false;
          unpassedPodmans.push(num);
        }
      }

      const averageScore =
        completedCount === totalPodmans && allPassed
          ? parseFloat((totalScore / totalPodmans).toFixed(2))
          : completedCount > 0
          ? parseFloat((totalScore / completedCount).toFixed(2))
          : 0;

      return {
        studentId: st.id,
        studentName: `${st.user.firstName} ${st.user.lastName}`,
        nationalCode: st.nationalCode,
        studentCode: st.studentCode,
        podmanGrades: podmanGradesObj,
        completedPodmanCount: completedCount,
        allPodmansPassed: allPassed && completedCount === totalPodmans,
        unpassedPodmanNumbers: unpassedPodmans,
        lessonAverageOutOf20: averageScore,
        status:
          allPassed && completedCount === totalPodmans
            ? 'PASSED'
            : unpassedPodmans.length > 0
            ? 'RETAKE_NEEDED'
            : 'IN_PROGRESS',
      };
    });

    return {
      classroom: {
        id: classroom.id,
        name: classroom.name,
        totalStudents: classroom.enrollments.length,
      },
      lesson: {
        id: lesson.id,
        name: lesson.name,
        code: lesson.code,
        isModular: lesson.isModular,
        podmanCount: totalPodmans,
        podmans: lesson.podmans,
      },
      students: studentsResult,
    };
  }
}
