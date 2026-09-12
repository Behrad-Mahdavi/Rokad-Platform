import * as jalaali from 'jalaali-js';

const PERSIAN_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return '';
  return String(val).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[parseInt(d, 10)]);
}

export function normalizeDigits(str: string): string {
  if (!str) return '';
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(PERSIAN_DIGITS[i], 'g'), String(i));
  }
  return result;
}

/**
 * تبدیل رشته تاریخ شمسی به شیء Date میلادی استاندارد
 */
export function jalaliToGregorianDate(jalaliStr: string): Date {
  const normalized = normalizeDigits(jalaliStr.trim());
  const match = normalized.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!match) {
    const fallback = new Date(jalaliStr);
    if (!isNaN(fallback.getTime())) return fallback;
    throw new Error(`تاریخ شمسی نامعتبر است: ${jalaliStr}`);
  }

  const jy = parseInt(match[1], 10);
  const jm = parseInt(match[2], 10);
  const jd = parseInt(match[3], 10);

  // اگر ورودی از قبل سال میلادی باشد
  if (jy >= 1800) {
    return new Date(Date.UTC(jy, jm - 1, jd, 12, 0, 0));
  }

  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);
  return new Date(Date.UTC(gy, gm - 1, gd, 12, 0, 0));
}

/**
 * تبدیل تاریخ میلادی یا ISO به رشته استاندارد شمسی YYYY-MM-DD
 */
export function gregorianToJalaliStr(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  const parts = formatter.formatToParts(date);
  const gy = parseInt(parts.find((p) => p.type === 'year')!.value, 10);
  const gm = parseInt(parts.find((p) => p.type === 'month')!.value, 10);
  const gd = parseInt(parts.find((p) => p.type === 'day')!.value, 10);

  const { jy, jm, jd } = jalaali.toJalaali(gy, gm, gd);
  return `${jy}-${String(jm).padStart(2, '0')}-${String(jd).padStart(2, '0')}`;
}

/**
 * قالب‌بندی متنی خوانا برای نمایش در UI (مثلاً: ۱ مهر ۱۴۰۴)
 */
export function formatJalaliDisplay(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  const parts = formatter.formatToParts(date);
  const gy = parseInt(parts.find((p) => p.type === 'year')!.value, 10);
  const gm = parseInt(parts.find((p) => p.type === 'month')!.value, 10);
  const gd = parseInt(parts.find((p) => p.type === 'day')!.value, 10);

  const { jy, jm, jd } = jalaali.toJalaali(gy, gm, gd);
  return `${toPersianDigits(jd)} ${PERSIAN_MONTH_NAMES[jm - 1]} ${toPersianDigits(jy)}`;
}
