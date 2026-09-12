import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { SchoolCalendarService } from './school-calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import {
  CreateTenantHolidayDto,
  CreateOfficialHolidayDto,
} from './dto/create-holiday.dto';
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
  constructor(
    private readonly calendarService: CalendarService,
    private readonly schoolCalendarService: SchoolCalendarService,
  ) {}

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

  @Get('announcements')
  @ApiOperation({ summary: 'استعلام بورد اطلاعیه‌های مدرسه با فیلتر مخاطب و کلاس' })
  async listAnnouncements(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('audience') audience?: string,
    @Query('classroomId') classroomId?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.calendarService.listAnnouncements(
      effectiveTenantId,
      audience,
      classroomId,
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

  // ==========================================
  // معماری تقویم شمسی: روز کاری و تعطیلات
  // ==========================================

  @Get('is-working-day')
  @ApiOperation({ summary: 'بررسی وضعیت روز کاری یا تعطیلی بر اساس تقویم رسمی، تعطیلات مدرسه و جمعه‌ها' })
  async checkWorkingDay(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('date') date: string,
  ) {
    if (!date) {
      throw new BadRequestException('پارامتر date الزامی است');
    }
    const effectiveTenantId = tenantId || userTenantId;
    return this.schoolCalendarService.isWorkingDay(effectiveTenantId, date);
  }

  @Post('tenant-holidays')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'ثبت روز تعطیل اختصاصی برای مدرسه' })
  async addTenantHoliday(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateTenantHolidayDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.schoolCalendarService.addTenantHoliday(effectiveTenantId, dto);
  }

  @Get('tenant-holidays')
  @ApiOperation({ summary: 'دریافت لیست تعطیلات اختصاصی مدرسه' })
  async listTenantHolidays(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.schoolCalendarService.listTenantHolidays(effectiveTenantId);
  }

  @Delete('tenant-holidays/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'حذف تعطیلی اختصاصی مدرسه' })
  async removeTenantHoliday(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') holidayId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.schoolCalendarService.removeTenantHoliday(effectiveTenantId, holidayId);
  }

  @Post('official-holidays')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'ثبت روز تعطیل رسمی کشوری (ویژه سوپرادمین پلتفرم)' })
  async addOfficialHoliday(@Body() dto: CreateOfficialHolidayDto) {
    return this.schoolCalendarService.addOfficialHoliday(dto);
  }

  @Get('official-holidays')
  @ApiOperation({ summary: 'دریافت لیست تعطیلات رسمی سراسری کشور' })
  async listOfficialHolidays() {
    return this.schoolCalendarService.listOfficialHolidays();
  }

  @Delete('official-holidays/:id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'حذف تعطیل رسمی کشوری (ویژه سوپرادمین پلتفرم)' })
  async removeOfficialHoliday(@Param('id') holidayId: string) {
    return this.schoolCalendarService.removeOfficialHoliday(holidayId);
  }

  @Get('holidays-in-range')
  @ApiOperation({ summary: 'دریافت تقویم تجمیعی تعطیلات (رسمی و مدرسه) در یک بازه زمانی' })
  async listHolidaysInRange(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('پارامترهای startDate و endDate الزامی هستند');
    }
    const effectiveTenantId = tenantId || userTenantId;
    return this.schoolCalendarService.listHolidaysInRange(effectiveTenantId, startDate, endDate);
  }
}
