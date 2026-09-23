import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePollDto,
  SubmitPollAnswersDto,
  CastVoteDto,
  PollStatusAction,
} from './dto/create-poll.dto';
import { Role } from '../../common/constants';

export interface SurveyQuestion {
  type: string;
  title: string;
  description?: string;
  options?: string[];
  maxSelections?: number;
  required?: boolean;
  displayMode?: 'buttons' | 'list';
  porscadQuestionId?: string | null;
}

const OPTION_TYPES = new Set([
  'choice',
  'picture_choice',
  'dropdown',
  'likert',
  'ranking',
  'matrix',
]);

@Injectable()
export class PollsService {
  constructor(private readonly prisma: PrismaService) {}

  private audienceForRole(role?: string): string | null {
    switch (role) {
      case Role.STUDENT:
        return 'STUDENTS';
      case Role.PARENT:
        return 'PARENTS';
      case Role.TEACHER:
      case Role.COACH:
      case Role.STAFF:
      case Role.SCHOOL_ADMIN:
      case Role.SUPER_ADMIN:
        return null;
      default:
        return 'ALL';
    }
  }

  async createPoll(tenantId: string, createdById: string, dto: CreatePollDto) {
    const questions = Array.isArray(dto.questions) ? dto.questions : [];
    const options = dto.options || [];

    if (questions.length === 0) {
      if (options.length < 2 && dto.pollType !== 'RATING_SCALE') {
        throw new BadRequestException('نظرسنجی باید حداقل دارای ۲ گزینه باشد');
      }
    } else {
      for (const q of questions) {
        const needsOptions = OPTION_TYPES.has(q.type);
        if (needsOptions && (!q.options || q.options.length < 2)) {
          throw new BadRequestException(
            `سوال «${q.title}» باید حداقل ۲ گزینه داشته باشد`,
          );
        }
      }
    }

    const questionIds =
      (dto.porscadMeta?.questionIds as string[] | undefined) ||
      (dto as { porscadQuestionIds?: string[] }).porscadQuestionIds ||
      [];

    const questionsJson = questions.map((q, index) => ({
      ...q,
      maxSelections: q.maxSelections ?? (q.type === 'choice' ? 1 : undefined),
      required: q.required ?? true,
      displayMode: q.displayMode ?? 'buttons',
      porscadQuestionId: questionIds[index] || null,
    }));

    return this.prisma.poll.create({
      data: {
        tenantId,
        title: dto.title,
        description: dto.description,
        pollType: dto.pollType || 'SINGLE_CHOICE',
        targetAudience: dto.targetAudience || 'ALL',
        targetClassIds: dto.targetClassIds || [],
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isAnonymous: dto.isAnonymous || false,
        createdById,
        questions: questionsJson as any,
        porscadFormId: dto.porscadFormId,
        porscadFormPublicId: dto.porscadFormPublicId,
        options: {
          create:
            options.length > 0
              ? options.map((opt, index) => ({
                  text: opt.text,
                  orderIndex: index + 1,
                }))
              : questions
                  .filter((q) => (q.options?.length || 0) > 0)
                  .flatMap((q, qi) =>
                    (q.options || []).map((text, oi) => ({
                      text,
                      orderIndex: qi * 10 + oi + 1,
                    })),
                  ),
        },
      },
      include: {
        options: { orderBy: { orderIndex: 'asc' } },
      },
    });
  }

