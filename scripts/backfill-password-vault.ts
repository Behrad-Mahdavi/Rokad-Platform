import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import {
  getTenantPasswordPrefix,
  stripLeadingZero,
  normalizeNationalCode,
} from '../src/common/utils/credential.util';
import { normalizePersianDigits } from '../src/common/utils/jalali.util';

const prisma = new PrismaClient();

function deriveAesKey(masterKey: string, salt: string): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256');
}

function encryptPrivateKey(privateKeyPem: string, aesKey: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
  let encrypted = cipher.update(privateKeyPem, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

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

async function ensureTenantVault(tenantId: string, initialMasterKey?: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) throw new Error(`Tenant ${tenantId} not found`);

  if (tenant.vaultPublicKey && tenant.vaultEncryptedPrivateKey) {
    return { publicKey: tenant.vaultPublicKey, masterKey: '(قبلاً تنظیم شده است)' };
  }

  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  const masterKey = initialMasterKey || `RokadVault@${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const salt = crypto.randomBytes(16).toString('hex');
  const aesKey = deriveAesKey(masterKey, salt);
  const vaultEncryptedPrivateKey = encryptPrivateKey(privateKey, aesKey);
  const vaultKeyHash = await argon2.hash(masterKey);

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      vaultPublicKey: publicKey,
      vaultEncryptedPrivateKey,
      vaultKeySalt: salt,
      vaultKeyHash,
      vaultKeyUpdatedAt: new Date(),
    },
  });

  return { publicKey, masterKey };
}

async function tryRecoverPlaintext(user: any, tenant: any): Promise<string | null> {
  const prefix = getTenantPasswordPrefix(tenant);
  const cleanNationalCode = normalizeNationalCode(user.nationalId);
  const strippedNational = stripLeadingZero(user.nationalId);
  const cleanPhone = normalizePersianDigits(user.phone).replace(/\D/g, '').trim();
  const cleanUsername = user.username?.trim();

  const candidates = new Set<string>();

  if (strippedNational) {
    candidates.add(`${prefix}${strippedNational}`);
    candidates.add(`b${strippedNational}`);
    candidates.add(`g${strippedNational}`);
    candidates.add(`c${strippedNational}`);
    candidates.add(`p${strippedNational}`);
    candidates.add(strippedNational);
  }

  if (cleanNationalCode) {
    candidates.add(`${prefix}${cleanNationalCode}`);
    candidates.add(cleanNationalCode);
    candidates.add(`p${cleanNationalCode}`);
  }

  if (cleanUsername) {
    candidates.add(cleanUsername);
    candidates.add(`${prefix}${cleanUsername}`);
    candidates.add(`p${cleanUsername}`);
    const strippedUsername = stripLeadingZero(cleanUsername);
    if (strippedUsername) {
      candidates.add(`${prefix}${strippedUsername}`);
      candidates.add(`p${strippedUsername}`);
      candidates.add(strippedUsername);
    }
  }

  if (cleanPhone) {
    candidates.add(cleanPhone);
    candidates.add(`p${cleanPhone}`);
    const strippedPhone = cleanPhone.replace(/^0+/, '');
    candidates.add(strippedPhone);
  }

  // Standard roles / defaults
  candidates.add('boysvice');
  candidates.add('girlsadmin');
  candidates.add('boyscoach');
  candidates.add('RokadPass2026!');
  candidates.add('RokadParent2026!');
  candidates.add('admin123456');
  candidates.add('admin');
  candidates.add('123456');
  candidates.add('password');

  for (const candidate of candidates) {
    try {
      const isValid = await argon2.verify(user.passwordHash, candidate);
      if (isValid) {
        return candidate;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

async function main() {
  console.log('🚀 Starting Password Vault Backfill...');

  const tenants = await prisma.tenant.findMany({
    where: { status: 'ACTIVE' },
  });

  console.log(`Found ${tenants.length} active tenants.`);

  for (const tenant of tenants) {
    console.log(`\n========================================`);
    console.log(`Processing Tenant: ${tenant.name} (${tenant.slug}) [${tenant.id}]`);

    // Let's use a clear master key for this tenant if not yet set
    const defaultKey = `RokadMaster@2026`;
    const { publicKey, masterKey } = await ensureTenantVault(tenant.id, defaultKey);

    console.log(`🔑 Master Key for Tenant [${tenant.name}]: ${masterKey}`);

    const users = await prisma.user.findMany({
      where: { tenantId: tenant.id },
    });

    let recovered = 0;
    let alreadyEncrypted = 0;
    let unrecovered = 0;

    for (const user of users) {
      if (user.encryptedPassword) {
        alreadyEncrypted++;
        continue;
      }

      const plaintext = await tryRecoverPlaintext(user, tenant);
      if (plaintext) {
        const encrypted = encryptWithPublicKey(publicKey, plaintext);
        await prisma.user.update({
          where: { id: user.id },
          data: { encryptedPassword: encrypted },
        });
        recovered++;
      } else {
        unrecovered++;
      }
    }

    console.log(`📊 Results: Total=${users.length}, Recovered=${recovered}, AlreadyEncrypted=${alreadyEncrypted}, Unrecovered=${unrecovered}`);
    const pct = users.length > 0 ? Math.round(((recovered + alreadyEncrypted) / users.length) * 100) : 0;
    console.log(`📈 Coverage: ${pct}%`);
  }

  console.log('\n✅ Backfill completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during backfill:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
