import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFeeContractDto } from './dto/create-fee-contract.dto';

@Injectable()
export class FeeService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Create Student Fee Contract with Installments
  async createContract(tenantId: string, dto: CreateFeeContractDto) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: dto.studentId, tenantId },
      include: { user: true },
    });
    if (!student) {
      throw new NotFoundException('پروفایل دانش‌آموز مورد نظر یافت نشد');
    }

    const discountAmount = dto.discountAmount || 0;
    const finalPayableAmount = dto.totalAmount - discountAmount;

    if (finalPayableAmount < 0) {
      throw new BadRequestException('مبلغ تخفیف نمی‌تواند بیشتر از کل مبلغ شهریه باشد');
    }

    // Validate installment sum equals finalPayableAmount
    const installmentsSum = dto.installments.reduce((sum, item) => sum + item.amount, 0);
    if (Math.abs(installmentsSum - finalPayableAmount) > 1) {
      throw new BadRequestException(
        `مجموع اقساط (${installmentsSum.toLocaleString()}) با مبلغ نهایی قابل پرداخت (${finalPayableAmount.toLocaleString()}) برابر نیست`,
      );
    }

    // Check unique contract number
    const existingNumber = await this.prisma.studentFeeContract.findUnique({
      where: {
        tenantId_contractNumber: {
          tenantId,
          contractNumber: dto.contractNumber,
        },
      },
    });
    if (existingNumber) {
      throw new ConflictException('شماره قرارداد تکراری است');
    }

    // Check if contract already exists for this student in this academic year
    const existingContract = await this.prisma.studentFeeContract.findUnique({
      where: {
        tenantId_academicYearId_studentId: {
          tenantId,
          academicYearId: dto.academicYearId,
          studentId: dto.studentId,
        },
      },
    });
    if (existingContract) {
      throw new ConflictException('قرارداد شهریه برای این دانش‌آموز در این سال تحصیلی قبلاً ثبت شده است');
    }

    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.studentFeeContract.create({
        data: {
          tenantId,
          academicYearId: dto.academicYearId,
          studentId: dto.studentId,
          contractNumber: dto.contractNumber,
          totalAmount: dto.totalAmount,
          discountAmount,
          finalPayableAmount,
          discountReason: dto.discountReason,
          notes: dto.notes,
          status: 'ACTIVE',
        },
      });

      for (const item of dto.installments) {
        await tx.feeInstallment.create({
          data: {
            tenantId,
            contractId: contract.id,
            installmentNumber: item.installmentNumber,
            title: item.title,
            dueDate: new Date(item.dueDate),
            amount: item.amount,
            paidAmount: 0,
            status: 'UNPAID',
          },
        });
      }

      return tx.studentFeeContract.findUnique({
        where: { id: contract.id },
        include: {
          student: { include: { user: { select: { firstName: true, lastName: true, nationalId: true } } } },
          academicYear: { select: { name: true } },
          installments: { orderBy: { installmentNumber: 'asc' } },
        },
      });
    });
  }

  // 2. List Contracts with filtering
  async listContracts(
    tenantId: string,
    filters?: { academicYearId?: string; studentId?: string },
  ) {
    const where: any = { tenantId };
    if (filters?.academicYearId) where.academicYearId = filters.academicYearId;
    if (filters?.studentId) where.studentId = filters.studentId;

    return this.prisma.studentFeeContract.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, phone: true } },
          },
        },
        academicYear: { select: { name: true } },
        installments: { orderBy: { installmentNumber: 'asc' } },
        _count: { select: { receipts: true, transactions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 3. Get Contract Details with Summary
  async getContractDetails(tenantId: string, contractId: string) {
    const contract = await this.prisma.studentFeeContract.findFirst({
      where: { id: contractId, tenantId },
      include: {
        student: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, phone: true, nationalId: true } },
          },
        },
        academicYear: true,
        installments: {
          orderBy: { installmentNumber: 'asc' },
        },
        receipts: {
          orderBy: { issuedAt: 'desc' },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException('قرارداد شهریه مورد نظر یافت نشد');
    }

    const totalPaid = contract.installments.reduce((sum, inst) => sum + inst.paidAmount, 0);
    const remainingBalance = Math.max(0, contract.finalPayableAmount - totalPaid);

    return {
      ...contract,
      summary: {
        totalAmount: contract.totalAmount,
        discountAmount: contract.discountAmount,
        finalPayableAmount: contract.finalPayableAmount,
        totalPaid,
        remainingBalance,
        isFullyPaid: remainingBalance === 0,
      },
    };
  }

  // 4. Get Student Fee Overview (for student & parent portal)
  async getStudentFeeOverview(tenantId: string, userId: string) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { userId, tenantId },
    });

    if (!student) {
      throw new NotFoundException('پروفایل دانش‌آموز یافت نشد');
    }

    const contracts = await this.prisma.studentFeeContract.findMany({
      where: { tenantId, studentId: student.id },
      include: {
        academicYear: true,
        installments: { orderBy: { installmentNumber: 'asc' } },
        receipts: { orderBy: { issuedAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return contracts;
  }
}
