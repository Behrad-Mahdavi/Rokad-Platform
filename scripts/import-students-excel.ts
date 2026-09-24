import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';
import * as argon2 from 'argon2';
import * as jalaali from 'jalaali-js';
import * as path from 'path';

const prisma = new PrismaClient();

function normalizePersianDigits(str: any): string {
  if (str === null || str === undefined) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let result = String(str);
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(persianDigits[i], 'g'), String(i));
    result = result.replace(new RegExp(arabicDigits[i], 'g'), String(i));
  }
  return result;
}

export function stripLeadingZero(code?: string | number | null): string {
  if (code === null || code === undefined) return '';
  const digitsOnly = normalizePersianDigits(code).replace(/\D/g, '').trim();
  const stripped = digitsOnly.replace(/^0+/, '');
  return stripped || digitsOnly;
}

function cleanPhone(val: any): string | null {
  if (!val) return null;
  let digits = normalizePersianDigits(val).replace(/\D/g, '').trim();
  if (digits.length === 10 && digits.startsWith('9')) {
    digits = '0' + digits;
  }
  return digits.length === 11 && digits.startsWith('09') ? digits : null;
}

function parseBirthDate(val: any): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  const str = normalizePersianDigits(val).trim();
  if (!str) return undefined;

  const jMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (jMatch) {
    const jy = parseInt(jMatch[1], 10);
    const jm = parseInt(jMatch[2], 10);
    const jd = parseInt(jMatch[3], 10);
    if (jy >= 1300 && jy <= 1450 && jm >= 1 && jm <= 12 && jd >= 1 && jd <= 31) {
      const g = jalaali.toGregorian(jy, jm, jd);
      return new Date(Date.UTC(g.gy, g.gm - 1, g.gd));
    }
  }

  const parsed = new Date(str);
  return !isNaN(parsed.getTime()) ? parsed : undefined;
}

