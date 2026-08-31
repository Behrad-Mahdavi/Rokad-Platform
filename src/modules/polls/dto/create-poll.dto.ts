import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PollType, TargetAudience } from '@prisma/client';

export class CreatePollOptionDto {
  @ApiProperty({ description: 'متن گزینه نظرسنجی', example: 'بله، کاملاً موافقم' })
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class CreatePollDto {
  @ApiProperty({ description: 'عنوان نظرسنجی', example: 'نظرسنجی کیفیت اردوهای علمی و آموزشی' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'توضیحات نظرسنجی' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'نوع نظرسنجی (SINGLE_CHOICE, MULTIPLE_CHOICE, RATING_SCALE)',
    enum: PollType,
    default: PollType.SINGLE_CHOICE,
  })
  @IsEnum(PollType)
  @IsOptional()
  pollType?: PollType;

  @ApiPropertyOptional({
    description: 'مخاطبان نظرسنجی (ALL, STUDENTS, PARENTS, TEACHERS)',
    enum: TargetAudience,
    default: TargetAudience.ALL,
  })
  @IsEnum(TargetAudience)
  @IsOptional()
  targetAudience?: TargetAudience;

  @ApiPropertyOptional({ description: 'شناسه کلاس‌های مخاطب' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetClassIds?: string[];

  @ApiProperty({ description: 'تاریخ شروع نظرسنجی', example: '2026-09-01T00:00:00.000Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'تاریخ پایان نظرسنجی', example: '2026-09-20T23:59:59.000Z' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'آیا آرا به صورت ناشناس ذخیره شود؟', default: false })
  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @ApiProperty({
    description: 'لیست گزینه‌های نظرسنجی (حداقل ۲ گزینه برای تک/چند انتخابی)',
    type: [CreatePollOptionDto],
  })
  @IsArray()
  options: CreatePollOptionDto[];
}

export class CastVoteDto {
  @ApiPropertyOptional({ description: 'شناسه گزینه‌های انتخاب‌شده' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  selectedOptionIds?: string[];

  @ApiPropertyOptional({ description: 'امتیاز عددی (بین ۱ تا ۵)', example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  ratingValue?: number;

  @ApiPropertyOptional({ description: 'پاسخ یا نظر متنی تشریحی' })
  @IsString()
  @IsOptional()
  textResponse?: string;
}
