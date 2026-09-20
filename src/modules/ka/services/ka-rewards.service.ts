import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateKaRewardDto, ClaimKaRewardDto, DeliverKaRewardDto } from '../dto/ka.dto';
import { KaRewardStatus } from '@prisma/client';

@Injectable()
export class KaRewardsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================
  // ADMIN: Reward Management
  // ============================

  async createReward(tenantId: string, dto: CreateKaRewardDto) {
    return this.prisma.kaReward.create({
      data: {
        tenantId,
        ...dto,
      },
    });
  }

  async findAllRewards(tenantId: string) {
    return this.prisma.kaReward.findMany({
      where: { tenantId },
      orderBy: { minToken: 'asc' },
    });
  }

  // ============================
  // STUDENT: Claim Reward
  // ============================

  async claimReward(tenantId: string, userId: string, dto: ClaimKaRewardDto) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });
    if (!student) throw new NotFoundException('Student profile not found');

    const reward = await this.prisma.kaReward.findUnique({
      where: { id: dto.rewardId },
    });
    if (!reward || reward.tenantId !== tenantId) {
      throw new NotFoundException('Reward not found');
    }

    if (student.kaToken < reward.minToken) {
      throw new BadRequestException('Not enough tokens');
    }

    // Deduct token
    await this.prisma.studentProfile.update({
      where: { id: student.id },
      data: {
        kaToken: { decrement: reward.minToken }
      },
    });

    return this.prisma.kaStudentReward.create({
      data: {
        tenantId,
        studentId: student.id,
        rewardId: reward.id,
        tokenCost: reward.minToken,
        status: KaRewardStatus.PENDING,
      },
    });
  }

  async getMyRewards(tenantId: string, userId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });
    if (!student) throw new NotFoundException('Student profile not found');

    return this.prisma.kaStudentReward.findMany({
      where: { tenantId, studentId: student.id },
      include: { reward: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================
  // ADMIN: Reward Fulfillment
  // ============================

  async findAllClaims(tenantId: string) {
    return this.prisma.kaStudentReward.findMany({
      where: { tenantId },
      include: { 
        reward: true,
        student: {
          include: { user: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async fulfillReward(tenantId: string, claimId: string, dto: DeliverKaRewardDto) {
    const claim = await this.prisma.kaStudentReward.findUnique({
      where: { id: claimId },
    });

    if (!claim || claim.tenantId !== tenantId) {
      throw new NotFoundException('Reward claim not found');
    }

    // اگر پاداش رد شد، توکن کسرشده باید به حساب دانش‌آموز برگردد
    if (dto.status === KaRewardStatus.REJECTED && claim.status !== KaRewardStatus.REJECTED) {
      await this.prisma.studentProfile.update({
        where: { id: claim.studentId },
        data: {
          kaToken: { increment: claim.tokenCost },
        },
      });
    }

    return this.prisma.kaStudentReward.update({
      where: { id: claimId },
      data: {
        status: dto.status,
      },
    });
  }
}
