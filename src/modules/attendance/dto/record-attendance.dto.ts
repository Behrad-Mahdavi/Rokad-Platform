import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus, TeacherAttendanceStatus } from '@prisma/client';

export class SingleStudentAttendanceItemDto {
  @ApiProperty({ description: 'شناسه پروفایل دانش‌آموز' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({
    description: 'وضعیت حضور (PRESENT, ABSENT, TARDY, EXCUSED_ABSENT, EXPELLED)',
    enum: AttendanceStatus,
    default: AttendanceStatus.PRESENT,
  })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiPropertyOptional({ description: 'میزان تاخیر به دقیقه (در صورت وضعیت TARDY)', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  delayMinutes?: number;

  @ApiPropertyOptional({ description: 'توضیح یا دلیل غیبت/تاخیر' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class BulkRecordStudentAttendanceDto {
  @ApiProperty({ description: 'شناسه سال تحصیلی' })
  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @ApiProperty({ description: 'شناسه کلاس درس' })
  @IsString()
  @IsNotEmpty()
  classroomId: string;

  @ApiPropertyOptional({ description: 'شناسه درس' })
  @IsString()
  @IsOptional()
  lessonId?: string;

  @ApiPropertyOptional({ description: 'شناسه برنامه هفتگی' })
  @IsString()
  @IsOptional()
  scheduleId?: string;

  @ApiProperty({ description: 'تاریخ حضور و غیاب به فرمت YYYY-MM-DD', example: '2026-09-01' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiPropertyOptional({ description: 'شماره زنگ کلاسی (null برای روزانه کل)', example: 1 })
  @IsInt()
  @IsOptional()
  periodNumber?: number;

  @ApiProperty({
    description: 'لیست وضعیت حضور و غیاب دانش‌آموزان کلاس',
    type: [SingleStudentAttendanceItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SingleStudentAttendanceItemDto)
  attendances: SingleStudentAttendanceItemDto[];
}

export class RecordTeacherAttendanceDto {
  @ApiProperty({ description: 'شناسه پروفایل معلم' })
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @ApiProperty({ description: 'تاریخ به فرمت YYYY-MM-DD', example: '2026-09-01' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiPropertyOptional({ description: 'ساعت ورود', example: '07:45' })
  @IsString()
  @IsOptional()
  entryTime?: string;

  @ApiPropertyOptional({ description: 'ساعت خروج', example: '14:30' })
  @IsString()
  @IsOptional()
  exitTime?: string;

  @ApiProperty({
    description: 'وضعیت تردد معلم',
    enum: TeacherAttendanceStatus,
    default: TeacherAttendanceStatus.PRESENT,
  })
  @IsEnum(TeacherAttendanceStatus)
  status: TeacherAttendanceStatus;

  @ApiPropertyOptional({ description: 'توضیحات یا علت مرخصی' })
  @IsString()
  @IsOptional()
  notes?: string;
}
