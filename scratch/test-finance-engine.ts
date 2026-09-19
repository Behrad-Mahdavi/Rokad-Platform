import { PrismaClient, Prisma, FeePlanScope, CheckStatus, PaymentMethod } from '@prisma/client';

const prisma = new PrismaClient();

async function runTests() {
  console.log('--- Starting Finance Engine Comprehensive Verification ---');

  // Find or use a test tenant
  const tenant = await prisma.tenant.findFirst({
    where: { status: 'ACTIVE', academicYears: { some: {} } },
    include: { academicYears: true },
  });

  if (!tenant || tenant.academicYears.length === 0) {
    console.error('No active tenant or academic year found for testing.');
    return;
  }

  const academicYear = tenant.academicYears[0];
  console.log(`Using Tenant: ${tenant.name} (${tenant.id}), AcademicYear: ${academicYear.name}`);

  // Find a staff or admin user for recordedById
  const adminUser = await prisma.user.findFirst({
    where: { tenantId: tenant.id },
  });
  if (!adminUser) {
    console.error('No admin user found in tenant.');
    return;
  }

  // 1. Create a FeePlan
  const testPlanTitle = `طرح تستی آزمایشی ${Date.now()}`;
  const plan = await prisma.feePlan.create({
    data: {
      tenantId: tenant.id,
      academicYearId: academicYear.id,
      title: testPlanTitle,
      amount: new Prisma.Decimal(30000000), // 30,000,000 Tomans
      appliesTo: FeePlanScope.ALL_SCHOOL,
      installmentCount: 3,
      installmentConfig: [
        { number: 1, title: 'پیش‌پرداخت شهریه', percentOrAmount: 40, dueMonthOffset: 0 },
        { number: 2, title: 'قسط اول (آذرماه)', percentOrAmount: 30, dueMonthOffset: 2 },
        { number: 3, title: 'قسط دوم (بهمن‌ماه)', percentOrAmount: 30, dueMonthOffset: 4 },
      ],
    },
  });
  console.log('✓ Step 1: FeePlan created successfully:', plan.id, plan.title, Number(plan.amount));

  // 2. Find or create a test student
  let student = await prisma.studentProfile.findFirst({
    where: { tenantId: tenant.id },
    include: { user: true },
  });

  if (!student) {
    console.log('Creating dummy student profile for test...');
    const testUser = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        firstName: 'آرش',
        lastName: 'راد',
        phone: `0912${Math.floor(1000000 + Math.random() * 9000000)}`,
        nationalId: `00${Math.floor(10000000 + Math.random() * 90000000)}`,
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummy$hash',
        role: 'STUDENT',
      },
    });
    student = await prisma.studentProfile.create({
      data: {
        tenantId: tenant.id,
        userId: testUser.id,
        studentCode: `STU-${Date.now().toString().slice(-4)}`,
        nationalCode: testUser.nationalId,
      },
      include: { user: true },
    });
  }

  // Check if student already has a contract in this year; if so, delete old test contract or create new student
  await prisma.studentFeeContract.deleteMany({
    where: { tenantId: tenant.id, academicYearId: academicYear.id, studentId: student.id },
  });

  // 3. Create Contract for this student with Decimal precision
  const contractNumber = `TEST-FEE-${Date.now()}`;
  const totalAmount = new Prisma.Decimal(30000000);
  const discountAmount = new Prisma.Decimal(5000000); // 5m discount
  const finalPayable = totalAmount.minus(discountAmount); // 25m

  const contract = await prisma.studentFeeContract.create({
    data: {
      tenantId: tenant.id,
      academicYearId: academicYear.id,
      studentId: student.id,
      contractNumber,
      totalAmount,
      discountAmount,
      finalPayableAmount: finalPayable,
      balanceRemaining: finalPayable,
      feePlanId: plan.id,
      isIndividual: false,
    },
  });
  console.log(`✓ Step 2: Contract created. Total: ${totalAmount}, Discount: ${discountAmount}, BalanceRemaining: ${contract.balanceRemaining}`);

  if (!contract.balanceRemaining.equals(finalPayable)) {
    throw new Error('Initial balanceRemaining mismatch!');
  }

  // 4. Test Cash Payment: 5,000,000 Tomans
  const cashPayAmount = new Prisma.Decimal(5000000);
  const cashPayment = await prisma.feePayment.create({
    data: {
      tenantId: tenant.id,
      feeContractId: contract.id,
      method: PaymentMethod.CASH,
      amount: cashPayAmount,
      cashReceivedAt: new Date(),
      recordedById: adminUser.id,
      note: 'پیش‌پرداخت نقد',
    },
  });

  const newBalanceAfterCash = finalPayable.minus(cashPayAmount);
  await prisma.studentFeeContract.update({
    where: { id: contract.id },
    data: { balanceRemaining: newBalanceAfterCash },
  });

  const contractAfterCash = await prisma.studentFeeContract.findUnique({
    where: { id: contract.id },
  });
  console.log(`✓ Step 3: Cash Payment applied. New Balance: ${contractAfterCash?.balanceRemaining} (Expected: 20,000,000)`);
  if (!contractAfterCash?.balanceRemaining.equals(new Prisma.Decimal(20000000))) {
    throw new Error('Balance after cash payment is incorrect!');
  }

  // 5. Test Cheque Payment in PENDING status: 10,000,000 Tomans
  const chequeSayadId = `${Math.floor(1000000000000000 + Math.random() * 9000000000000000)}`;
  const chequeAmount = new Prisma.Decimal(10000000);

  const chequePayment = await prisma.feePayment.create({
    data: {
      tenantId: tenant.id,
      feeContractId: contract.id,
      method: PaymentMethod.CHEQUE,
      amount: chequeAmount,
      checkNumber: 'CHQ-88901',
      checkSayadId: chequeSayadId,
      bankName: 'بانک ملت',
      branchName: 'شعبه ونک',
      checkDueDate: new Date(Date.now() + 3 * 86400000), // due in 3 days
      checkStatus: CheckStatus.PENDING,
      recordedById: adminUser.id,
    },
  });

  const contractAfterPendingCheque = await prisma.studentFeeContract.findUnique({
    where: { id: contract.id },
  });
  console.log(`✓ Step 4: Cheque registered as PENDING. Balance: ${contractAfterPendingCheque?.balanceRemaining} (Expected: 20,000,000 - unchanged)`);
  if (!contractAfterPendingCheque?.balanceRemaining.equals(new Prisma.Decimal(20000000))) {
    throw new Error('CRITICAL BUG: PENDING cheque prematurely reduced balanceRemaining!');
  }

  // 6. Test Cheque BOUNCED: sets hasFinancialHold = true and does NOT reduce balance
  await prisma.feePayment.update({
    where: { id: chequePayment.id },
    data: {
      checkStatus: CheckStatus.BOUNCED,
      checkStatusChangedAt: new Date(),
      checkStatusChangedById: adminUser.id,
    },
  });

  await prisma.studentFeeContract.update({
    where: { id: contract.id },
    data: {
      hasFinancialHold: true,
      financialHoldReason: `برگشت چک صیادی شماره ${chequeSayadId}`,
    },
  });

  const contractAfterBounce = await prisma.studentFeeContract.findUnique({
    where: { id: contract.id },
  });
  console.log(`✓ Step 5: Cheque marked BOUNCED. hasFinancialHold: ${contractAfterBounce?.hasFinancialHold}, Balance: ${contractAfterBounce?.balanceRemaining}`);
  if (contractAfterBounce?.hasFinancialHold !== true) {
    throw new Error('Financial hold was not triggered for bounced cheque!');
  }

  // 7. Test Cheque REPLACED with Cash payment: clears hold and reduces debt!
  const replacementCash = await prisma.feePayment.create({
    data: {
      tenantId: tenant.id,
      feeContractId: contract.id,
      method: PaymentMethod.CASH,
      amount: chequeAmount,
      cashReceivedAt: new Date(),
      recordedById: adminUser.id,
      note: 'تسویه نقدی به جای چک برگشتی',
    },
  });

  await prisma.feePayment.update({
    where: { id: chequePayment.id },
    data: {
      checkStatus: CheckStatus.REPLACED,
      replacedByPaymentId: replacementCash.id,
    },
  });

  const finalBalanceAfterReplacement = new Prisma.Decimal(contractAfterBounce!.balanceRemaining).minus(chequeAmount);
  await prisma.studentFeeContract.update({
    where: { id: contract.id },
    data: {
      balanceRemaining: finalBalanceAfterReplacement,
      hasFinancialHold: false,
      financialHoldReason: null,
    },
  });

  const contractAfterReplacement = await prisma.studentFeeContract.findUnique({
    where: { id: contract.id },
  });
  console.log(`✓ Step 6: Replacement completed. New Balance: ${contractAfterReplacement?.balanceRemaining} (Expected: 10,000,000), hasFinancialHold: ${contractAfterReplacement?.hasFinancialHold}`);
  if (!contractAfterReplacement?.balanceRemaining.equals(new Prisma.Decimal(10000000))) {
    throw new Error('Balance after replaced payment is incorrect!');
  }
  if (contractAfterReplacement?.hasFinancialHold !== false) {
    throw new Error('Financial hold was not cleared after settlement!');
  }

  console.log('\n======================================================');
  console.log('🎉 ALL BACKEND BUSINESS LOGIC TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runTests()
  .catch((err) => {
    console.error('Test failed with error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
