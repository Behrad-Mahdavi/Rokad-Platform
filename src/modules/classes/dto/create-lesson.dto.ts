import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { LessonType, DayOfWeek } from '@prisma/client';

export class CreateLessonDto {
  @ApiProperty({ description: 'شناسه مقطع تحصیلی' })
  @IsString()
  @IsNotEmpty()
  levelId: string;

  @ApiPropertyOptional({ description: 'شناسه رشته تحصیلی' })
  @IsString()
  @IsOptional()
  fieldId?: string;

  @ApiProperty({ description: 'نام درس یا کتاب', example: 'حسابان ۱' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'کد یکتای درس در مدرسه', example: 'CALC-10' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ description: 'تعداد واحد یا ضریب درس', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  unitCount?: number;

  @ApiPropertyOptional({
    description: 'نوع درس (GENERAL, SPECIALIZED, PRACTICAL, OPTIONAL)',
    enum: LessonType,
    default: LessonType.GENERAL,
  })
  @IsEnum(LessonType)
  @IsOptional()
  type?: LessonType;

  @ApiPropertyOptional({ description: 'توضیحات یا سرفصل درس' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateClassroomDto {
  @ApiProperty({ description: 'شناسه سال تحصیلی' })
  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @ApiProperty({ description: 'شناسه مقطع تحصیلی' })
  @IsString()
  @IsNotEmpty()
  levelId: string;

  @ApiPropertyOptional({ description: 'شناسه رشته تحصیلی' })
  @IsString()
  @IsOptional()
  fieldId?: string;

  @ApiPropertyOptional({ description: 'شناسه کاربر معلم راهنما / سرپرست کلاس' })
  @IsString()
  @IsOptional()
  mentorId?: string;

  @ApiProperty({ description: 'نام کلاس', example: 'کلاس دهم ریاضی ۱' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'کد یکتای کلاس', example: 'CLS-10-M1' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ description: 'ظرفیت کلاس', default: 30 })
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({ description: 'شماره یا نام اتاق فیزیکی', example: 'اتاق ۱۰۱' })
  @IsString()
  @IsOptional()
  roomNumber?: string;
}

export class EnrollStudentDto {
  @ApiProperty({ description: 'شناسه پروفایل دانش‌آموز' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ description: 'شناسه کلاس درس' })
  @IsString()
  @IsNotEmpty()
  classroomId: string;

  @ApiProperty({ description: 'شناسه سال تحصیلی' })
  @IsString()
  @IsNotEmpty()
  academicYearId: string;
}

export class CreateScheduleDto {
  @ApiProperty({ description: 'شناسه کلاس درس' })
  @IsString()
  @IsNotEmpty()
  classroomId: string;

  @ApiProperty({ description: 'شناسه درس' })
  @IsString()
  @IsNotEmpty()
  lessonId: string;

  @ApiProperty({ description: 'شناسه پروفایل معلم' })
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @ApiProperty({
    description: 'روز هفته',
    enum: DayOfWeek,
    example: DayOfWeek.SATURDAY,
  })
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @ApiProperty({ description: 'شماره زنگ کلاسی (۱، ۲، ۳...)', example: 1 })
  @IsInt()
  @Min(1)
  periodNumber: number;

  @ApiProperty({ description: 'ساعت شروع', example: '08:00' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ description: 'ساعت پایان', example: '09:30' })
  @IsString()
  @IsNotEmpty()
  endTime: string;
}
