const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

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

// List of 14 teachers for the girls school
const teachers = [
  { firstName: 'حدیثه', lastName: 'حسینپور', phone: '09931192388' },
  { firstName: 'فرشته', lastName: 'ضیائی', phone: '09033942406' },
  { firstName: 'مونا', lastName: 'دهقانی', phone: '09304548388' },
  { firstName: 'صالحه', lastName: 'شهابی', phone: '09391469422' },
  { firstName: 'زهرا', lastName: 'میرزاخان زاده', phone: '09150784833' },
  { firstName: 'مهری', lastName: 'کمالی حیدری', phone: '09357025403' },
  { firstName: 'مریم', lastName: 'معینی خواه', phone: '09022673203' },
  { firstName: 'حلما', lastName: 'لاچینیان', phone: '09155367894' },
  { firstName: 'رها', lastName: 'آزاد', phone: '09905753035' },
  { firstName: 'عارفه', lastName: 'امیری', phone: '09395108511' },
  { firstName: 'سعیده', lastName: 'خزاعی', phone: '09218904717' },
  { firstName: 'خانم', lastName: 'بهنام', phone: '09155084812' },
  { firstName: 'بهراد', lastName: 'مهدوی', phone: '09027359019' },
  { firstName: 'لنا', lastName: 'اقبالی', phone: '09900657458' },
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

  const girlsTenant = await prisma.tenant.findFirst({
    where: {
      OR: [{ slug: 'rokad-girls' }, { theme: 'FEMALE' }, { name: { contains: 'دختر' } }],
    },
  });

  if (!girlsTenant) {
    throw new Error('❌ خطای بحرانی: هنرستان دخترانه در پایگاه داده یافت نشد!');
  }

  console.log(`🌸 هنرستان مقصد: ${girlsTenant.name} (شناسه: ${girlsTenant.id})`);
  console.log(`📋 تعداد کل دبیران برای ثبت: ${teachers.length} نفر\n`);

  const results = [];

  for (let i = 0; i < teachers.length; i++) {
    const t = teachers[i];
    const phone = cleanPhoneNumber(t.phone);
    const rawPassword = `g${phone}`;
    const passwordHash = await argon2.hash(rawPassword);
    const personnelCode = `TCH-G${101 + i}`;

    // Find if user already exists in this tenant by phone or username
    let user = await prisma.user.findFirst({
      where: {
        tenantId: girlsTenant.id,
        OR: [{ phone }, { username: phone }],
      },
      include: {
        teacherProfile: true,
      },
    });

    if (user) {
      // Update existing user
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
        },
        include: {
          teacherProfile: true,
        },
      });

      // Update or create TeacherProfile
      if (user.teacherProfile) {
        await prisma.teacherProfile.update({
          where: { id: user.teacherProfile.id },
          data: {
            personnelCode: user.teacherProfile.personnelCode || personnelCode,
            speciality: null, // Removed as requested
          },
        });
      } else {
        await prisma.teacherProfile.create({
          data: {
            tenantId: girlsTenant.id,
            userId: user.id,
            personnelCode,
            speciality: null,
          },
        });
      }

      results.push({
        status: 'به‌روزرسانی شد',
        fullName: `${t.firstName} ${t.lastName}`,
        username: phone,
        password: rawPassword,
        personnelCode: user.teacherProfile?.personnelCode || personnelCode,
      });
    } else {
      // Create new user & teacher profile
      user = await prisma.user.create({
        data: {
          tenantId: girlsTenant.id,
          firstName: t.firstName,
          lastName: t.lastName,
          phone,
          username: phone,
          role: 'TEACHER',
          status: 'ACTIVE',
          passwordHash,
          teacherProfile: {
            create: {
              tenantId: girlsTenant.id,
              personnelCode,
              speciality: null,
            },
          },
        },
        include: {
          teacherProfile: true,
        },
      });

      results.push({
        status: 'ایجاد شد (جدید)',
        fullName: `${t.firstName} ${t.lastName}`,
        username: phone,
        password: rawPassword,
        personnelCode,
      });
    }
  }

  console.log('='.repeat(95));
  console.log('🎉 عملیات ثبت/به‌روزرسانی با موفقیت انجام شد:');
  console.log('='.repeat(95));
  console.table(results);
  console.log('='.repeat(95));
  console.log(`✨ مجموع دبیران ثبت‌شده/به‌روزرسانی‌شده: ${results.length} نفر`);
  console.log('🔐 الگوی رمز عبور دخترانه: حرف g به همراه شماره موبایل (مثال: g09931192388)');
}

main()
  .catch((err) => {
    console.error('❌ خطا در اجرای اسکریپت:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
