import {
  getTenantPasswordPrefix,
  normalizeNationalCode,
  generateUnifiedCredentials,
  deriveStudentCode,
} from './credential.util';

describe('Unified Credential Generation System (سامانه ورود یکپارچه)', () => {
  describe('Tenant Password Prefix Resolution', () => {
    it('returns "b" for boys school via slug, theme, or name', () => {
      expect(getTenantPasswordPrefix({ slug: 'rokad-boys' })).toBe('b');
      expect(getTenantPasswordPrefix({ theme: 'MALE' })).toBe('b');
      expect(getTenantPasswordPrefix({ name: 'هنرستان پسرانه رُکاد' })).toBe('b');
    });

    it('returns "g" for girls school via slug, theme, or name', () => {
      expect(getTenantPasswordPrefix({ slug: 'rokad-girls' })).toBe('g');
      expect(getTenantPasswordPrefix({ theme: 'FEMALE' })).toBe('g');
      expect(getTenantPasswordPrefix({ name: 'هنرستان فنی دخترانه رُکاد' })).toBe('g');
    });

    it('returns "c" for college via slug, theme, or type', () => {
      expect(getTenantPasswordPrefix({ slug: 'rokad-college' })).toBe('c');
      expect(getTenantPasswordPrefix({ theme: 'COLLEGE' })).toBe('c');
      expect(getTenantPasswordPrefix({ type: 'COLLEGE' })).toBe('c');
      expect(getTenantPasswordPrefix({ name: 'کالج فناوری رُکاد' })).toBe('c');
    });

    it('falls back to "b" if tenant context is missing or unspecified', () => {
      expect(getTenantPasswordPrefix(null)).toBe('b');
      expect(getTenantPasswordPrefix({})).toBe('b');
    });
  });

  describe('National Code Normalization', () => {
    it('normalizes Persian digits and removes whitespace/hyphens', () => {
      expect(normalizeNationalCode('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
      expect(normalizeNationalCode(' 001-234567-8 ')).toBe('0012345678');
      expect(normalizeNationalCode(undefined)).toBe('');
      expect(normalizeNationalCode(null)).toBe('');
    });
  });

  describe('Unified Credentials Auto-Generation', () => {
    it('generates username=nationalCode and password=b+nationalCode for boys school', () => {
      const creds = generateUnifiedCredentials({
        tenant: { slug: 'rokad-boys', theme: 'MALE' },
        nationalCode: '۰۱۲۳۴۵۶۷۸۹',
        fallbackPhone: '09121111111',
      });

      expect(creds.username).toBe('0123456789');
      expect(creds.nationalId).toBe('0123456789');
      expect(creds.prefix).toBe('b');
      expect(creds.defaultPassword).toBe('b0123456789');
      expect(creds.finalPassword).toBe('b0123456789');
    });

    it('generates username=nationalCode and password=g+nationalCode for girls school', () => {
      const creds = generateUnifiedCredentials({
        tenant: { slug: 'rokad-girls', theme: 'FEMALE' },
        nationalCode: '0023456789',
        fallbackPhone: '09122222222',
      });

      expect(creds.username).toBe('0023456789');
      expect(creds.prefix).toBe('g');
      expect(creds.defaultPassword).toBe('g0023456789');
      expect(creds.finalPassword).toBe('g0023456789');
    });

    it('generates username=nationalCode and password=c+nationalCode for college', () => {
      const creds = generateUnifiedCredentials({
        tenant: { slug: 'rokad-college', theme: 'COLLEGE' },
        nationalCode: '0034567890',
      });

      expect(creds.username).toBe('0034567890');
      expect(creds.prefix).toBe('c');
      expect(creds.defaultPassword).toBe('c0034567890');
      expect(creds.finalPassword).toBe('c0034567890');
    });

    it('respects customPassword if explicitly provided', () => {
      const creds = generateUnifiedCredentials({
        tenant: { slug: 'rokad-boys' },
        nationalCode: '0012345678',
        customPassword: 'MyCustomPass123!',
      });

      expect(creds.username).toBe('0012345678');
      expect(creds.defaultPassword).toBe('b0012345678');
      expect(creds.finalPassword).toBe('MyCustomPass123!');
    });
  });

  describe('Student Code Derivation (شماره دانش‌آموزی = کد ملی بدون صفر)', () => {
    it('strips leading zeros from 10-digit national code', () => {
      expect(deriveStudentCode('0012345678')).toBe('12345678');
      expect(deriveStudentCode('۰۱۲۳۴۵۶۷۸۹')).toBe('123456789');
      expect(deriveStudentCode('0923456789')).toBe('923456789');
    });

    it('keeps national code unchanged if there are no leading zeros', () => {
      expect(deriveStudentCode('1234567890')).toBe('1234567890');
    });

    it('falls back to phone number without leading zero if national code is absent', () => {
      expect(deriveStudentCode(null, '09123456789')).toBe('9123456789');
    });
  });
});