async function main() {
  console.log('🚀 شروع فرآیند ورود ساختار آموزشی و ۱۰۰ دانش‌آموز از فایل اکسل استاندارد...');

  // ۱. یافتن مدرسه پسرانه
  const boysTenant = await prisma.tenant.findUnique({
    where: { slug: 'rokad-boys' },
  });
  if (!boysTenant) {
    throw new Error('مدرسه پسرانه (rokad-boys) یافت نشد!');
  }

  // ۲. یافتن سال تحصیلی جاری ۱۴۰۵-۱۴۰۶
  const academicYear = await prisma.academicYear.findFirst({
    where: { tenantId: boysTenant.id, isCurrent: true },
  });
  if (!academicYear) {
    throw new Error('سال تحصیلی جاری ۱۴۰۵-۱۴۰۶ برای مدرسه پسرانه یافت نشد!');
  }

  console.log(`🏫 مدرسه: ${boysTenant.name} (${boysTenant.id}) | سال تحصیلی: ${academicYear.name}`);

  // ۳. ایجاد پایه‌های تحصیلی دهم، یازدهم، دوازدهم
  console.log('📚 در حال ایجاد پایه‌های تحصیلی...');
  const grade10 = await prisma.educationalLevel.upsert({
    where: { tenantId_code: { tenantId: boysTenant.id, code: 'GRADE_10' } },
    update: { name: 'دهم', orderIndex: 10 },
    create: {
      tenantId: boysTenant.id,
      name: 'دهم',
      code: 'GRADE_10',
      orderIndex: 10,
    },
  });

  const grade11 = await prisma.educationalLevel.upsert({
    where: { tenantId_code: { tenantId: boysTenant.id, code: 'GRADE_11' } },
    update: { name: 'یازدهم', orderIndex: 11 },
    create: {
      tenantId: boysTenant.id,
      name: 'یازدهم',
      code: 'GRADE_11',
      orderIndex: 11,
    },
  });

  const grade12 = await prisma.educationalLevel.upsert({
    where: { tenantId_code: { tenantId: boysTenant.id, code: 'GRADE_12' } },
    update: { name: 'دوازدهم', orderIndex: 12 },
    create: {
      tenantId: boysTenant.id,
      name: 'دوازدهم',
      code: 'GRADE_12',
      orderIndex: 12,
    },
  });

  // ۴. ایجاد رشته‌های تحصیلی
  console.log('📐 در حال ایجاد رشته‌های تحصیلی...');
  const field10Net = await prisma.studyField.upsert({
    where: { tenantId_levelId_name: { tenantId: boysTenant.id, levelId: grade10.id, name: 'شبکه و نرم‌افزار رایانه' } },
    update: { code: 'B_GRADE_10_NET' },
    create: {
      tenantId: boysTenant.id,
      levelId: grade10.id,
      name: 'شبکه و نرم‌افزار رایانه',
      code: 'B_GRADE_10_NET',
    },
  });

  const field11Web = await prisma.studyField.upsert({
    where: { tenantId_levelId_name: { tenantId: boysTenant.id, levelId: grade11.id, name: 'تولید و توسعه پایگاه‌های اینترنتی' } },
    update: { code: 'B_GRADE_11_WEB' },
    create: {
      tenantId: boysTenant.id,
      levelId: grade11.id,
      name: 'تولید و توسعه پایگاه‌های اینترنتی',
      code: 'B_GRADE_11_WEB',
    },
  });

  const field12Web = await prisma.studyField.upsert({
    where: { tenantId_levelId_name: { tenantId: boysTenant.id, levelId: grade12.id, name: 'تولید و توسعه پایگاه‌های اینترنتی' } },
    update: { code: 'B_GRADE_12_WEB' },
    create: {
      tenantId: boysTenant.id,
      levelId: grade12.id,
      name: 'تولید و توسعه پایگاه‌های اینترنتی',
      code: 'B_GRADE_12_WEB',
    },
  });

  const field12Media = await prisma.studyField.upsert({
    where: { tenantId_levelId_name: { tenantId: boysTenant.id, levelId: grade12.id, name: 'تولید محتوای چندرسانه‌ای' } },
    update: { code: 'B_GRADE_12_MEDIA' },
    create: {
      tenantId: boysTenant.id,
      levelId: grade12.id,
      name: 'تولید محتوای چندرسانه‌ای',
      code: 'B_GRADE_12_MEDIA',
    },
  });

  // ۵. ایجاد ۴ کلاس درس تعریف‌شده
  console.log('🚪 در حال ایجاد کلاس‌های درس (۱۰۱، ۲۰۱، ۳۰۱، ۳۰۲)...');
  const class101 = await prisma.classroom.upsert({
    where: {
      tenantId_academicYearId_code: {
        tenantId: boysTenant.id,
        academicYearId: academicYear.id,
        code: '101',
      },
    },
    update: {
      name: 'کلاس ۱۰۱ شبکه و نرم‌افزار',
      levelId: grade10.id,
      fieldId: field10Net.id,
      capacity: 35,
      roomNumber: 'اتاق ۱۰۱',
    },
    create: {
      tenantId: boysTenant.id,
      academicYearId: academicYear.id,
      name: 'کلاس ۱۰۱ شبکه و نرم‌افزار',
      code: '101',
      levelId: grade10.id,
      fieldId: field10Net.id,
      capacity: 35,
      roomNumber: 'اتاق ۱۰۱',
    },
  });

  const class201 = await prisma.classroom.upsert({
    where: {
      tenantId_academicYearId_code: {
        tenantId: boysTenant.id,
        academicYearId: academicYear.id,
        code: '201',
      },
    },
    update: {
      name: 'کلاس ۲۰۱ تولید توسعه پایگاه اینترنتی',
      levelId: grade11.id,
      fieldId: field11Web.id,
      capacity: 40,
      roomNumber: 'اتاق ۲۰۱',
    },
    create: {
      tenantId: boysTenant.id,
      academicYearId: academicYear.id,
      name: 'کلاس ۲۰۱ تولید توسعه پایگاه اینترنتی',
      code: '201',
      levelId: grade11.id,
      fieldId: field11Web.id,
      capacity: 40,
      roomNumber: 'اتاق ۲۰۱',
    },
  });

  const class301 = await prisma.classroom.upsert({
    where: {
      tenantId_academicYearId_code: {
        tenantId: boysTenant.id,
        academicYearId: academicYear.id,
        code: '301',
      },
    },
    update: {
      name: 'تولید و توسعه پایگاه اینترنتی - 301',
      levelId: grade12.id,
      fieldId: field12Web.id,
      capacity: 45,
      roomNumber: 'اتاق ۳۰۱',
    },
    create: {
      tenantId: boysTenant.id,
      academicYearId: academicYear.id,
      name: 'تولید و توسعه پایگاه اینترنتی - 301',
      code: '301',
      levelId: grade12.id,
      fieldId: field12Web.id,
      capacity: 45,
      roomNumber: 'اتاق ۳۰۱',
    },
  });

  const class302 = await prisma.classroom.upsert({
    where: {
      tenantId_academicYearId_code: {
        tenantId: boysTenant.id,
        academicYearId: academicYear.id,
        code: '302',
      },
    },
    update: {
      name: 'تولید کننده چند رسانه ای - 302',
      levelId: grade12.id,
      fieldId: field12Media.id,
      capacity: 35,
      roomNumber: 'اتاق ۳۰۲',
    },
    create: {
      tenantId: boysTenant.id,
      academicYearId: academicYear.id,
      name: 'تولید کننده چند رسانه ای - 302',
      code: '302',
      levelId: grade12.id,
      fieldId: field12Media.id,
      capacity: 35,
      roomNumber: 'اتاق ۳۰۲',
    },
  });

  // ۶. خواندن فایل اکسل
  const excelPath = path.resolve(process.cwd(), './نمونه_استاندارد_ورود_دانش_آموزان_رکاد (1).xlsx');
  console.log(`📄 خواندن فایل اکسل: ${excelPath}`);
  const wb = xlsx.readFile(excelPath);
  const rows: any[] = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  console.log(`📊 تعداد رکوردهای یافت‌شده در اکسل: ${rows.length}`);

  let successCount = 0;
  const usedPhones = new Set<string>();

  // Fetch existing phones in tenant to avoid collisions
  const existingUsers = await prisma.user.findMany({
    where: { tenantId: boysTenant.id, phone: { not: null } },
    select: { phone: true },
  });
  existingUsers.forEach((u) => {
    if (u.phone) usedPhones.add(u.phone);
  });

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawNationalCode = normalizePersianDigits(row['کد ملی:']).replace(/\D/g, '').trim();
    if (!rawNationalCode) {
      console.warn(`⚠️ ردیف ${i + 1} فاقد کد ملی معتبر است، رد شد.`);
      continue;
    }

    // نام کاربری دانش‌آموز: کد ملی بدون صفر اول
    const studentUsername = stripLeadingZero(rawNationalCode);
    const studentPass = `b${studentUsername}`;
    const studentPassHash = await argon2.hash(studentPass);

    // نام کاربری والد در دیتابیس: p + کد ملی بدون صفر
    const parentUsername = `p${studentUsername}`;
    const parentPass = `p${studentUsername}`;
    const parentPassHash = await argon2.hash(parentPass);

    // شماره‌های تماس
    let studentPhone = cleanPhone(row['شماره همراه دانش‌آموز:']);
    if (studentPhone && usedPhones.has(studentPhone)) {
      studentPhone = null; // اجتناب از تکرار شماره
    }
    if (studentPhone) usedPhones.add(studentPhone);

    let parentPhone = cleanPhone(row['شماره همراه پدر:']) || cleanPhone(row['شماره همراه مادر:']);
    if (parentPhone && usedPhones.has(parentPhone)) {
      parentPhone = cleanPhone(row['شماره همراه مادر:']);
      if (parentPhone && usedPhones.has(parentPhone)) {
        parentPhone = null;
      }
    }
    if (parentPhone) usedPhones.add(parentPhone);

    // نام و نام خانوادگی
    const firstName = String(row['نام:'] || 'دانش‌آموز').trim();
    const lastName = String(row['نام خانوادگی:'] || '').trim();
    const fatherName = row['نام پدر:'] ? String(row['نام پدر:']).trim() : undefined;
    const gradeLevel = String(row['پایه تحصیلی:'] || '').trim();
    const birthDate = parseBirthDate(row['تاریخ تولد:']);
    const birthPlace = row['محل تولد:'] ? String(row['محل تولد:']).trim() : undefined;
    const certificateNumber = row['سریال شناسنامه:'] ? String(row['سریال شناسنامه:']).trim() : undefined;
    const certificateSeriesLetter = row['سری حرفی:'] ? String(row['سری حرفی:']).trim() : undefined;
    const certificateSeriesNumber = row['سری عددی:'] ? String(row['سری عددی:']).trim() : undefined;
    const issuePlace = row['محل صدور:'] ? String(row['محل صدور:']).trim() : undefined;
    const physicalCondition = row['وضعیت جسمانی:'] ? String(row['وضعیت جسمانی:']).trim() : undefined;

    const fatherFullName = row['نام و نام‌خانوادگی پدر:'] ? String(row['نام و نام‌خانوادگی پدر:']).trim() : undefined;
    const fatherNationalId = row['کد ملی پدر:'] ? String(row['کد ملی پدر:']).trim() : undefined;
    const fatherEducation = row['تحصیلات پدر:'] ? String(row['تحصیلات پدر:']).trim() : undefined;
    const fatherOccupation = row['شغل پدر:'] ? String(row['شغل پدر:']).trim() : undefined;
    const fatherPhone = row['شماره همراه پدر:'] ? String(row['شماره همراه پدر:']).trim() : undefined;
    const fatherWorkAddress = row['آدرس محل کار پدر:'] ? String(row['آدرس محل کار پدر:']).trim() : undefined;

    const motherFullName = row['نام و نام‌خانوادگی مادر:'] ? String(row['نام و نام‌خانوادگی مادر:']).trim() : undefined;
    const motherNationalId = row['کد ملی مادر:'] ? String(row['کد ملی مادر:']).trim() : undefined;
    const motherEducation = row['تحصیلات مادر:'] ? String(row['تحصیلات مادر:']).trim() : undefined;
    const motherOccupation = row['شغل مادر:'] ? String(row['شغل مادر:']).trim() : undefined;
    const motherPhone = row['شماره همراه مادر:'] ? String(row['شماره همراه مادر:']).trim() : undefined;
    const motherWorkAddress = row['آدرس محل کار مادر:'] ? String(row['آدرس محل کار مادر:']).trim() : undefined;

    const homeAddress = row['آدرس منزل:'] ? String(row['آدرس منزل:']).trim() : undefined;
    const landlinePhone = row['شماره ثابت:'] ? String(row['شماره ثابت:']).trim() : undefined;
    const studentMobile = row['شماره همراه دانش‌آموز:'] ? String(row['شماره همراه دانش‌آموز:']).trim() : undefined;

    // ۱. کاربر دانش‌آموز
    const studentUser = await prisma.user.upsert({
      where: {
        tenantId_username: {
          tenantId: boysTenant.id,
          username: studentUsername,
        },
      },
      update: {
        firstName,
        lastName,
        passwordHash: studentPassHash,
        role: 'STUDENT',
        status: 'ACTIVE',
        gender: 'MALE',
        nationalId: rawNationalCode,
        ...(studentPhone ? { phone: studentPhone } : {}),
      },
      create: {
        tenantId: boysTenant.id,
        firstName,
        lastName,
        username: studentUsername,
        phone: studentPhone || undefined,
        passwordHash: studentPassHash,
        role: 'STUDENT',
        status: 'ACTIVE',
        gender: 'MALE',
        nationalId: rawNationalCode,
      },
    });

    // ۲. پروفایل دانش‌آموز
    const studentProfile = await prisma.studentProfile.upsert({
      where: { userId: studentUser.id },
      update: {
        studentCode: studentUsername,
        nationalCode: rawNationalCode,
        fatherName: fatherName || (fatherFullName ? fatherFullName.split(' ')[0] : undefined),
        birthDate,
        birthPlace,
        certificateNumber,
        certificateSeriesLetter,
        certificateSeriesNumber,
        issuePlace,
        physicalCondition,
        fatherFullName,
        fatherNationalId,
        fatherEducation,
        fatherOccupation,
        fatherPhone,
        fatherWorkAddress,
        motherFullName,
        motherNationalId,
        motherEducation,
        motherOccupation,
        motherPhone,
        motherWorkAddress,
        homeAddress,
        landlinePhone,
        studentMobile,
        gradeLevel,
      },
      create: {
        tenantId: boysTenant.id,
        userId: studentUser.id,
        studentCode: studentUsername,
        nationalCode: rawNationalCode,
        fatherName: fatherName || (fatherFullName ? fatherFullName.split(' ')[0] : undefined),
        birthDate,
        birthPlace,
        certificateNumber,
        certificateSeriesLetter,
        certificateSeriesNumber,
        issuePlace,
        physicalCondition,
        fatherFullName,
        fatherNationalId,
        fatherEducation,
        fatherOccupation,
        fatherPhone,
        fatherWorkAddress,
        motherFullName,
        motherNationalId,
        motherEducation,
        motherOccupation,
        motherPhone,
        motherWorkAddress,
        homeAddress,
        landlinePhone,
        studentMobile,
        gradeLevel,
      },
    });

    // ۳. ثبت‌نام در کلاس متناظر
    let targetClass = class101;
    if (gradeLevel === 'یازدهم') {
      targetClass = class201;
    } else if (gradeLevel === 'دوازدهم') {
      targetClass = class301; // تمام ۳۸ دانش‌آموز دوازدهم فعلاً در ۳۰۱
    }

    await prisma.classEnrollment.upsert({
      where: {
        classroomId_studentId: {
          classroomId: targetClass.id,
          studentId: studentProfile.id,
        },
      },
      update: { status: 'ACTIVE' },
      create: {
        tenantId: boysTenant.id,
        academicYearId: academicYear.id,
        classroomId: targetClass.id,
        studentId: studentProfile.id,
        status: 'ACTIVE',
      },
    });

    // ۴. کاربر والد (Parent)
    let parentFirstName = 'ولی دانش‌آموز';
    let parentLastName = lastName || 'صادقی';
    if (fatherFullName) {
      const parts = fatherFullName.split(' ');
      parentFirstName = parts[0];
      parentLastName = parts.slice(1).join(' ') || parentLastName;
    } else if (motherFullName) {
      const parts = motherFullName.split(' ');
      parentFirstName = parts[0];
      parentLastName = parts.slice(1).join(' ') || parentLastName;
    }

    const parentUser = await prisma.user.upsert({
      where: {
        tenantId_username: {
          tenantId: boysTenant.id,
          username: parentUsername,
        },
      },
      update: {
        firstName: parentFirstName,
        lastName: parentLastName,
        passwordHash: parentPassHash,
        role: 'PARENT',
        status: 'ACTIVE',
        gender: fatherFullName ? 'MALE' : 'FEMALE',
        ...(parentPhone ? { phone: parentPhone } : {}),
      },
      create: {
        tenantId: boysTenant.id,
        firstName: parentFirstName,
        lastName: parentLastName,
        username: parentUsername,
        phone: parentPhone || undefined,
        passwordHash: parentPassHash,
        role: 'PARENT',
        status: 'ACTIVE',
        gender: fatherFullName ? 'MALE' : 'FEMALE',
      },
    });

    // ۵. پروفایل والد
    const parentProfile = await prisma.parentProfile.upsert({
      where: { userId: parentUser.id },
      update: {
        occupation: fatherOccupation || motherOccupation,
        education: fatherEducation || motherEducation,
        homeAddress,
        workPhone: fatherWorkAddress || motherWorkAddress,
      },
      create: {
        tenantId: boysTenant.id,
        userId: parentUser.id,
        occupation: fatherOccupation || motherOccupation,
        education: fatherEducation || motherEducation,
        homeAddress,
        workPhone: fatherWorkAddress || motherWorkAddress,
      },
    });

    // ۶. پیوند والد با دانش‌آموز (ParentStudentLink)
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
        tenantId: boysTenant.id,
        parentId: parentProfile.id,
        studentId: studentProfile.id,
        relationType: fatherFullName ? 'FATHER' : 'MOTHER',
        isPrimaryContact: true,
      },
    });

    successCount++;
  }

  console.log(`\n🎉 عملیات با موفقیت پایان یافت!`);
  console.log(`✅ تعداد دانش‌آموزان ثبت‌شده: ${successCount}`);
  console.log(`✅ تعداد اکانت‌های والد ایجادشده: ${successCount}`);

  // چاپ آمار کلاسی
  const count101 = await prisma.classEnrollment.count({ where: { classroomId: class101.id } });
  const count201 = await prisma.classEnrollment.count({ where: { classroomId: class201.id } });
  const count301 = await prisma.classEnrollment.count({ where: { classroomId: class301.id } });
  const count302 = await prisma.classEnrollment.count({ where: { classroomId: class302.id } });

  console.log(`📌 آمار دانش‌آموزان در کلاس‌ها:`);
  console.log(`   - کلاس ۱۰۱ (دهم شبکه نرم‌افزار): ${count101} نفر`);
  console.log(`   - کلاس ۲۰۱ (یازدهم پایگاه اینترنتی): ${count201} نفر`);
  console.log(`   - کلاس ۳۰۱ (دوازدهم پایگاه اینترنتی): ${count301} نفر`);
  console.log(`   - کلاس ۳۰۲ (دوازدهم چندرسانه‌ای): ${count302} نفر (آماده تخصیص دستی)`);
}

main()
  .catch((e) => {
    console.error('❌ خطا در فرآیند ورود دانش‌آموزان:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
