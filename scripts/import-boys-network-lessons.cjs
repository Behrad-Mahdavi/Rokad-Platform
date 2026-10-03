const { PrismaClient } = require('@prisma/client');

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

// فهرست ۴۵ درس رشته شبکه و نرم‌افزار رایانه
const lessonsData = [
  // ─── پایه دهم (10) ───
  { name: 'ارائه‌دهنده خدمات رایانه‌ای', code: 'CSP-10', grade: 10, isModular: true, type: 'TECHNICAL_MODULAR_COMPETENCY', units: 8 },
  { name: 'الزامات محیط‌کار', code: 'WR-10', grade: 10, isModular: true, type: 'NON_TECHNICAL_COMPETENCY', units: 2 },
  { name: 'تربیت‌بدنی ۱', code: 'PE-10', grade: 10, isModular: false, type: 'GENERAL', units: 2 },
  { name: 'جغرافیا', code: 'GEO-10', grade: 10, isModular: false, type: 'GENERAL', units: 2 },
  { name: 'دانش فنی پایه', code: 'BTK-10', grade: 10, isModular: true, type: 'TECHNICAL_MODULAR_COMPETENCY', units: 3 },
  { name: 'دین و زندگی ۱', code: 'R-10', grade: 10, isModular: false, type: 'GENERAL', units: 2 },
  { name: 'ریاضی ۱', code: 'MTH-10', grade: 10, isModular: true, type: 'BASIC_COMPETENCY', units: 2 },
  { name: 'زبان خارجی ۱', code: 'EN-10', grade: 10, isModular: false, type: 'GENERAL', units: 2 },
  { name: 'عربی ۱', code: 'AR-10', grade: 10, isModular: false, type: 'GENERAL', units: 1 },
  { name: 'فارسی و نگارش ۱', code: 'LIT-10', grade: 10, isModular: false, type: 'GENERAL', units: 2 },
  { name: 'فیزیک', code: 'PHY-10', grade: 10, isModular: true, type: 'BASIC_COMPETENCY', units: 2 },
  { name: 'مهارت نرم و توسعه فردی ۱', code: 'SS-10', grade: 10, isModular: false, type: 'EXTRACURRICULAR', units: 1 },
  { name: 'نگهداری سیستم‌های رایانه‌ای', code: 'SM-10', grade: 10, isModular: true, type: 'TECHNICAL_MODULAR_COMPETENCY', units: 8 },
  { name: 'هوش مصنوعی', code: 'AI-10', grade: 10, isModular: true, type: 'TECHNICAL_MODULAR_COMPETENCY', units: 4 },

  // ─── پایه یازدهم (11) ───
  { name: 'انسان و محیط‌زیست', code: 'HE-11', grade: 11, isModular: false, type: 'GENERAL', units: 2 },
  { name: 'تاریخ معاصر', code: 'HIS-11', grade: 11, isModular: false, type: 'GENERAL', units: 2 },
  { name: 'تربیت‌بدنی ۲', code: 'PE-11', grade: 11, isModular: false, type: 'GENERAL', units: 2 },
  { name: 'تفکر و سواد رسانه‌ای', code: 'ML-11', grade: 11, isModular: false, type: 'GENERAL', units: 2 },
  { name: 'تولید محتوای رایانه‌ای', code: 'CC-11', grade: 11, isModular: true, type: 'TECHNICAL_MODULAR_COMPETENCY', units: 8 },
  { name: 'دین و زندگی ۲', code: 'R-11', grade: 11, isModular: false, type: 'GENERAL', units: 2 },
  { name: 'ریاضی ۲', code: 'MTH-11', grade: 11, isModular: true, type: 'BASIC_COMPETENCY', units: 2 },
  { name: 'زبان خارجی ۲', code: 'EN-11', grade: 11, isModular: false, type: 'GENERAL', units: 2 },
  { name: 'شیمی', code: 'CHM-11', grade: 11, isModular: true, type: 'BASIC_COMPETENCY', units: 2 },
  { name: 'طراحی سایت', code: 'WD-11', grade: 11, isModular: true, type: 'TECHNICAL_MODULAR_COMPETENCY', units: 8 },
  { name: 'عربی ۲', code: 'AR-11', grade: 11, isModular: false, type: 'GENERAL', units: 1 },
  { name: 'فارسی و نگارش ۲', code: 'LIT-11', grade: 11, isModular: false, type: 'GENERAL', units: 2 },
  { name: 'کاربرد فناوری‌های نوین', code: 'NT-11', grade: 11, isModular: true, type: 'NON_TECHNICAL_COMPETENCY', units: 2 },
  { name: 'کارگاه نوآوری و کارآفرینی', code: 'ENT-11', grade: 11, isModular: true, type: 'NON_TECHNICAL_COMPETENCY', units: 3 },
  { name: 'مدیریت تولید', code: 'PM-11', grade: 11, isModular: true, type: 'NON_TECHNICAL_COMPETENCY', units: 2 },
  { name: 'مهارت نرم و توسعه فردی ۲', code: 'SS-11', grade: 11, isModular: false, type: 'EXTRACURRICULAR', units: 1 },

  // ─── پایه دوازدهم (12) ───
  { name: 'آمادگی دفاعی', code: 'DR-12', grade: 12, isModular: false, type: 'GENERAL', units: 3 },
  { name: 'اخلاق حرفه‌ای', code: 'PET-12', grade: 12, isModular: true, type: 'NON_TECHNICAL_COMPETENCY', units: 2 },
  { name: 'تأمین‌کننده امنیت سایبری', code: 'CS-12', grade: 12, isModular: true, type: 'TECHNICAL_MODULAR_COMPETENCY', units: 8 },
  { name: 'تجارت الکترونیک و امنیت شبکه', code: 'EC-12', grade: 12, isModular: true, type: 'TECHNICAL_MODULAR_COMPETENCY', units: 8 },
  { name: 'تربیت‌بدنی ۳', code: 'PE-12', grade: 12, isModular: false, type: 'GENERAL', units: 2 },
  { name: 'دانش فنی تخصصی', code: 'STK-12', grade: 12, isModular: true, type: 'TECHNICAL_MODULAR_COMPETENCY', units: 4 },
  { name: 'دین و زندگی ۳', code: 'R-12', grade: 12, isModular: false, type: 'GENERAL', units: 2 },
  { name: 'ریاضی ۳', code: 'MTH-12', grade: 12, isModular: true, type: 'BASIC_COMPETENCY', units: 2 },
  { name: 'سلامت و بهداشت', code: 'HH-12', grade: 12, isModular: false, type: 'GENERAL', units: 2 },
  { name: 'عربی ۳', code: 'AR-12', grade: 12, isModular: false, type: 'GENERAL', units: 1 },
  { name: 'فارسی و نگارش ۳', code: 'LIT-12', grade: 12, isModular: false, type: 'GENERAL', units: 2 },
  { name: 'مدیریت خانواده و سبک زندگی', code: 'LS-12', grade: 12, isModular: false, type: 'GENERAL', units: 2 },
  { name: 'مهارت نرم و توسعه فردی ۳', code: 'SS-12', grade: 12, isModular: false, type: 'EXTRACURRICULAR', units: 1 },
  { name: 'نصب و نگهداری تجهیزات شبکه', code: 'NE-12', grade: 12, isModular: true, type: 'TECHNICAL_MODULAR_COMPETENCY', units: 8 },
  { name: 'هویت اجتماعی', code: 'SI-12', grade: 12, isModular: false, type: 'GENERAL', units: 2 },
];

