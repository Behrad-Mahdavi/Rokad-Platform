const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    await prisma.$connect();
    const count = await prisma.user.count();
    console.log('Database connected successfully! Total users count:', count);
    const tenantCount = await prisma.tenant.count();
    console.log('Total tenants count:', tenantCount);
  } catch (err) {
    console.error('Database connection failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
