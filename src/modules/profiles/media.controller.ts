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
import { ProfilesService } from './profiles.service';
import {
  CreateBlogPostDto,
  CreateMediaCommentDto,
} from './dto/update-school-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';

@ApiTags('School Media Hub (رسانه و تعاملات هنرستان)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  @ApiOperation({ summary: 'دریافت فید رسانه و اطلاعیه‌های هنرستان با فیلتر مخاطب' })
  async getMediaFeed(
    @CurrentUser() user: any,
    @CurrentTenant('id') tenantId: string,
    @Query('postType') postType?: string,
  ) {
    const effectiveTenantId = tenantId || user?.tenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست شعبه هنرستان مشخص نیست');
    }
    return this.profilesService.listMediaFeed(effectiveTenantId, user, { postType });
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF)
  @ApiOperation({ summary: 'انتشار پست جدید در رسانه هنرستان (ادمین و هنرآموز)' })
  async createMediaPost(
    @CurrentUser('id') authorId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateBlogPostDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست شعبه هنرستان مشخص نیست');
    }
    return this.profilesService.createBlogPost(effectiveTenantId, authorId, dto);
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'ثبت یا لغو لایک روی پست رسانه (Toggle Like)' })
  async toggleLike(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') postId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست شعبه هنرستان مشخص نیست');
    }
    return this.profilesService.toggleLike(effectiveTenantId, postId, userId);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'ثبت نظر و کامنت روی پست رسانه' })
  async addComment(
    @CurrentUser('id') authorId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') postId: string,
    @Body() dto: CreateMediaCommentDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست شعبه هنرستان مشخص نیست');
    }
    return this.profilesService.addComment(effectiveTenantId, postId, authorId, dto.content);
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'حذف نظر' })
  async deleteComment(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('commentId') commentId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست شعبه هنرستان مشخص نیست');
    }
    return this.profilesService.deleteComment(effectiveTenantId, commentId, userId, userRole);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF)
  @ApiOperation({ summary: 'حذف پست رسانه' })
  async deleteMediaPost(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') postId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست شعبه هنرستان مشخص نیست');
    }
    return this.profilesService.deleteBlogPost(effectiveTenantId, postId, userId, userRole);
  }
}
