import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiProperty } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../decorators/current-tenant.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PresignedUploadDto {
  @ApiProperty({ description: 'نام ماژول', example: 'materials' })
  @IsString()
  @IsNotEmpty()
  moduleName: string;

  @ApiProperty({ description: 'نام اصلی فایل', example: 'heavy-video.mp4' })
  @IsString()
  @IsNotEmpty()
  filename: string;
}

@ApiTags('Infrastructure — Storage (ذخیره‌سازی فایل)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'آپلود مستقیم فایل روی مخزن ابری MinIO' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  )
  async uploadFile(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body('moduleName') moduleName: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('فایلی برای آپلود انتخاب نشده است');
    }
    const effectiveTenantId = tenantId || userTenantId;
    const targetModule = moduleName || 'general';

    return this.storageService.uploadFile(effectiveTenantId, targetModule, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
  }

  @Post('presigned-upload')
  @ApiOperation({ summary: 'تولید Presigned URL برای آپلود مستقیم و امن فایل‌های حجیم' })
  async getPresignedUploadUrl(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: PresignedUploadDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.storageService.getPresignedUploadUrl(
      effectiveTenantId,
      dto.moduleName || 'general',
      dto.filename,
      900, // 15 mins expiry
    );
  }
}
