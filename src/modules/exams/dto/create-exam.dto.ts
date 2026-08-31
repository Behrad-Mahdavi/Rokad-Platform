import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExamType, ExamStatus } from '@prisma/client';

export class ExamQuestionItemDto {
  @ApiProperty({ description: 'شناسه سوال در بانک سوالات' })
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @ApiPropertyOptional({ description: 'ترتیب سوال در آزمون', default: 1 })
  @IsInt()
  @IsOptional()
  orderIndex?: number;

  @ApiProperty({ description: 'بارم نمره اختصاص‌یافته به این سوال', example: 2.0 })
  @IsNumber()
  @Min(0.25)
  score: number;
}

export class CreateExamDto {
  @ApiProperty({ description: 'شناسه سال تحصیلی' })
  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @ApiPropertyOptional({ description: 'شناسه ترم' })
  @IsString()
  @IsOptional()
  termId?: string;

  @ApiProperty({ description: 'شناسه درس' })
  @IsString()
  @IsNotEmpty()
  lessonId: string;

  @ApiProperty({ description: 'شناسه پروفایل معلم طراح آزمون' })
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @ApiProperty({ description: 'عنوان آزمون', example: 'آزمون میان‌ترم حسابان ۱' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'توضیحات و دستورالعمل آزمون' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'نوع آزمون (ONLINE, PAPER_BASED, HYBRID)',
    enum: ExamType,
    default: ExamType.ONLINE,
  })
  @IsEnum(ExamType)
  examType: ExamType;

  @ApiProperty({ description: 'مدت زمان آزمون به دقیقه', example: 60 })
  @IsInt()
  @Min(5)
  durationMinutes: number;

  @ApiProperty({ description: 'زمان باز شدن آزمون', example: '2026-09-25T08:00:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: 'زمان پایان و مهلت شرکت در آزمون', example: '2026-09-25T12:00:00.000Z' })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({ description: 'سقف کل بارم آزمون', default: 20 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  totalScore?: number;

  @ApiPropertyOptional({ description: 'آیا سوالات برای هر دانش‌آموز بر زده شود؟', default: true })
  @IsBoolean()
  @IsOptional()
  shuffleQuestions?: boolean;

  @ApiPropertyOptional({ description: 'آیا گزینه‌های تستی برای هر دانش‌آموز بر زده شود؟', default: true })
  @IsBoolean()
  @IsOptional()
  shuffleOptions?: boolean;

  @ApiPropertyOptional({ description: 'آیا مشاهده کارنامه و نمرات بلافاصله پس از آزمون فعال باشد؟', default: false })
  @IsBoolean()
  @IsOptional()
  showResultsImmediately?: boolean;

  @ApiProperty({ description: 'لیست شناسه‌های کلاس‌های مخاطب آزمون' })
  @IsArray()
  @IsString({ each: true })
  classroomIds: string[];

  @ApiProperty({
    description: 'لیست سوالات و بارم‌بندی آزمون',
    type: [ExamQuestionItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamQuestionItemDto)
  questions: ExamQuestionItemDto[];
}
