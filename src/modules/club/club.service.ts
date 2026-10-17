import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ClubDepartment,
  ClubGrade,
  ClubMembershipStatus,
  ClubMilestoneStatus,
  ClubMilestoneType,
  ClubSubmissionStatus,
  UserRole,
} from '@prisma/client';
import {
  CreateClubChallengeDto,
  UpdateClubChallengeDto,
  CreateClubMilestoneDto,
  UpdateClubMilestoneDto,
  SubmitChallengeDto,
  GradeSubmissionDto,
  UpdateClubMembershipDto,
  TeacherApprovalDto,
  CreateClubReportDto,
} from './dto/club.dto';
import { ENTRANCE_CHALLENGES } from './club.constants';

@Injectable()
export class ClubService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Student Business Club Portal
  // ─────────────────────────────────────────────────────────────────────────────

  async getMyClubStatus(userId: string, tenantId: string) {
    // 1. Get or initialize membership
    let membership = await this.prisma.clubMembership.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            avatarUrl: true,
            phone: true,
            studentProfile: {
              select: {
                studentCode: true,
                nationalCode: true,
              },
            },
          },
        },
      },
    });

    if (!membership) {
      membership = await this.prisma.clubMembership.create({
        data: {
          tenantId,
          userId,
          status: ClubMembershipStatus.IN_ROADMAP,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              avatarUrl: true,
              phone: true,
              studentProfile: {
                select: {
                  studentCode: true,
                  nationalCode: true,
                },
              },
            },
          },
        },
      });
    }

    // 2. Fetch milestones for this tenant
    const milestones = await this.prisma.clubRoadmapMilestone.findMany({
      where: { tenantId },
      orderBy: { orderIndex: 'asc' },
      include: {
        lesson: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // 3. Fetch student's progress on these milestones
    const progressRecords = await this.prisma.clubStudentMilestoneProgress.findMany({
      where: {
        tenantId,
        studentId: userId,
      },
      include: {
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    const progressMap = new Map(progressRecords.map((p) => [p.milestoneId, p]));

    // 4. Calculate progress percentage
    let totalWeight = 0;
    let completedWeight = 0;

    const roadmap = milestones.map((m) => {
      const progress = progressMap.get(m.id);
      const isApproved = progress?.status === ClubMilestoneStatus.APPROVED;
      totalWeight += m.weight;
      if (isApproved) {
        completedWeight += m.weight;
      }

      return {
        ...m,
        progress: progress || {
          status: ClubMilestoneStatus.PENDING,
          approvedAt: null,
          notes: null,
          approvedBy: null,
        },
      };
    });

    const progressPercentage =
      totalWeight > 0 ? Math.min(100, Math.round((completedWeight / totalWeight) * 100)) : 0;

    // 5. Active and past challenge submissions
    const activeSubmissions = await this.prisma.clubChallengeSubmission.findMany({
      where: {
        tenantId,
        studentId: userId,
        status: ClubSubmissionStatus.IN_PROGRESS,
      },
      include: {
        challenge: true,
      },
    });

    const recentSubmissions = await this.prisma.clubChallengeSubmission.findMany({
      where: {
        tenantId,
        studentId: userId,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        challenge: true,
        gradedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      membership,
      roadmap,
      progressPercentage,
      activeChallengesCount: activeSubmissions.length,
      canStartNewChallenge: activeSubmissions.length < 2,
      activeSubmissions,
      recentSubmissions,
      isStudioReady: membership.grade === ClubGrade.A,
    };
  }

  async getChallenges(userId: string, tenantId: string, department?: ClubDepartment) {
    const where: any = {
      tenantId,
      isPublished: true,
      ...(department ? { department } : {}),
    };

    const challenges = await this.prisma.clubChallenge.findMany({
      where,
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
      include: {
        submissions: {
          where: { studentId: userId },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Check how many active challenges student currently has
    const activeCount = await this.prisma.clubChallengeSubmission.count({
      where: {
        tenantId,
        studentId: userId,
        status: ClubSubmissionStatus.IN_PROGRESS,
      },
    });

    return {
      activeCount,
      canStartMore: activeCount < 2,
      challenges: challenges.map((ch) => {
        const latestSubmission = ch.submissions[0] || null;
        return {
          id: ch.id,
          title: ch.title,
          slug: ch.slug,
          description: ch.description,
          department: ch.department,
          type: ch.type,
          minGrade: ch.minGrade,
          maxDays: ch.maxDays,
          maxScore: ch.maxScore,
          isPublished: ch.isPublished,
          createdAt: ch.createdAt,
          userSubmission: latestSubmission,
          isEnrolled: latestSubmission?.status === ClubSubmissionStatus.IN_PROGRESS,
          isGraded: latestSubmission?.status === ClubSubmissionStatus.GRADED,
        };
      }),
    };
  }

  async getChallengeById(id: string, userId: string, tenantId: string) {
    const challenge = await this.prisma.clubChallenge.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        submissions: {
          where: { studentId: userId },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!challenge) {
      throw new NotFoundException('چالش مورد نظر یافت نشد');
    }

    const latestSubmission = challenge.submissions[0] || null;

    const activeCount = await this.prisma.clubChallengeSubmission.count({
      where: {
        tenantId,
        studentId: userId,
        status: ClubSubmissionStatus.IN_PROGRESS,
      },
    });

    return {
      challenge,
      latestSubmission,
      activeChallengesCount: activeCount,
      canStart: activeCount < 2 && (!latestSubmission || latestSubmission.status !== ClubSubmissionStatus.IN_PROGRESS),
    };
  }

  async startChallenge(challengeId: string, userId: string, tenantId: string) {
    const challenge = await this.prisma.clubChallenge.findFirst({
      where: { id: challengeId, tenantId, isPublished: true },
    });

    if (!challenge) {
      throw new NotFoundException('چالش یافت نشد یا در دسترس نیست');
    }

    // 1. Check max 2 active challenges rule
    const activeCount = await this.prisma.clubChallengeSubmission.count({
      where: {
        tenantId,
        studentId: userId,
        status: ClubSubmissionStatus.IN_PROGRESS,
      },
    });

    if (activeCount >= 2) {
      throw new BadRequestException(
        'شما هم‌زمان حداکثر می‌توانید ۲ چالش فعال داشته باشید. لطفاً ابتدا یکی از چالش‌های در حال اجرا را ارسال یا تکمیل کنید.',
      );
    }

    // 2. Check if already active on this challenge
    const existingActive = await this.prisma.clubChallengeSubmission.findFirst({
      where: {
        tenantId,
        challengeId,
        studentId: userId,
        status: ClubSubmissionStatus.IN_PROGRESS,
      },
    });

    if (existingActive) {
      return existingActive;
    }

    const deadlineAt = new Date(Date.now() + challenge.maxDays * 24 * 60 * 60 * 1000);

    return this.prisma.clubChallengeSubmission.create({
      data: {
        tenantId,
        challengeId,
        studentId: userId,
        status: ClubSubmissionStatus.IN_PROGRESS,
        deadlineAt,
      },
    });
  }

  async submitChallenge(challengeId: string, userId: string, tenantId: string, dto: SubmitChallengeDto) {
    const submission = await this.prisma.clubChallengeSubmission.findFirst({
      where: {
        tenantId,
        challengeId,
        studentId: userId,
        status: ClubSubmissionStatus.IN_PROGRESS,
      },
    });

    if (!submission) {
      throw new BadRequestException('هیچ چالش فعالی برای ارسال پاسخ یافت نشد.');
    }

    return this.prisma.clubChallengeSubmission.update({
      where: { id: submission.id },
      data: {
        status: ClubSubmissionStatus.SUBMITTED,
        submittedAt: new Date(),
        repositoryUrl: dto.repositoryUrl,
        figmaUrl: dto.figmaUrl,
        demoUrl: dto.demoUrl,
        submissionNotes: dto.submissionNotes,
        attachments: dto.attachments,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Teacher Club Approvals
  // ─────────────────────────────────────────────────────────────────────────────

  async getTeacherPendingApprovals(teacherUserId: string, tenantId: string) {
    // 1. Find teacher's assigned lessons
    const teacherProfile = await this.prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
      include: {
        teacherLessons: true,
      },
    });

    const lessonIds = teacherProfile ? teacherProfile.teacherLessons.map((tl) => tl.lessonId) : [];

    // 2. Find milestones linked to these lessons, or general teacher approval milestones
    let milestones = await this.prisma.clubRoadmapMilestone.findMany({
      where: {
        tenantId,
        type: ClubMilestoneType.TEACHER_APPROVAL,
        ...(lessonIds.length > 0
          ? {
              OR: [
                { lessonId: { in: lessonIds } },
                { lessonId: null },
              ],
            }
          : {}),
      },
    });

    // Fallback: if no milestones match teacher's specific lessons, show all teacher approval milestones in the tenant
    if (milestones.length === 0) {
      milestones = await this.prisma.clubRoadmapMilestone.findMany({
        where: {
          tenantId,
          type: ClubMilestoneType.TEACHER_APPROVAL,
        },
      });
    }

    const milestoneIds = milestones.map((m) => m.id);

    // 3. Find student progress for these milestones (all statuses so teacher can see pending, approved, and rejected)
    const progressRecords = await this.prisma.clubStudentMilestoneProgress.findMany({
      where: {
        tenantId,
        milestoneId: { in: milestoneIds },
      },
      include: {
        milestone: {
          include: {
            lesson: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            avatarUrl: true,
            studentProfile: {
              select: {
                studentCode: true,
                nationalCode: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      approvals: progressRecords,
      total: progressRecords.length,
    };
  }

  async submitTeacherApproval(
    progressId: string,
    teacherUserId: string,
    tenantId: string,
    dto: TeacherApprovalDto,
  ) {
    const progress = await this.prisma.clubStudentMilestoneProgress.findFirst({
      where: { id: progressId, tenantId },
      include: {
        milestone: true,
      },
    });

    if (!progress) {
      throw new NotFoundException('درخواست تایید یافت نشد');
    }

    return this.prisma.clubStudentMilestoneProgress.update({
      where: { id: progressId },
      data: {
        status: dto.status,
        notes: dto.notes,
        approvedAt: new Date(),
        approvedById: teacherUserId,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Admin & Club Lead Management
  // ─────────────────────────────────────────────────────────────────────────────

  async getAdminMembers(tenantId: string, filter?: { department?: ClubDepartment; grade?: ClubGrade; search?: string }) {
    const whereUser: any = {
      tenantId,
      role: UserRole.STUDENT,
      status: 'ACTIVE',
    };

    if (filter?.search) {
      whereUser.OR = [
        { firstName: { contains: filter.search, mode: 'insensitive' } },
        { lastName: { contains: filter.search, mode: 'insensitive' } },
        { username: { contains: filter.search } },
      ];
    }

    const students = await this.prisma.user.findMany({
      where: whereUser,
      include: {
        studentProfile: true,
        clubMembership: true,
        studentClubMilestones: {
          include: {
            milestone: true,
          },
        },
        studentClubSubmissions: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: {
            challenge: true,
          },
        },
      },
      orderBy: { lastName: 'asc' },
    });

    const milestones = await this.prisma.clubRoadmapMilestone.findMany({
      where: { tenantId },
      orderBy: { orderIndex: 'asc' },
    });

    const totalWeight = milestones.reduce((sum, m) => sum + m.weight, 0);

    const members = students.map((s) => {
      const approvedWeight = s.studentClubMilestones
        .filter((p) => p.status === ClubMilestoneStatus.APPROVED)
        .reduce((sum, p) => sum + (p.milestone?.weight || 0), 0);

      const progressPct = totalWeight > 0 ? Math.min(100, Math.round((approvedWeight / totalWeight) * 100)) : 0;

      const mem = s.clubMembership;

      return {
        id: mem?.id || s.id,
        studentId: s.id,
        userId: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        username: s.username,
        phone: s.phone,
        avatarUrl: s.avatarUrl,
        studentCode: s.studentProfile?.studentCode,
        department: mem?.department || null,
        grade: mem?.grade || null,
        status: mem?.status || ClubMembershipStatus.IN_ROADMAP,
        joinedAt: mem?.joinedAt || null,
        promotedToGradeAAt: mem?.promotedToGradeAAt || null,
        adminNotes: mem?.adminNotes || null,
        user: {
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          username: s.username,
          phone: s.phone,
          avatarUrl: s.avatarUrl,
          studentProfile: s.studentProfile,
        },
        membership: mem || {
          status: ClubMembershipStatus.IN_ROADMAP,
          department: null,
          grade: null,
          joinedAt: null,
        },
        progressPercentage: progressPct,
        completedMilestonesCount: s.studentClubMilestones.filter((p) => p.status === ClubMilestoneStatus.APPROVED).length,
        totalMilestonesCount: milestones.length,
        milestoneProgress: s.studentClubMilestones,
        recentSubmissions: s.studentClubSubmissions,
      };
    });

    return {
      members,
      total: members.length,
    };
  }

  async updateMemberStatus(studentId: string, tenantId: string, adminUserId: string, dto: UpdateClubMembershipDto) {
    const student = await this.prisma.user.findFirst({
      where: { id: studentId, tenantId },
    });
    if (!student) {
      throw new NotFoundException('دانش‌آموز مورد نظر یافت نشد');
    }

    const existing = await this.prisma.clubMembership.findUnique({
      where: { userId: studentId },
    });

    const data: any = {
      ...dto,
    };

    if (dto.grade === ClubGrade.A && (!existing || existing.grade !== ClubGrade.A)) {
      data.promotedToGradeAAt = new Date();
      data.status = ClubMembershipStatus.STUDIO_READY;
    }

    if (dto.status === ClubMembershipStatus.ACTIVE_MEMBER && (!existing || !existing.joinedAt)) {
      data.joinedAt = new Date();
    }

    if (existing) {
      return this.prisma.clubMembership.update({
        where: { userId: studentId },
        data,
      });
    }

    return this.prisma.clubMembership.create({
      data: {
        tenantId,
        userId: studentId,
        ...data,
      },
    });
  }

  async toggleStudentMilestone(studentId: string, milestoneId: string, tenantId: string, adminUserId: string) {
    const [student, milestone] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: studentId, tenantId } }),
      this.prisma.clubRoadmapMilestone.findFirst({ where: { id: milestoneId, tenantId } }),
    ]);

    if (!student) {
      throw new NotFoundException('دانش‌آموز مورد نظر یافت نشد');
    }
    if (!milestone) {
      throw new NotFoundException('مایلستون مورد نظر یافت نشد');
    }

    const existing = await this.prisma.clubStudentMilestoneProgress.findUnique({
      where: {
        tenantId_studentId_milestoneId: {
          tenantId,
          studentId,
          milestoneId,
        },
      },
    });

    if (existing && existing.status === ClubMilestoneStatus.APPROVED) {
      return this.prisma.clubStudentMilestoneProgress.update({
        where: { id: existing.id },
        data: {
          status: ClubMilestoneStatus.PENDING,
          approvedAt: null,
          approvedById: null,
        },
      });
    }

    if (existing) {
      return this.prisma.clubStudentMilestoneProgress.update({
        where: { id: existing.id },
        data: {
          status: ClubMilestoneStatus.APPROVED,
          approvedAt: new Date(),
          approvedById: adminUserId,
        },
      });
    }

    return this.prisma.clubStudentMilestoneProgress.create({
      data: {
        tenantId,
        studentId,
        milestoneId,
        status: ClubMilestoneStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: adminUserId,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Milestone CRUD
  // ─────────────────────────────────────────────────────────────────────────────

  async getAdminMilestones(tenantId: string) {
    const milestones = await this.prisma.clubRoadmapMilestone.findMany({
      where: { tenantId },
      orderBy: { orderIndex: 'asc' },
      include: {
        lesson: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
    return {
      milestones,
      total: milestones.length,
    };
  }

  async createMilestone(tenantId: string, dto: CreateClubMilestoneDto) {
    return this.prisma.clubRoadmapMilestone.create({
      data: {
        tenantId,
        ...dto,
      },
    });
  }

  async updateMilestone(id: string, tenantId: string, dto: UpdateClubMilestoneDto) {
    const existing = await this.prisma.clubRoadmapMilestone.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('مایلستون مورد نظر یافت نشد');
    }

    return this.prisma.clubRoadmapMilestone.update({
      where: { id },
      data: dto,
    });
  }

  async deleteMilestone(id: string, tenantId: string) {
    const existing = await this.prisma.clubRoadmapMilestone.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('مایلستون مورد نظر یافت نشد');
    }

    return this.prisma.clubRoadmapMilestone.delete({
      where: { id },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Challenges CRUD & Grading
  // ─────────────────────────────────────────────────────────────────────────────

  async getAdminChallenges(tenantId: string) {
    const challenges = await this.prisma.clubChallenge.findMany({
      where: { tenantId },
      orderBy: [{ department: 'asc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });
    return {
      challenges,
      total: challenges.length,
    };
  }

  async createChallenge(tenantId: string, dto: CreateClubChallengeDto) {
    const slug = `${dto.department.toLowerCase()}-${Date.now().toString(36)}`;
    return this.prisma.clubChallenge.create({
      data: {
        tenantId,
        slug,
        ...dto,
      },
    });
  }

  async updateChallenge(id: string, tenantId: string, dto: UpdateClubChallengeDto) {
    const existing = await this.prisma.clubChallenge.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('چالش مورد نظر یافت نشد');
    }

    return this.prisma.clubChallenge.update({
      where: { id },
      data: dto,
    });
  }

  async deleteChallenge(id: string, tenantId: string) {
    const existing = await this.prisma.clubChallenge.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('چالش مورد نظر یافت نشد');
    }

    return this.prisma.clubChallenge.delete({
      where: { id },
    });
  }

  async getAdminSubmissions(tenantId: string, status?: ClubSubmissionStatus) {
    const submissions = await this.prisma.clubChallengeSubmission.findMany({
      where: {
        tenantId,
        ...(status ? { status } : {}),
      },
      include: {
        challenge: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            avatarUrl: true,
            studentProfile: {
              select: {
                studentCode: true,
              },
            },
          },
        },
        gradedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
    return {
      submissions,
      total: submissions.length,
    };
  }

  async gradeSubmission(submissionId: string, tenantId: string, adminUserId: string, dto: GradeSubmissionDto) {
    const submission = await this.prisma.clubChallengeSubmission.findFirst({
      where: { id: submissionId, tenantId },
      include: { challenge: true },
    });

    if (!submission) {
      throw new NotFoundException('ارسال مورد نظر یافت نشد');
    }

    // 1. Calculate grade based on score:
    // < 50 -> C
    // 50 .. 80 -> B
    // > 80 -> A
    let calculatedGrade: ClubGrade = ClubGrade.C;
    if (dto.score >= 80) {
      calculatedGrade = ClubGrade.A;
    } else if (dto.score >= 50) {
      calculatedGrade = ClubGrade.B;
    } else {
      calculatedGrade = ClubGrade.C;
    }

    const finalGrade = dto.overrideGrade || calculatedGrade;

    // 2. Update Submission
    const updatedSubmission = await this.prisma.clubChallengeSubmission.update({
      where: { id: submissionId },
      data: {
        score: dto.score,
        feedback: dto.feedback,
        awardedGrade: finalGrade,
        gradedAt: new Date(),
        gradedById: adminUserId,
        status: ClubSubmissionStatus.GRADED,
      },
    });

    // 3. Update or promote Student Club Membership
    const existingMembership = await this.prisma.clubMembership.findUnique({
      where: { userId: submission.studentId },
    });

    const isGradeA = finalGrade === ClubGrade.A;

    await this.prisma.clubMembership.upsert({
      where: { userId: submission.studentId },
      update: {
        department: submission.challenge.department,
        grade: finalGrade,
        status: isGradeA ? ClubMembershipStatus.STUDIO_READY : ClubMembershipStatus.ACTIVE_MEMBER,
        joinedAt: existingMembership?.joinedAt || new Date(),
        ...(isGradeA ? { promotedToGradeAAt: new Date() } : {}),
      },
      create: {
        tenantId,
        userId: submission.studentId,
        department: submission.challenge.department,
        grade: finalGrade,
        status: isGradeA ? ClubMembershipStatus.STUDIO_READY : ClubMembershipStatus.ACTIVE_MEMBER,
        joinedAt: new Date(),
        ...(isGradeA ? { promotedToGradeAAt: new Date() } : {}),
      },
    });

    // 4. Auto-approve PLACEMENT_CHALLENGE milestone if exists in roadmap
    if (submission.challenge.type === 'PLACEMENT') {
      const placementMilestone = await this.prisma.clubRoadmapMilestone.findFirst({
        where: {
          tenantId,
          type: ClubMilestoneType.PLACEMENT_CHALLENGE,
        },
      });

      if (placementMilestone) {
        await this.prisma.clubStudentMilestoneProgress.upsert({
          where: {
            tenantId_studentId_milestoneId: {
              tenantId,
              studentId: submission.studentId,
              milestoneId: placementMilestone.id,
            },
          },
          update: {
            status: ClubMilestoneStatus.APPROVED,
            approvedAt: new Date(),
            approvedById: adminUserId,
            notes: `تأیید خودکار با نمره ${dto.score} در چالش ${submission.challenge.title}`,
          },
          create: {
            tenantId,
            studentId: submission.studentId,
            milestoneId: placementMilestone.id,
            status: ClubMilestoneStatus.APPROVED,
            approvedAt: new Date(),
            approvedById: adminUserId,
            notes: `تأیید خودکار با نمره ${dto.score} در چالش ${submission.challenge.title}`,
          },
        });
      }
    }

    return updatedSubmission;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Entrance Challenges & Dated Progress Reports (فراخوان ورودی باشگاه)
  // ─────────────────────────────────────────────────────────────────────────────

  async ensureEntranceChallengeInDb(item: typeof ENTRANCE_CHALLENGES[0], tenantId: string) {
    try {
      let challenge = await this.prisma.clubChallenge.findFirst({
        where: {
          slug: item.slug,
        },
      });

      if (!challenge) {
        challenge = await this.prisma.clubChallenge.create({
          data: {
            tenantId,
            title: item.title,
            slug: item.slug,
            description: item.description,
            missionBrief: item.missionBrief,
            rules: item.rules,
            department: item.department,
            type: item.type,
            maxDays: item.maxDays || 10,
            maxScore: item.maxScore || 100,
            attachments: {
              packageFile: item.packageFile,
              tags: item.tags,
            },
            isPublished: true,
          },
        });
      } else if (
        challenge.title !== item.title ||
        challenge.department !== item.department ||
        challenge.description !== item.description
      ) {
        challenge = await this.prisma.clubChallenge.update({
          where: { id: challenge.id },
          data: {
            title: item.title,
            department: item.department,
            description: item.description,
            missionBrief: item.missionBrief,
            rules: item.rules,
            maxDays: item.maxDays || 10,
            attachments: {
              packageFile: item.packageFile,
              tags: item.tags,
            },
          },
        });
      }
      return challenge;
    } catch (error) {
      // Return a simulated object if db fails
      return {
        id: item.slug,
        tenantId,
        title: item.title,
        slug: item.slug,
        description: item.description,
        missionBrief: item.missionBrief,
        rules: item.rules,
        department: item.department,
        type: item.type,
        maxDays: item.maxDays,
        maxScore: item.maxScore,
        attachments: { packageFile: item.packageFile, tags: item.tags },
        isPublished: true,
      };
    }
  }

  async getEntranceChallenges(userId: string, tenantId: string) {
    // 1. Fetch user active submissions
    const userSubmissions = await this.prisma.clubChallengeSubmission.findMany({
      where: {
        studentId: userId,
        ...(tenantId ? { tenantId } : {}),
      },
      include: {
        challenge: true,
      },
      orderBy: { startedAt: 'desc' },
    });

    const activeCount = userSubmissions.filter(
      (s) => s.status === ClubSubmissionStatus.IN_PROGRESS,
    ).length;

    // 2. Fetch reports if available
    let userReports: any[] = [];
    try {
      userReports = await (this.prisma as any).clubSubmissionReport.findMany({
        where: { studentId: userId },
        orderBy: { reportDate: 'desc' },
      });
    } catch (e) {
      // fallback
    }

    // 3. Map all 9 entrance challenges
    const challenges = await Promise.all(
      ENTRANCE_CHALLENGES.map(async (def) => {
        let dbChallenge: any = null;
        try {
          dbChallenge = await this.ensureEntranceChallengeInDb(def, tenantId);
        } catch {
          dbChallenge = { id: def.slug };
        }

        // Find user submission for this challenge
        const submission = userSubmissions.find(
          (s) => s.challengeId === dbChallenge.id || s.challenge?.slug === def.slug,
        );

        let reports: any[] = [];
        if (submission) {
          const directReports = userReports.filter((r) => r.submissionId === submission.id);
          const attReports = Array.isArray((submission.attachments as any)?.reports)
            ? (submission.attachments as any).reports
            : [];
          reports = [...directReports];
          for (const ar of attReports) {
            if (!reports.some((r) => r.id === ar.id)) {
              reports.push(ar);
            }
          }
          reports.sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
        }

        return {
          id: dbChallenge.id,
          slug: def.slug,
          title: def.title,
          description: def.description,
          department: def.department,
          missionBrief: def.missionBrief,
          rules: def.rules,
          packageFile: def.packageFile,
          driveUrl: def.driveUrl || null,
          packageDownloadUrl: def.driveUrl || `/api/club/packages/${def.packageFile}`,
          maxDays: def.maxDays,
          maxScore: def.maxScore,
          tags: def.tags,
          isEnrolled: !!submission,
          submissionStatus: submission ? submission.status : 'NOT_STARTED',
          submission: submission
            ? {
                id: submission.id,
                status: submission.status,
                startedAt: submission.startedAt,
                deadlineAt: submission.deadlineAt,
                submittedAt: submission.submittedAt,
                score: submission.score,
                feedback: submission.feedback,
                reportsCount: reports.length,
                reports,
              }
            : null,
        };
      }),
    );

    return {
      challenges,
      activeCount,
      maxAllowed: 2,
      canStartNew: activeCount < 2,
    };
  }

  async startEntranceChallenge(challengeIdOrSlug: string, userId: string, tenantId: string) {
    // 1. Find the challenge
    let challenge = await this.prisma.clubChallenge.findFirst({
      where: {
        OR: [{ id: challengeIdOrSlug }, { slug: challengeIdOrSlug }],
      },
    });

    if (!challenge) {
      const def = ENTRANCE_CHALLENGES.find(
        (c) => c.slug === challengeIdOrSlug || c.title === challengeIdOrSlug,
      );
      if (def) {
        challenge = (await this.ensureEntranceChallengeInDb(def, tenantId)) as any;
      }
    }

    if (!challenge) {
      throw new NotFoundException('چالش مورد نظر یافت نشد');
    }

    // 2. Check active 2-challenge limit
    const activeCount = await this.prisma.clubChallengeSubmission.count({
      where: {
        tenantId,
        studentId: userId,
        status: ClubSubmissionStatus.IN_PROGRESS,
      },
    });

    if (activeCount >= 2) {
      throw new BadRequestException(
        'شما هم‌زمان حداکثر می‌توانید ۲ چالش فعال داشته باشید. لطفاً ابتدا یکی از چالش‌های قبلی را به اتمام برسانید.',
      );
    }

    // 3. Return existing if already started
    const existingActive = await this.prisma.clubChallengeSubmission.findFirst({
      where: {
        challengeId: challenge.id,
        studentId: userId,
      },
    });

    if (existingActive) {
      return existingActive;
    }

    const deadlineAt = new Date(Date.now() + (challenge.maxDays || 14) * 24 * 60 * 60 * 1000);

    return this.prisma.clubChallengeSubmission.create({
      data: {
        tenantId,
        challengeId: challenge.id,
        studentId: userId,
        status: ClubSubmissionStatus.IN_PROGRESS,
        deadlineAt,
      },
    });
  }

  async addSubmissionReport(
    submissionId: string,
    userId: string,
    tenantId: string,
    dto: CreateClubReportDto,
  ) {
    const submission = await this.prisma.clubChallengeSubmission.findFirst({
      where: { id: submissionId },
      include: { challenge: true },
    });

    if (!submission) {
      throw new NotFoundException('پروژه چالش یافت نشد');
    }

    if (submission.studentId !== userId) {
      throw new ForbiddenException('شما دسترسی ثبت گزارش برای این چالش را ندارید');
    }

    const reportId = `rep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const parsedDate = dto.reportDate ? new Date(dto.reportDate) : new Date();

    const reportPayload = {
      id: reportId,
      tenantId: submission.tenantId || tenantId,
      submissionId,
      studentId: userId,
      reportDate: parsedDate,
      title: dto.title || 'گزارش پیشرفت پروژه',
      content: dto.content,
      workDuration: dto.workDuration ? Number(dto.workDuration) : null,
      links: dto.links || null,
      attachments: dto.attachments || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 1. Always append into submission.attachments for resilient multi-layer backup
    try {
      const currentAttachments = (submission.attachments as any) || {};
      const existingReports = Array.isArray(currentAttachments.reports)
        ? currentAttachments.reports
        : [];
      const updatedReports = [reportPayload, ...existingReports];

      await this.prisma.clubChallengeSubmission.update({
        where: { id: submissionId },
        data: {
          attachments: {
            ...currentAttachments,
            reports: updatedReports,
          },
        },
      });
    } catch (e) {
      // logging without breaking
    }

    // 2. Also save to Prisma ClubSubmissionReport table
    try {
      const createdReport = await (this.prisma as any).clubSubmissionReport.create({
        data: {
          id: reportId,
          tenantId: submission.tenantId || tenantId,
          submissionId,
          studentId: userId,
          reportDate: parsedDate,
          title: dto.title || 'گزارش پیشرفت پروژه',
          content: dto.content,
          workDuration: dto.workDuration ? Number(dto.workDuration) : null,
          links: dto.links || null,
          attachments: dto.attachments || null,
        },
      });
      return createdReport;
    } catch (err) {
      // Table may not yet be migrated on remote database - returns the saved payload safely
      return reportPayload;
    }
  }

  async getSubmissionReports(
    submissionId: string,
    userId: string,
    tenantId: string,
    isAdmin = false,
  ) {
    const submission = await this.prisma.clubChallengeSubmission.findFirst({
      where: { id: submissionId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            studentProfile: {
              select: { studentCode: true, nationalCode: true },
            },
          },
        },
        challenge: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('پروژه چالش یافت نشد');
    }

    if (!isAdmin && submission.studentId !== userId) {
      throw new ForbiddenException('عدم دسترسی به گزارش‌های این پروژه');
    }

    let dbReports: any[] = [];
    try {
      dbReports = await (this.prisma as any).clubSubmissionReport.findMany({
        where: { submissionId },
        orderBy: { reportDate: 'desc' },
      });
    } catch (e) {
      // ignore if table not ready
    }

    const attachmentReports = Array.isArray((submission.attachments as any)?.reports)
      ? (submission.attachments as any).reports
      : [];

    const combinedReports = [...dbReports];
    for (const ar of attachmentReports) {
      if (!combinedReports.some((cr) => cr.id === ar.id)) {
        combinedReports.push(ar);
      }
    }

    combinedReports.sort(
      (a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime(),
    );

    return {
      submission,
      reports: combinedReports,
    };
  }

  async getAdminEnrolledProjects(tenantId: string) {
    const submissions = await this.prisma.clubChallengeSubmission.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            avatarUrl: true,
            phone: true,
            studentProfile: {
              select: {
                studentCode: true,
                nationalCode: true,
              },
            },
          },
        },
        challenge: {
          select: {
            id: true,
            title: true,
            slug: true,
            department: true,
            maxDays: true,
            maxScore: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    let dbReports: any[] = [];
    try {
      dbReports = await (this.prisma as any).clubSubmissionReport.findMany({
        where: {
          ...(tenantId ? { tenantId } : {}),
        },
        orderBy: { reportDate: 'desc' },
      });
    } catch (e) {
      // fallback
    }

    const projectsWithReports = submissions.map((sub) => {
      const subDbReports = dbReports.filter((r) => r.submissionId === sub.id);
      const attReports = Array.isArray((sub.attachments as any)?.reports)
        ? (sub.attachments as any).reports
        : [];

      const combinedReports = [...subDbReports];
      for (const ar of attReports) {
        if (!combinedReports.some((cr) => cr.id === ar.id)) {
          combinedReports.push(ar);
        }
      }
      combinedReports.sort(
        (a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime(),
      );

      return {
        ...sub,
        reports: combinedReports,
        reportsCount: combinedReports.length,
        lastReportDate: combinedReports[0]?.reportDate || null,
      };
    });

    return {
      totalEnrolled: projectsWithReports.length,
      activeProjects: projectsWithReports.filter(
        (p) => p.status === ClubSubmissionStatus.IN_PROGRESS,
      ).length,
      submittedProjects: projectsWithReports.filter(
        (p) => p.status === ClubSubmissionStatus.SUBMITTED,
      ).length,
      gradedProjects: projectsWithReports.filter(
        (p) => p.status === ClubSubmissionStatus.GRADED,
      ).length,
      totalReports: projectsWithReports.reduce((sum, p) => sum + p.reportsCount, 0),
      projects: projectsWithReports,
    };
  }
}
