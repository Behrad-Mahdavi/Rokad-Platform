const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const OFFICIAL_KA_REWARDS = [
  // ۱. پاداش‌های عمومی (General Rewards)
  {
    parent: 'پاداش‌های عمومی',
    name: 'تخفیف شهریه فوق برنامه',
    minToken: 300,
    maxToken: 500,
    icon: 'Percent',
    color: '#652D90',
  },
  {
    parent: 'پاداش‌های عمومی',
    name: 'تخفیف هزینه شرکت در رویدادها و اردوها',
    minToken: 50,
    maxToken: 500,
    icon: 'Compass',
    color: '#652D90',
  },
  {
    parent: 'پاداش‌های عمومی',
    name: 'کمک‌هزینه ثبت‌نام در دوره‌های آموزشی',
    minToken: 100,
    maxToken: 500,
    icon: 'GraduationCap',
    color: '#652D90',
  },
  {
    parent: 'پاداش‌های عمومی',
    name: 'کمک‌هزینه خرید اشتراک وب‌سایت‌های آموزشی',
    minToken: 50,
    maxToken: 200,
    icon: 'Globe',
    color: '#652D90',
  },
  {
    parent: 'پاداش‌های عمومی',
    name: 'کمک‌هزینه خرید کتاب‌های توسعه فردی',
    minToken: 50,
    maxToken: 200,
    icon: 'BookOpen',
    color: '#652D90',
  },
  {
    parent: 'پاداش‌های عمومی',
    name: 'کمک‌هزینه خرید بازی‌های فکری',
    minToken: 50,
    maxToken: 200,
    icon: 'Gamepad2',
    color: '#652D90',
  },
  {
    parent: 'پاداش‌های عمومی',
    name: 'کمک‌هزینه خرید لوازم الکترونیکی',
    minToken: 100,
    maxToken: 300,
    icon: 'Laptop',
    color: '#652D90',
  },
  {
    parent: 'پاداش‌های عمومی',
    name: 'سرمایه‌گذاری روی ایده‌ها',
    minToken: 200,
    maxToken: 500,
    icon: 'Lightbulb',
    color: '#652D90',
  },
  {
    parent: 'پاداش‌های عمومی',
    name: 'رزرو جلسات مشاوره اختصاصی',
    minToken: 200,
    maxToken: 500,
    icon: 'UserCheck',
    color: '#652D90',
  },
  {
    parent: 'پاداش‌های عمومی',
    name: 'رزرو تایم عکاسی اختصاصی',
    minToken: 200,
    maxToken: 200,
    icon: 'Camera',
    color: '#652D90',
  },
  {
    parent: 'پاداش‌های عمومی',
    name: 'چاپ لوازم اختصاصی (لیوان، لباس یا ...)',
    minToken: 50,
    maxToken: 300,
    icon: 'Printer',
    color: '#652D90',
  },

  // ۲. پاداش‌های اختصاصی (۵ نفر برتر پایه) (Exclusive Rewards)
  {
    parent: 'پاداش‌های اختصاصی (۵ نفر برتر پایه)',
    name: 'اولویت در ثبت‌نام رویدادها',
    minToken: 0,
    maxToken: 0,
    icon: 'در لحظه',
    color: '#F8A41D',
  },
  {
    parent: 'پاداش‌های اختصاصی (۵ نفر برتر پایه)',
    name: 'اولویت در تخصیص پروژه‌ها و فرصت‌های شغلی',
    minToken: 0,
    maxToken: 0,
    icon: 'در لحظه',
    color: '#F8A41D',
  },
  {
    parent: 'پاداش‌های اختصاصی (۵ نفر برتر پایه)',
    name: 'تخصیص فضای کار در خارج از زمان مدرسه',
    minToken: 0,
    maxToken: 0,
    icon: 'پایان هر ماه',
    color: '#F8A41D',
  },
  {
    parent: 'پاداش‌های اختصاصی (۵ نفر برتر پایه)',
    name: 'نمایش دائمی نمونه‌کارها در مدرسه',
    minToken: 0,
    maxToken: 0,
    icon: 'پایان هر ماه',
    color: '#F8A41D',
  },
  {
    parent: 'پاداش‌های اختصاصی (۵ نفر برتر پایه)',
    name: 'معرفی در فضای مجازی',
    minToken: 0,
    maxToken: 0,
    icon: '۱۵ بهمن / ۱۵ تیر',
    color: '#F8A41D',
  },
  {
    parent: 'پاداش‌های اختصاصی (۵ نفر برتر پایه)',
    name: 'شرکت در رویدادها و اردوهای ویژه',
    minToken: 0,
    maxToken: 0,
    icon: '۱۵ بهمن / ۱۵ تیر',
    color: '#F8A41D',
  },
  {
    parent: 'پاداش‌های اختصاصی (۵ نفر برتر پایه)',
    name: 'ثبت عکس در دیوار افتخارات',
    minToken: 0,
    maxToken: 0,
    icon: '۱۵ شهریور',
    color: '#F8A41D',
  },

  // ۳. پاداش نیکوکارانه (Charity Rewards)
  {
    parent: 'پاداش نیکوکارانه',
    name: 'کمک به انجام امور نیکوکارانه در مدرسه و خارج از مدرسه',
    minToken: 1,
    maxToken: null,
    icon: 'به میزان دلخواه',
    color: '#E0195B',
  },
];

async function main() {
  console.log('🔄 Syncing official Rokad Ka Rewards...');

  const tenants = await prisma.tenant.findMany();
  console.log(`Found ${tenants.length} tenants in database.`);

  for (const tenant of tenants) {
    console.log(`Updating rewards for tenant: ${tenant.name} (${tenant.slug})`);

    // First, remove existing default seed rewards to replace with official ones
    // Note: Don't break foreign keys if any student rewards exist, so we delete unused or update
    const existingClaims = await prisma.kaStudentReward.findMany({
      where: { tenantId: tenant.id },
      select: { rewardId: true },
    });
    const claimedRewardIds = new Set(existingClaims.map(c => c.rewardId));

    // Delete rewards that have no claims
    await prisma.kaReward.deleteMany({
      where: {
        tenantId: tenant.id,
        id: { notIn: Array.from(claimedRewardIds) },
      },
    });

    // Create the official rewards
    for (const rew of OFFICIAL_KA_REWARDS) {
      await prisma.kaReward.create({
        data: {
          tenantId: tenant.id,
          parent: rew.parent,
          name: rew.name,
          minToken: rew.minToken,
          maxToken: rew.maxToken,
          icon: rew.icon,
          color: rew.color,
        },
      });
    }
  }

  console.log('✅ Successfully synced official Ka Rewards across all tenants!');
}

main()
  .catch((e) => {
    console.error('❌ Error syncing rewards:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
