const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('--- بررسی و اصلاح سال تحصیلی به ۱۴۰۵-۱۴۰۶ ---');
    const tenants = await prisma.tenant.findMany({
      select: { id: true, name: true, type: true }
    });

    console.log(`تعداد مدارس/مستأجرین یافت‌شده: ${tenants.length}`);

    for (const tenant of tenants) {
      console.log(`\nدر حال بررسی مدرسه: ${tenant.name} (${tenant.id})`);

      // 1. بررسی سال‌های تحصیلی موجود در این مدرسه
      const allYears = await prisma.academicYear.findMany({
        where: { tenantId: tenant.id }
      });

      let year1405 = allYears.find(y => y.name.includes('۱۴۰۵') || y.name.includes('1405') || y.name.includes('۴۰۵'));
      let year1404 = allYears.find(y => y.name.includes('۱۴۰۴') || y.name.includes('1404') || y.name.includes('۴۰۴'));

      if (!year1405 && year1404) {
        // تغییر نام سال ۱۴۰۴-۱۴۰۵ به ۱۴۰۵-۱۴۰۶
        console.log(`تغییر نام سال ${year1404.name} به «۱۴۰۵-۱۴۰۶»...`);
        year1405 = await prisma.academicYear.update({
          where: { id: year1404.id },
          data: {
            name: '۱۴۰۵-۱۴۰۶',
            isCurrent: true
          }
        });
      } else if (!year1405 && !year1404) {
        // ایجاد سال جدید ۱۴۰۵-۱۴۰۶
        console.log(`ایجاد سال تحصیلی جدید «۱۴۰۵-۱۴۰۶»...`);
        year1405 = await prisma.academicYear.create({
          data: {
            tenantId: tenant.id,
            name: '۱۴۰۵-۱۴۰۶',
            isCurrent: true,
            startDate: new Date('2026-09-23T00:00:00.000Z'),
            endDate: new Date('2027-06-21T23:59:59.000Z')
          }
        });
      } else if (year1405) {
        // اطمینان از فعال بودن ۱۴۰۵-۱۴۰۶
        await prisma.academicYear.update({
          where: { id: year1405.id },
          data: {
            name: '۱۴۰۵-۱۴۰۶',
            isCurrent: true
          }
        });
        if (year1404 && year1404.id !== year1405.id) {
          await prisma.academicYear.update({
            where: { id: year1404.id },
            data: { isCurrent: false }
          });
        }
      }

      // غیرفعال کردن بقیه سال‌ها
      await prisma.academicYear.updateMany({
        where: {
          tenantId: tenant.id,
          id: { not: year1405.id }
        },
        data: { isCurrent: false }
      });

      console.log(`سال تحصیلی جاری فعال: ${year1405.name} (${year1405.id})`);

      // 2. به‌روزرسانی تمام کلاس‌های این مدرسه به سال ۱۴۰۵-۱۴۰۶
      const updatedClasses = await prisma.classroom.updateMany({
        where: { tenantId: tenant.id },
        data: { academicYearId: year1405.id }
      });
      console.log(`تعداد ${updatedClasses.count} کلاس به سال تحصیلی ۱۴۰۵-۱۴۰۶ متصل شدند.`);

      // 3. به‌روزرسانی ثبت‌نام‌های کلاسی (Enrollments)
      const updatedEnrollments = await prisma.classEnrollment.updateMany({
        where: { tenantId: tenant.id },
        data: { academicYearId: year1405.id }
      });
      console.log(`تعداد ${updatedEnrollments.count} ثبت‌نام کلاسی دانش‌آموز به سال تحصیلی ۱۴۰۵-۱۴۰۶ متصل شدند.`);
    }

    console.log('\n عملیات با موفقیت به پایان رسید!');
  } catch (err) {
    console.error('خطا در اجرای اسکریپت:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
