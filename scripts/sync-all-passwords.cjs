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

function normalizeDigits(str) {
  if (!str) return '';
  return str
    .toString()
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .trim();
}

function stripLeadingZero(code) {
  if (!code) return '';
  const digits = normalizeDigits(code).replace(/\D/g, '');
  return digits.replace(/^0+/, '') || digits;
}

function getPrefix(tenant) {
  if (!tenant) return 'b';
  const slug = (tenant.slug || '').toLowerCase();
  const theme = (tenant.theme || '').toUpperCase();
  const name = (tenant.name || '').toLowerCase();
  if (slug.includes('girl') || slug.includes('dokhtar') || theme === 'FEMALE' || name.includes('دختر')) {
    return 'g';
  }
  if (slug.includes('college') || theme === 'COLLEGE' || name.includes('کالج')) {
    return 'c';
  }
  return 'b';
}

function determinePassword(user) {
  const role = user.role;
  const tenant = user.tenant;
  const prefix = getPrefix(tenant);

  // 1. Super Admin
  if (role === 'SUPER_ADMIN' || user.isPlatformAdmin || user.phone === '09120000000') {
    return 'RokadAdminPass2026!';
  }

  // 2. School Admin
  if (role === 'SCHOOL_ADMIN') {
    if (user.phone === '09121111112' || prefix === 'g') return 'RokadGirlsPass2026!';
    if (user.phone === '09121111111' || prefix === 'b') return 'RokadBoysPass2026!';
    return 'RokadAdminPass2026!';
  }

  // 3. Parent
  if (role === 'PARENT') {
    const username = (user.username || '').trim();
    if (username.startsWith('p')) {
      return username; // e.g. p960041362 or p929800273
    }
    const student = user.parentProfile?.studentLinks?.[0]?.student;
    const studentCode = student?.studentCode || student?.nationalCode;
    const stripped = stripLeadingZero(studentCode);
    if (stripped) {
      return `p${stripped}`;
    }
    const cleanPhone = normalizeDigits(user.phone).replace(/\D/g, '');
    if (cleanPhone) {
      return `p${cleanPhone}`;
    }
    return 'RokadParent2026!';
  }

  // 4. Student
  if (role === 'STUDENT') {
    const rawCode =
      user.studentProfile?.studentCode ||
      user.studentProfile?.nationalCode ||
      user.nationalId ||
      user.username;
    const stripped = stripLeadingZero(rawCode);
    if (stripped) {
      return `${prefix}${stripped}`; // e.g. b960041362 or g980153158
    }
    const cleanPhone = normalizeDigits(user.phone).replace(/\D/g, '');
    if (cleanPhone) {
      return cleanPhone;
    }
    return `${prefix}12345678`;
  }

  // 5. Teachers, Coaches, Staff
  const rawCode = user.nationalId || user.username;
  const stripped = stripLeadingZero(rawCode);
  if (stripped && stripped.length >= 8 && stripped.length <= 10 && !stripped.startsWith('9')) {
    return `${prefix}${stripped}`;
  }
  if (user.phone) {
    const cleanPhone = normalizeDigits(user.phone).replace(/\D/g, '');
    if (cleanPhone) return cleanPhone;
  }
  if (stripped) {
    return `${prefix}${stripped}`;
  }
  return role === 'COACH' ? 'RokadCoach2026!' : 'RokadStaff2026!';
}

async function main() {
  console.log('🔄 Connecting to database...');
  const users = await prisma.user.findMany({
    include: {
      tenant: true,
      studentProfile: true,
      parentProfile: {
        include: {
          studentLinks: {
            include: {
              student: true,
            },
          },
        },
      },
    },
  });

  console.log(`📋 Found ${users.length} total users in database.`);
  console.log('⚙️ Synchronizing all passwords according to official Rokad Platform rule...\n');

  const stats = {
    STUDENT: 0,
    PARENT: 0,
    TEACHER: 0,
    COACH: 0,
    STAFF: 0,
    ADMIN: 0,
    samples: [],
  };

  for (const user of users) {
    const password = determinePassword(user);
    const hash = await argon2.hash(password);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash },
    });

    if (user.role === 'STUDENT') stats.STUDENT++;
    else if (user.role === 'PARENT') stats.PARENT++;
    else if (user.role === 'TEACHER') stats.TEACHER++;
    else if (user.role === 'COACH') stats.COACH++;
    else if (user.role === 'STAFF') stats.STAFF++;
    else stats.ADMIN++;

    if (stats.samples.length < 15) {
      stats.samples.push({
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        role: user.role,
        identifier: user.username || user.phone,
        passwordFormula: password,
      });
    }
  }

  console.log('✅ All passwords synchronized successfully!');
  console.log('----------------------------------------');
  console.log(`👨‍🎓 دانش‌آموزان: ${stats.STUDENT}`);
  console.log(`👨‍👩‍👧 اولیاء: ${stats.PARENT}`);
  console.log(`👨‍🏫 دبیران: ${stats.TEACHER}`);
  console.log(`🧭 کوچ‌ها: ${stats.COACH}`);
  console.log(`💼 پرسنل و کادر: ${stats.STAFF}`);
  console.log(`🔑 مدیران: ${stats.ADMIN}`);
  console.log('----------------------------------------');
  console.log('\n🔍 نمونه کاربران به‌روزرسانی‌شده:');
  console.table(stats.samples);
}

main()
  .catch((e) => {
    console.error('❌ Error during synchronization:', e);
  })
  .finally(() => prisma.$disconnect());
