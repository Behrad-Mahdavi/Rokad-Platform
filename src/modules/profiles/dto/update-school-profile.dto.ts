import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateSchoolProfileDto {
  @ApiPropertyOptional({ description: 'شعار مدرسه', example: 'پرورش استعداد، پیشرو در نوآوری' })
  @IsString()
  @IsOptional()
  motto?: string;

  @ApiPropertyOptional({ description: 'متن درباره مدرسه (HTML / Markdown)' })
  @IsString()
  @IsOptional()
  aboutHtml?: string;

  @ApiPropertyOptional({ description: 'آدرس تصویر کاور یا بنر مدرسه' })
  @IsString()
  @IsOptional()
  headerImageUrl?: string;

  @ApiPropertyOptional({ description: 'لینک شبکه‌های اجتماعی (ایتا، شاد، بله، تلگرام، اینستاگرام)' })
  @IsOptional()
  socialLinks?: any;

  @ApiPropertyOptional({ description: 'نام مدیر مدرسه' })
  @IsString()
  @IsOptional()
  managerName?: string;

  @ApiPropertyOptional({ description: 'پیام مدیر مدرسه به دانش‌آموزان و اولیا' })
  @IsString()
  @IsOptional()
  managerMessage?: string;

  @ApiPropertyOptional({ description: 'افتخارات و دستاوردهای مدرسه (JSON)' })
  @IsOptional()
  achievements?: any;
}

export class CreateBlogPostDto {
  @ApiProperty({ description: 'عنوان مقاله یا دستاورد', example: 'کسب رتبه اول مسابقات برنامه‌نویسی توسط تیم رُکاد' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'اسلاگ انگلیسی یا فارسی برای آدرس وبلاگ', example: 'first-place-programming-contest' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ description: 'متن کامل مقاله' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'تصویر شاخص مقاله' })
  @IsString()
  @IsOptional()
  coverImageUrl?: string;

  @ApiPropertyOptional({ description: 'آیا بلافاصله منتشر شود؟', default: true })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @ApiPropertyOptional({ description: 'برچسب‌ها (تگ‌ها)', example: ['مسابقات', 'نوآوری', 'افتخارات'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
