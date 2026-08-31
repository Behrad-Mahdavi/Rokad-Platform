import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateAcademicYearDto,
  CreateTermDto,
  CreateEducationalLevelDto,
  CreateStudyFieldDto,
} from './dto/create-academic-year.dto';

@Injectable()
export class AcademicService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Academic Years
  async listAcademicYears(tenantId: string) {
    return this.prisma.academicYear.findMany({
      where: { tenantId },
      include: {
        terms: true,
        _count: {
          select: { classrooms: true, classEnrollments: true },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async createAcademicYear(tenantId: string, dto: CreateAcademicYearDto) {
    const existing = await this.prisma.academicYear.findFirst({
      where: { tenantId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`سال تحصیلی '${dto.name}' قبلاً ثبت شده است`);
    }

    if (dto.isCurrent) {
      // Set all other years to not current
      await this.prisma.academicYear.updateMany({
        where: { tenantId },
        data: { isCurrent: false },
      });
    }

    return this.prisma.academicYear.create({
      data: {
        tenantId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isCurrent: dto.isCurrent || false,
      },
    });
  }

  // 2. Terms
  async createTerm(tenantId: string, dto: CreateTermDto) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id: dto.academicYearId, tenantId },
    });
    if (!year) {
      throw new NotFoundException('سال تحصیلی مورد نظر یافت نشد');
    }

    if (dto.isCurrent) {
      await this.prisma.term.updateMany({
        where: { tenantId, academicYearId: dto.academicYearId },
        data: { isCurrent: false },
      });
    }

    return this.prisma.term.create({
      data: {
        tenantId,
        academicYearId: dto.academicYearId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isCurrent: dto.isCurrent || false,
      },
    });
  }

  // 3. Educational Levels
  async listLevels(tenantId: string) {
    return this.prisma.educationalLevel.findMany({
      where: { tenantId },
      include: {
        studyFields: true,
        _count: {
          select: { classrooms: true, lessons: true },
        },
      },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async createLevel(tenantId: string, dto: CreateEducationalLevelDto) {
    const existing = await this.prisma.educationalLevel.findFirst({
      where: {
        tenantId,
        OR: [{ name: dto.name }, { code: dto.code }],
      },
    });
    if (existing) {
      throw new ConflictException(`مقطع تحصیلی با این نام یا کد قبلاً ثبت شده است`);
    }

    return this.prisma.educationalLevel.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        orderIndex: dto.orderIndex || 1,
      },
    });
  }

  // 4. Study Fields
  async listFields(tenantId: string, levelId?: string) {
    return this.prisma.studyField.findMany({
      where: {
        tenantId,
        ...(levelId ? { levelId } : {}),
      },
      include: {
        level: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async createField(tenantId: string, dto: CreateStudyFieldDto) {
    const level = await this.prisma.educationalLevel.findFirst({
      where: { id: dto.levelId, tenantId },
    });
    if (!level) {
      throw new NotFoundException('مقطع تحصیلی مورد نظر یافت نشد');
    }

    const existing = await this.prisma.studyField.findFirst({
      where: {
        tenantId,
        levelId: dto.levelId,
        OR: [{ name: dto.name }, { code: dto.code }],
      },
    });
    if (existing) {
      throw new ConflictException(`این رشته تحصیلی در این مقطع قبلاً ثبت شده است`);
    }

    return this.prisma.studyField.create({
      data: {
        tenantId,
        levelId: dto.levelId,
        name: dto.name,
        code: dto.code,
      },
      include: {
        level: true,
      },
    });
  }
}
