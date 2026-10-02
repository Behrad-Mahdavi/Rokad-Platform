const { PrismaClient } = require('@prisma/client');

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

  // Find the teacher user
  const teacherUser = await prisma.user.findFirst({
    where: {
      tenantId: girlsTenant.id,
      OR: [
        { phone: '09027359019' },
        { phone: '9027359019' },
        {
          teacherProfile: {
            personnelCode: 'TCH-1001',
          },
        },
        {
          AND: [
            { firstName: { contains: 'بهراد' } },
            { lastName: { contains: 'مهدوی' } },
          ],
        },
      ],
    },
    include: {
      teacherProfile: {
        include: {
          schedules: true,
          secondSchedules: true,
          teacherLessons: {
            include: {
              lesson: true,
            },
          },
        },
      },
    },
  });

  if (!teacherUser) {
    console.log('⚠️ دبیر «بهراد مهدوی» با این مشخصات در هنرستان دخترانه پیدا نشد (شاید قبلاً حذف شده باشد).');
    
    // Check if user exists anywhere else for visibility
    const anyUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: '09027359019' },
          { firstName: { contains: 'بهراد' } },
        ],
      },
      include: { tenant: true },
    });
    if (anyUser) {
      console.log(`ℹ️ کاربر با شماره یا نام بهراد در تننت دیگری یافت شد: ${anyUser.tenant?.name} (${anyUser.tenant?.slug})`);
    }
    return;
  }

  console.log(`\n🔍 دبیر پیدا شد:`);
  console.log(`- شناسه: ${teacherUser.id}`);
  console.log(`- نام و نام خانوادگی: ${teacherUser.firstName} ${teacherUser.lastName}`);
  console.log(`- شماره همراه: ${teacherUser.phone}`);
  console.log(`- کد پرسنلی: ${teacherUser.teacherProfile?.personnelCode || 'ندارد'}`);
  console.log(`- درس‌های تخصیص داده شده: ${teacherUser.teacherProfile?.teacherLessons?.map(tl => tl.lesson.name).join(', ') || 'ندارد'}`);
  console.log(`- تعداد زنگ‌های برنامه کلاسی: ${(teacherUser.teacherProfile?.schedules?.length || 0) + (teacherUser.teacherProfile?.secondSchedules?.length || 0)}`);

  console.log('\n🗑️ در حال حذف ایمن دبیر و وابستگی‌های آن در هنرستان دخترانه...');

  await prisma.$transaction(async (tx) => {
    if (teacherUser.teacherProfile) {
      const tpId = teacherUser.teacherProfile.id;

      // 1. Delete ClassSchedules where he is primary teacher
      await tx.classSchedule.deleteMany({
        where: { teacherId: tpId },
      });

      // 2. Clear secondTeacherId if assigned as second teacher
      await tx.classSchedule.updateMany({
        where: { secondTeacherId: tpId },
        data: { secondTeacherId: null, isSplitPeriod: false },
      });

      // 3. Delete teacher attendances
      await tx.teacherAttendance.deleteMany({
        where: { teacherId: tpId },
      });

      // 4. Delete homeworks
      await tx.homework.deleteMany({
        where: { teacherId: tpId },
      });

      // 5. Delete teacher lessons
      await tx.teacherLesson.deleteMany({
        where: { teacherId: tpId },
      });

      // 6. Delete teacher profile
      await tx.teacherProfile.delete({
        where: { id: tpId },
      });
    }

    // 7. Delete sessions, tokens, etc. and User
    await tx.userSession.deleteMany({ where: { userId: teacherUser.id } });
    await tx.refreshTokenFamily.deleteMany({ where: { userId: teacherUser.id } });
    await tx.auditLog.deleteMany({ where: { userId: teacherUser.id } });

    await tx.user.delete({
      where: { id: teacherUser.id },
    });
  });

  console.log('\n✅ دبیر «بهراد مهدوی» (کارگاه نوآوری و کارآفرینی - یازدهم) با موفقیت کامل از هنرستان دخترانه حذف شد!');
}

main()
  .catch((e) => {
    console.error('❌ خطا در حذف دبیر:', e);
  })
  .finally(() => prisma.$disconnect());
