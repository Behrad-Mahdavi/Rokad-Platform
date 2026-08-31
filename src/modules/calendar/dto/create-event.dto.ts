import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { EventType, TargetAudience } from '@prisma/client';

export class CreateEventDto {
  @ApiProperty({ description: 'عنوان رویداد', example: 'برگزاری اولین آزمون جامع ترم اول' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'توضیحات تکمیلی رویداد' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'نوع رویداد (ACADEMIC, HOLIDAY, EXAM, MEETING, CULTURAL, SPORTS, EXCURSION)',
    enum: EventType,
    default: EventType.ACADEMIC,
  })
  @IsEnum(EventType)
  @IsOptional()
  eventType?: EventType;

  @ApiProperty({ description: 'تاریخ و زمان شروع', example: '2026-09-15T08:00:00.000Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'تاریخ و زمان پایان', example: '2026-09-15T12:00:00.000Z' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'آیا رویداد کل روز است؟', default: false })
  @IsBoolean()
  @IsOptional()
  isAllDay?: boolean;

  @ApiPropertyOptional({
    description: 'مخاطبان هدف رویداد (ALL, STUDENTS, TEACHERS, PARENTS, STAFF, SPECIFIC_CLASSES)',
    enum: TargetAudience,
    default: TargetAudience.ALL,
  })
  @IsEnum(TargetAudience)
  @IsOptional()
  targetAudience?: TargetAudience;

  @ApiPropertyOptional({ description: 'شناسه کلاس‌های هدف (در صورت مخاطب خاص)' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetClassIds?: string[];

  @ApiPropertyOptional({ description: 'محل برگزاری (سالن همایش، اتاق جلسه، آنلاین)' })
  @IsString()
  @IsOptional()
  location?: string;
}
