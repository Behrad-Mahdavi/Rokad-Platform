import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

// Support custom DATABASE_URL (e.g. for Liara PostgreSQL)
const dbUrl = process.env.DATABASE_URL;
const prisma = new PrismaClient(
  dbUrl ? { datasources: { db: { url: dbUrl } } } : undefined
);

function encryptWithPublicKey(publicKeyPem: string, plaintext: string): string {
  const buffer = Buffer.from(plaintext, 'utf8');
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    buffer,
  );
  return encrypted.toString('base64');
}

interface StudentInfo {
  firstName: string;
  lastName: string;
  rawNationalCode: string;
  username: string; // کد ملی بدون صفر اول
  classCode: string;
  gradeLevel: string;
  gradeCode: string;
  studentPhone?: string;
  fatherPhone?: string;
  motherPhone?: string;
}

const studentsToInsert: StudentInfo[] = [
  {
    firstName: 'محدثه',
    lastName: 'حبیبی',
    rawNationalCode: '970346395',
    username: '970346395',
    classCode: '101',
    gradeLevel: 'دهم',
    gradeCode: 'G_GRADE_10',
    studentPhone: undefined,
    fatherPhone: '09155015451',
    motherPhone: '09105092954',
  },
  {
    firstName: 'نوشین',
    lastName: 'جبلی',
    rawNationalCode: '0950022225',
    username: '950022225', // کد ملی بدون صفر اول
    classCode: '201',
    gradeLevel: 'یازدهم',
    gradeCode: 'G_GRADE_11',
    studentPhone: '09150277055',
    fatherPhone: '09155589428',
    motherPhone: '09158135911',
  },
  {
    firstName: 'محیا',
    lastName: 'تقوی‌فرد',
    rawNationalCode: '0950289493',
    username: '950289493',
    classCode: '101',
    gradeLevel: 'دهم',
    gradeCode: 'G_GRADE_10',
    studentPhone: undefined,
    fatherPhone: undefined,
    motherPhone: undefined,
  },
];

