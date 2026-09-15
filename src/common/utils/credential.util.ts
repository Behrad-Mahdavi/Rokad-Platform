import { normalizePersianDigits } from './jalali.util';

export interface TenantCredentialContext {
  slug?: string | null;
  theme?: string | null;
  type?: string | null;
  name?: string | null;
}

/**
 * تعیین پیش‌وند رمز عبور بر اساس نوع شعبه مرکز آموزشی:
 * - 'b' برای هنرستان پسرانه (Boys)
 * - 'g' برای هنرستان دخترانه (Girls)
 * - 'c' برای کالج رُکاد (College)
 */
export function getTenantPasswordPrefix(
  tenant?: TenantCredentialContext | null,
): 'b' | 'g' | 'c' {
  if (!tenant) return 'b';

  const slug = (tenant.slug || '').toLowerCase();
  const theme = (tenant.theme || '').toUpperCase();
  const name = (tenant.name || '').toLowerCase();
  const type = (tenant.type || '').toUpperCase();

  // 1. Girls School
  if (
    slug.includes('girl') ||
    slug.includes('dokhtar') ||
    theme === 'FEMALE' ||
    name.includes('دختر')
  ) {
    return 'g';
  }

  // 2. College
  if (
    slug.includes('college') ||
    theme === 'COLLEGE' ||
    type === 'COLLEGE' ||
    name.includes('کالج')
  ) {
    return 'c';
  }

  // 3. Boys School (default fallback for vocational boys)
  if (
    slug.includes('boy') ||
    slug.includes('pesar') ||
    theme === 'MALE' ||
    name.includes('پسر')
  ) {
    return 'b';
  }

  return 'b';
}

/**
 * نرمال‌سازی کد ملی (تبدیل ارقام فارسی/عربی، حذف فواصل و کاراکترهای غیرعددی)
 */
export function normalizeNationalCode(
  code?: string | number | null,
): string {
  if (code === null || code === undefined) return '';
  const digitsOnly = normalizePersianDigits(code).replace(/\D/g, '');
  return digitsOnly.trim();
}

/**
 * تولید خودکار نام کاربری و رمز عبور یکپارچه:
 * - نام کاربری = کد ملی (۱۰ رقمی)
 * - رمز عبور = پیش‌وند شعبه (b / g / c) + کد ملی
 */
export function generateUnifiedCredentials(params: {
  tenant?: TenantCredentialContext | null;
  nationalCode?: string | number | null;
  fallbackPhone?: string | number | null;
  customPassword?: string | null;
}): {
  username: string;
  nationalId?: string;
  defaultPassword: string;
  finalPassword: string;
  prefix: 'b' | 'g' | 'c';
} {
  const prefix = getTenantPasswordPrefix(params.tenant);
  const cleanNationalCode = normalizeNationalCode(params.nationalCode);
  const cleanPhone = normalizePersianDigits(params.fallbackPhone).replace(/\D/g, '').trim();

  const username = cleanNationalCode || cleanPhone || `user_${Date.now()}`;
  const defaultPassword = cleanNationalCode ? `${prefix}${cleanNationalCode}` : (cleanPhone || 'RokadPass2026!');
  const finalPassword = params.customPassword?.trim() ? params.customPassword.trim() : defaultPassword;

  return {
    username,
    nationalId: cleanNationalCode || undefined,
    defaultPassword,
    finalPassword,
    prefix,
  };
}
