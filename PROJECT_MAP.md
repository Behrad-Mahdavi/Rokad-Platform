# نقشه پروژه پلتفرم رکاد (Rokad Platform Map)

## ۱. زمینه‌ی پروژه (Project Context)
* **هدف پلتفرم:** سیستم یکپارچه مدیریت مدارس و آموزشگاه‌ها (School ERP & Cloud LMS) با معماری چندمستأجری (Multi-Tenant).
* **کاربران اصلی:** سوپرادمین SaaS، مدیر مدرسه، کادر اجرایی، معلم، مشاور، دانش‌آموز، والد.
* **استک فنی:** 
  * بک‌اند: Node.js, NestJS, TypeScript, Prisma ORM
  * دیتابیس و کش: PostgreSQL 16 (RLS), Redis 7, MinIO (Object Storage)
  * ارتباطات بلادرنگ: Socket.io, BullMQ
  * فرانت‌اند: React, Vite, TailwindCSS, PWA
* **وضعیت فعلی:** در حال توسعه فعال و پایدارسازی (فازهای ۱ تا ۷ پیاده‌سازی شده).
* **نگرانی‌های کلیدی:** نشت داده بین تننت‌ها (Tenant Data Leakage)، امنیت تراکنش‌های مالی و شهریه، عملکرد بلادرنگ، پایداری توکن‌ها (Token Family).

## ۲. معماری کلی و جریان داده (Architecture & Data Flow)
1. **ورود درخواست (Request Entry):** کلاینت (فرانت‌اند وب/PWA) درخواست را ارسال می‌کند.
2. **تشخیص تننت (Tenant Resolution):** از طریق میدل‌ور/گارد (بررسی ساب‌دامین، هدر `x-tenant-slug` یا توکن JWT). تنظیم در `AsyncLocalStorage`.
3. **احراز هویت و دسترسی (Auth & RBAC):** اعتبارسنجی JWT، بررسی `Token Family` (جلوگیری از استفاده مجدد)، بررسی دسترسی‌ها (`RolesGuard`، بررسی پرمیشن‌ها در `UserPermissionOverride`).
4. **لایه سرویس (Business Logic):** کنترلرها درخواست را به سرویس‌ها می‌دهند.
5. **لایه داده (Data Access):** 
   * **Prisma Extension:** تزریق خودکار `tenantId` به کوئری‌ها.
   * **PostgreSQL RLS:** اعمال سیاست‌های لایه سطر برای ایزولاسیون کامل.
6. **عملیات غیرهمگام (Async Operations):** ارسال رویدادها (EventEmitter) برای لاگین امنیتی (Audit Log)، نوتیفیکیشن‌ها و پیامک.

## ۳. ماژول‌ها و وظایف (Modules & Responsibilities)
سیستم شامل ۳۱ ماژول اصلی در مسیر `src/modules` است:

* **هسته و امنیت:**
  * `tenants`: مدیریت اطلاعات تننت‌ها (مدارس).
  * `saas-admin`: راهبری پلتفرم، ثبت‌نام مدرسه، Impersonation.
  * `auth`: مدیریت ورود، 2FA، توکن‌ها و گاوصندوق رمز.
  * `rbac`: مدیریت نقش‌ها و پرمیشن‌های دانه‌ای.
  * `audit-log`: ثبت و لنگرگذاری (Anchoring) رویدادهای امنیتی.
* **عملیات مدرسه (ERP):**
  * `academic`, `classes`: دوره‌ها، کلاس‌ها، زمان‌بندی.
  * `members`, `profiles`: مدیریت کاربران و پروفایل‌های اجتماعی.
  * `attendance`, `calendar`: حضور و غیاب، مناسبت‌ها.
  * `matters`, `parent-visits`, `polls`: امور انضباطی، ملاقات اولیا، نظرسنجی.
* **آموزش و آزمون (LMS):**
  * `question-bank`, `exams`, `gradebook`: آزمون‌ها، بانک سوال و کارنامه/دفتر نمره.
  * `lesson-plans`, `learning-materials`: طرح درس و فایل‌های آموزشی.
* **مالی و اداری:**
  * `finance`: برنامه‌های شهریه، پرداخت‌ها، اقساط، چک صیادی.
  * `payroll`: قرارداد معلمان، فیش حقوقی.
* **ارتباطات:**
  * `chat`, `messages`, `notifications`, `sms`: چت زنده، کارتابل نامه، پوش نوتیفیکیشن، پیامک.
* **گیمیفیکیشن:**
  * `ka`, `club`: اقتصاد مدرسه، فعالیت‌ها، لیدربورد و باشگاه‌ها.

## ۴. مسیرهای حیاتی (Critical Paths)
1. **Auth & Session Path:** `auth.controller.ts` -> بررسی رمز/2FA -> تولید توکن و ثبت در `RefreshTokenFamily` (حساس به سرقت توکن).
2. **Tenant Resolution Path:** دریافت درخواست -> مقداردهی متغیر محلی -> اعمال اکستنشن پریزما (حیاتی برای امنیت داده).
3. **Financial Transaction Path:** `fee-payment.service.ts` -> محاسبه اقساط/جریمه دیرکرد -> ثبت تراکنش (نیازمند تضمین ACID تراکنش‌های دیتابیس).
4. **Audit Logging Path:** هر عملیات `CREATE/UPDATE/DELETE` حساس -> شلیک رویداد -> ذخیره لاگ با محاسبه هش قبلی (زنجیره تغییرناپذیر).

## ۵. وابستگی‌های کلیدی بین ماژول‌ها
* ماژول `auth` به `users` (در `members`)، `rbac` و `tenants` گره خورده است.
* ماژول `finance` به `members` (برای دانش‌آموزان و والدین) وابستگی شدید دارد.
* ماژول‌های آموزشی (`gradebook`, `attendance`) وابستگی کامل به `classes` و `academic` دارند.
* تمام ماژول‌ها برای ثبت تغییرات به `audit-log` و برای اطلاع‌رسانی به `notifications`/`sms` وابسته هستند (عمدتاً از طریق Event Emitter برای کاهش کلاپینگ).
