const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const prisma = new PrismaClient();

async function run() {
  const [boysAdmin, girlsAdmin, superAdmin, common] = await Promise.all([
    argon2.hash('RokadBoysPass2026!'),
    argon2.hash('RokadGirlsPass2026!'),
    argon2.hash('RokadAdminPass2026!'),
    argon2.hash('RokadPass2026!'),
  ]);

  let count = 0;
  count += (await prisma.user.updateMany({ where: { phone: '09121111111' }, data: { passwordHash: boysAdmin } })).count;
  count += (await prisma.user.updateMany({ where: { phone: '09121111112' }, data: { passwordHash: girlsAdmin } })).count;
  count += (await prisma.user.updateMany({ where: { phone: '09120000000' }, data: { passwordHash: superAdmin } })).count;
  count += (await prisma.user.updateMany({
    where: { phone: { notIn: ['09121111111', '09121111112', '09120000000'] } },
    data: { passwordHash: common },
  })).count;

  console.log('DONE_RESET', count);
}

run().finally(() => prisma.$disconnect());
