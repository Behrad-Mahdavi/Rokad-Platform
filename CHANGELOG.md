# Changelog

All notable changes to the **Rokad Platform** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.7.12] - 2026-09-21

### 🚀 Added
- **سیستم مدیریت نسخه و انتشار پلتفرم (Release Versioning & PWA Auto-Update):**
  - تزریق خودکار نسخه در زمان کامپایل (`__APP_VERSION__` و `__BUILD_TIME__`) در Vite و خواندن مستقیم از `package.json` ریشه.
  - اندپوینت عمومی `GET /api/v1/version` برای استعلام سبک وضعیت نسخه، تاریخ بیلد و محیط ران‌تایم سرور.
  - هوک کلاینت `useAppVersionCheck` با پولینگ دوره‌ای ۵ دقیقه‌ای و استعلام در رویداد فوکوس مجدد تب مرورگر (`window onfocus` / `visibilitychange`).
  - ارتقای مؤلفه `PwaUpdatePrompt` با شناسایی ناهماهنگی نسخه و ارائه دکمه فورس‌آپدیت برای اجرای `skipWaiting()`، پاکسازی کش منسوخ مرورگر و بارگذاری مجدد.
  - الصاق خودکار هدر `X-App-Version` در تمام درخواست‌های Axios کلاینت و استخراج در فیلتر خطای سرور (`HttpExceptionFilter`) و متادیتای `AuditLog`.
  - اسکریپت `scripts/sync-version.js` (`npm run version:sync`) جهت تضمین همگام‌سازی دائمی شماره نسخه در ریشه و فرانت‌اند.
- **پلتفرم گیمیفیکیشن و توسعه مهارتی «کا» (Ka Platform):**
  - بازطراحی نئوبروتالیسم اسلایدرهای ۴ حوزه ارزیابی کا (آموزشی ۵۸۰، داوطلبانه ۳۶۰، شغلی ۲۳۵ و کسر انضباطی) همراه با جدول فرمول‌های محاسباتی هر ۲۲ فعالیت.
  - باتم‌شیت مودال اختصاصی بازشونده از پایین (Bottom Sheet Modal) در جدول رتبه‌بندی و سکوی افتخار (Top 3 Podium) با کلیک روی هر هنرجو.
  - تفکیک نقش‌ها و جریان ثبت فعالیت‌های شغلی برای دانش‌آموزان و میز ارزیابی و ثبت مستقیم نمره برای کادر مدرسه.

### 🛡️ Security & Observability
- ردیابی نسخه کلاینت روی خطاهای سرور و زنجیره رخدادهای امنیتی Audit Log جهت تسهیل دیباگ و شناسایی خطاهای کاربران دارای نسخه‌های قدیمی PWA.
- مجازسازی هدر `X-App-Version` در پیکربندی CORS بک‌اند.

---

## [1.0.0] - 2026-09-19

### 🚀 Added
- **Enterprise Zero-Trust Security Suite:**
  - RFC 6238 compliant Two-Factor Authentication (2FA TOTP) with QR generation and recovery codes.
  - Step-Up Authentication (`StepUpGuard`) for high-privilege operations (permission escalation, user deletion, financial settlements).
  - AES-256-GCM Envelope Encryption for sensitive PII data with per-record Data Encryption Keys (DEK).
  - HMAC-SHA256 Blind Indexing with secret pepper for sub-millisecond query performance over encrypted national codes and phones.
  - Cryptographic Chained Audit Logs (Blockchain-like SHA-256 Previous Hash linking) with external anchoring to Telegram channels.
  - Distributed Sliding-Window Anti-Brute-Force rate limiter backed by Redis.
- **Financial & Treasury Engine:**
  - Complete migration to Prisma `Decimal(15, 2)` for floating-point error elimination.
  - Dynamic `balanceRemaining` tracking on fee contracts.
  - Annual `FeePlan` model with configurable scopes (`ALL_SCHOOL`, `EDUCATIONAL_LEVEL`, `CLASSROOM`) and atomic group debt allocation.
  - Comprehensive Sayad Cheque Ledger with 16-digit ID validation, status lifecycle (`PENDING`, `CASHED`, `BOUNCED`, `REPLACED`), and automatic `hasFinancialHold` flag on bounced cheques.
  - Automated daily Cheque Reminder Scheduler at 09:00 AM for 3-day, 1-day, and due-day alerts.
  - Two-stage Excel batch import with server-side error validation and preview before commit.
  - Zarinpal online gateway integration with cryptographic idempotency and automatic receipt generation.
- **Multi-Tenant SaaS Operations:**
  - Two-tier tenant isolation (Prisma Client Extension + PostgreSQL Row-Level Security).
  - SuperAdmin platform operations console with live CPU, RAM, Redis, MinIO, and database health metrics.
  - Tenant provisioning, subscription plan assignments, and custom branding engine.
- **Next-Gen Academic & LMS Engine:**
  - Course curriculums, lesson plans, class enrollments, and schedule conflict resolution.
  - Automated gradebook with weighted continuous assessments and PDF report card generator.
  - Online exam engine with multiple-choice / descriptive question bank and timer enforcement.
  - Homework assignment submission portal backed by MinIO S3 object storage.
- **Realtime Communications & PWA:**
  - WebSocket multi-room chat powered by Socket.io and `@socket.io/redis-adapter`.
  - WebPush notifications via standard VAPID protocol.
  - Offline-first Progressive Web App (PWA) manifest with service worker caching.
  - Multi-child Parent Portal with direct Zarinpal checkout and cheque status monitoring.

### 🛡️ Security
- Timing-safe comparisons (`crypto.timingSafeEqual`) on all authentication tokens and webhook signatures.
- Principle of least privilege enforced via fine-grained RBAC permissions catalog.
- Helmet HTTP security headers and CORS protection with strict origin whitelisting.
