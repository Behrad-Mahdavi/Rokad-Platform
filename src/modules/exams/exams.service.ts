import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import {
  SubmitExamAnswersDto,
  GradeExamParticipationDto,
} from './dto/participate-exam.dto';

@Injectable()
export class ExamsService {
  private readonly logger = new Logger(ExamsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // 1. Create Exam
  async createExam(tenantId: string, dto: CreateExamDto) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: dto.lessonId, tenantId },
    });
    if (!lesson) {
      throw new NotFoundException('درس مورد نظر یافت نشد');
    }

    const teacher = await this.prisma.teacherProfile.findFirst({
      where: { id: dto.teacherId, tenantId },
    });
    if (!teacher) {
      throw new NotFoundException('پروفایل معلم یافت نشد');
    }

    if (!dto.questions || dto.questions.length === 0) {
      throw new BadRequestException('آزمون باید حداقل شامل یک سوال باشد');
    }

    const calculatedTotalScore = dto.questions.reduce(
      (sum, q) => sum + (q.score || 1.0),
      0,
    );

    return this.prisma.exam.create({
      data: {
        tenantId,
        academicYearId: dto.academicYearId,
        termId: dto.termId,
        lessonId: dto.lessonId,
        teacherId: dto.teacherId,
        title: dto.title,
        description: dto.description,
        examType: dto.examType || 'ONLINE',
        durationMinutes: dto.durationMinutes,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        totalScore: dto.totalScore || calculatedTotalScore,
        shuffleQuestions: dto.shuffleQuestions ?? true,
        shuffleOptions: dto.shuffleOptions ?? true,
        showResultsImmediately: dto.showResultsImmediately ?? false,
        status: 'SCHEDULED',
        isPublished: true,
        classrooms: {
          create: dto.classroomIds.map((cid) => ({
            tenantId,
            classroomId: cid,
          })),
        },
        questions: {
          create: dto.questions.map((q, idx) => ({
            questionId: q.questionId,
            orderIndex: q.orderIndex || idx + 1,
            score: q.score,
          })),
        },
      },
      include: {
        classrooms: { include: { classroom: true } },
        questions: { include: { question: true }, orderBy: { orderIndex: 'asc' } },
      },
    });
  }

  // 2. List Exams
  async listExams(
    tenantId: string,
    filters?: { classroomId?: string; lessonId?: string; teacherId?: string },
  ) {
    const where: any = { tenantId };
    if (filters?.lessonId) where.lessonId = filters.lessonId;
    if (filters?.teacherId) where.teacherId = filters.teacherId;
    if (filters?.classroomId) {
      where.classrooms = { some: { classroomId: filters.classroomId } };
    }

    return this.prisma.exam.findMany({
      where,
      include: {
        lesson: true,
        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
        classrooms: { include: { classroom: true } },
        _count: { select: { questions: true, participations: true } },
      },
      orderBy: { startTime: 'desc' },
    });
  }

  // 3. Start Online Exam (Student Paper Assembly with Deterministic Shuffle)
  async startExam(tenantId: string, examId: string, studentUserId: string) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { userId: studentUserId, tenantId },
      include: { enrollments: true },
    });
    if (!student) {
      throw new ForbiddenException('پروفایل دانش‌آموزی یافت نشد');
    }

    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, tenantId },
      include: {
        classrooms: true,
        questions: {
          include: {
            question: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });
    if (!exam) {
      throw new NotFoundException('آزمون یافت نشد');
    }

    // Check if student belongs to one of the classrooms
    const studentClassIds = student.enrollments.map((e) => e.classroomId);
    const hasAccess = exam.classrooms.some((ec) =>
      studentClassIds.includes(ec.classroomId),
    );
    if (!hasAccess) {
      throw new ForbiddenException('شما مجاز به شرکت در این آزمون نیستید');
    }

    const now = new Date();
    if (now < exam.startTime) {
      throw new BadRequestException('زمان برگزاری آزمون هنوز فرا نرسیده است');
    }
    if (now > exam.endTime) {
      throw new BadRequestException('مهلت شرکت در آزمون به پایان رسیده است');
    }

    // Check existing participation
    let participation = await this.prisma.examParticipation.findUnique({
      where: { examId_studentId: { examId, studentId: student.id } },
      include: { answers: true },
    });

    if (participation) {
      if (participation.status === 'SUBMITTED' || participation.status === 'TIMED_OUT') {
        throw new ConflictException('شما قبلاً در این آزمون شرکت کرده و پاسخ‌های خود را ثبت کرده‌اید');
      }
    } else {
      // Calculate server deadline (Exam End Time or Started At + Duration + 1 min grace buffer)
      const allowedDurationMs = (exam.durationMinutes + 1) * 60 * 1000;
      const calculatedDeadlineMs = Math.min(
        exam.endTime.getTime(),
        now.getTime() + allowedDurationMs,
      );
      const serverDeadline = new Date(calculatedDeadlineMs);

      // Generate Deterministic Per-Student Shuffle Order
      let questionList = [...exam.questions];
      if (exam.shuffleQuestions) {
        questionList = this.shuffleArray(questionList);
      }
      const questionOrder = questionList.map((q) => q.questionId);

      const optionOrders: Record<string, string[]> = {};
      for (const eq of exam.questions) {
        if (eq.question.options && eq.question.options.length > 0) {
          let opts = [...eq.question.options];
          if (exam.shuffleOptions) {
            opts = this.shuffleArray(opts);
          }
          optionOrders[eq.questionId] = opts.map((o) => o.id);
        }
      }

      participation = await this.prisma.examParticipation.create({
        data: {
          tenantId,
          examId,
          studentId: student.id,
          startedAt: now,
          serverDeadline,
          status: 'IN_PROGRESS',
          questionOrder,
          optionOrders,
        },
        include: { answers: true },
      });
    }

    // Render questions to student strictly in their persisted order without solutions/correct flags!
    const orderedQuestions = participation.questionOrder.map((qid) => {
      const examQ = exam.questions.find((q) => q.questionId === qid);
      if (!examQ) return null;

      const savedOptionOrder = (participation?.optionOrders as any)?.[qid];
      let options = examQ.question.options;
      if (savedOptionOrder && Array.isArray(savedOptionOrder)) {
        options = savedOptionOrder
          .map((oid) => examQ.question.options.find((o) => o.id === oid))
          .filter(Boolean) as any;
      }

      return {
        questionId: examQ.question.id,
        score: examQ.score,
        type: examQ.question.type,
        difficulty: examQ.question.difficulty,
        text: examQ.question.text,
        formulaHtml: examQ.question.formulaHtml,
        imageUrls: examQ.question.imageUrls,
        suggestedTimeSeconds: examQ.question.suggestedTimeSeconds,
        options: options.map((opt) => ({
          id: opt.id,
          text: opt.text,
          formulaHtml: opt.formulaHtml,
          imageUrl: opt.imageUrl,
          orderIndex: opt.orderIndex,
        })),
      };
    }).filter(Boolean);

    return {
      exam: {
        id: exam.id,
        title: exam.title,
        durationMinutes: exam.durationMinutes,
        totalScore: exam.totalScore,
      },
      participation: {
        id: participation.id,
        startedAt: participation.startedAt,
        serverDeadline: participation.serverDeadline,
        status: participation.status,
      },
      questions: orderedQuestions,
    };
  }

  // 4. Submit Online Exam Answers (Server-Side Deadline Enforcement & Auto-Grading)
  async submitExamAnswers(
    tenantId: string,
    examId: string,
    studentUserId: string,
    dto: SubmitExamAnswersDto,
  ) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { userId: studentUserId, tenantId },
    });
    if (!student) {
      throw new ForbiddenException('پروفایل دانش‌آموزی یافت نشد');
    }

    const participation = await this.prisma.examParticipation.findUnique({
      where: { examId_studentId: { examId, studentId: student.id } },
      include: {
        exam: {
          include: {
            questions: {
              include: {
                question: {
                  include: { options: true },
                },
              },
            },
          },
        },
      },
    });

    if (!participation) {
      throw new NotFoundException('برگه آزمون برای شما ایجاد نشده است');
    }

    if (participation.status === 'SUBMITTED') {
      throw new ConflictException('پاسخ‌های شما قبلاً در سامانه ثبت شده است');
    }

    const now = new Date();

    // Strict Server-Side Time Enforcement
    if (now > participation.serverDeadline) {
      await this.prisma.examParticipation.update({
        where: { id: participation.id },
        data: { status: 'TIMED_OUT', submittedAt: now },
      });
      throw new BadRequestException('مهلت زمانی آزمون در سرور به پایان رسیده است');
    }

    const tabSwitchCount = dto.tabSwitchCount || 0;
    const flaggedForReview = tabSwitchCount >= 3;

    // Process & Auto-grade Multiple Choice Answers
    let autoGradedTotalScore = 0;
    let hasDescriptiveQuestions = false;

    const answerRecords: any[] = [];
    for (const ans of dto.answers) {
      const examQuestion = participation.exam.questions.find(
        (eq) => eq.questionId === ans.questionId,
      );
      if (!examQuestion) continue;

      let scoreAwarded: number | null = null;
      let isAutoGraded = false;

      if (
        examQuestion.question.type === 'MULTIPLE_CHOICE' ||
        examQuestion.question.type === 'TRUE_FALSE'
      ) {
        const correctOption = examQuestion.question.options.find(
          (o) => o.isCorrect,
        );
        if (correctOption && ans.selectedOptionId === correctOption.id) {
          scoreAwarded = examQuestion.score;
        } else {
          scoreAwarded = 0;
        }
        autoGradedTotalScore += scoreAwarded;
        isAutoGraded = true;
      } else {
        hasDescriptiveQuestions = true;
      }

      answerRecords.push({
        participationId: participation.id,
        questionId: ans.questionId,
        selectedOptionId: ans.selectedOptionId,
        descriptiveAnswer: ans.descriptiveAnswer,
        scoreAwarded,
        isAutoGraded,
      });
    }

    // Save answers and finalize submission in transaction
    await this.prisma.$transaction(async (tx) => {
      for (const record of answerRecords) {
        await tx.examAnswer.upsert({
          where: {
            participationId_questionId: {
              participationId: record.participationId,
              questionId: record.questionId,
            },
          },
          update: record,
          create: record,
        });
      }

      await tx.examParticipation.update({
        where: { id: participation.id },
        data: {
          status: 'SUBMITTED',
          submittedAt: now,
          tabSwitchCount,
          flaggedForReview,
          totalScore: hasDescriptiveQuestions ? null : autoGradedTotalScore,
          isGraded: !hasDescriptiveQuestions,
        },
      });
    });

    return {
      message: 'پاسخ‌های آزمون با موفقیت در سامانه ثبت و ارسال گردید',
      status: 'SUBMITTED',
      isGraded: !hasDescriptiveQuestions,
      autoGradedScore: !hasDescriptiveQuestions ? autoGradedTotalScore : null,
      flaggedForReview,
    };
  }

  // 5. Grade Descriptive Answers (Teacher Grading)
  async gradeDescriptiveAnswers(
    tenantId: string,
    participationId: string,
    dto: GradeExamParticipationDto,
  ) {
    const participation = await this.prisma.examParticipation.findFirst({
      where: { id: participationId, tenantId },
      include: {
        answers: true,
        exam: { include: { questions: true } },
      },
    });

    if (!participation) {
      throw new NotFoundException('برگه مشارکت آزمون یافت نشد');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const g of dto.grades) {
        await tx.examAnswer.update({
          where: {
            participationId_questionId: {
              participationId,
              questionId: g.questionId,
            },
          },
          data: {
            scoreAwarded: g.scoreAwarded,
            teacherComment: g.teacherComment,
          },
        });
      }

      // Re-aggregate total score
      const allAnswers = await tx.examAnswer.findMany({
        where: { participationId },
      });
      const totalScore = allAnswers.reduce(
        (sum, a) => sum + (a.scoreAwarded || 0),
        0,
      );

      await tx.examParticipation.update({
        where: { id: participationId },
        data: {
          totalScore,
          isGraded: true,
          teacherFeedback: dto.teacherFeedback,
        },
      });
    });

    return {
      message: 'تصحیح و ثبت نمرات برگه با موفقیت انجام شد',
      participationId,
    };
  }

  // 6. Get Exam Results & Sheet
  async getExamResults(tenantId: string, examId: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, tenantId },
      include: {
        participations: {
          include: {
            student: { include: { user: { select: { firstName: true, lastName: true } } } },
            answers: true,
          },
          orderBy: { totalScore: 'desc' },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('آزمون یافت نشد');
    }

    const totalStudents = exam.participations.length;
    const gradedCount = exam.participations.filter((p) => p.isGraded).length;
    const scores = exam.participations
      .filter((p) => p.isGraded && p.totalScore !== null)
      .map((p) => p.totalScore as number);

    const averageScore =
      scores.length > 0
        ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
        : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;

    return {
      exam: {
        id: exam.id,
        title: exam.title,
        totalScore: exam.totalScore,
      },
      stats: {
        totalStudents,
        gradedCount,
        averageScore,
        maxScore,
        minScore,
      },
      participations: exam.participations.map((p) => ({
        id: p.id,
        studentName: `${p.student.user.firstName} ${p.student.user.lastName}`,
        status: p.status,
        startedAt: p.startedAt,
        submittedAt: p.submittedAt,
        totalScore: p.totalScore,
        isGraded: p.isGraded,
        tabSwitchCount: p.tabSwitchCount,
        flaggedForReview: p.flaggedForReview,
      })),
    };
  }

  private shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
