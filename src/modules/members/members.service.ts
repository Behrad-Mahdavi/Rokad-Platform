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
import {
  generateUnifiedCredentials,
  normalizeNationalCode,
} from '../../common/utils/credential.util';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Students
  async bulkImportStudents(tenantId: string, items: any[]): Promise<any> {
    const results = {
      total: items.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, theme: true, type: true, name: true },
    });

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const rawNationalCode =
          item['کد ملی'] ||
          item['کدملی'] ||
          item['کد_ملی'] ||
          item['nationalCode'] ||
          item['کد ملی دانش آموز'];
        const phone =
          item['موبایل دانش آموز']?.toString() ||
          item['موبایل پدر']?.toString() ||
          item['موبایل مادر']?.toString() ||
          item['شماره همراه']?.toString() ||
          `09${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`;

        const creds = generateUnifiedCredentials({
          tenant,
          nationalCode: rawNationalCode,
          fallbackPhone: phone,
        });

        const studentCode =
          item['شماره دانش آموزی']?.toString() ||
          creds.nationalId ||
          `STD-${Math.floor(100000 + Math.random() * 900000)}`;

        const nationalCode = creds.nationalId || undefined;
        const firstName = item['نام']?.toString() || 'دانش‌آموز';
        const lastName = item['نام خانوادگی']?.toString() || 'بدون فامیل';
        const fatherName = item['نام پدر']?.toString() || undefined;
        const className = item['شماره کلاس']?.toString() || item['کلاس']?.toString() || undefined;
        const gender = item['جنسیت']?.toString() === 'دختر' ? 'FEMALE' : 'MALE';

        // Find classroom if provided
        let classroomId: string | undefined = undefined;
        if (className) {
          const classroom = await this.prisma.classroom.findFirst({
            where: { tenantId, name: { contains: className } },
          });
          if (classroom) classroomId = classroom.id;
        }

        const passwordHash = await argon2.hash(creds.finalPassword);

        await this.prisma.$transaction(async (tx) => {
          // Check if code, nationalId, username or phone already exists
          const existingUser = await tx.user.findFirst({
            where: {
              tenantId,
              OR: [
                { phone },
                ...(creds.username ? [{ username: creds.username }] : []),
                ...(creds.nationalId ? [{ nationalId: creds.nationalId }] : []),
              ],
            },
          });

          if (existingUser) {
            throw new Error(`کاربر با کد ملی یا شماره همراه ${creds.username || phone} تکراری است`);
          }

          const existingProfile = await tx.studentProfile.findFirst({
            where: {
              tenantId,
              OR: [
                { studentCode },
                ...(nationalCode ? [{ nationalCode }] : []),
              ],
            },
          });

          if (existingProfile) {
            throw new Error(`کد دانش‌آموزی یا کد ملی ${studentCode} تکراری است`);
          }

          const user = await tx.user.create({
            data: {
              tenantId,
              firstName,
              lastName,
              phone,
              username: creds.username,
              gender,
              nationalId: creds.nationalId || undefined,
              passwordHash,
              role: Role.STUDENT as any,
              status: 'ACTIVE',
            },
          });

          const profile = await tx.studentProfile.create({
            data: {
              tenantId,
              userId: user.id,
              studentCode,
              nationalCode,
              fatherName,
            },
          });

          if (classroomId) {
            const classroom = await tx.classroom.findUnique({ where: { id: classroomId } });
            if (classroom) {
              await tx.classEnrollment.create({
                data: {
                  tenantId,
                  studentId: profile.id,
                  classroomId: classroom.id,
                  academicYearId: classroom.academicYearId,
                },
              });
            }
          }
        });

        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`ردیف ${i + 1} (${item['نام'] || ''} ${item['نام خانوادگی'] || ''}): ${err.message}`);
      }
    }

    return results;
  }

  async listStudents(tenantId: string, search?: string): Promise<any> {
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

  async createStudent(tenantId: string, dto: CreateStudentDto): Promise<any> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, theme: true, type: true, name: true },
    });

    const creds = generateUnifiedCredentials({
      tenant,
      nationalCode: dto.nationalCode,
      fallbackPhone: dto.phone,
      customPassword: dto.password,
    });

    const studentCode =
      dto.studentCode ||
      dto.studentNumber ||
      creds.nationalId ||
      `STD-${Math.floor(100000 + Math.random() * 900000)}`;

    const existingCode = await this.prisma.studentProfile.findFirst({
      where: {
        tenantId,
        OR: [
          { studentCode },
          ...(creds.nationalId ? [{ nationalCode: creds.nationalId }] : []),
        ],
      },
    });
    if (existingCode) {
      throw new ConflictException(`شماره دانش‌آموزی یا کد ملی '${studentCode}' قبلاً ثبت شده است`);
    }

    if (creds.username) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          tenantId,
          OR: [
            { username: creds.username },
            ...(creds.nationalId ? [{ nationalId: creds.nationalId }] : []),
          ],
        },
      });
      if (existingUser) {
        throw new ConflictException(`کاربر با کد ملی / نام کاربری '${creds.username}' قبلاً در این مرکز ثبت شده است`);
      }
    }

    const passwordHash = await argon2.hash(creds.finalPassword);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create base User
      const user = await tx.user.create({
        data: {
          tenantId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          username: creds.username,
          gender: dto.gender,
          nationalId: creds.nationalId,
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
          studentCode,
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

      // 3. Optional Auto-Enrollment into Classroom
      if (dto.classroomId) {
        const classroom = await tx.classroom.findFirst({
          where: { id: dto.classroomId, tenantId },
        });
        if (classroom) {
          await tx.classEnrollment.create({
            data: {
              tenantId,
              studentId: profile.id,
              classroomId: classroom.id,
              academicYearId: classroom.academicYearId,
            },
          });
        }
      }

      return profile;
    });
  }

  // 2. Teachers
  async listTeachers(tenantId: string): Promise<any> {
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
        teacherLessons: {
          include: {
            lesson: {
              include: {
                level: true,
                field: true,
              },
            },
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

  async createTeacher(tenantId: string, dto: CreateTeacherDto): Promise<any> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, theme: true, type: true, name: true },
    });

    const creds = generateUnifiedCredentials({
      tenant,
      nationalCode: dto.nationalCode,
      fallbackPhone: dto.phone,
      customPassword: dto.password,
    });

    const passwordHash = await argon2.hash(creds.finalPassword);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          username: creds.username !== dto.phone ? creds.username : undefined,
          nationalId: creds.nationalId,
          email: dto.email,
          passwordHash,
          role: Role.TEACHER as any,
          status: 'ACTIVE',
        },
      });

      const teacher = await tx.teacherProfile.create({
        data: {
          tenantId,
          userId: user.id,
          speciality: dto.speciality || dto.specialization,
          degree: dto.degree,
          employmentType: dto.employmentType || 'FULL_TIME',
          bio: dto.bio,
        },
        include: {
          user: true,
        },
      });

      if (dto.lessonIds && Array.isArray(dto.lessonIds) && dto.lessonIds.length > 0) {
        const uniqueLessonIds = Array.from(new Set(dto.lessonIds.filter(Boolean)));
        for (const lessonId of uniqueLessonIds) {
          await tx.teacherLesson.create({
            data: {
              tenantId,
              teacherId: teacher.id,
              lessonId,
            },
          });
        }
      }

      return tx.teacherProfile.findUnique({
        where: { id: teacher.id },
        include: {
          user: true,
          teacherLessons: {
            include: {
              lesson: {
                include: {
                  level: true,
                  field: true,
                },
              },
            },
          },
        },
      });
    });
  }

  async assignLessonsToTeacher(tenantId: string, teacherId: string, lessonIds: string[]): Promise<any> {
    const teacher = await this.prisma.teacherProfile.findFirst({
      where: { id: teacherId, tenantId },
    });
    if (!teacher) {
      throw new NotFoundException('دبیر مورد نظر در این مدرسه یافت نشد');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.teacherLesson.deleteMany({
        where: { teacherId, tenantId },
      });

      const uniqueLessonIds = Array.from(new Set(lessonIds.filter(Boolean)));
      for (const lessonId of uniqueLessonIds) {
        await tx.teacherLesson.create({
          data: {
            tenantId,
            teacherId,
            lessonId,
          },
        });
      }

      return tx.teacherProfile.findUnique({
        where: { id: teacherId },
        include: {
          user: true,
          teacherLessons: {
            include: {
              lesson: {
                include: {
                  level: true,
                  field: true,
                },
              },
            },
          },
        },
      });
    });
  }

  // 3. Coaches & Counselors
  async listCoaches(tenantId: string): Promise<any> {
    return this.prisma.coachProfile.findMany({
      where: { tenantId },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCoach(tenantId: string, dto: CreateCoachDto): Promise<any> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, theme: true, type: true, name: true },
    });

    const creds = generateUnifiedCredentials({
      tenant,
      nationalCode: dto.nationalCode,
      fallbackPhone: dto.phone,
      customPassword: dto.password,
    });

    const passwordHash = await argon2.hash(creds.finalPassword);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          username: creds.username !== dto.phone ? creds.username : undefined,
          nationalId: creds.nationalId,
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
  async listStaff(tenantId: string): Promise<any> {
    return this.prisma.staffProfile.findMany({
      where: { tenantId },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStaff(tenantId: string, dto: CreateStaffDto): Promise<any> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, theme: true, type: true, name: true },
    });

    const creds = generateUnifiedCredentials({
      tenant,
      nationalCode: dto.nationalCode,
      fallbackPhone: dto.phone,
      customPassword: dto.password,
    });

    const passwordHash = await argon2.hash(creds.finalPassword);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          username: creds.username !== dto.phone ? creds.username : undefined,
          nationalId: creds.nationalId,
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
  async listParents(tenantId: string): Promise<any> {
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

  async createParent(tenantId: string, dto: CreateParentDto): Promise<any> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, theme: true, type: true, name: true },
    });

    const creds = generateUnifiedCredentials({
      tenant,
      nationalCode: dto.nationalCode,
      fallbackPhone: dto.phone,
      customPassword: dto.password,
    });

    const passwordHash = await argon2.hash(creds.finalPassword);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          username: creds.username !== dto.phone ? creds.username : undefined,
          nationalId: creds.nationalId,
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
  async linkParentStudent(tenantId: string, dto: LinkParentStudentDto): Promise<any> {
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

  async getParentStudents(tenantId: string, parentUserId: string): Promise<any> {
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