async function main() {
  console.log('🚀 شروع ثبت اطلاعات دانش‌آموزان (نوشین جبلی و محدثه حبیبی)...');
  console.log(`📡 دیتابیس هدف: ${dbUrl ? 'پایگاه داده سفارشی (لیارا)' : 'پایگاه داده محلی (Local)'}`);

  // ۱. پیدا کردن تننت هنرستان دخترانه
  const girlsTenant = await prisma.tenant.findUnique({
    where: { slug: 'rokad-girls' },
  });

  if (!girlsTenant) {
    throw new Error('❌ تننت هنرستان دخترانه با اسلاگ rokad-girls در دیتابیس یافت نشد!');
  }

  // ۲. پیدا کردن سال تحصیلی فعال
  let academicYear = await prisma.academicYear.findFirst({
    where: { tenantId: girlsTenant.id, isCurrent: true },
  });
  if (!academicYear) {
    academicYear = await prisma.academicYear.findFirst({
      where: { tenantId: girlsTenant.id },
      orderBy: { createdAt: 'desc' },
    });
  }
  if (!academicYear) {
    academicYear = await prisma.academicYear.create({
      data: {
        tenantId: girlsTenant.id,
        name: '۱۴۰۵-۱۴۰۶',
        isCurrent: true,
        startDate: new Date('2026-09-23T00:00:00Z'),
        endDate: new Date('2027-06-20T23:59:59Z'),
      },
    });
  }

  console.log(`🏫 تننت: ${girlsTenant.name} (${girlsTenant.id})`);
  console.log(`📅 سال تحصیلی: ${academicYear.name}`);

  for (const item of studentsToInsert) {
    console.log(`\n--------------------------------------------------`);
    console.log(`👩‍🎓 در حال ایجاد حساب برای: ${item.firstName} ${item.lastName}`);

    // الزامات اکانت:
    // نام کاربری دانش‌آموز: کد ملی بدون صفر اول
    // رمز دانش‌آموز: g + کد ملی بدون صفر اول
    const studentUsername = item.username;
    const studentPassword = `g${studentUsername}`;
    const studentPassHash = await argon2.hash(studentPassword);

    // نام کاربری و پسورد والد:
    const parentUsername = `p${studentUsername}`;
    const parentPassword = `p${studentUsername}`;
    const parentPassHash = await argon2.hash(parentPassword);

    let encryptedStudentPass: string | undefined = undefined;
    let encryptedParentPass: string | undefined = undefined;
    if (girlsTenant.vaultPublicKey) {
      try {
        encryptedStudentPass = encryptWithPublicKey(girlsTenant.vaultPublicKey, studentPassword);
        encryptedParentPass = encryptWithPublicKey(girlsTenant.vaultPublicKey, parentPassword);
      } catch (err) {
        // Vault encryption failure ignored
      }
    }

    // بررسی عدم تکراری بودن شماره‌ها در این تننت
    let studentPhone: string | undefined = undefined;
    if (item.studentPhone) {
      const existing = await prisma.user.findFirst({
        where: { tenantId: girlsTenant.id, phone: item.studentPhone, username: { not: studentUsername } },
      });
      if (!existing) studentPhone = item.studentPhone;
    }

    let parentPhone: string | undefined = undefined;
    const preferredParentPhone = item.fatherPhone || item.motherPhone;
    if (preferredParentPhone) {
      const existing = await prisma.user.findFirst({
        where: { tenantId: girlsTenant.id, phone: preferredParentPhone, username: { not: parentUsername } },
      });
      if (!existing) parentPhone = preferredParentPhone;
    }

    // ۱. ایجاد یا بروزرسانی کاربر دانش‌آموز
    const studentUser = await prisma.user.upsert({
      where: {
        tenantId_username: {
          tenantId: girlsTenant.id,
          username: studentUsername,
        },
      },
      update: {
        firstName: item.firstName,
        lastName: item.lastName,
        passwordHash: studentPassHash,
        encryptedPassword: encryptedStudentPass,
        role: 'STUDENT',
        status: 'ACTIVE',
        gender: 'FEMALE',
        nationalId: item.rawNationalCode,
        ...(studentPhone ? { phone: studentPhone } : {}),
      },
      create: {
        tenantId: girlsTenant.id,
        firstName: item.firstName,
        lastName: item.lastName,
        username: studentUsername,
        phone: studentPhone,
        passwordHash: studentPassHash,
        encryptedPassword: encryptedStudentPass,
        role: 'STUDENT',
        status: 'ACTIVE',
        gender: 'FEMALE',
        nationalId: item.rawNationalCode,
      },
    });

    // ۲. ایجاد یا بروزرسانی پروفایل دانش‌آموز
    const studentProfile = await prisma.studentProfile.upsert({
      where: { userId: studentUser.id },
      update: {
        studentCode: studentUsername,
        nationalCode: item.rawNationalCode,
        gradeLevel: item.gradeLevel,
        fatherPhone: item.fatherPhone,
        motherPhone: item.motherPhone,
        studentMobile: item.studentPhone,
      },
      create: {
        tenantId: girlsTenant.id,
        userId: studentUser.id,
        studentCode: studentUsername,
        nationalCode: item.rawNationalCode,
        gradeLevel: item.gradeLevel,
        fatherPhone: item.fatherPhone,
        motherPhone: item.motherPhone,
        studentMobile: item.studentPhone,
      },
    });

    // ۳. یافتن یا ایجاد کلاس و ثبت نام
    let classroom = await prisma.classroom.findFirst({
      where: {
        tenantId: girlsTenant.id,
        code: item.classCode,
      },
    });

    if (!classroom) {
      // Find or create grade level
      const grade = await prisma.educationalLevel.upsert({
        where: { tenantId_code: { tenantId: girlsTenant.id, code: item.gradeCode } },
        update: {},
        create: {
          tenantId: girlsTenant.id,
          name: item.gradeLevel,
          code: item.gradeCode,
          orderIndex: item.gradeLevel === 'دهم' ? 10 : 11,
        },
      });

      classroom = await prisma.classroom.create({
        data: {
          tenantId: girlsTenant.id,
          academicYearId: academicYear.id,
          name: `کلاس ${item.classCode} شبکه و نرم‌افزار`,
          code: item.classCode,
          levelId: grade.id,
          capacity: 40,
        },
      });
    }

    await prisma.classEnrollment.upsert({
      where: {
        classroomId_studentId: {
          classroomId: classroom.id,
          studentId: studentProfile.id,
        },
      },
      update: { status: 'ACTIVE' },
      create: {
        tenantId: girlsTenant.id,
        academicYearId: academicYear.id,
        classroomId: classroom.id,
        studentId: studentProfile.id,
        status: 'ACTIVE',
      },
    });

    // ۴. ایجاد یا بروزرسانی حساب کاربر والد
    const parentUser = await prisma.user.upsert({
      where: {
        tenantId_username: {
          tenantId: girlsTenant.id,
          username: parentUsername,
        },
      },
      update: {
        firstName: 'ولی دانش‌آموز',
        lastName: item.lastName,
        passwordHash: parentPassHash,
        encryptedPassword: encryptedParentPass,
        role: 'PARENT',
        status: 'ACTIVE',
        gender: 'MALE',
        ...(parentPhone ? { phone: parentPhone } : {}),
      },
      create: {
        tenantId: girlsTenant.id,
        firstName: 'ولی دانش‌آموز',
        lastName: item.lastName,
        username: parentUsername,
        phone: parentPhone,
        passwordHash: parentPassHash,
        encryptedPassword: encryptedParentPass,
        role: 'PARENT',
        status: 'ACTIVE',
        gender: 'MALE',
      },
    });

    // ۵. پروفایل والد
    const parentProfile = await prisma.parentProfile.upsert({
      where: { userId: parentUser.id },
      update: {},
      create: {
        tenantId: girlsTenant.id,
        userId: parentUser.id,
      },
    });

    // ۶. پیوند والد و دانش‌آموز
    await prisma.parentStudentLink.upsert({
      where: {
        parentId_studentId: {
          parentId: parentProfile.id,
          studentId: studentProfile.id,
        },
      },
      update: {
        isPrimaryContact: true,
      },
      create: {
        tenantId: girlsTenant.id,
        parentId: parentProfile.id,
        studentId: studentProfile.id,
        relationType: 'FATHER',
        isPrimaryContact: true,
      },
    });

    console.log(`   ✅ حساب دانش‌آموز:`);
    console.log(`      - نام: ${studentUser.firstName} ${studentUser.lastName}`);
    console.log(`      - نام کاربری: ${studentUsername}`);
    console.log(`      - رمز عبور: ${studentPassword}`);
    console.log(`      - کد ملی: ${item.rawNationalCode}`);
    console.log(`      - کلاس: ${classroom.name} (کد ${classroom.code})`);
    console.log(`   ✅ حساب والد:`);
    console.log(`      - نام: ${parentUser.firstName} ${parentUser.lastName}`);
    console.log(`      - نام کاربری: ${parentUsername}`);
    console.log(`      - رمز عبور: ${parentPassword}`);
    console.log(`      - شماره تماس والد: ${parentPhone || 'ندارد'}`);
  }

  console.log(`\n🎉 عملیات با موفقیت به پایان رسید!`);
}

main()
  .catch((e) => {
    console.error('❌ خطا در اجرای اسکریپت:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
