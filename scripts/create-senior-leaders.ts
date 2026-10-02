import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

function encryptWithPublicKey(publicKeyPem: string, plaintext: string): string {
  const buffer = Buffer.from(plaintext, 'utf8');
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    buffer,
  );
  return encrypted.toString('base64');
}

interface AccountConfig {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  boysPassword: string;
  girlsPassword: string;
}

const accountsToCreate: AccountConfig[] = [
  {
    firstName: 'علیرضا',
    lastName: 'عزیزپور (راهبر ارشد)',
    phone: '09154489820',
    email: 'alireza.azizpour@rokad.ir',
    boysPassword: 'b09154489820',
    girlsPassword: 'g09154489820',
  },
  {
    firstName: 'حامد',
    lastName: 'آرون (راهبر ارشد)',
    phone: '09151257100',
    email: 'hamed.aron@rokad.ir',
    boysPassword: 'b09151257100',
    girlsPassword: 'g09151257100',
  },
];

async function main() {
  console.log('🚀 Starting creation of Senior School Leaders (راهبر ارشد)...');

  const boysTenant = await prisma.tenant.findUnique({
    where: { slug: 'rokad-boys' },
  });
  if (!boysTenant) {
    throw new Error('Tenant rokad-boys not found in database!');
  }

  const girlsTenant = await prisma.tenant.findUnique({
    where: { slug: 'rokad-girls' },
  });
  if (!girlsTenant) {
    throw new Error('Tenant rokad-girls not found in database!');
  }

  console.log(`✓ Found Boys School: ${boysTenant.name} (${boysTenant.id})`);
  console.log(`✓ Found Girls School: ${girlsTenant.name} (${girlsTenant.id})`);

  for (const acc of accountsToCreate) {
    console.log(`\n========================================`);
    console.log(`Processing: ${acc.firstName} ${acc.lastName} (${acc.phone})`);
    console.log(`========================================`);

    // 1. Boys School Account
    const boysPasswordHash = await argon2.hash(acc.boysPassword);
    const boysEncryptedPassword = boysTenant.vaultPublicKey
      ? encryptWithPublicKey(boysTenant.vaultPublicKey, acc.boysPassword)
      : null;

    const boysUser = await prisma.user.upsert({
      where: {
        tenantId_phone: {
          tenantId: boysTenant.id,
          phone: acc.phone,
        },
      },
      update: {
        firstName: acc.firstName,
        lastName: acc.lastName,
        username: acc.phone,
        email: acc.email,
        passwordHash: boysPasswordHash,
        encryptedPassword: boysEncryptedPassword,
        role: UserRole.SCHOOL_ADMIN,
        isPlatformAdmin: true,
        status: UserStatus.ACTIVE,
      },
      create: {
        tenantId: boysTenant.id,
        firstName: acc.firstName,
        lastName: acc.lastName,
        phone: acc.phone,
        username: acc.phone,
        email: acc.email,
        passwordHash: boysPasswordHash,
        encryptedPassword: boysEncryptedPassword,
        role: UserRole.SCHOOL_ADMIN,
        isPlatformAdmin: true,
        status: UserStatus.ACTIVE,
      },
    });

    console.log(`✅ [Boys School] Created/Updated user: ${boysUser.firstName} ${boysUser.lastName} (ID: ${boysUser.id})`);
    console.log(`   Phone: ${boysUser.phone} | Password: ${acc.boysPassword} | Role: ${boysUser.role}`);

    // 2. Girls School Account
    const girlsPasswordHash = await argon2.hash(acc.girlsPassword);
    const girlsEncryptedPassword = girlsTenant.vaultPublicKey
      ? encryptWithPublicKey(girlsTenant.vaultPublicKey, acc.girlsPassword)
      : null;

    const girlsUser = await prisma.user.upsert({
      where: {
        tenantId_phone: {
          tenantId: girlsTenant.id,
          phone: acc.phone,
        },
      },
      update: {
        firstName: acc.firstName,
        lastName: acc.lastName,
        username: acc.phone,
        email: acc.email,
        passwordHash: girlsPasswordHash,
        encryptedPassword: girlsEncryptedPassword,
        role: UserRole.SCHOOL_ADMIN,
        isPlatformAdmin: true,
        status: UserStatus.ACTIVE,
      },
      create: {
        tenantId: girlsTenant.id,
        firstName: acc.firstName,
        lastName: acc.lastName,
        phone: acc.phone,
        username: acc.phone,
        email: acc.email,
        passwordHash: girlsPasswordHash,
        encryptedPassword: girlsEncryptedPassword,
        role: UserRole.SCHOOL_ADMIN,
        isPlatformAdmin: true,
        status: UserStatus.ACTIVE,
      },
    });

    console.log(`✅ [Girls School] Created/Updated user: ${girlsUser.firstName} ${girlsUser.lastName} (ID: ${girlsUser.id})`);
    console.log(`   Phone: ${girlsUser.phone} | Password: ${acc.girlsPassword} | Role: ${girlsUser.role}`);
  }

  console.log('\n🎉 All accounts successfully provisioned in both schools!');
}

main()
  .catch((err) => {
    console.error('❌ Error executing senior leaders provisioning:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
