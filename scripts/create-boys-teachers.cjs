const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const crypto = require('crypto');

const dbUrl =
  process.env.DATABASE_URL ||
  'postgresql://root:u82txHRHaQ8KFW7ZlRn4tT23@grande-casse.liara.cloud:33497/postgres?schema=public';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

function encryptWithPublicKey(publicKeyPem, plaintext) {
  try {
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
  } catch (err) {
    return null;
  }
}

// لیست دبیران هنرستان پسرانه
const teachers = [
  { firstName: 'محمودرضا', lastName: 'ناظم', phone: '09155140454' },
  { firstName: 'پوریا', lastName: 'محمدی', phone: '09351342213' },
  { firstName: 'علیرضا', lastName: 'آقایی', phone: '09335554028' },
  { firstName: 'ابوالفضل', lastName: 'توانا', phone: '09368631841' },
  { firstName: 'مهدی', lastName: 'علیزاده', phone: '09158989451' },
  { firstName: 'سجاد', lastName: 'مقدم', phone: '09152261379' },
  { firstName: 'بهراد', lastName: 'مهدوی', phone: '09027359019' },
  { firstName: 'علیرضا', lastName: 'عزیزپور', phone: '09154489820' },
];

function cleanPhoneNumber(p) {
  let cleaned = p.replace(/\s+/g, '').replace(/[^0-9]/g, '');
  if (cleaned.startsWith('98')) {
    cleaned = '0' + cleaned.substring(2);
  }
  return cleaned;
}

async function main() {
  console.log('🔄 در حال اتصال به پایگاه داده...');

  // 1. یافتن هنرستان پسرانه
  const boysTenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { slug: 'rokad-boys' },
        { theme: 'MALE' },
        { name: { contains: 'پسرانه' } },
        { name: { contains: 'پسران' } },
      ],
    },
  });

  if (!boysTenant) {
    throw new Error('❌ خطای بحرانی: هنرستان پسرانه در پایگاه داده یافت نشد!');
  }

  console.log(`🏫 هنرستان مقصد: ${boysTenant.name} (شناسه: ${boysTenant.id})`);
  console.log(`📋 تعداد کل دبیران برای ثبت: ${teachers.length} نفر\n`);

  const results = [];

  for (let i = 0; i < teachers.length; i++) {
    const t = teachers[i];
    const phone = cleanPhoneNumber(t.phone);
    const rawPassword = `b${phone}`;
    const passwordHash = await argon2.hash(rawPassword);
    const personnelCode = `TCH-B${101 + i}`;

    // بررسی وجود کاربر بر اساس شماره یا نام کاربری در این مدرسه
    let user = await prisma.user.findFirst({
      where: {
        tenantId: boysTenant.id,
        OR: [{ phone }, { username: phone }],
      },
      include: {
        teacherProfile: true,
      },
    });

    const encrypted = boysTenant.vaultPublicKey ? encryptWithPublicKey(boysTenant.vaultPublicKey, rawPassword) : null;

    if (user) {
      // به‌روزرسانی کاربر موجود
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: t.firstName,
          lastName: t.lastName,
          phone,
          username: phone,
          role: 'TEACHER',
          status: 'ACTIVE',
          passwordHash,
          ...(encrypted ? { encryptedPassword: encrypted } : {}),
        },
        include: {
          teacherProfile: true,
        },
      });

      // ایجاد یا به‌روزرسانی پرونده دبیری (TeacherProfile)
      if (user.teacherProfile) {
        await prisma.teacherProfile.update({
          where: { id: user.teacherProfile.id },
          data: {
            personnelCode: user.teacherProfile.personnelCode || personnelCode,
          },
        });
      } else {
        await prisma.teacherProfile.create({
          data: {
            tenantId: boysTenant.id,
            userId: user.id,
            personnelCode,
          },
        });
      }

      results.push({
        وضعیت: 'به‌روزرسانی شد',
        نام: `${t.firstName} ${t.lastName}`,
        'نام کاربری': phone,
        'رمز عبور': rawPassword,
        'کد پرسنلی': user.teacherProfile?.personnelCode || personnelCode,
      });
    } else {
      // ایجاد کاربر و پرونده دبیری جدید
      user = await prisma.user.create({
        data: {
          tenantId: boysTenant.id,
          firstName: t.firstName,
          lastName: t.lastName,
          phone,
          username: phone,
          role: 'TEACHER',
          status: 'ACTIVE',
          passwordHash,
          ...(encrypted ? { encryptedPassword: encrypted } : {}),
          teacherProfile: {
            create: {
              tenantId: boysTenant.id,
              personnelCode,
            },
          },
        },
        include: {
          teacherProfile: true,
        },
      });

      results.push({
        وضعیت: 'ایجاد شد (جدید)',
        نام: `${t.firstName} ${t.lastName}`,
        'نام کاربری': phone,
        'رمز عبور': rawPassword,
        'کد پرسنلی': personnelCode,
      });
    }
  }

  console.log('='.repeat(95));
  console.log('🎉 عملیات ثبت/به‌روزرسانی دبیران پسرانه با موفقیت انجام شد:');
  console.log('='.repeat(95));
  console.table(results);
  console.log('='.repeat(95));
  console.log(`✨ مجموع دبیران: ${results.length} نفر`);
  console.log('🔐 الگوی ورود: نام کاربری = شماره موبایل | رمز عبور = حرف b + شماره موبایل (مثال: b09155140454)');
}

main()
  .catch((err) => {
    console.error('❌ خطا در اجرای اسکریپت:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
