import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSchoolRoleDto {
  @ApiProperty({ description: 'نام نقش در مدرسه (مانند ناظم پایه دهم، حسابدار)', example: 'ناظم پایه دهم' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'توضیحات نقش' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'لیست کدهای پرمیشن منتسب به این نقش',
    example: ['attendance.read', 'attendance.write', 'student.read'],
  })
  @IsArray()
  @IsString({ each: true })
  permissionCodes: string[];
}

export class AssignRoleDto {
  @ApiProperty({ description: 'شناسه کاربری' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'شناسه نقش مدرسه' })
  @IsString()
  @IsNotEmpty()
  schoolRoleId: string;
}
