import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UpdateStaffPayrollProfileDto,
  GeneratePayrollSlipDto,
  ApproveAndPaySlipDto,
} from './dto/create-payroll.dto';

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Upsert Staff Payroll Profile
  async upsertStaffProfile(
    tenantId: string,
    userId: string,
    dto: UpdateStaffPayrollProfileDto,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) {
      throw new NotFoundException('کاربر پرسنل در این مدرسه یافت نشد');
    }

    return this.prisma.staffPayrollProfile.upsert({
      where: { userId },
      update: {
        contractType: dto.contractType,
        baseMonthlySalary: dto.baseMonthlySalary,
        hourlyRate: dto.hourlyRate || 0,
        bankAccountNumber: dto.bankAccountNumber,
        bankShebaNumber: dto.bankShebaNumber,
        bankName: dto.bankName,
        insuranceNumber: dto.insuranceNumber,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      create: {
        tenantId,
        userId,
        contractType: dto.contractType,
        baseMonthlySalary: dto.baseMonthlySalary,
        hourlyRate: dto.hourlyRate || 0,
        bankAccountNumber: dto.bankAccountNumber,
        bankShebaNumber: dto.bankShebaNumber,
        bankName: dto.bankName,
        insuranceNumber: dto.insuranceNumber,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });
  }

  // 2. Get Staff Payroll Profile
  async getStaffProfile(tenantId: string, userId: string) {
    const profile = await this.prisma.staffPayrollProfile.findFirst({
      where: { userId, tenantId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true, phone: true } },
      },
    });

    if (!profile) {
      throw new NotFoundException('پروفایل حقوق و دستمزد برای این کاربر ثبت نشده است');
    }
    return profile;
  }

  // 3. Generate Monthly Payroll Slip
  async generatePayrollSlip(
    tenantId: string,
    createdById: string,
    dto: GeneratePayrollSlipDto,
  ) {
    const profile = await this.prisma.staffPayrollProfile.findFirst({
      where: { userId: dto.userId, tenantId },
      include: { user: true },
    });

    if (!profile) {
      throw new BadRequestException('ابتدا باید پروفایل مالی و حقوقی این پرسنل تعریف گردد');
    }

    // Check unique slip per user per month
    const existing = await this.prisma.payrollSlip.findUnique({
      where: {
        tenantId_userId_year_month: {
          tenantId,
          userId: dto.userId,
          year: dto.year,
          month: dto.month,
        },
      },
    });

    if (existing) {
      throw new ConflictException('فیش حقوقی این ماه برای کاربر قبلاً صادر گردیده است');
    }

    const itemsToCreate: Array<{
      type: any;
      title: string;
      amount: number;
      multiplierOrHours?: number;
      notes?: string;
    }> = [];

    if (dto.customItems && dto.customItems.length > 0) {
      for (const item of dto.customItems) {
        itemsToCreate.push({
          type: item.type,
          title: item.title,
          amount: item.amount,
          multiplierOrHours: item.multiplierOrHours,
          notes: item.notes,
        });
      }
    } else {
      // Auto-generate from profile
      if (profile.contractType === 'FULL_TIME_SALARY' || profile.baseMonthlySalary > 0) {
        itemsToCreate.push({
          type: 'BASE_SALARY',
          title: `حقوق پایه ماه ${dto.month} سال ${dto.year}`,
          amount: profile.baseMonthlySalary,
        });
      }

      if (profile.contractType === 'HOURLY_TEACHER' && profile.hourlyRate > 0) {
        // Sample 30 teaching hours
        const teachingHours = 30;
        itemsToCreate.push({
          type: 'HOURLY_TEACHING',
          title: `حق‌التدریس ${teachingHours} ساعت کلاسی`,
          amount: profile.hourlyRate * teachingHours,
          multiplierOrHours: teachingHours,
        });
      }

      // Default Insurance Deduction 7%
      const grossEstimated = itemsToCreate.reduce((sum, it) => sum + it.amount, 0);
      if (profile.insuranceNumber && grossEstimated > 0) {
        const insuranceDeduction = Math.round(grossEstimated * 0.07);
        itemsToCreate.push({
          type: 'INSURANCE_DEDUCTION',
          title: 'کسر حق بیمه تأمین اجتماعی سهم کارمند (۷٪)',
          amount: -insuranceDeduction,
        });
      }
    }

    // Calculate Gross, Deductions, Net
    let grossPay = 0;
    let totalDeductions = 0;

    for (const item of itemsToCreate) {
      if (item.amount >= 0) {
        grossPay += item.amount;
      } else {
        totalDeductions += Math.abs(item.amount);
      }
    }

    const netPay = Math.max(0, grossPay - totalDeductions);
    const slipNumber = `PAY-${dto.year}-${String(dto.month).padStart(2, '0')}-${profile.user.id.slice(0, 5)}`;

    return this.prisma.$transaction(async (tx) => {
      const slip = await tx.payrollSlip.create({
        data: {
          tenantId,
          userId: dto.userId,
          year: dto.year,
          month: dto.month,
          slipNumber,
          grossPay,
          totalDeductions,
          netPay,
          status: 'APPROVED',
        },
      });

      for (const item of itemsToCreate) {
        await tx.payrollItem.create({
          data: {
            tenantId,
            payrollSlipId: slip.id,
            type: item.type,
            title: item.title,
            amount: item.amount,
            multiplierOrHours: item.multiplierOrHours,
            notes: item.notes,
          },
        });
      }

      return tx.payrollSlip.findUnique({
        where: { id: slip.id },
        include: {
          user: { select: { firstName: true, lastName: true, role: true } },
          items: true,
        },
      });
    });
  }

  // 4. List Payroll Slips
  async listPayrollSlips(
    tenantId: string,
    filters?: { year?: number; month?: number; status?: any; userId?: string },
  ) {
    const where: any = { tenantId };
    if (filters?.year) where.year = filters.year;
    if (filters?.month) where.month = filters.month;
    if (filters?.status) where.status = filters.status;
    if (filters?.userId) where.userId = filters.userId;

    return this.prisma.payrollSlip.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true, role: true, phone: true } },
        items: true,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  // 5. Approve and Disburse (Pay)
  async approveAndDisburse(
    tenantId: string,
    slipId: string,
    approverUserId: string,
    dto: ApproveAndPaySlipDto,
  ) {
    const slip = await this.prisma.payrollSlip.findFirst({
      where: { id: slipId, tenantId },
    });

    if (!slip) {
      throw new NotFoundException('فیش حقوقی مورد نظر یافت نشد');
    }

    return this.prisma.payrollSlip.update({
      where: { id: slipId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paidById: approverUserId,
        paymentRefNumber: dto.paymentRefNumber,
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        paidBy: { select: { firstName: true, lastName: true } },
        items: true,
      },
    });
  }

  // 6. Get My Slips (for Employee Portal)
  async getMyPayrollSlips(tenantId: string, userId: string) {
    return this.prisma.payrollSlip.findMany({
      where: { tenantId, userId },
      include: { items: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }
}
