-- Update School Leaders and Vice Principals for Rokad Boys and Girls

BEGIN;

-- 1. Boys School - راهبر پسرانه (امیرحسین امیریان)
UPDATE "User"
SET 
  "firstName" = 'امیرحسین',
  "lastName" = 'امیریان (راهبر پسرانه)',
  "phone" = '09101654176',
  "username" = '09101654176',
  "updatedAt" = NOW()
WHERE "tenantId" = (SELECT id FROM "Tenant" WHERE slug = 'rokad-boys')
  AND ("role" = 'SCHOOL_ADMIN' OR "username" = 'boysadmin' OR "phone" = '09121111111');

-- 2. Girls School - راهبر دخترانه (رویا دولت‌آبادی)
UPDATE "User"
SET 
  "firstName" = 'رویا',
  "lastName" = 'دولت‌آبادی (راهبر دخترانه)',
  "phone" = '09307966319',
  "username" = '09307966319',
  "updatedAt" = NOW()
WHERE "tenantId" = (SELECT id FROM "Tenant" WHERE slug = 'rokad-girls')
  AND ("role" = 'SCHOOL_ADMIN' OR "username" = 'girlsadmin' OR "phone" = '09121111112');

-- 3. Boys School - معاون پسرانه (عماد پورحسنی)
UPDATE "User"
SET 
  "firstName" = 'عماد',
  "lastName" = 'پورحسنی (معاون پسرانه)',
  "phone" = '09021600933',
  "username" = '09021600933',
  "updatedAt" = NOW()
WHERE "tenantId" = (SELECT id FROM "Tenant" WHERE slug = 'rokad-boys')
  AND ("role" = 'STAFF' OR "username" = 'boysvice' OR "phone" = '09121111119');

-- 4. Girls School - معاون دخترانه (مبینا فلاح)
UPDATE "User"
SET 
  "firstName" = 'مبینا',
  "lastName" = 'فلاح (معاون دخترانه)',
  "phone" = '09150747096',
  "username" = '09150747096',
  "updatedAt" = NOW()
WHERE "tenantId" = (SELECT id FROM "Tenant" WHERE slug = 'rokad-girls')
  AND ("role" = 'STAFF' OR "username" = 'girlsvice' OR "phone" = '09122221112');

COMMIT;
