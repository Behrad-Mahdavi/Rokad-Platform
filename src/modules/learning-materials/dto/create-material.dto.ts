import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { MaterialType } from '@prisma/client';

export class CreateMaterialDto {
  @ApiProperty({ description: 'شناسه سال تحصیلی' })
  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @ApiPropertyOptional({ description: 'شناسه ترم تحصیلی' })
  @IsString()
  @IsOptional()
  termId?: string;

  @ApiProperty({ description: 'شناسه درس' })
  @IsString()
  @IsNotEmpty()
  lessonId: string;

  @ApiProperty({ description: 'شناسه پروفایل معلم' })
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @ApiProperty({ description: 'عنوان جزوه یا محتوای آموزشی', example: 'جزوه دست‌نویس حل تمرین‌های فصل اول' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'توضیحات تکمیلی' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'نوع محتوا (DOCUMENT, VIDEO, AUDIO, LINK, ARCHIVE)',
    enum: MaterialType,
    default: MaterialType.DOCUMENT,
  })
  @IsEnum(MaterialType)
  materialType: MaterialType;

  @ApiProperty({ description: 'کلید فایل در MinIO Storage', example: 'tenants/rokad-boys/materials/xyz.pdf' })
  @IsString()
  @IsNotEmpty()
  fileKey: string;

  @ApiProperty({ description: 'آدرس فایل یا لینک محتوا', example: 'http://localhost:9000/rokad-storage/tenants/rokad-boys/materials/xyz.pdf' })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @ApiPropertyOptional({ description: 'حجم فایل به مگابایت', example: 4.2 })
  @IsOptional()
  fileSizeMb?: number;

  @ApiPropertyOptional({ description: 'نوع MIME فایل', example: 'application/pdf' })
  @IsString()
  @IsOptional()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'آیا دانلود مستقیم مجاز است؟', default: true })
  @IsBoolean()
  @IsOptional()
  isDownloadable?: boolean;

  @ApiPropertyOptional({ description: 'آیا برای دانش‌آموزان منتشر شده است؟', default: true })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @ApiProperty({ description: 'شناسه کلاس‌های مجاز برای مشاهده این جزوه' })
  @IsArray()
  @IsString({ each: true })
  classroomIds: string[];
}
