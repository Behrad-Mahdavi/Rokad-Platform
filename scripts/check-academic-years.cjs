const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const years = await prisma.academicYear.findMany({
      include: {
        tenant: { select: { id: true, name: true, type: true } }
      }
    });
    console.log('--- ACADEMIC YEARS ---');
    console.log(JSON.stringify(years, null, 2));

    const classrooms = await prisma.classroom.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        academicYearId: true,
        academicYear: { select: { id: true, name: true } },
        tenant: { select: { id: true, name: true } }
      }
    });
    console.log('--- CLASSROOMS ---');
    console.log(JSON.stringify(classrooms, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
