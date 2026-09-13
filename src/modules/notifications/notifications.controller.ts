import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService, SystemNotification } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Operations — Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'دریافت اعلان‌ها و نوتیفیکیشن‌های اختصاصی بر اساس رول کاربر' })
  async getNotifications(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser() user: any,
  ): Promise<SystemNotification[]> {
    const effectiveTenantId = tenantId || user?.tenantId;
    return this.notificationsService.getUserNotifications(effectiveTenantId, user);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'علامت‌گذاری یک اعلان به عنوان خوانده‌شده' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.notificationsService.markAsRead(userId, id);
    return { success: true };
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'علامت‌گذاری تمام اعلان‌ها به عنوان خوانده‌شده' })
  async markAllAsRead(
    @CurrentUser('id') userId: string,
    @Body('notificationIds') notificationIds: string[],
  ) {
    await this.notificationsService.markAllAsRead(userId, notificationIds || []);
    return { success: true };
  }
}
