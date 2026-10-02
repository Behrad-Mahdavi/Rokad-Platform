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

async function main() {
  console.log('🔄 در حال اتصال به پایگاه داده...');

  // 1. Find Tenants
  const boysTenant = await prisma.tenant.findFirst({
    where: {
      OR: [{ slug: 'rokad-boys' }, { theme: 'MALE' }],
    },
  });

  const girlsTenant = await prisma.tenant.findFirst({
    where: {
      OR: [{ slug: 'rokad-girls' }, { theme: 'FEMALE' }],
    },
  });

  if (!boysTenant || !girlsTenant) {
    throw new Error(`خطا: مدارک مدارس یافت نشد! پسرانه: ${boysTenant?.id}, دخترانه: ${girlsTenant?.id}`);
  }

  console.log(`🏫 هنرستان پسرانه: ${boysTenant.name} (${boysTenant.id})`);
  console.log(`🌸 هنرستان دخترانه: ${girlsTenant.name} (${girlsTenant.id})`);
  console.log('');

  const accounts = [
    {
      roleDesc: 'راهبر ارشد دخترانه',
      tenant: girlsTenant,
      firstName: 'رویا',
      lastName: 'دولت‌آبادی',
      phone: '09307966319',
      rawPassword: 'g09307966319',
      role: 'SCHOOL_ADMIN',
      isStaff: false,
    },
    {
      roleDesc: 'معاون دخترانه',
      tenant: girlsTenant,
      firstName: 'مبینا',
      lastName: 'فلاح',
      phone: '09150747096',
      rawPassword: 'g09150747096',
      role: 'STAFF',
      isStaff: true,
      jobTitle: 'معاون آموزشی',
      department: 'آموزش',
    },
    {
      roleDesc: 'معاون پسرانه',
      tenant: boysTenant,
      firstName: 'عماد',
      lastName: 'پورحسنی',
      phone: '09335938328',
      rawPassword: 'b09335938328',
      role: 'STAFF',
      isStaff: true,
      jobTitle: 'معاون آموزشی',
      department: 'آموزش',
    },
  ];

  const results = [];

  for (const acc of accounts) {
    const passwordHash = await argon2.hash(acc.rawPassword);

    let user = await prisma.user.findFirst({
      where: {
        tenantId: acc.tenant.id,
        OR: [{ phone: acc.phone }, { username: acc.phone }],
      },
      include: {
        staffProfile: true,
      },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: acc.firstName,
          lastName: acc.lastName,
          phone: acc.phone,
          username: acc.phone,
          role: acc.role,
          status: 'ACTIVE',
          passwordHash,
        },
        include: {
          staffProfile: true,
        },
      });

      if (acc.isStaff) {
        if (user.staffProfile) {
          await prisma.staffProfile.update({
            where: { id: user.staffProfile.id },
            data: {
              jobTitle: acc.jobTitle,
              department: acc.department,
            },
          });
        } else {
          await prisma.staffProfile.create({
            data: {
              tenantId: acc.tenant.id,
              userId: user.id,
              jobTitle: acc.jobTitle,
              department: acc.department,
            },
          });
        }
      }

      results.push({
        status: 'به‌روزرسانی شد',
        school: acc.tenant.name.includes('دختر') ? 'دخترانه' : 'پسرانه',
        name: `${acc.firstName} ${acc.lastName}`,
        role: acc.roleDesc,
        username: acc.phone,
        password: acc.rawPassword,
      });
    } else {
      user = await prisma.user.create({
        data: {
          tenantId: acc.tenant.id,
          firstName: acc.firstName,
          lastName: acc.lastName,
          phone: acc.phone,
          username: acc.phone,
          role: acc.role,
          status: 'ACTIVE',
          passwordHash,
          ...(acc.isStaff
            ? {
                staffProfile: {
                  create: {
                    tenantId: acc.tenant.id,
                    jobTitle: acc.jobTitle,
                    department: acc.department,
                  },
                },
              }
            : {}),
        },
        include: {
          staffProfile: true,
        },
      });

      results.push({
        status: 'ایجاد شد (جدید)',
        school: acc.tenant.name.includes('دختر') ? 'دخترانه' : 'پسرانه',
        name: `${acc.firstName} ${acc.lastName}`,
        role: acc.roleDesc,
        username: acc.phone,
        password: acc.rawPassword,
      });
    }
  }

  console.log('='.repeat(95));
  console.log('🎉 اکانت‌های کادر مدیریت با موفقیت ثبت / به‌روزرسانی شدند:');
  console.log('='.repeat(95));
  console.table(results);
  console.log('='.repeat(95));
}

main()
  .catch((err) => {
    console.error('❌ خطا در اجرای اسکریپت:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
