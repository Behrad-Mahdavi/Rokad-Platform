const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const dbUrl = process.env.DATABASE_URL || 'postgresql://root:u82txHRHaQ8KFW7ZlRn4tT23@grande-casse.liara.cloud:33497/postgres?schema=public';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

async function main() {
  console.log('🔄 Connecting to database...');

  const girlsTenant = await prisma.tenant.findFirst({
    where: {
      OR: [{ slug: 'rokad-girls' }, { theme: 'FEMALE' }, { name: { contains: 'دختر' } }],
    },
  });

  if (!girlsTenant) {
    throw new Error('Girls tenant not found!');
  }

  console.log(`🏫 هنرستان دخترانه: ${girlsTenant.name} (${girlsTenant.id})`);

  const phone = '09931192388';
  const rawPassword = `g${phone}`; // g09931192388
  const passwordHash = await argon2.hash(rawPassword);

  // Check if teacher already exists in this tenant
  let teacherUser = await prisma.user.findFirst({
    where: {
      tenantId: girlsTenant.id,
      phone,
    },
    include: { teacherProfile: true },
  });

  if (teacherUser) {
    await prisma.user.update({
      where: { id: teacherUser.id },
      data: {
        firstName: 'حدیثه',
        lastName: 'حسینپور',
        passwordHash,
        status: 'ACTIVE',
        role: 'TEACHER',
      },
    });

    if (teacherUser.teacherProfile) {
      await prisma.teacherProfile.update({
        where: { id: teacherUser.teacherProfile.id },
        data: {
          personnelCode: 'TCH-1001',
        },
      });
    } else {
      await prisma.teacherProfile.create({
        data: {
          tenantId: girlsTenant.id,
          userId: teacherUser.id,
          personnelCode: 'TCH-1001',
        },
      });
    }

    console.log(`✅ دبیر «حدیثه حسینپور» در هنرستان دخترانه به‌روزرسانی شد.`);
  } else {
    teacherUser = await prisma.user.create({
      data: {
        tenantId: girlsTenant.id,
        firstName: 'حدیثه',
        lastName: 'حسینپور',
        phone,
        username: phone,
        role: 'TEACHER',
        status: 'ACTIVE',
        passwordHash,
        teacherProfile: {
          create: {
            tenantId: girlsTenant.id,
            personnelCode: 'TCH-1001',
          },
        },
      },
      include: { teacherProfile: true },
    });

    console.log(`✅ دبیر جدید «حدیثه حسینپور» در هنرستان دخترانه ایجاد شد.`);
  }

  // Look for lesson "کارگاه نوآوری و کارآفرینی" to assign if present
  const lesson = await prisma.lesson.findFirst({
    where: {
      tenantId: girlsTenant.id,
      name: { contains: 'نوآوری' },
    },
  });

  if (lesson && teacherUser.teacherProfile) {
    const existingAssign = await prisma.teacherLesson.findUnique({
      where: {
        teacherId_lessonId: {
          teacherId: teacherUser.teacherProfile.id,
          lessonId: lesson.id,
        },
      },
    });

    if (!existingAssign) {
      await prisma.teacherLesson.create({
        data: {
          tenantId: girlsTenant.id,
          teacherId: teacherUser.teacherProfile.id,
          lessonId: lesson.id,
        },
      });
      console.log(`📚 درس «${lesson.name}» به ایشان تخصیص داده شد.`);
    }
  }

  console.log('\n=======================================');
  console.log(`نام: حدیثه حسینپور`);
  console.log(`کد پرسنلی: TCH-1001`);
  console.log(`شناسه ورود / شماره تماس: ${phone}`);
  console.log(`رمز عبور تعیین‌شده: ${rawPassword}`);
  console.log('=======================================');
}

main()
  .catch((e) => {
    console.error('❌ خطا:', e);
  })
  .finally(() => prisma.$disconnect());
