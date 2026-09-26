import { PrismaClient } from '@prisma/client';

const dbUrl = process.env.DATABASE_URL;
const prisma = new PrismaClient(
  dbUrl ? { datasources: { db: { url: dbUrl } } } : undefined
);

async function main() {
  console.log('🔄 در حال اصلاح نام «مهیا» به «محیا تقوی‌فرد» در دیتابیس...');

  // ۱. اصلاح در جدول کاربران
  const updatedUsers = await prisma.user.updateMany({
    where: {
      OR: [
        { nationalId: '0950289493' },
        { nationalId: '950289493' },
        { username: '0950289493' },
        { username: '950289493' },
        { firstName: 'مهیا', lastName: { contains: 'تقوی' } },
      ],
    },
    data: {
      firstName: 'محیا',
      lastName: 'تقوی‌فرد',
    },
  });

  // ۲. اصلاح در جدول مشخصات دانش‌آموزی
  const updatedProfiles = await prisma.studentProfile.updateMany({
    where: {
      OR: [
        { nationalCode: '0950289493' },
        { nationalCode: '950289493' },
        { studentCode: '0950289493' },
        { studentCode: '950289493' },
      ],
    },
    data: {
      nationalCode: '0950289493',
    },
  });

  console.log(`✅ تعداد کاربران اصلاح شده: ${updatedUsers.count}`);
  console.log(`✅ تعداد پروفایل‌های دانش‌آموزی اصلاح شده: ${updatedProfiles.count}`);

  // ۳. نمایش وضعیت فعلی کاربر
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: '950289493' },
        { username: '0950289493' },
        { nationalId: '0950289493' },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      nationalId: true,
      role: true,
    },
  });

  if (user) {
    console.log('\nاطلاعات کاربر پس از اصلاح:');
    console.log(`- نام و نام خانوادگی: ${user.firstName} ${user.lastName}`);
    console.log(`- نام کاربری: ${user.username}`);
    console.log(`- کد ملی: ${user.nationalId}`);
  } else {
    console.log('⚠️ کاربری با این مشخصات یافت نشد؛ در حال ایجاد کاربر جدید...');
  }
}

main()
  .catch((e) => {
    console.error('❌ خطا:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
