import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { createTenantExtension } from './prisma-tenant.extension';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  public client: ReturnType<typeof this.getExtendedClient>;

  constructor(private readonly tenantContext: TenantContextService) {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['error', 'warn']
          : ['error'],
    });

    this.client = this.getExtendedClient();
  }

  private getExtendedClient() {
    return this.$extends(createTenantExtension(this.tenantContext));
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Connected to PostgreSQL database');
    } catch (err: any) {
      this.logger.error(`Database connection error: ${err?.message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Run a callback inside a transaction with PostgreSQL RLS tenant context set
   */
  async withRlsTransaction<T>(
    tenantId: string,
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SET LOCAL app.current_tenant_id = '${tenantId}'`,
      );
      return callback(tx);
    });
  }
}
