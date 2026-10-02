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
    throw new Error(`Tenants not found! Boys: ${boysTenant?.id}, Girls: ${girlsTenant?.id}`);
  }

  console.log(`✅ هنرستان پسرانه: ${boysTenant.name} (${boysTenant.id})`);
  console.log(`✅ هنرستان دخترانه: ${girlsTenant.name} (${girlsTenant.id})`);

  // 1. Update Boys School Admin Password -> b09154489820
  const boysPassHash = await argon2.hash('b09154489820');
  const boysAdmin = await prisma.user.findFirst({
    where: {
      tenantId: boysTenant.id,
      phone: '09154489820',
    },
  });

  if (boysAdmin) {
    await prisma.user.update({
      where: { id: boysAdmin.id },
      data: {
        passwordHash: boysPassHash,
        role: 'SCHOOL_ADMIN',
        status: 'ACTIVE',
        firstName: 'علیرضا',
        lastName: 'عزیزپور',
      },
    });
    console.log('\n🟢 اکانت هنرستان پسرانه با موفقیت به‌روزرسانی شد:');
    console.log(`- نام: علیرضا عزیزپور`);
    console.log(`- مدرسه: ${boysTenant.name}`);
    console.log(`- نقش: SCHOOL_ADMIN`);
    console.log(`- شناسه/همراه: 09154489820`);
    console.log(`- رمز عبور جدید: b09154489820`);
  } else {
    // If not found in boys tenant, create it
    await prisma.user.create({
      data: {
        tenantId: boysTenant.id,
        phone: '09154489820',
        username: '09154489820',
        firstName: 'علیرضا',
        lastName: 'عزیزپور',
        role: 'SCHOOL_ADMIN',
        status: 'ACTIVE',
        passwordHash: boysPassHash,
      },
    });
    console.log('\n🟢 اکانت هنرستان پسرانه ایجاد شد: رمز: b09154489820');
  }

  // 2. Create or Update Girls School Admin -> g09154489820
  const girlsPassHash = await argon2.hash('g09154489820');
  const existingGirlsAdmin = await prisma.user.findFirst({
    where: {
      tenantId: girlsTenant.id,
      phone: '09154489820',
    },
  });

  if (existingGirlsAdmin) {
    await prisma.user.update({
      where: { id: existingGirlsAdmin.id },
      data: {
        passwordHash: girlsPassHash,
        role: 'SCHOOL_ADMIN',
        status: 'ACTIVE',
        firstName: 'علیرضا',
        lastName: 'عزیزپور',
      },
    });
    console.log('\n🌸 اکانت هنرستان دخترانه با موفقیت به‌روزرسانی شد:');
  } else {
    await prisma.user.create({
      data: {
        tenantId: girlsTenant.id,
        phone: '09154489820',
        username: '09154489820',
        firstName: 'علیرضا',
        lastName: 'عزیزپور',
        role: 'SCHOOL_ADMIN',
        status: 'ACTIVE',
        passwordHash: girlsPassHash,
      },
    });
    console.log('\n🌸 اکانت جدید راهبر هنرستان دخترانه با موفقیت ایجاد شد:');
  }

  console.log(`- نام: علیرضا عزیزپور`);
  console.log(`- مدرسه: ${girlsTenant.name}`);
  console.log(`- نقش: SCHOOL_ADMIN (راهبر مدرسه)`);
  console.log(`- شناسه/همراه: 09154489820`);
  console.log(`- رمز عبور: g09154489820`);

  console.log('\n======================================================');
  console.log('🎉 هر دو اکانت با موفقیت ثبت و تفکیک شدند!');
  console.log('ورود به پسرانه: 09154489820 با رمز b09154489820');
  console.log('ورود به دخترانه: 09154489820 با رمز g09154489820');
  console.log('======================================================');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
  })
  .finally(() => prisma.$disconnect());
