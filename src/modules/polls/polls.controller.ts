import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PollsService } from './polls.service';
import { CreatePollDto, CastVoteDto } from './dto/create-poll.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';

@ApiTags('Daily Operations — Polls & Surveys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('polls')
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'ایجاد نظرسنجی جدید' })
  async createPoll(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreatePollDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.pollsService.createPoll(effectiveTenantId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'لیست نظرسنجی‌های فعال و گذشته مدرسه' })
  async listPolls(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.pollsService.listPolls(effectiveTenantId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'مشاهده گزینه‌ها، آمار آرا و وضعیت رأی کاربر جاری' })
  async getPollDetails(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') pollId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.pollsService.getPollDetails(effectiveTenantId, pollId, userId);
  }

  @Post(':id/vote')
  @ApiOperation({ summary: 'ثبت رأی در نظرسنجی (تک، چندانتخابی یا امتیازی)' })
  async castVote(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') pollId: string,
    @Body() dto: CastVoteDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.pollsService.castVote(effectiveTenantId, pollId, userId, dto);
  }
}
