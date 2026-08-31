import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { CreateSchoolRoleDto, AssignRoleDto } from './dto/create-role.dto';

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * List all available system permissions
   */
  async listPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });
  }

  /**
   * List all school roles for a tenant
   */
  async listRoles(tenantId: string) {
    return this.prisma.schoolRole.findMany({
      where: { tenantId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { userRoles: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a new school role with attached permissions
   */
  async createRole(tenantId: string, dto: CreateSchoolRoleDto) {
    const existing = await this.prisma.schoolRole.findFirst({
      where: {
        tenantId,
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException(`نقش '${dto.name}' قبلاً در این مدرسه تعریف شده است`);
    }

    // Find permissions matching codes
    const permissions = await this.prisma.permission.findMany({
      where: {
        code: { in: dto.permissionCodes },
      },
    });

    return this.prisma.schoolRole.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        permissions: {
          create: permissions.map((p) => ({
            permissionId: p.id,
          })),
        },
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  /**
   * Assign a school role to a user in a tenant
   */
  async assignRole(tenantId: string, dto: AssignRoleDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, tenantId },
    });
    if (!user) {
      throw new NotFoundException('کاربر مورد نظر در این مدرسه یافت نشد');
    }

    const role = await this.prisma.schoolRole.findFirst({
      where: { id: dto.schoolRoleId, tenantId },
    });
    if (!role) {
      throw new NotFoundException('نقش مورد نظر در این مدرسه یافت نشد');
    }

    const userRole = await this.prisma.userSchoolRole.upsert({
      where: {
        tenantId_userId_schoolRoleId: {
          tenantId,
          userId: dto.userId,
          schoolRoleId: dto.schoolRoleId,
        },
      },
      update: {},
      create: {
        tenantId,
        userId: dto.userId,
        schoolRoleId: dto.schoolRoleId,
      },
    });

    // Invalidate user permissions cache in Redis
    await this.invalidateUserPermissionsCache(tenantId, dto.userId);

    return {
      message: `نقش '${role.name}' با موفقیت به کاربر تخصیص داده شد`,
      userRole,
    };
  }

  /**
   * Revoke a school role from a user
   */
  async revokeRole(tenantId: string, userId: string, schoolRoleId: string) {
    await this.prisma.userSchoolRole.deleteMany({
      where: {
        tenantId,
        userId,
        schoolRoleId,
      },
    });

    await this.invalidateUserPermissionsCache(tenantId, userId);
    return { message: 'نقش با موفقیت از کاربر سلب شد' };
  }

  /**
   * Get all resolved permission codes for a user in a tenant
   */
  async getUserPermissions(tenantId: string, userId: string): Promise<string[]> {
    const cacheKey = `user_perms:${tenantId}:${userId}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }

    // Query user roles and permissions
    const userRoles = await this.prisma.userSchoolRole.findMany({
      where: { tenantId, userId },
      include: {
        schoolRole: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const permissionSet = new Set<string>();

    // 1. Fetch user to check base role
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { role: true },
    });

    if (user) {
      if (user.role === 'TEACHER') {
        [
          'lesson.read',
          'attendance.write',
          'attendance.read',
          'homework.write',
          'homework.read',
          'grades.write',
          'grades.read',
          'schedule.read',
          'student.read',
          'blog.write',
        ].forEach((p) => permissionSet.add(p));
      } else if (user.role === 'STUDENT') {
        [
          'lesson.read',
          'schedule.read',
          'attendance.read',
          'homework.read',
          'grades.read',
          'blog.write',
        ].forEach((p) => permissionSet.add(p));
      } else if (user.role === 'PARENT') {
        [
          'student.read',
          'attendance.read',
          'grades.read',
          'homework.read',
          'schedule.read',
        ].forEach((p) => permissionSet.add(p));
      }
    }

    // 2. Add fine-grained custom permissions from SchoolRoles
    for (const ur of userRoles) {
      for (const rp of ur.schoolRole.permissions) {
        permissionSet.add(rp.permission.code);
      }
    }

    const permissions = Array.from(permissionSet);
    // Cache in Redis for 10 minutes
    await this.redisService.set(cacheKey, JSON.stringify(permissions), 600);

    return permissions;
  }

  async invalidateUserPermissionsCache(tenantId: string, userId: string) {
    await this.redisService.del(`user_perms:${tenantId}:${userId}`);
  }
}
