const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "LessonType" ADD VALUE IF NOT EXISTS 'EXTRACURRICULAR';`);
    console.log("Successfully added 'EXTRACURRICULAR' to LessonType enum!");
  } catch (err) {
    console.error("Error updating enum:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
