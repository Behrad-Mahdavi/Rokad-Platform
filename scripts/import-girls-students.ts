import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';
import * as argon2 from 'argon2';
import * as jalaali from 'jalaali-js';
import * as crypto from 'crypto';
import * as path from 'path';

// پشتیبانی از DATABASE_URL سفارشی (مثلاً دیتابیس لیارا)
const dbUrl = process.env.DATABASE_URL;
const prisma = new PrismaClient(
  dbUrl ? { datasources: { db: { url: dbUrl } } } : undefined
);

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

interface StudentData {
  source: string;
  firstName: string;
  lastName: string;
  rawNationalCode: string;
  username: string; // کد ملی بدون صفر اول
  className: string;
  gradeLevel: string;
  fatherName?: string;
  birthDate?: Date;
  birthPlace?: string;
  certificateNumber?: string;
  certificateSeriesLetter?: string;
  certificateSeriesNumber?: string;
  issuePlace?: string;
  physicalCondition?: string;
  fatherFullName?: string;
  fatherNationalId?: string;
  fatherEducation?: string;
  fatherOccupation?: string;
  fatherPhone?: string;
  fatherWorkAddress?: string;
  motherFullName?: string;
  motherNationalId?: string;
  motherEducation?: string;
  motherOccupation?: string;
  motherPhone?: string;
  motherWorkAddress?: string;
  homeAddress?: string;
  landlinePhone?: string;
  studentMobile?: string;
}

