import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContractType, PayrollItemType } from '@prisma/client';

export class UpdateStaffPayrollProfileDto {
  @ApiProperty({
    description: 'نوع قرارداد (FULL_TIME_SALARY, HOURLY_TEACHER, CONTRACTUAL)',
    enum: ContractType,
    default: ContractType.FULL_TIME_SALARY,
  })
  @IsEnum(ContractType)
  contractType: ContractType;

  @ApiProperty({ description: 'حقوق ثابت ماهیانه (تومان)', example: 18000000 })
  @IsNumber()
  @Min(0)
  baseMonthlySalary: number;

  @ApiPropertyOptional({ description: 'نرخ هر ساعت تدریس برای معلمان ساعتی (تومان)', example: 250000 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional({ description: 'شماره حساب بانکی' })
  @IsString()
  @IsOptional()
  bankAccountNumber?: string;

  @ApiPropertyOptional({ description: 'شماره شبا (با IR یا بدون آن)' })
  @IsString()
  @IsOptional()
  bankShebaNumber?: string;

  @ApiPropertyOptional({ description: 'نام بانک' })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiPropertyOptional({ description: 'شماره بیمه تامین اجتماعی' })
  @IsString()
  @IsOptional()
  insuranceNumber?: string;

  @ApiPropertyOptional({ description: 'وضعیت فعال بودن پروفایل', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreatePayrollItemDto {
  @ApiProperty({
    description: 'نوع ردیف حقوق (BASE_SALARY, HOURLY_TEACHING, BONUS, OVERTIME, INSURANCE_DEDUCTION, TAX_DEDUCTION, ADVANCE_DEDUCTION, OTHER)',
    enum: PayrollItemType,
  })
  @IsEnum(PayrollItemType)
  type: PayrollItemType;

  @ApiProperty({ description: 'عنوان ردیف', example: 'حقوق پایه آبان‌ماه' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'مبلغ (مثبت برای دریافتی‌ها، منفی برای کسورات)', example: 18000000 })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: 'تعداد ساعت یا ضریب', example: 40 })
  @IsNumber()
  @IsOptional()
  multiplierOrHours?: number;

  @ApiPropertyOptional({ description: 'توضیحات' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class GeneratePayrollSlipDto {
  @ApiProperty({ description: 'شناسه کاربری پرسنل / معلم' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'سال فیش حقوقی', example: 1404 })
  @IsInt()
  @Min(1400)
  @Max(1450)
  year: number;

  @ApiProperty({ description: 'ماه فیش حقوقی (۱ تا ۱۲)', example: 8 })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiPropertyOptional({
    description: 'آیتم‌ها و ردیف‌های سفارشی فیش (در صورت خالی بودن خودکار از روی پروفایل محاسبه می‌شود)',
    type: [CreatePayrollItemDto],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreatePayrollItemDto)
  customItems?: CreatePayrollItemDto[];
}

export class ApproveAndPaySlipDto {
  @ApiProperty({ description: 'شماره پیگیری پرداخت بانکی / پایا' })
  @IsString()
  @IsNotEmpty()
  paymentRefNumber: string;
}
