import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateStudentDto,
  CreateTeacherDto,
  CreateCoachDto,
  CreateStaffDto,
  CreateParentDto,
  LinkParentStudentDto,
} from './dto/create-student.dto';
import { Role } from '../../common/constants';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Students
  async listStudents(tenantId: string, search?: string) {
    const where: any = { tenantId };
    if (search) {
      where.OR = [
        { studentCode: { contains: search, mode: 'insensitive' } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { nationalCode: { contains: search } },
      ];
    }

    return this.prisma.studentProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            avatarUrl: true,
            status: true,
          },
        },
        enrollments: {
          include: {
            classroom: true,
          },
        },
        parentLinks: {
          include: {
            parent: {
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
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStudent(tenantId: string, dto: CreateStudentDto) {
    const existingCode = await this.prisma.studentProfile.findFirst({
      where: { tenantId, studentCode: dto.studentCode },
    });
    if (existingCode) {
      throw new ConflictException(`شماره دانش‌آموزی '${dto.studentCode}' قبلاً ثبت شده است`);
    }

    const defaultPassword = dto.password || dto.phone;
    const passwordHash = await argon2.hash(defaultPassword);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create base User
      const user = await tx.user.create({
        data: {
          tenantId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          gender: dto.gender,
          nationalId: dto.nationalCode,
          passwordHash,
          role: Role.STUDENT as any,
          status: 'ACTIVE',
        },
      });

      // 2. Create StudentProfile
      const profile = await tx.studentProfile.create({
        data: {
          tenantId,
          userId: user.id,
          studentCode: dto.studentCode,
          nationalCode: dto.nationalCode,
          fatherName: dto.fatherName,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
          address: dto.address,
          medicalNotes: dto.medicalNotes,
        },
        include: {
          user: true,
        },
      });

      return profile;
    });
  }

  // 2. Teachers
  async listTeachers(tenantId: string) {
    return this.prisma.teacherProfile.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            avatarUrl: true,
            status: true,
          },
        },
        schedules: {
          include: {
            classroom: true,
            lesson: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTeacher(tenantId: string, dto: CreateTeacherDto) {
    const defaultPassword = dto.password || dto.phone;
    const passwordHash = await argon2.hash(defaultPassword);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          email: dto.email,
          passwordHash,
          role: Role.TEACHER as any,
          status: 'ACTIVE',
        },
      });

      return tx.teacherProfile.create({
        data: {
          tenantId,
          userId: user.id,
          speciality: dto.speciality,
          degree: dto.degree,
          employmentType: dto.employmentType || 'FULL_TIME',
          bio: dto.bio,
        },
        include: {
          user: true,
        },
      });
    });
  }

  // 3. Coaches & Counselors
  async listCoaches(tenantId: string) {
    return this.prisma.coachProfile.findMany({
      where: { tenantId },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCoach(tenantId: string, dto: CreateCoachDto) {
    const defaultPassword = dto.password || dto.phone;
    const passwordHash = await argon2.hash(defaultPassword);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          passwordHash,
          role: Role.STAFF as any,
          status: 'ACTIVE',
        },
      });

      return tx.coachProfile.create({
        data: {
          tenantId,
          userId: user.id,
          coachType: dto.coachType || 'ACADEMIC_COUNSELOR',
          bio: dto.bio,
        },
        include: {
          user: true,
        },
      });
    });
  }

  // 4. Staff
  async listStaff(tenantId: string) {
    return this.prisma.staffProfile.findMany({
      where: { tenantId },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStaff(tenantId: string, dto: CreateStaffDto) {
    const defaultPassword = dto.password || dto.phone;
    const passwordHash = await argon2.hash(defaultPassword);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          passwordHash,
          role: Role.STAFF as any,
          status: 'ACTIVE',
        },
      });

      return tx.staffProfile.create({
        data: {
          tenantId,
          userId: user.id,
          department: dto.department,
          jobTitle: dto.jobTitle,
        },
        include: {
          user: true,
        },
      });
    });
  }

  // 5. Parents
  async listParents(tenantId: string) {
    return this.prisma.parentProfile.findMany({
      where: { tenantId },
      include: {
        user: true,
        studentLinks: {
          include: {
            student: {
              include: { user: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createParent(tenantId: string, dto: CreateParentDto) {
    const defaultPassword = dto.password || dto.phone;
    const passwordHash = await argon2.hash(defaultPassword);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          passwordHash,
          role: Role.PARENT as any,
          status: 'ACTIVE',
        },
      });

      return tx.parentProfile.create({
        data: {
          tenantId,
          userId: user.id,
          occupation: dto.occupation,
          education: dto.education,
          workPhone: dto.workPhone,
          homeAddress: dto.homeAddress,
        },
        include: {
          user: true,
        },
      });
    });
  }

  // 6. Parent-Student Linking
  async linkParentStudent(tenantId: string, dto: LinkParentStudentDto) {
    const parent = await this.prisma.parentProfile.findFirst({
      where: { id: dto.parentId, tenantId },
    });
    if (!parent) {
      throw new NotFoundException('پروفایل والد یافت نشد');
    }

    const student = await this.prisma.studentProfile.findFirst({
      where: { id: dto.studentId, tenantId },
    });
    if (!student) {
      throw new NotFoundException('پروفایل دانش‌آموز یافت نشد');
    }

    const existing = await this.prisma.parentStudentLink.findFirst({
      where: {
        parentId: dto.parentId,
        studentId: dto.studentId,
      },
    });
    if (existing) {
      throw new ConflictException('این والد قبلاً به این دانش‌آموز متصل شده است');
    }

    return this.prisma.parentStudentLink.create({
      data: {
        tenantId,
        parentId: dto.parentId,
        studentId: dto.studentId,
        relationType: dto.relationType || 'FATHER',
        isPrimaryContact: dto.isPrimaryContact !== undefined ? dto.isPrimaryContact : false,
      },
      include: {
        parent: { include: { user: true } },
        student: { include: { user: true } },
      },
    });
  }

  async getParentStudents(tenantId: string, parentUserId: string) {
    const parent = await this.prisma.parentProfile.findFirst({
      where: { tenantId, userId: parentUserId },
    });
    if (!parent) {
      throw new NotFoundException('پروفایل والد یافت نشد');
    }

    return this.prisma.parentStudentLink.findMany({
      where: { tenantId, parentId: parent.id },
      include: {
        student: {
          include: {
            user: true,
            enrollments: {
              include: { classroom: true },
            },
          },
        },
      },
    });
  }
}
