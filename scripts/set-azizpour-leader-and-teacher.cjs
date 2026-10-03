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

async function main() {
  console.log('🔄 در حال اتصال به پایگاه داده...');

  // 1. یافتن مدرسه پسرانه
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

  console.log(`🏫 هنرستان پسرانه: ${boysTenant.name} (${boysTenant.id})`);

  const phone = '09154489820';
  const rawPassword = `b${phone}`; // b09154489820
  const passwordHash = await argon2.hash(rawPassword);
  const encrypted = boysTenant.vaultPublicKey ? encryptWithPublicKey(boysTenant.vaultPublicKey, rawPassword) : null;

  // ─────────────────────────────────────────────────────────────
  // 1. تنظیم اکانت راهبر ارشد (SCHOOL_ADMIN)
  // نام کاربری: 09154489820
  // ─────────────────────────────────────────────────────────────
  let adminUser = await prisma.user.findFirst({
    where: {
      tenantId: boysTenant.id,
      role: 'SCHOOL_ADMIN',
      OR: [{ phone }, { username: phone }],
    },
  });

  if (!adminUser) {
    // اگر اکانت قبلی نقش TEACHER گرفته، آن را به عنوان admin برگردانیم یا ایجاد کنیم
    adminUser = await prisma.user.findFirst({
      where: {
        tenantId: boysTenant.id,
        phone,
        username: phone,
      },
    });
  }

  if (adminUser) {
    adminUser = await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        firstName: 'علیرضا',
        lastName: 'عزیزپور',
        phone,
        username: phone,
        role: 'SCHOOL_ADMIN',
        status: 'ACTIVE',
        passwordHash,
        ...(encrypted ? { encryptedPassword: encrypted } : {}),
      },
    });
    console.log(`✅ اکانت ۱ (راهبر ارشد) به‌روزرسانی شد: شناسه ${adminUser.id}`);
  } else {
    adminUser = await prisma.user.create({
      data: {
        tenantId: boysTenant.id,
        firstName: 'علیرضا',
        lastName: 'عزیزپور',
        phone,
        username: phone,
        role: 'SCHOOL_ADMIN',
        status: 'ACTIVE',
        passwordHash,
        ...(encrypted ? { encryptedPassword: encrypted } : {}),
      },
    });
    console.log(`✨ اکانت ۱ (راهبر ارشد) ایجاد شد: شناسه ${adminUser.id}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. تنظیم اکانت مجزای معلم (TEACHER)
  // نام کاربری: t09154489820
  // ─────────────────────────────────────────────────────────────
  const teacherUsername = `t${phone}`; // t09154489820
  const personnelCode = 'TCH-B108';

  // اگر اکانت مدیر از قبل پروفایل دبیری گرفته بود، آن را پاک می‌کنیم تا روی اکانت معلم قرار گیرد
  const adminTeacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: adminUser.id },
  });
  if (adminTeacherProfile) {
    try {
      await prisma.teacherProfile.delete({
        where: { id: adminTeacherProfile.id },
      });
      console.log('🧹 پرونده دبیری از اکانت راهبر ارشد جدا شد تا فقط روی اکانت دبیر قرار گیرد.');
    } catch (e) {
      // اگر وابستگی دیتابیسی داشت نادیده می‌گیریم
    }
  }

  let teacherUser = await prisma.user.findFirst({
    where: {
      tenantId: boysTenant.id,
      id: { not: adminUser.id },
      OR: [
        { username: teacherUsername },
        { teacherProfile: { isNot: null } },
      ],
      lastName: { contains: 'عزیزپور' },
    },
    include: {
      teacherProfile: true,
    },
  });

  if (!teacherUser) {
    // جستجو برای کاربری با یوزرنیم معلمی
    teacherUser = await prisma.user.findFirst({
      where: {
        tenantId: boysTenant.id,
        username: teacherUsername,
      },
      include: {
        teacherProfile: true,
      },
    });
  }

  if (teacherUser) {
    teacherUser = await prisma.user.update({
      where: { id: teacherUser.id },
      data: {
        firstName: 'علیرضا',
        lastName: 'عزیزپور',
        phone: null,
        metadata: { phone },
        username: teacherUsername,
        role: 'TEACHER',
        status: 'ACTIVE',
        passwordHash,
        ...(encrypted ? { encryptedPassword: encrypted } : {}),
      },
      include: {
        teacherProfile: true,
      },
    });

    if (teacherUser.teacherProfile) {
      await prisma.teacherProfile.update({
        where: { id: teacherUser.teacherProfile.id },
        data: {
          personnelCode: teacherUser.teacherProfile.personnelCode || personnelCode,
        },
      });
    } else {
      await prisma.teacherProfile.create({
        data: {
          tenantId: boysTenant.id,
          userId: teacherUser.id,
          personnelCode,
        },
      });
    }
    console.log(`✅ اکانت ۲ (معلم) به‌روزرسانی شد: شناسه ${teacherUser.id}`);
  } else {
    teacherUser = await prisma.user.create({
      data: {
        tenantId: boysTenant.id,
        firstName: 'علیرضا',
        lastName: 'عزیزپور',
        phone: null,
        metadata: { phone },
        username: teacherUsername,
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
    console.log(`✨ اکانت ۲ (معلم) ایجاد شد: شناسه ${teacherUser.id}`);
  }

  const summary = [
    {
      'نوع اکانت': '۱. راهبر ارشد مدرسه پسرانه (مدیر)',
      'نقش سیستمی': 'SCHOOL_ADMIN',
      نام: 'علیرضا عزیزپور',
      'شماره تماس': phone,
      'نام کاربری ورود': phone, // 09154489820
      'رمز عبور': rawPassword, // b09154489820
      'کد پرسنلی': 'ـ',
    },
    {
      'نوع اکانت': '۲. کادر آموزشی / دبیر (معلم)',
      'نقش سیستمی': 'TEACHER',
      نام: 'علیرضا عزیزپور',
      'شماره تماس': phone,
      'نام کاربری ورود': teacherUsername, // t09154489820
      'رمز عبور': rawPassword, // b09154489820
      'کد پرسنلی': personnelCode,
    },
  ];

  console.log('\n' + '='.repeat(95));
  console.log('🎉 هر دو اکانت علیرضا عزیزپور با موفقیت در مدرسه پسرانه تنظیم شدند:');
  console.log('='.repeat(95));
  console.table(summary);
  console.log('='.repeat(95));
  console.log('💡 راهنمای ورود:');
  console.log('   👑 برای ورود به پنل مدیریت: نام کاربری 09154489820 | رمز عبور b09154489820');
  console.log('   👨‍🏫 برای ورود به پنل دبیری: نام کاربری t09154489820 | رمز عبور b09154489820');
}

main()
  .catch((err) => {
    console.error('❌ خطا در اجرای اسکریپت:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