async function main() {
  console.log('================================================================');
  console.log('🌸 شروع فرآیند ورود اطلاعات دانش‌آموزان هنرستان دخترانه رکاد 🌸');
  console.log('================================================================\n');

  if (dbUrl) {
    const masked = dbUrl.replace(/:[^:@]+@/, ':***@');
    console.log(`🌐 دیتابیس مقصد: ${masked}\n`);
  }

  // ۱. بررسی و دریافت یا ایجاد تننت دخترانه
  let girlsTenant = await prisma.tenant.findUnique({
    where: { slug: 'rokad-girls' },
  });
  if (!girlsTenant) {
    console.log('⚠️ تننت هنرستان دخترانه در دیتابیس یافت نشد، در حال ایجاد رکورد تننت...');
    girlsTenant = await prisma.tenant.create({
      data: {
        name: 'هنرستان فنی و حرفه‌ای دخترانه رکاد',
        slug: 'rokad-girls',
        theme: 'FEMALE',
        type: 'VOCATIONAL_GIRLS',
      },
    });
  }

  // ۲. بررسی سال تحصیلی جاری
  let academicYear = await prisma.academicYear.findFirst({
    where: { tenantId: girlsTenant.id, isCurrent: true },
  });
  if (!academicYear) {
    console.log('⚠️ سال تحصیلی جاری یافت نشد، در حال ایجاد سال تحصیلی ۱۴۰۵-۱۴۰۶...');
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

  console.log(`🏫 مدرسه: ${girlsTenant.name} (${girlsTenant.id})`);
  console.log(`📅 سال تحصیلی فعال: ${academicYear.name}\n`);

  // ۳. ایجاد یا به‌روزرسانی پایه‌های تحصیلی دخترانه (دهم، یازدهم، دوازدهم)
  console.log('📚 بررسی و ایجاد پایه‌های تحصیلی دخترانه...');
  const grade10 = await prisma.educationalLevel.upsert({
    where: { tenantId_code: { tenantId: girlsTenant.id, code: 'G_GRADE_10' } },
    update: { name: 'دهم', orderIndex: 10 },
    create: {
      tenantId: girlsTenant.id,
      name: 'دهم',
      code: 'G_GRADE_10',
      orderIndex: 10,
    },
  });

  const grade11 = await prisma.educationalLevel.upsert({
    where: { tenantId_code: { tenantId: girlsTenant.id, code: 'G_GRADE_11' } },
    update: { name: 'یازدهم', orderIndex: 11 },
    create: {
      tenantId: girlsTenant.id,
      name: 'یازدهم',
      code: 'G_GRADE_11',
      orderIndex: 11,
    },
  });

  const grade12 = await prisma.educationalLevel.upsert({
    where: { tenantId_code: { tenantId: girlsTenant.id, code: 'G_GRADE_12' } },
    update: { name: 'دوازدهم', orderIndex: 12 },
    create: {
      tenantId: girlsTenant.id,
      name: 'دوازدهم',
      code: 'G_GRADE_12',
      orderIndex: 12,
    },
  });

  // ۴. تنظیم رشته تحصیلی «شبکه و نرم‌افزار رایانه» برای تمام پایه‌ها
  console.log('📐 تنظیم رشته تحصیلی «شبکه و نرم‌افزار رایانه» برای تمام پایه‌ها...');
  const field10Net = await prisma.studyField.upsert({
    where: {
      tenantId_levelId_name: {
        tenantId: girlsTenant.id,
        levelId: grade10.id,
        name: 'شبکه و نرم‌افزار رایانه',
      },
    },
    update: { code: 'G_GRADE_10_NET' },
    create: {
      tenantId: girlsTenant.id,
      levelId: grade10.id,
      name: 'شبکه و نرم‌افزار رایانه',
      code: 'G_GRADE_10_NET',
    },
  });

  const field11Net = await prisma.studyField.upsert({
    where: {
      tenantId_levelId_name: {
        tenantId: girlsTenant.id,
        levelId: grade11.id,
        name: 'شبکه و نرم‌افزار رایانه',
      },
    },
    update: { code: 'G_GRADE_11_NET' },
    create: {
      tenantId: girlsTenant.id,
      levelId: grade11.id,
      name: 'شبکه و نرم‌افزار رایانه',
      code: 'G_GRADE_11_NET',
    },
  });

  const field12Net = await prisma.studyField.upsert({
    where: {
      tenantId_levelId_name: {
        tenantId: girlsTenant.id,
        levelId: grade12.id,
        name: 'شبکه و نرم‌افزار رایانه',
      },
    },
    update: { code: 'G_GRADE_12_NET' },
    create: {
      tenantId: girlsTenant.id,
      levelId: grade12.id,
      name: 'شبکه و نرم‌افزار رایانه',
      code: 'G_GRADE_12_NET',
    },
  });

  // ۵. ایجاد کلاس‌های درس دخترانه (۱۰۱، ۲۰۱، ۳۰۱، ۳۰۲) - تماماً رشته شبکه و نرم‌افزار
  console.log('🚪 بررسی و ایجاد کلاس‌های درس دخترانه (۱۰۱، ۲۰۱، ۳۰۱، ۳۰۲)...');
  const class101 = await prisma.classroom.upsert({
    where: {
      tenantId_academicYearId_code: {
        tenantId: girlsTenant.id,
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
      tenantId: girlsTenant.id,
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
        tenantId: girlsTenant.id,
        academicYearId: academicYear.id,
        code: '201',
      },
    },
    update: {
      name: 'کلاس ۲۰۱ شبکه و نرم‌افزار',
      levelId: grade11.id,
      fieldId: field11Net.id,
      capacity: 40,
      roomNumber: 'اتاق ۲۰۱',
    },
    create: {
      tenantId: girlsTenant.id,
      academicYearId: academicYear.id,
      name: 'کلاس ۲۰۱ شبکه و نرم‌افزار',
      code: '201',
      levelId: grade11.id,
      fieldId: field11Net.id,
      capacity: 40,
      roomNumber: 'اتاق ۲۰۱',
    },
  });

  const class301 = await prisma.classroom.upsert({
    where: {
      tenantId_academicYearId_code: {
        tenantId: girlsTenant.id,
        academicYearId: academicYear.id,
        code: '301',
      },
    },
    update: {
      name: 'کلاس ۳۰۱ شبکه و نرم‌افزار',
      levelId: grade12.id,
      fieldId: field12Net.id,
      capacity: 40,
      roomNumber: 'اتاق ۳۰۱',
    },
    create: {
      tenantId: girlsTenant.id,
      academicYearId: academicYear.id,
      name: 'کلاس ۳۰۱ شبکه و نرم‌افزار',
      code: '301',
      levelId: grade12.id,
      fieldId: field12Net.id,
      capacity: 40,
      roomNumber: 'اتاق ۳۰۱',
    },
  });

  const class302 = await prisma.classroom.upsert({
    where: {
      tenantId_academicYearId_code: {
        tenantId: girlsTenant.id,
        academicYearId: academicYear.id,
        code: '302',
      },
    },
    update: {
      name: 'کلاس ۳۰۲ شبکه و نرم‌افزار',
      levelId: grade12.id,
      fieldId: field12Net.id,
      capacity: 40,
      roomNumber: 'اتاق ۳۰۲',
    },
    create: {
      tenantId: girlsTenant.id,
      academicYearId: academicYear.id,
      name: 'کلاس ۳۰۲ شبکه و نرم‌افزار',
      code: '302',
      levelId: grade12.id,
      fieldId: field12Net.id,
      capacity: 40,
      roomNumber: 'اتاق ۳۰۲',
    },
  });

  const classMap: Record<string, typeof class101> = {
    '101': class101,
    '201': class201,
    '301': class301,
    '302': class302,
  };

  // ۶. خواندن داده‌های فایل‌ها طبق دستور کاربر
  const studentsMap = new Map<string, StudentData>();
  const skippedStudents: Array<{ name: string; reason: string }> = [];

  // ۶.۱. پردازش فایل ۱: ثبت نام نهایی دخترانه - دهم.xlsx
  // نکته: ۴ دانش‌آموزی که در فایل دهم ثبت شده بودند اما پایه یازدهم بودند، از این فایل حذف شدند و فقط با فایل ۱۱ و ۱۲ ثبت می‌شوند.
  const file1Path = path.resolve(process.cwd(), './ثبت نام نهایی دخترانه - دهم.xlsx');
  console.log(`📄 در حال پردازش فایل ۱ (فقط دانش‌آموزان پایه دهم): ${file1Path}`);
  const wb1 = xlsx.readFile(file1Path);
  const rows1: any[] = xlsx.utils.sheet_to_json(wb1.Sheets[wb1.SheetNames[0]]);

  let file1Imported = 0;
  for (const row of rows1) {
    const rawGrade = String(row['پایه تحصیلی:'] || '').trim();
    const fullName = `${row['نام:'] || ''} ${row['نام خانوادگی:'] || ''}`.trim();

    // حذف دانش‌آموزان غیرپایه دهم از فایل ۱ طبق دستور
    if (rawGrade !== 'دهم') {
      console.log(`   ⏭️ حذف دانش‌آموز «${fullName}» از فایل دهم (ثبت مستقل از فایل یازدهم/دوازدهم)`);
      continue;
    }

    const rawNationalCode = normalizePersianDigits(row['کد ملی:']).replace(/\D/g, '').trim();
    if (!rawNationalCode) {
      skippedStudents.push({ name: fullName || 'بدون نام', reason: 'عدم وجود کد ملی در فایل دهم' });
      continue;
    }

    const username = stripLeadingZero(rawNationalCode);
    const firstName = String(row['نام:'] || '').trim();
    const lastName = String(row['نام خانوادگی:'] || '').trim();
    const fatherName = row['نام پدر:'] ? String(row['نام پدر:']).trim() : undefined;
    const gradeLevel = 'دهم';
    const className = '101';
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
    const fatherPhone = cleanPhone(row['شماره همراه پدر:']) || undefined;
    const fatherWorkAddress = row['آدرس محل کار پدر:'] ? String(row['آدرس محل کار پدر:']).trim() : undefined;

    const motherFullName = row['نام و نام‌خانوادگی مادر:'] ? String(row['نام و نام‌خانوادگی مادر:']).trim() : undefined;
    const motherNationalId = row['کد ملی مادر:'] ? String(row['کد ملی مادر:']).trim() : undefined;
    const motherEducation = row['تحصیلات مادر:'] ? String(row['تحصیلات مادر:']).trim() : undefined;
    const motherOccupation = row['شغل مادر:'] ? String(row['شغل مادر:']).trim() : undefined;
    const motherPhone = cleanPhone(row['شماره همراه مادر:']) || undefined;
    const motherWorkAddress = row['آدرس محل کار مادر:'] ? String(row['آدرس محل کار مادر:']).trim() : undefined;

    const homeAddress = row['آدرس منزل:'] ? String(row['آدرس منزل:']).trim() : undefined;
    const landlinePhone = row['شماره ثابت:'] ? String(row['شماره ثابت:']).trim() : undefined;
    const studentMobile = cleanPhone(row['شماره همراه دانش‌آموز:']) || undefined;

    studentsMap.set(username, {
      source: 'file1',
      firstName,
      lastName,
      rawNationalCode,
      username,
      className,
      gradeLevel,
      fatherName,
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
    });
    file1Imported++;
  }
  console.log(`   تعداد دانش‌آموزان پایه دهم آماده ثبت: ${file1Imported}`);

  // ۶.۲. پردازش فایل ۲: دخترانه - یازدهم و دوازدهم.xlsx
  const file2Path = path.resolve(process.cwd(), './دخترانه - یازدهم و دوازدهم.xlsx');
  console.log(`\n📄 در حال پردازش فایل ۲ (پایه‌های یازدهم و دوازدهم): ${file2Path}`);
  const wb2 = xlsx.readFile(file2Path);
  const rows2: any[] = xlsx.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[0]]);

  let file2Imported = 0;
  for (const row of rows2) {
    const fullName = String(row['نام و نام خانوداگی دانش آموز'] || '').trim();
    let rawNationalCode = normalizePersianDigits(row['کد ملی']).replace(/\D/g, '').trim();

    // اصلاح کد ملی دانش‌آموزانی که در اکسل خالی بودند طبق دستور کاربر
    if (fullName.includes('بذرافشان')) {
      rawNationalCode = '970001150';
      console.log(`   ✏️ تنظیم کد ملی صحیح برای «بهار بذرافشان»: 970001150`);
    } else if (fullName.includes('خاکسار')) {
      rawNationalCode = '970007795';
      console.log(`   ✏️ تنظیم کد ملی صحیح برای «یسنا خاکسار»: 970007795`);
    } else if (fullName.includes('جبلی')) {
      rawNationalCode = '0950022225';
      console.log(`   ✏️ تنظیم کد ملی صحیح برای «نوشین جبلی»: 0950022225`);
    } else if (fullName.includes('حبیبی')) {
      rawNationalCode = '970346395';
      console.log(`   ✏️ تنظیم کد ملی صحیح برای «محدثه حبیبی»: 970346395`);
    }

    if (!rawNationalCode) {
      skippedStudents.push({
        name: fullName || 'بدون نام',
        reason: 'عدم وجود کد ملی',
      });
      continue;
    }

    const username = stripLeadingZero(rawNationalCode);
    const className = String(row['نام کلاس'] || '').trim();
    const gradeLevel = String(row['پایه'] || '').trim();
    const studentMobile = cleanPhone(row['شماره تماس دانش آموز']) || undefined;
    const fatherPhone = cleanPhone(row['شماره تماس پدر']) || undefined;
    const motherPhone = cleanPhone(row['شماره تماس مادر']) || undefined;

    const parts = fullName.split(' ');
    const firstName = parts[0] || fullName;
    const lastName = parts.slice(1).join(' ') || '';

    studentsMap.set(username, {
      source: 'file2',
      firstName,
      lastName,
      rawNationalCode,
      username,
      className,
      gradeLevel,
      studentMobile,
      fatherPhone,
      motherPhone,
    });
    file2Imported++;
  }
  console.log(`   تعداد دانش‌آموزان پایه‌های ۱۱ و ۱۲ آماده ثبت: ${file2Imported}`);

  console.log(`\n📊 مجموع کل دانش‌آموزان واجد شرایط ثبت‌نام: ${studentsMap.size} نفر`);
  console.log(`🚫 تعداد افراد رد شده به علت نداشتن کد ملی: ${skippedStudents.length} نفر`);
  skippedStudents.forEach((s) => console.log(`   - ${s.name} (${s.reason})`));

  // ۷. ثبت دانش‌آموزان و اولیا در پایگاه داده
  console.log('\n🔄 شروع ثبت اطلاعات و ایجاد حساب‌های کاربری در دیتابیس...');

  const usedPhones = new Set<string>();
  const existingUsersWithPhone = await prisma.user.findMany({
    where: { tenantId: girlsTenant.id, phone: { not: null } },
    select: { phone: true },
  });
  existingUsersWithPhone.forEach((u) => {
    if (u.phone) usedPhones.add(u.phone);
  });

  let importedCount = 0;

  for (const student of studentsMap.values()) {
    // الزامات ورود کاربر:
    // ۱. نام کاربری = کد ملی بدون صفر اول
    // ۲. رمز عبور = "g" + کد ملی بدون صفر اول
    const studentUsername = student.username;
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

    // تکراری نبودن شماره تماس
    let phoneToSet = student.studentMobile || null;
    if (phoneToSet && usedPhones.has(phoneToSet)) {
      phoneToSet = null;
    }
    if (phoneToSet) usedPhones.add(phoneToSet);

    let parentPhoneToSet = student.fatherPhone || student.motherPhone || null;
    if (parentPhoneToSet && usedPhones.has(parentPhoneToSet)) {
      parentPhoneToSet = student.motherPhone || null;
      if (parentPhoneToSet && usedPhones.has(parentPhoneToSet)) {
        parentPhoneToSet = null;
      }
    }
    if (parentPhoneToSet) usedPhones.add(parentPhoneToSet);

    // ۱. ایجاد یا به‌روزرسانی کاربر دانش‌آموز
    const studentUser = await prisma.user.upsert({
      where: {
        tenantId_username: {
          tenantId: girlsTenant.id,
          username: studentUsername,
        },
      },
      update: {
        firstName: student.firstName,
        lastName: student.lastName,
        passwordHash: studentPassHash,
        encryptedPassword: encryptedStudentPass,
        role: 'STUDENT',
        status: 'ACTIVE',
        gender: 'FEMALE',
        nationalId: student.rawNationalCode,
        ...(phoneToSet ? { phone: phoneToSet } : {}),
      },
      create: {
        tenantId: girlsTenant.id,
        firstName: student.firstName,
        lastName: student.lastName,
        username: studentUsername,
        phone: phoneToSet || undefined,
        passwordHash: studentPassHash,
        encryptedPassword: encryptedStudentPass,
        role: 'STUDENT',
        status: 'ACTIVE',
        gender: 'FEMALE',
        nationalId: student.rawNationalCode,
      },
    });

    // ۲. ایجاد یا به‌روزرسانی پروفایل دانش‌آموز
    const studentProfile = await prisma.studentProfile.upsert({
      where: { userId: studentUser.id },
      update: {
        studentCode: studentUsername,
        nationalCode: student.rawNationalCode,
        fatherName: student.fatherName || (student.fatherFullName ? student.fatherFullName.split(' ')[0] : undefined),
        birthDate: student.birthDate,
        birthPlace: student.birthPlace,
        certificateNumber: student.certificateNumber,
        certificateSeriesLetter: student.certificateSeriesLetter,
        certificateSeriesNumber: student.certificateSeriesNumber,
        issuePlace: student.issuePlace,
        physicalCondition: student.physicalCondition,
        fatherFullName: student.fatherFullName,
        fatherNationalId: student.fatherNationalId,
        fatherEducation: student.fatherEducation,
        fatherOccupation: student.fatherOccupation,
        fatherPhone: student.fatherPhone,
        fatherWorkAddress: student.fatherWorkAddress,
        motherFullName: student.motherFullName,
        motherNationalId: student.motherNationalId,
        motherEducation: student.motherEducation,
        motherOccupation: student.motherOccupation,
        motherPhone: student.motherPhone,
        motherWorkAddress: student.motherWorkAddress,
        homeAddress: student.homeAddress,
        landlinePhone: student.landlinePhone,
        studentMobile: student.studentMobile,
        gradeLevel: student.gradeLevel,
      },
      create: {
        tenantId: girlsTenant.id,
        userId: studentUser.id,
        studentCode: studentUsername,
        nationalCode: student.rawNationalCode,
        fatherName: student.fatherName || (student.fatherFullName ? student.fatherFullName.split(' ')[0] : undefined),
        birthDate: student.birthDate,
        birthPlace: student.birthPlace,
        certificateNumber: student.certificateNumber,
        certificateSeriesLetter: student.certificateSeriesLetter,
        certificateSeriesNumber: student.certificateSeriesNumber,
        issuePlace: student.issuePlace,
        physicalCondition: student.physicalCondition,
        fatherFullName: student.fatherFullName,
        fatherNationalId: student.fatherNationalId,
        fatherEducation: student.fatherEducation,
        fatherOccupation: student.fatherOccupation,
        fatherPhone: student.fatherPhone,
        fatherWorkAddress: student.fatherWorkAddress,
        motherFullName: student.motherFullName,
        motherNationalId: student.motherNationalId,
        motherEducation: student.motherEducation,
        motherOccupation: student.motherOccupation,
        motherPhone: student.motherPhone,
        motherWorkAddress: student.motherWorkAddress,
        homeAddress: student.homeAddress,
        landlinePhone: student.landlinePhone,
        studentMobile: student.studentMobile,
        gradeLevel: student.gradeLevel,
      },
    });

    // ۳. انتساب به کلاس
    let targetClass = classMap[student.className];
    if (!targetClass) {
      if (student.gradeLevel === 'دهم') targetClass = class101;
      else if (student.gradeLevel === 'یازدهم') targetClass = class201;
      else if (student.gradeLevel === 'دوازدهم') targetClass = class301;
      else targetClass = class101;
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
        tenantId: girlsTenant.id,
        academicYearId: academicYear.id,
        classroomId: targetClass.id,
        studentId: studentProfile.id,
        status: 'ACTIVE',
      },
    });

    // ۴. ایجاد کاربر والد
    let parentFirstName = 'ولی دانش‌آموز';
    let parentLastName = student.lastName || '';
    if (student.fatherFullName) {
      const parts = student.fatherFullName.split(' ');
      parentFirstName = parts[0];
      parentLastName = parts.slice(1).join(' ') || parentLastName;
    } else if (student.motherFullName) {
      const parts = student.motherFullName.split(' ');
      parentFirstName = parts[0];
      parentLastName = parts.slice(1).join(' ') || parentLastName;
    }

    const parentUser = await prisma.user.upsert({
      where: {
        tenantId_username: {
          tenantId: girlsTenant.id,
          username: parentUsername,
        },
      },
      update: {
        firstName: parentFirstName,
        lastName: parentLastName,
        passwordHash: parentPassHash,
        encryptedPassword: encryptedParentPass,
        role: 'PARENT',
        status: 'ACTIVE',
        gender: student.fatherFullName ? 'MALE' : 'FEMALE',
        ...(parentPhoneToSet ? { phone: parentPhoneToSet } : {}),
      },
      create: {
        tenantId: girlsTenant.id,
        firstName: parentFirstName,
        lastName: parentLastName,
        username: parentUsername,
        phone: parentPhoneToSet || undefined,
        passwordHash: parentPassHash,
        encryptedPassword: encryptedParentPass,
        role: 'PARENT',
        status: 'ACTIVE',
        gender: student.fatherFullName ? 'MALE' : 'FEMALE',
      },
    });

    // ۵. ایجاد پروفایل والد
    const parentProfile = await prisma.parentProfile.upsert({
      where: { userId: parentUser.id },
      update: {
        occupation: student.fatherOccupation || student.motherOccupation,
        education: student.fatherEducation || student.motherEducation,
        homeAddress: student.homeAddress,
        workPhone: student.fatherWorkAddress || student.motherWorkAddress,
      },
      create: {
        tenantId: girlsTenant.id,
        userId: parentUser.id,
        occupation: student.fatherOccupation || student.motherOccupation,
        education: student.fatherEducation || student.motherEducation,
        homeAddress: student.homeAddress,
        workPhone: student.fatherWorkAddress || student.motherWorkAddress,
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
        relationType: student.fatherFullName ? 'FATHER' : 'MOTHER',
        isPrimaryContact: true,
      },
    });

    importedCount++;
  }

  console.log(`\n🎉 عملیات با موفقیت کامل انجام شد!`);
  console.log(`✅ تعداد دانش‌آموزان ثبت‌شده در دیتابیس: ${importedCount} نفر`);
  console.log(`✅ تعداد اکانت‌های والد ایجادشده: ${importedCount} نفر`);

  // آمار تفکیکی کلاس‌ها
  const c101Count = await prisma.classEnrollment.count({ where: { classroomId: class101.id } });
  const c201Count = await prisma.classEnrollment.count({ where: { classroomId: class201.id } });
  const c301Count = await prisma.classEnrollment.count({ where: { classroomId: class301.id } });
  const c302Count = await prisma.classEnrollment.count({ where: { classroomId: class302.id } });

  console.log('\n📊 آمار ثبت‌نام دانش‌آموزان در کلاس‌های هنرستان دخترانه:');
  console.log(`   - کلاس ۱۰۱ (دهم شبکه و نرم‌افزار): ${c101Count} دانش‌آموز`);
  console.log(`   - کلاس ۲۰۱ (یازدهم شبکه و نرم‌افزار): ${c201Count} دانش‌آموز`);
  console.log(`   - کلاس ۳۰۱ (دوازدهم شبکه و نرم‌افزار): ${c301Count} دانش‌آموز`);
  console.log(`   - کلاس ۳۰۲ (دوازدهم شبکه و نرم‌افزار): ${c302Count} دانش‌آموز`);
  console.log(`   - مجموع کل ثبت‌نامی‌ها: ${c101Count + c201Count + c301Count + c302Count} دانش‌آموز`);
}

main()
  .catch((e) => {
    console.error('❌ خطا در فرآیند ورود دانش‌آموزان دخترانه:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