async function main() {
  try {
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
      throw new Error('مدرسه پسرانه در سامانه یافت نشد!');
    }

    console.log(`🏫 هنرستان پسرانه شناسایی شد: ${boysTenant.name} (${boysTenant.id})\n`);

    // 2. بررسی و ایجاد پایه‌های تحصیلی دهم، یازدهم، دوازدهم
    const gradeCodes = [
      { grade: 10, name: 'پایه دهم', code: 'GRADE_10', orderIndex: 10 },
      { grade: 11, name: 'پایه یازدهم', code: 'GRADE_11', orderIndex: 11 },
      { grade: 12, name: 'پایه دوازدهم', code: 'GRADE_12', orderIndex: 12 },
    ];

    const levelMap = {};

    for (const g of gradeCodes) {
      let level = await prisma.educationalLevel.findFirst({
        where: {
          tenantId: boysTenant.id,
          OR: [
            { code: g.code },
            { name: g.name },
            { orderIndex: g.orderIndex },
          ],
        },
      });

      if (!level) {
        level = await prisma.educationalLevel.create({
          data: {
            tenantId: boysTenant.id,
            name: g.name,
            code: g.code,
            orderIndex: g.orderIndex,
          },
        });
        console.log(`✅ پایه ایجاد شد: ${g.name}`);
      } else {
        console.log(`ℹ️ پایه موجود است: ${level.name} (${level.id})`);
      }
      levelMap[g.grade] = level;
    }

    // 3. بررسی و ایجاد رشته «شبکه و نرم‌افزار رایانه» برای هر پایه
    const fieldMap = {};

    for (const g of gradeCodes) {
      const level = levelMap[g.grade];
      let field = await prisma.studyField.findFirst({
        where: {
          tenantId: boysTenant.id,
          levelId: level.id,
          OR: [
            { name: { contains: 'شبکه' } },
            { code: { contains: 'NET' } },
          ],
        },
      });

      if (!field) {
        field = await prisma.studyField.create({
          data: {
            tenantId: boysTenant.id,
            levelId: level.id,
            name: 'شبکه و نرم‌افزار رایانه',
            code: `B_${g.code}_NET`,
          },
        });
        console.log(`✅ رشته شبکه ایجاد شد برای ${level.name}`);
      } else {
        console.log(`ℹ️ رشته موجود است برای ${level.name}: ${field.name} (${field.id})`);
      }
      fieldMap[g.grade] = field;
    }

    console.log('\n📚 شروع ثبت/بروزرسانی ۴۵ درس در مدرسه پسرانه...\n');

    let createdCount = 0;
    let updatedCount = 0;

    for (const item of lessonsData) {
      const level = levelMap[item.grade];
      const field = fieldMap[item.grade];

      const existingLesson = await prisma.lesson.findFirst({
        where: {
          tenantId: boysTenant.id,
          code: item.code,
        },
        include: {
          podmans: true,
        },
      });

      let lessonId;

      if (existingLesson) {
        await prisma.lesson.update({
          where: { id: existingLesson.id },
          data: {
            name: item.name,
            levelId: level.id,
            fieldId: field.id,
            unitCount: item.units,
            type: item.type,
            isModular: item.isModular,
            podmanCount: item.isModular ? 5 : 5,
          },
        });
        lessonId = existingLesson.id;
        updatedCount++;
        console.log(`🔄 بروزرسانی: ${item.name} (${item.code}) - ${level.name}`);
      } else {
        const newLesson = await prisma.lesson.create({
          data: {
            tenantId: boysTenant.id,
            name: item.name,
            code: item.code,
            levelId: level.id,
            fieldId: field.id,
            unitCount: item.units,
            type: item.type,
            isModular: item.isModular,
            podmanCount: item.isModular ? 5 : 5,
          },
        });
        lessonId = newLesson.id;
        createdCount++;
        console.log(`✨ ایجاد شد: ${item.name} (${item.code}) - ${level.name}`);
      }

      // اگر درس پودمانی است، ایجاد ۵ پودمان در صورت عدم وجود
      if (item.isModular) {
        const podmansCount = await prisma.podman.count({
          where: { lessonId },
        });

        if (podmansCount < 5) {
          const podmanCreates = [];
          for (let i = podmansCount + 1; i <= 5; i++) {
            podmanCreates.push({
              tenantId: boysTenant.id,
              lessonId,
              number: i,
              title: `پودمان ${i}`,
            });
          }
          await prisma.podman.createMany({
            data: podmanCreates,
          });
          console.log(`   📦 ۵ پودمان برای درس ${item.name} ثبت شدند.`);
        }
      }
    }

    console.log('\n🎉 عملیات با موفقیت به پایان رسید!');
    console.log(`📊 آمار کلی: ${createdCount} درس جدید ایجاد شد، ${updatedCount} درس بروزرسانی شد.`);
    console.log(`🎯 تمامی ۴۵ درس در مدرسه پسرانه برای رشته «شبکه و نرم‌افزار رایانه» ثبت شدند.`);
  } catch (err) {
    console.error('❌ خطا در اجرای اسکریپت:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
