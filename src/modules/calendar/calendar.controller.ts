import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';
import { AppPermission } from '../../common/constants/permissions';

@ApiTags('Daily Operations — Calendar & Events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post('events')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.CALENDAR_WRITE)
  @ApiOperation({ summary: 'ایجاد رویداد جدید در تقویم مدرسه' })
  async createEvent(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateEventDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.calendarService.createEvent(effectiveTenantId, userId, dto);
  }

  @Get('events')
  @ApiOperation({ summary: 'استعلام رویدادهای تقویم در یک بازه زمانی' })
  async listEvents(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('audience') audience?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.calendarService.listEvents(
      effectiveTenantId,
      startDate,
      endDate,
      audience,
    );
  }

  @Delete('events/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.CALENDAR_WRITE)
  @ApiOperation({ summary: 'حذف رویداد از تقویم' })
  async deleteEvent(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') eventId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.calendarService.deleteEvent(effectiveTenantId, eventId);
  }
}
