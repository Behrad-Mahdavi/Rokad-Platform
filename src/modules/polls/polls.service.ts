import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePollDto, CastVoteDto } from './dto/create-poll.dto';

@Injectable()
export class PollsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPoll(tenantId: string, createdById: string, dto: CreatePollDto) {
    if (dto.options.length < 2 && dto.pollType !== 'RATING_SCALE') {
      throw new BadRequestException('نظرسنجی باید حداقل دارای ۲ گزینه باشد');
    }

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
        options: {
          create: dto.options.map((opt, index) => ({
            text: opt.text,
            orderIndex: index + 1,
          })),
        },
      },
      include: {
        options: { orderBy: { orderIndex: 'asc' } },
      },
    });
  }

  async listPolls(tenantId: string, userId?: string) {
    return this.prisma.poll.findMany({
      where: { tenantId },
      include: {
        options: { orderBy: { orderIndex: 'asc' } },
        _count: { select: { votes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPollDetails(tenantId: string, pollId: string, userId?: string) {
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

    let userVote: any = null;
    if (userId) {
      userVote = await this.prisma.pollVote.findUnique({
        where: {
          pollId_userId: { pollId, userId },
        },
      });
    }

    return {
      poll,
      hasVoted: !!userVote,
      userVote: userVote ? { createdAt: userVote.createdAt } : null,
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
    if (now < poll.startDate || now > poll.endDate || poll.isClosed) {
      throw new BadRequestException('مهلت شرکت در این نظرسنجی به پایان رسیده یا هنوز آغاز نشده است');
    }

    const existingVote = await this.prisma.pollVote.findUnique({
      where: {
        pollId_userId: { pollId, userId },
      },
    });
    if (existingVote) {
      throw new ConflictException('شما قبلاً در این نظرسنجی رأی داده‌اید');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create vote
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

      // 2. Increment vote counts on selected options
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
