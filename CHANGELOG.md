# Changelog

All notable changes to the **Rokad Platform** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
