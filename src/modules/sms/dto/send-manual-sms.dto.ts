import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ManualSmsTargetType {
  INDIVIDUAL = 'INDIVIDUAL',
  ROLE = 'ROLE',
  CLASS = 'CLASS',
  DIRECT_PHONE = 'DIRECT_PHONE',
}

export enum TargetRoleAudience {
  ALL = 'ALL',
  STUDENTS = 'STUDENTS',
  PARENTS = 'PARENTS',
  TEACHERS = 'TEACHERS',
  STAFF = 'STAFF',
}

export enum ClassAudienceType {
  STUDENTS = 'STUDENTS',
  PARENTS = 'PARENTS',
  BOTH = 'BOTH',
}

export class SendManualSmsDto {
  @ApiProperty({ enum: ManualSmsTargetType, description: 'نوع گیرندگان (فرد، نقش/گروه، کلاس یا شماره مستقیم)' })
  @IsEnum(ManualSmsTargetType)
  @IsNotEmpty()
  targetType: ManualSmsTargetType;

  @ApiProperty({ description: 'متن پیامک ارسالی' })
  @IsString()
  @IsNotEmpty()
  message: string;

  // For INDIVIDUAL
  @ApiPropertyOptional({ description: 'شناسه کاربر هدف (در صورت ارسال فردی)' })
  @IsString()
  @IsOptional()
  targetUserId?: string;

  // For DIRECT_PHONE
  @ApiPropertyOptional({ description: 'شماره تلفن مستقیم گیرنده' })
  @IsString()
  @IsOptional()
  directPhone?: string;

  // For DIRECT_PHONE bulk or custom phones
  @ApiPropertyOptional({ description: 'لیست شماره تلفن‌های مستقیم', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  directPhones?: string[];

  // For ROLE
  @ApiPropertyOptional({ enum: TargetRoleAudience, description: 'نقش گروه هدف' })
  @IsEnum(TargetRoleAudience)
  @IsOptional()
  targetRole?: TargetRoleAudience;

  // For CLASS
  @ApiPropertyOptional({ description: 'شناسه کلاس' })
  @IsString()
  @IsOptional()
  classroomId?: string;

  @ApiPropertyOptional({ enum: ClassAudienceType, description: 'گیرندگان کلاس (دانش‌آموزان، والدین یا هردو)' })
  @IsEnum(ClassAudienceType)
  @IsOptional()
  classAudience?: ClassAudienceType;
}

export class UpsertSmsTemplateDto {
  @ApiProperty({ description: 'نوع الگو (غیبت، سررسید چک، تبریک تولد و...)' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: 'عنوان نمایشی الگو' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'متن الگو با متغیرهای پویا مانند {نام}، {تاریخ}' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ description: 'وضعیت فعال/غیرفعال بودن اتوماسیون' })
  @IsOptional()
  isEnabled?: boolean;
}
