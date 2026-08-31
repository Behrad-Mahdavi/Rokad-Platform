import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('audit.log', { async: true })
  async handleAuditLogEvent(payload: CreateAuditLogDto) {
    try {
      if (!payload.tenantId) {
        return;
      }

      await this.prisma.auditLog.create({
        data: {
          tenantId: payload.tenantId,
          userId: payload.userId,
          action: payload.action,
          entity: payload.entity,
          entityId: payload.entityId,
          oldValues: payload.oldValues ? JSON.parse(JSON.stringify(payload.oldValues)) : undefined,
          newValues: payload.newValues ? JSON.parse(JSON.stringify(payload.newValues)) : undefined,
          ipAddress: payload.ipAddress,
          userAgent: payload.userAgent,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to record audit log: ${err.message}`, err.stack);
    }
  }

  async getTenantLogs(
    tenantId: string,
    query?: { entity?: string; action?: string; limit?: number; page?: number },
  ) {
    const limit = query?.limit || 50;
    const page = query?.page || 1;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (query?.entity) where.entity = query.entity;
    if (query?.action) where.action = query.action;

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
    ]);

    return {
      items: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
