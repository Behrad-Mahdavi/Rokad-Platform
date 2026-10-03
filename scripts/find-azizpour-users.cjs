const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { phone: { contains: '09154489820' } },
          { username: { contains: '09154489820' } },
          { lastName: { contains: 'عزیزپور' } },
        ],
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        teacherProfile: true,
      },
    });

    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
