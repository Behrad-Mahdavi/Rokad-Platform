import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  Gender,
  CoachType,
  EmploymentType,
  ParentRelationType,
} from '@prisma/client';

export class CreateStudentDto {
  @ApiProperty({ description: 'نام دانش‌آموز', example: 'امیرعلی' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'نام خانوادگی دانش‌آموز', example: 'صادقی' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'شماره همراه دانش‌آموز یا والد', example: '09123456780' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: 'شماره دانش‌آموزی یکتا', example: 'STD-1404-001' })
  @IsString()
  @IsNotEmpty()
  studentCode: string;

  @ApiPropertyOptional({ description: 'کد ملی دانش‌آموز', example: '0012345678' })
  @IsString()
  @IsOptional()
  nationalCode?: string;

  @ApiPropertyOptional({ description: 'نام پدر', example: 'حسین' })
  @IsString()
  @IsOptional()
  fatherName?: string;

  @ApiPropertyOptional({ description: 'جنسیت (MALE, FEMALE, OTHER)', enum: Gender })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiPropertyOptional({ description: 'تاریخ تولد', example: '2008-05-12T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @ApiPropertyOptional({ description: 'آدرس منزل' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'نکات پزشکی یا انضباطی' })
  @IsString()
  @IsOptional()
  medicalNotes?: string;

  @ApiPropertyOptional({ description: 'رمز عبور (پیش‌فرض: شماره همراه)' })
  @IsString()
  @IsOptional()
  password?: string;
}

export class CreateTeacherDto {
  @ApiProperty({ description: 'نام دبیر', example: 'محسن' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'نام خانوادگی دبیر', example: 'رضایی' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'شماره همراه دبیر', example: '09123456781' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ description: 'ایمیل دبیر', example: 'rezaei@rokadschool.ir' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'تخصص تدریس', example: 'فیزیک کوانتوم و کنکور' })
  @IsString()
  @IsOptional()
  speciality?: string;

  @ApiPropertyOptional({ description: 'مدرک تحصیلی', example: 'کارشناسی ارشد فیزیک' })
  @IsString()
  @IsOptional()
  degree?: string;

  @ApiPropertyOptional({
    description: 'نوع قرارداد (FULL_TIME, PART_TIME, HOURLY, CONTRACT)',
    enum: EmploymentType,
    default: EmploymentType.FULL_TIME,
  })
  @IsEnum(EmploymentType)
  @IsOptional()
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ description: 'رزومه یا بیوگرافی' })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ description: 'رمز عبور (پیش‌فرض: شماره همراه)' })
  @IsString()
  @IsOptional()
  password?: string;
}

export class CreateCoachDto {
  @ApiProperty({ description: 'نام مربی / مشاور', example: 'سارا' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'نام خانوادگی مربی / مشاور', example: 'کریمی' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'شماره همراه', example: '09123456782' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({
    description: 'نوع مربیگری (ACADEMIC_COUNSELOR, DISCIPLINARY, SPORTS, CULTURAL, HEALTH)',
    enum: CoachType,
    default: CoachType.ACADEMIC_COUNSELOR,
  })
  @IsEnum(CoachType)
  @IsOptional()
  coachType?: CoachType;

  @ApiPropertyOptional({ description: 'بیوگرافی یا زمینه مشاوره' })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ description: 'رمز عبور (پیش‌فرض: شماره همراه)' })
  @IsString()
  @IsOptional()
  password?: string;
}

export class CreateStaffDto {
  @ApiProperty({ description: 'نام کارمند', example: 'رضا' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'نام خانوادگی کارمند', example: 'نوری' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'شماره همراه', example: '09123456783' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ description: 'دپارتمان یا واحد اداری', example: 'امور دفتری و ثبت‌نام' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ description: 'عنوان شغلی', example: 'مسئول بایگانی' })
  @IsString()
  @IsOptional()
  jobTitle?: string;

  @ApiPropertyOptional({ description: 'رمز عبور (پیش‌فرض: شماره همراه)' })
  @IsString()
  @IsOptional()
  password?: string;
}

export class CreateParentDto {
  @ApiProperty({ description: 'نام ولی دانش‌آموز', example: 'حسین' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'نام خانوادگی ولی', example: 'صادقی' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'شماره همراه ولی', example: '09123456784' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ description: 'شغل ولی', example: 'مهندس عمران' })
  @IsString()
  @IsOptional()
  occupation?: string;

  @ApiPropertyOptional({ description: 'میزان تحصیلات', example: 'کارشناسی' })
  @IsString()
  @IsOptional()
  education?: string;

  @ApiPropertyOptional({ description: 'تلفن محل کار' })
  @IsString()
  @IsOptional()
  workPhone?: string;

  @ApiPropertyOptional({ description: 'آدرس منزل' })
  @IsString()
  @IsOptional()
  homeAddress?: string;

  @ApiPropertyOptional({ description: 'رمز عبور (پیش‌فرض: شماره همراه)' })
  @IsString()
  @IsOptional()
  password?: string;
}

export class LinkParentStudentDto {
  @ApiProperty({ description: 'شناسه پروفایل والد' })
  @IsString()
  @IsNotEmpty()
  parentId: string;

  @ApiProperty({ description: 'شناسه پروفایل دانش‌آموز' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiPropertyOptional({
    description: 'نوع نسبت (FATHER, MOTHER, LEGAL_GUARDIAN)',
    enum: ParentRelationType,
    default: ParentRelationType.FATHER,
  })
  @IsEnum(ParentRelationType)
  @IsOptional()
  relationType?: ParentRelationType;

  @ApiPropertyOptional({ description: 'آیا مخاطب اصلی برای پیامک و اعلان‌ها است؟', default: true })
  @IsBoolean()
  @IsOptional()
  isPrimaryContact?: boolean;
}