  async listPolls(tenantId: string, userId?: string, role?: string) {
    const audience = this.audienceForRole(role);
    const where: Record<string, unknown> = { tenantId };
    if (audience) {
      where.targetAudience = { in: ['ALL', audience] };
    }

    return this.prisma.poll.findMany({
      where,
      include: {
        options: { orderBy: { orderIndex: 'asc' } },
        _count: { select: { votes: true } },
        createdBy: {
          select: { firstName: true, lastName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePollStatus(
    tenantId: string,
    pollId: string,
    action: PollStatusAction,
  ) {
    const poll = await this.prisma.poll.findFirst({
      where: { id: pollId, tenantId },
    });
    if (!poll) {
      throw new NotFoundException('نظرسنجی یافت نشد');
    }

    switch (action) {
      case 'close': {
        if (poll.isClosed) {
          throw new BadRequestException('این نظرسنجی هم‌اکنون بسته است');
        }
        return this.prisma.poll.update({
          where: { id: pollId },
          data: { isClosed: true },
        });
      }
      case 'open': {
        if (!poll.isClosed) {
          throw new BadRequestException('این نظرسنجی هم‌اکنون باز است');
        }
        if (new Date() > poll.endDate) {
          throw new BadRequestException(
            'مهلت این نظرسنجی به پایان رسیده است؛ ابتدا تاریخ پایان را تمدید کنید',
          );
        }
        return this.prisma.poll.update({
          where: { id: pollId },
          data: { isClosed: false },
        });
      }
      case 'archive': {
        if (poll.isArchived) {
          throw new BadRequestException('این نظرسنجی در آرشیو است');
        }
        return this.prisma.poll.update({
          where: { id: pollId },
          data: { isArchived: true },
        });
      }
      case 'unarchive': {
        if (!poll.isArchived) {
          throw new BadRequestException('این نظرسنجی در آرشیو نیست');
        }
        return this.prisma.poll.update({
          where: { id: pollId },
          data: { isArchived: false },
        });
      }
      default:
        throw new BadRequestException('عملیات وضعیت نامعتبر است');
    }
  }

  async deletePoll(tenantId: string, pollId: string) {
    const poll = await this.prisma.poll.findFirst({
      where: { id: pollId, tenantId },
      select: { id: true, porscadFormId: true, porscadFormPublicId: true },
    });
    if (!poll) {
      throw new NotFoundException('نظرسنجی یافت نشد');
    }

    await this.prisma.poll.delete({ where: { id: pollId } });

    return {
      message: 'نظرسنجی با موفقیت حذف شد',
      porscadFormId: poll.porscadFormId,
      porscadFormPublicId: poll.porscadFormPublicId,
    };
  }

  async getPollDetails(tenantId: string, pollId: string, userId?: string) {
    const poll = await this.prisma.poll.findFirst({
      where: { id: pollId, tenantId },
      include: {
        options: { orderBy: { orderIndex: 'asc' } },
        _count: { select: { votes: true } },
        votes: userId
          ? { where: { userId }, take: 1 }
          : false,
      },
    });

    if (!poll) {
      throw new NotFoundException('نظرسنجی یافت نشد');
    }

    const userVote = userId
      ? await this.prisma.pollVote.findUnique({
          where: { pollId_userId: { pollId, userId } },
        })
      : null;

    const { votes: _votes, ...rest } = poll as any;

    return {
      poll: rest,
      hasVoted: !!userVote,
      userVote: userVote
        ? {
            createdAt: userVote.createdAt,
            answers: userVote.answers,
            respondentName: userVote.respondentName,
          }
        : null,
    };
  }

  async submitAnswers(
    tenantId: string,
    pollId: string,
    userId: string,
    respondentName: string,
    dto: SubmitPollAnswersDto,
  ) {
    const poll = await this.prisma.poll.findFirst({
      where: { id: pollId, tenantId },
    });
    if (!poll) {
      throw new NotFoundException('نظرسنجی یافت نشد');
    }

    const now = new Date();
    if (poll.isArchived) {
      throw new BadRequestException('این نظرسنجی آرشیو شده و پذیرش پاسخ نیست');
    }
    if (now < poll.startDate || now > poll.endDate || poll.isClosed) {
      throw new BadRequestException(
        'مهلت شرکت در این نظرسنجی به پایان رسیده یا هنوز آغاز نشده است',
      );
    }

    const existing = await this.prisma.pollVote.findUnique({
      where: { pollId_userId: { pollId, userId } },
    });
    if (existing) {
      throw new ConflictException('شما قبلاً در این نظرسنجی پاسخ داده‌اید');
    }

    const answers = dto.answers || {};
    const selectedOptionIds = Object.values(answers)
      .flatMap((v) => (Array.isArray(v) ? v : [v]))
      .filter((v): v is string => typeof v === 'string');

    const firstNumeric = Object.values(answers).find(
      (v) => typeof v === 'number',
    );

    return this.prisma.$transaction(async (tx) => {
      const vote = await tx.pollVote.create({
        data: {
          tenantId,
          pollId,
          userId,
          selectedOptionIds,
          ratingValue: typeof firstNumeric === 'number' ? firstNumeric : null,
          textResponse:
            typeof dto.answers?.comment === 'string'
              ? dto.answers.comment
              : null,
          answers: dto.answers as any,
          porscadResponseId: dto.porscadResponseId,
          respondentName: respondentName || dto.respondentName,
        },
      });

      for (const optId of selectedOptionIds) {
        const opt = await tx.pollOption.findFirst({
          where: {
            pollId,
            OR: [{ id: optId }, { text: optId }],
          },
        });
        if (opt) {
          await tx.pollOption.update({
            where: { id: opt.id },
            data: { voteCount: { increment: 1 } },
          });
        }
      }

      return {
        message: 'پاسخ شما با موفقیت ثبت گردید',
        voteId: vote.id,
        porscadResponseId: vote.porscadResponseId,
      };
    });
  }

  async getAnalytics(tenantId: string, pollId: string) {
    const poll = await this.prisma.poll.findFirst({
      where: { id: pollId, tenantId },
      include: {
        options: { orderBy: { orderIndex: 'asc' } },
        _count: { select: { votes: true } },
      },
    });
    if (!poll) {
      throw new NotFoundException('نظرسنجی یافت نشد');
    }

    const votes = await this.prisma.pollVote.findMany({
      where: { pollId, tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        respondentName: true,
        answers: true,
        porscadResponseId: true,
        ratingValue: true,
        selectedOptionIds: true,
        textResponse: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true, role: true } },
      },
    });

    const questions = (poll.questions as unknown as SurveyQuestion[]) || [];
    const perQuestion = questions.map((q, index) => {
      const counts: Record<string, number> = {};
      let ratingSum = 0;
      let ratingCount = 0;
      let answered = 0;

      for (const v of votes) {
        const answers = (v.answers as Record<string, unknown>) || {};
        const raw = answers[String(index)] ?? answers[`q_${index}`];
        if (raw === undefined || raw === null || raw === '') continue;
        answered += 1;
        if (typeof raw === 'number') {
          ratingSum += raw;
          ratingCount += 1;
          const key = String(raw);
          counts[key] = (counts[key] || 0) + 1;
        } else if (Array.isArray(raw)) {
          for (const item of raw) {
            const key = String(item);
            counts[key] = (counts[key] || 0) + 1;
          }
        } else {
          const key = String(raw);
          counts[key] = (counts[key] || 0) + 1;
        }
      }

      const options = (q.options || []).map((text) => ({
        text,
        count: counts[text] || 0,
        percentage:
          answered > 0
            ? Math.round(((counts[text] || 0) / answered) * 100)
            : 0,
      }));

      Object.entries(counts).forEach(([text, count]) => {
        if (!options.find((o) => o.text === text)) {
          options.push({
            text,
            count,
            percentage:
              answered > 0 ? Math.round((count / answered) * 100) : 0,
          });
        }
      });

      return {
        index,
        title: q.title,
        type: q.type,
        answered,
        options: options.sort((a, b) => b.count - a.count),
        avgRating:
          ratingCount > 0 ? Number((ratingSum / ratingCount).toFixed(2)) : null,
      };
    });

    const legacyCounts = poll.options.map((opt) => ({
      id: opt.id,
      text: opt.text,
      voteCount: opt.voteCount,
      percentage:
        poll._count.votes > 0
          ? Math.round((opt.voteCount / poll._count.votes) * 100)
          : 0,
    }));

    return {
      poll: {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        startDate: poll.startDate,
        endDate: poll.endDate,
        isClosed: poll.isClosed,
        isArchived: poll.isArchived,
        targetAudience: poll.targetAudience,
        porscadFormId: poll.porscadFormId,
        porscadFormPublicId: poll.porscadFormPublicId,
        questions: poll.questions,
      },
      totalResponses: votes.length,
      porscadLinked: !!poll.porscadFormId,
      perQuestion,
      legacyOptions: legacyCounts,
      responses: votes.map((v) => ({
        id: v.id,
        respondentName: poll.isAnonymous
          ? 'کاربر ناشناس'
          : v.respondentName ||
            `${v.user?.firstName || ''} ${v.user?.lastName || ''}`.trim() ||
            'کاربر',
        role: poll.isAnonymous ? undefined : v.user?.role,
        answers: v.answers,
        porscadResponseId: v.porscadResponseId,
        createdAt: v.createdAt,
      })),
    };
  }

  async castVote(
    tenantId: string,
    pollId: string,
    userId: string,
    dto: CastVoteDto,
  ) {
    const poll = await this.prisma.poll.findFirst({
      where: { id: pollId, tenantId },
    });
    if (!poll) {
      throw new NotFoundException('نظرسنجی یافت نشد');
    }

    const now = new Date();
    if (poll.isArchived) {
      throw new BadRequestException('این نظرسنجی آرشیو شده و پذیرش رأی نیست');
    }
    if (now < poll.startDate || now > poll.endDate || poll.isClosed) {
      throw new BadRequestException(
        'مهلت شرکت در این نظرسنجی به پایان رسیده یا هنوز آغاز نشده است',
      );
    }

    const existingVote = await this.prisma.pollVote.findUnique({
      where: { pollId_userId: { pollId, userId } },
    });
    if (existingVote) {
      throw new ConflictException('شما قبلاً در این نظرسنجی رأی داده‌اید');
    }

    return this.prisma.$transaction(async (tx) => {
      const vote = await tx.pollVote.create({
        data: {
          tenantId,
          pollId,
          userId,
          selectedOptionIds: dto.selectedOptionIds || [],
          ratingValue: dto.ratingValue,
          textResponse: dto.textResponse,
        },
      });

      if (dto.selectedOptionIds && dto.selectedOptionIds.length > 0) {
        for (const optId of dto.selectedOptionIds) {
          await tx.pollOption.update({
            where: { id: optId },
            data: { voteCount: { increment: 1 } },
          });
        }
      }

      return {
        message: 'رأی شما با موفقیت ثبت گردید',
        voteId: vote.id,
      };
    });
  }
}
