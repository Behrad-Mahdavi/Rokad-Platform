import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Rokad Platform Comprehensive Database Seeding...');

  // 1. Seed Core Feature Flags
  console.log('📦 1. Seeding Core Feature Flags...');
  const featureFlags = [
    {
      key: 'academic_attendance',
      name: 'سامانه حضور و غیاب هوشمند',
      description: 'ثبت تردد روزانه دانش‌آموزان و ارسال اعلان به والدین',
      category: 'ERP_ACADEMIC',
      defaultEnabled: true,
    },
    {
      key: 'academic_homework',
      name: 'مدیریت و تصحیح تکالیف',
      description: 'امکان تعریف، تحویل و نمره‌دهی به تکالیف درسی',
      category: 'ERP_ACADEMIC',
      defaultEnabled: true,
    },
    {
      key: 'lms_question_bank',
      name: 'بانک سوالات و آزمون‌ساز',
      description: 'طراحی آزمون و دسته‌بندی سوالات تستی و تشریحی',
      category: 'LMS',
      defaultEnabled: true,
    },
    {
      key: 'lms_online_exam',
      name: 'موتور آزمون آنلاین',
      description: 'برگزاری امتحانات آنلاین با تصحیح خودکار و ضدتقلب',
      category: 'LMS',
      defaultEnabled: true,
    },
    {
      key: 'live_chat',
      name: 'پیام‌رسان و چت درون‌برنامه‌ای',
      description: 'چت کلاسی، گفتگوی معلم با دانش‌آموز و والدین',
      category: 'LIVE_COMMUNICATION',
      defaultEnabled: true,
    },
    {
      key: 'live_online_class',
      name: 'کلاس آنلاین و وبینار',
      description: 'اتصال به بیگ‌بلوباتن و جیتسی جهت پخش زنده کلاس',
      category: 'LIVE_COMMUNICATION',
      defaultEnabled: true,
    },
    {
      key: 'finance_fee_engine',
      name: 'مدیریت شهریه و اقساط',
      description: 'محاسبه شهریه، ثبت فیش، اقساط‌بندی و پرداخت آنلاین',
      category: 'FINANCE',
      defaultEnabled: true,
    },
    {
      key: 'finance_payroll',
      name: 'حقوق و دستمزد اساتید و پرسنل',
      description: 'محاسبه کارکرد ساعتی، فیش حقوقی و تسویه‌حساب',
      category: 'FINANCE',
      defaultEnabled: true,
    },
    {
      key: 'ka_system',
      name: 'سیستم کا و تنظیمات پیشرفته',
      description: 'ماژول سیستم کا و امتیازدهی اختصاصی رُکاد',
      category: 'FINANCE_KA',
      defaultEnabled: true,
    },
  ];

  for (const flag of featureFlags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: flag,
      create: flag,
    });
  }

  // 2. Seed System Permissions (Phase 2)
  console.log('🛡️ 2. Seeding System Permissions...');
  const permissions = [
    // Academic & Classes
    { code: 'academic.year.read', module: 'ERP_ACADEMIC', name: 'مشاهده سال‌های تحصیلی' },
    { code: 'academic.year.write', module: 'ERP_ACADEMIC', name: 'ایجاد و ویرایش سال تحصیلی' },
    { code: 'academic.level.write', module: 'ERP_ACADEMIC', name: 'مدیریت مقاطع تحصیلی' },
    { code: 'academic.field.write', module: 'ERP_ACADEMIC', name: 'مدیریت رشته‌های تحصیلی' },
    { code: 'lesson.read', module: 'ERP_ACADEMIC', name: 'مشاهده دروس و کتاب‌ها' },
    { code: 'lesson.write', module: 'ERP_ACADEMIC', name: 'تعریف و ویرایش دروس' },
    { code: 'classroom.read', module: 'ERP_ACADEMIC', name: 'مشاهده کلاس‌های درس' },
    { code: 'classroom.write', module: 'ERP_ACADEMIC', name: 'ایجاد و ویرایش کلاس درس' },
    { code: 'schedule.read', module: 'ERP_ACADEMIC', name: 'مشاهده برنامه هفتگی' },
    { code: 'schedule.write', module: 'ERP_ACADEMIC', name: 'تنظیم و ویرایش برنامه هفتگی' },
    { code: 'enrollment.write', module: 'ERP_ACADEMIC', name: 'ثبت‌نام و کلاس‌بندی دانش‌آموزان' },

    // Members Directory
    { code: 'student.read', module: 'ERP_MEMBERS', name: 'مشاهده پرونده دانش‌آموزان' },
    { code: 'student.write', module: 'ERP_MEMBERS', name: 'ثبت و ویرایش دانش‌آموزان' },
    { code: 'teacher.read', module: 'ERP_MEMBERS', name: 'مشاهده لیست معلمان' },
    { code: 'teacher.write', module: 'ERP_MEMBERS', name: 'ثبت و ویرایش معلمان' },
    { code: 'coach.read', module: 'ERP_MEMBERS', name: 'مشاهده مربیان و مشاوران' },
    { code: 'coach.write', module: 'ERP_MEMBERS', name: 'ثبت و ویرایش مربیان' },
    { code: 'staff.read', module: 'ERP_MEMBERS', name: 'مشاهده پرسنل اداری' },
    { code: 'staff.write', module: 'ERP_MEMBERS', name: 'ثبت و ویرایش پرسنل' },
    { code: 'parent.read', module: 'ERP_MEMBERS', name: 'مشاهده پرونده اولیا' },
    { code: 'parent.write', module: 'ERP_MEMBERS', name: 'ثبت و ویرایش اولیا' },
    { code: 'parent.student.link', module: 'ERP_MEMBERS', name: 'پیوند والد و دانش‌آموز' },

    // Roles & RBAC
    { code: 'role.read', module: 'RBAC', name: 'مشاهده نقش‌های مدرسه' },
    { code: 'role.write', module: 'RBAC', name: 'ایجاد و ویرایش نقش‌ها' },
    { code: 'role.assign', module: 'RBAC', name: 'تخصیص نقش سازمانی به کاربران' },

    // Profiles & Blogs
    { code: 'school.profile.write', module: 'PROFILE', name: 'ویرایش مشخصات عمومی مدرسه' },
    { code: 'blog.write', module: 'PROFILE', name: 'نگارش مقاله در وبلاگ مدرسه' },
    { code: 'blog.publish', module: 'PROFILE', name: 'انتشار و تایید مقالات' },

    // Daily Operations
    { code: 'attendance.read', module: 'OPERATIONS', name: 'مشاهده آمار حضور و غیاب' },
    { code: 'attendance.write', module: 'OPERATIONS', name: 'ثبت حضور و غیاب کلاسی' },
    { code: 'homework.read', module: 'OPERATIONS', name: 'مشاهده تکالیف' },
    { code: 'homework.write', module: 'OPERATIONS', name: 'تعریف و نمره‌دهی تکلیف' },
    { code: 'calendar.write', module: 'OPERATIONS', name: 'مدیریت تقویم و رویدادها' },

    // LMS & Grades
    { code: 'exam.read', module: 'LMS', name: 'مشاهده آزمون‌ها' },
    { code: 'exam.write', module: 'LMS', name: 'طراحی آزمون و سوالات' },
    { code: 'grades.read', module: 'LMS', name: 'مشاهده کارنامه و نمرات' },
    { code: 'grades.write', module: 'LMS', name: 'ثبت و نهایی‌سازی نمرات' },

    // Finance & HR
    { code: 'finance.fee.read', module: 'FINANCE', name: 'مشاهده وضعیت شهریه دانش‌آموزان' },
    { code: 'finance.fee.write', module: 'FINANCE', name: 'ثبت فیش و تقسیط شهریه' },
    { code: 'finance.payroll.read', module: 'FINANCE', name: 'مشاهده فیش‌های حقوقی' },
    { code: 'finance.payroll.write', module: 'FINANCE', name: 'محاسبه و صدور حقوق' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: perm,
      create: perm,
    });
  }

  // 3. Seed Platform Root Tenant & Global SuperAdmin
  console.log('👑 3. Seeding Platform Root Tenant & Super Admin...');
  const platformTenant = await prisma.tenant.upsert({
    where: { slug: 'platform-root' },
    update: {
      name: 'مرکز مدیریت پلتفرم رُکاد',
      type: 'PLATFORM',
      theme: 'ECOSYSTEM',
      status: 'ACTIVE',
    },
    create: {
      name: 'مرکز مدیریت پلتفرم رُکاد',
      slug: 'platform-root',
      subdomain: 'admin',
      type: 'PLATFORM',
      theme: 'ECOSYSTEM',
      status: 'ACTIVE',
      email: 'admin@rokadschool.ir',
      phone: '09120000000',
    },
  });

  const superAdminPasswordHash = await argon2.hash('RokadAdminPass2026!');
  await prisma.user.upsert({
    where: {
      tenantId_phone: {
        tenantId: platformTenant.id,
        phone: '09120000000',
      },
    },
    update: {
      passwordHash: superAdminPasswordHash,
      isPlatformAdmin: true,
      role: 'SUPER_ADMIN',
    },
    create: {
      tenantId: platformTenant.id,
      firstName: 'مدیر کل',
      lastName: 'پلتفرم رُکاد',
      phone: '09120000000',
      email: 'admin@rokadschool.ir',
      username: 'superadmin',
      passwordHash: superAdminPasswordHash,
      role: 'SUPER_ADMIN',
      isPlatformAdmin: true,
      status: 'ACTIVE',
    },
  });

  // 4. Seed Rokad Boys School Tenant
  console.log('👦 4. Seeding Rokad Boys School Structure & Members...');
  const boysTenant = await prisma.tenant.upsert({
    where: { slug: 'rokad-boys' },
    update: {
      name: 'مجموعه مدارس هوشمند رُکاد — شعبه پسرانه',
      type: 'SCHOOL',
      theme: 'MALE',
      subdomain: 'boys',
      status: 'ACTIVE',
    },
    create: {
      name: 'مجموعه مدارس هوشمند رُکاد — شعبه پسرانه',
      slug: 'rokad-boys',
      subdomain: 'boys',
      type: 'SCHOOL',
      theme: 'MALE',
      status: 'ACTIVE',
      email: 'boys@rokadschool.ir',
      phone: '09121111111',
      address: 'تهران، مجتمع آموزشی رُکاد پسرانه',
    },
  });

  const boysAdminPasswordHash = await argon2.hash('RokadBoysPass2026!');
  const boysAdmin = await prisma.user.upsert({
    where: {
      tenantId_phone: {
        tenantId: boysTenant.id,
        phone: '09121111111',
      },
    },
    update: {
      passwordHash: boysAdminPasswordHash,
      role: 'SCHOOL_ADMIN',
    },
    create: {
      tenantId: boysTenant.id,
      firstName: 'علیرضا',
      lastName: 'احمدی (مدیر پسرانه)',
      phone: '09121111111',
      email: 'boys-admin@rokadschool.ir',
      username: 'boysadmin',
      passwordHash: boysAdminPasswordHash,
      role: 'SCHOOL_ADMIN',
      status: 'ACTIVE',
    },
  });

  // 5. Seed Academic Structure for Boys School
  const academicYear = await prisma.academicYear.upsert({
    where: {
      tenantId_name: {
        tenantId: boysTenant.id,
        name: '۱۴۰۴-۱۴۰۵',
      },
    },
    update: { isCurrent: true },
    create: {
      tenantId: boysTenant.id,
      name: '۱۴۰۴-۱۴۰۵',
      startDate: new Date('2025-09-23T00:00:00.000Z'),
      endDate: new Date('2026-06-20T00:00:00.000Z'),
      isCurrent: true,
    },
  });

  const term1 = await prisma.term.upsert({
    where: {
      academicYearId_name: {
        academicYearId: academicYear.id,
        name: 'نیم‌سال اول',
      },
    },
    update: { isCurrent: true },
    create: {
      tenantId: boysTenant.id,
      academicYearId: academicYear.id,
      name: 'نیم‌سال اول',
      startDate: new Date('2025-09-23T00:00:00.000Z'),
      endDate: new Date('2026-01-20T00:00:00.000Z'),
      isCurrent: true,
    },
  });

  const highSchoolLevel = await prisma.educationalLevel.upsert({
    where: {
      tenantId_code: {
        tenantId: boysTenant.id,
        code: 'HIGH_SCHOOL_2',
      },
    },
    update: {},
    create: {
      tenantId: boysTenant.id,
      name: 'متوسطه دوم',
      code: 'HIGH_SCHOOL_2',
      orderIndex: 2,
    },
  });

  const mathField = await prisma.studyField.upsert({
    where: {
      tenantId_code: {
        tenantId: boysTenant.id,
        code: 'MATH_PHYSICS',
      },
    },
    update: {},
    create: {
      tenantId: boysTenant.id,
      levelId: highSchoolLevel.id,
      name: 'ریاضی و فیزیک',
      code: 'MATH_PHYSICS',
    },
  });

  // Lessons
  const calculusLesson = await prisma.lesson.upsert({
    where: {
      tenantId_code: {
        tenantId: boysTenant.id,
        code: 'CALC-10',
      },
    },
    update: {},
    create: {
      tenantId: boysTenant.id,
      levelId: highSchoolLevel.id,
      fieldId: mathField.id,
      name: 'حسابان ۱',
      code: 'CALC-10',
      unitCount: 4,
      type: 'SPECIALIZED',
    },
  });

  const physicsLesson = await prisma.lesson.upsert({
    where: {
      tenantId_code: {
        tenantId: boysTenant.id,
        code: 'PHYS-10',
      },
    },
    update: {},
    create: {
      tenantId: boysTenant.id,
      levelId: highSchoolLevel.id,
      fieldId: mathField.id,
      name: 'فیزیک ۱ و آزمایشگاه',
      code: 'PHYS-10',
      unitCount: 3,
      type: 'SPECIALIZED',
    },
  });

  // Classroom
  const classroom10M1 = await prisma.classroom.upsert({
    where: {
      tenantId_academicYearId_code: {
        tenantId: boysTenant.id,
        academicYearId: academicYear.id,
        code: 'CLS-10-M1',
      },
    },
    update: {},
    create: {
      tenantId: boysTenant.id,
      academicYearId: academicYear.id,
      levelId: highSchoolLevel.id,
      fieldId: mathField.id,
      name: 'کلاس دهم ریاضی ۱',
      code: 'CLS-10-M1',
      capacity: 30,
      roomNumber: 'اتاق ۲۰۱',
    },
  });

  // 6. Seed Teacher & Student & Parent with Links
  const defaultPass = await argon2.hash('RokadPass2026!');

  // Teacher
  const teacherUser = await prisma.user.upsert({
    where: {
      tenantId_phone: {
        tenantId: boysTenant.id,
        phone: '09123000001',
      },
    },
    update: {},
    create: {
      tenantId: boysTenant.id,
      firstName: 'دکتر بهزاد',
      lastName: 'کاظمی',
      phone: '09123000001',
      email: 'kazemi@rokadschool.ir',
      passwordHash: defaultPass,
      role: 'TEACHER',
      status: 'ACTIVE',
    },
  });

  const teacherProfile = await prisma.teacherProfile.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: {
      tenantId: boysTenant.id,
      userId: teacherUser.id,
      speciality: 'ریاضیات و حسابان پیشرفته',
      degree: 'دکتری ریاضی کاربردی',
      employmentType: 'FULL_TIME',
    },
  });

  // Schedule for Classroom
  await prisma.classSchedule.upsert({
    where: {
      classroomId_dayOfWeek_periodNumber: {
        classroomId: classroom10M1.id,
        dayOfWeek: 'SATURDAY',
        periodNumber: 1,
      },
    },
    update: {},
    create: {
      tenantId: boysTenant.id,
      classroomId: classroom10M1.id,
      lessonId: calculusLesson.id,
      teacherId: teacherProfile.id,
      dayOfWeek: 'SATURDAY',
      periodNumber: 1,
      startTime: '08:00',
      endTime: '09:30',
    },
  });

  // Student
  const studentUser = await prisma.user.upsert({
    where: {
      tenantId_phone: {
        tenantId: boysTenant.id,
        phone: '09124000001',
      },
    },
    update: {},
    create: {
      tenantId: boysTenant.id,
      firstName: 'امیرعلی',
      lastName: 'صادقی',
      phone: '09124000001',
      passwordHash: defaultPass,
      role: 'STUDENT',
      gender: 'MALE',
      status: 'ACTIVE',
    },
  });

  const studentProfile = await prisma.studentProfile.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      tenantId: boysTenant.id,
      userId: studentUser.id,
      studentCode: 'STD-1404-001',
      nationalCode: '0012345678',
      fatherName: 'حسین',
      birthDate: new Date('2009-04-10'),
    },
  });

  // Enroll Student in Classroom
  await prisma.classEnrollment.upsert({
    where: {
      classroomId_studentId: {
        classroomId: classroom10M1.id,
        studentId: studentProfile.id,
      },
    },
    update: {},
    create: {
      tenantId: boysTenant.id,
      academicYearId: academicYear.id,
      classroomId: classroom10M1.id,
      studentId: studentProfile.id,
      status: 'ACTIVE',
    },
  });

  // Parent
  const parentUser = await prisma.user.upsert({
    where: {
      tenantId_phone: {
        tenantId: boysTenant.id,
        phone: '09125000001',
      },
    },
    update: {},
    create: {
      tenantId: boysTenant.id,
      firstName: 'حسین',
      lastName: 'صادقی (پدر)',
      phone: '09125000001',
      passwordHash: defaultPass,
      role: 'PARENT',
      gender: 'MALE',
      status: 'ACTIVE',
    },
  });

  const parentProfile = await prisma.parentProfile.upsert({
    where: { userId: parentUser.id },
    update: {},
    create: {
      tenantId: boysTenant.id,
      userId: parentUser.id,
      occupation: 'مهندس عمران',
      education: 'کارشناسی ارشد',
    },
  });

  // Link Parent & Student
  await prisma.parentStudentLink.upsert({
    where: {
      parentId_studentId: {
        parentId: parentProfile.id,
        studentId: studentProfile.id,
      },
    },
    update: {},
    create: {
      tenantId: boysTenant.id,
      parentId: parentProfile.id,
      studentId: studentProfile.id,
      relationType: 'FATHER',
      isPrimaryContact: true,
    },
  });

  // 7. Seed School Profiles and Sample Blogs
  await prisma.schoolProfile.upsert({
    where: { tenantId: boysTenant.id },
    update: {},
    create: {
      tenantId: boysTenant.id,
      motto: 'تربیت نسل پیشرو، خلاق و کارآفرین در اکوسیستم آموزشی رُکاد',
      aboutHtml: '<h2>درباره مجتمع پسرانه رُکاد</h2><p>مدرسه رُکاد با رویکرد آموزش پروژه‌محور و تلفیق فناوری با مهارت‌های زندگی فعالیت می‌کند.</p>',
      managerName: 'علیرضا احمدی',
      managerMessage: 'با همراهی اولیای گرامی و اساتید فرهیخته، آینده‌ای درخشان را رقم می‌زنیم.',
    },
  });

  await prisma.profileBlog.upsert({
    where: {
      tenantId_slug: {
        tenantId: boysTenant.id,
        slug: 'welcome-to-new-academic-year',
      },
    },
    update: {},
    create: {
      tenantId: boysTenant.id,
      authorId: boysAdmin.id,
      title: 'پیام آغاز سال تحصیلی جدید ۱۴۰۴-۱۴۰۵',
      slug: 'welcome-to-new-academic-year',
      content: 'با تبریک آغاز سال تحصیلی جدید، تقویم اجرایی و برنامه‌های پژوهشی مدرسه اعلام گردید.',
      tags: ['اطلاعیه', 'سال تحصیلی جدید', 'رُکاد'],
      isPublished: true,
    },
  });

  // 8. Phase 3: Seed Daily Academic Operations
  console.log('⚡ 8. Seeding Phase 3 Daily Academic Operations...');

  // Student Attendance
  await prisma.studentAttendance.upsert({
    where: {
      tenantId_classroomId_studentId_date_periodNumber: {
        tenantId: boysTenant.id,
        classroomId: classroom10M1.id,
        studentId: studentProfile.id,
        date: '2026-09-01',
        periodNumber: 1,
      },
    },
    update: {},
    create: {
      tenantId: boysTenant.id,
      academicYearId: academicYear.id,
      classroomId: classroom10M1.id,
      studentId: studentProfile.id,
      lessonId: calculusLesson.id,
      date: '2026-09-01',
      periodNumber: 1,
      status: 'PRESENT',
      recordedById: teacherUser.id,
    },
  });

  // Teacher Attendance
  await prisma.teacherAttendance.upsert({
    where: {
      tenantId_teacherId_date: {
        tenantId: boysTenant.id,
        teacherId: teacherProfile.id,
        date: '2026-09-01',
      },
    },
    update: {},
    create: {
      tenantId: boysTenant.id,
      teacherId: teacherProfile.id,
      date: '2026-09-01',
      entryTime: '07:45',
      exitTime: '14:30',
      status: 'PRESENT',
      recordedById: boysAdmin.id,
    },
  });

  // Homework
  const calculusHomework = await prisma.homework.create({
    data: {
      tenantId: boysTenant.id,
      classroomId: classroom10M1.id,
      lessonId: calculusLesson.id,
      teacherId: teacherProfile.id,
      title: 'تمرینات فصل اول: مشتق و پیوستگی',
      description: 'لطفاً تمرین‌های صفحه ۱۵ الی ۱۸ کتاب درسی را حل نموده و تصویر دست‌نویس آن را بارگذاری نمایید.',
      dueDate: new Date('2026-09-20T23:59:59.000Z'),
      maxScore: 20,
      isGraded: true,
      allowLateSubmissions: true,
    },
  });

  // Homework Submission
  await prisma.homeworkSubmission.create({
    data: {
      tenantId: boysTenant.id,
      homeworkId: calculusHomework.id,
      studentId: studentProfile.id,
      content: 'پاسخ سوالات ۱ تا ۵ پیوست گردید.',
      status: 'GRADED',
      score: 19.5,
      feedback: 'بسیار عالی و دقیق حل شده است.',
      gradedAt: new Date(),
      gradedById: teacherUser.id,
    },
  });

  // Calendar Event
  await prisma.schoolEvent.create({
    data: {
      tenantId: boysTenant.id,
      title: 'اولین آزمون جامع پیشرفت تحصیلی ترم اول',
      description: 'آزمون تستی از دروس تخصصی ریاضی و فیزیک پایه دهم',
      eventType: 'EXAM',
      startDate: new Date('2026-09-25T08:30:00.000Z'),
      endDate: new Date('2026-09-25T11:30:00.000Z'),
      targetAudience: 'STUDENTS',
      location: 'سالن امتحانات شماره ۱',
      createdById: boysAdmin.id,
    },
  });

  // Poll
  await prisma.poll.create({
    data: {
      tenantId: boysTenant.id,
      title: 'نظرسنجی انتخاب کارگاه‌های مهارت‌آموزی ترم پاییز',
      description: 'علاقه‌مندی خود را به یکی از دوره‌های مهارتی مشخص نمایید',
      pollType: 'SINGLE_CHOICE',
      targetAudience: 'STUDENTS',
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2026-09-30T23:59:59.000Z'),
      createdById: boysAdmin.id,
      options: {
        create: [
          { text: 'هوش مصنوعی و یادگیری ماشین', orderIndex: 1 },
          { text: 'طراحی وب و توسعه اپلیکیشن', orderIndex: 2 },
          { text: 'رباتیک و اینترنت اشیاء (IoT)', orderIndex: 3 },
        ],
      },
    },
  });

  // Parent Visit Slot
  await prisma.parentVisitSlot.create({
    data: {
      tenantId: boysTenant.id,
      teacherId: teacherProfile.id,
      date: '2026-09-12',
      startTime: '10:00',
      endTime: '10:20',
      durationMinutes: 20,
      capacityPerSlot: 1,
      roomLocation: 'اتاق مشاوره و دیدار با اولیا ۱۰۲',
    },
  });

  // Disciplinary / Commendation Matter
  await prisma.disciplinaryMatter.create({
    data: {
      tenantId: boysTenant.id,
      studentId: studentProfile.id,
      academicYearId: academicYear.id,
      type: 'POSITIVE',
      title: 'کسب مدال طلای المپیاد ریاضی استانی',
      description: 'درخشش در مرحله اول المپیاد علمی و تشویق در صف صبحگاه',
      points: 5.0,
      actionTaken: 'تقدیرنامه کتبی و درج در پرونده تحصیلی',
      notifiedParents: true,
      reportedById: boysAdmin.id,
    },
  });

  // 9. Phase 4: Seed Exams & LMS Engine
  console.log('⚡ 9. Seeding Phase 4 Exams & LMS Engine...');

  // Lesson Plan
  const calculusPlan = await prisma.lessonPlan.create({
    data: {
      tenantId: boysTenant.id,
      academicYearId: academicYear.id,
      lessonId: calculusLesson.id,
      teacherId: teacherProfile.id,
      title: 'طرح درس سالانه حسابان ۱ پایه دهم ریاضی',
      description: 'سرفصل‌ها و بودجه‌بندی جلسات درس حسابان ۱ برای سال تحصیلی',
      totalHoursPlanned: 32,
      sessions: {
        create: [
          {
            sessionNumber: 1,
            topic: 'آشنایی با توابع و دامنه و برد تابع',
            objectives: 'درک مفهوم تابع و تعیین دامنه توابع کسری و رادیکالی',
            activities: 'حل تمرین‌های مقدماتی و رسم نمودار با نرم‌افزار GeoGebra',
            status: 'COMPLETED',
          },
          {
            sessionNumber: 2,
            topic: 'توابع جبری و ترکیب توابع (f o g)',
            objectives: 'آموزش ترکیب توابع و خواص آن',
            status: 'COMPLETED',
          },
          {
            sessionNumber: 3,
            topic: 'مفهوم حد و پیوستگی توابع',
            objectives: 'محاسبه حدود نامعین صفر بر صفر و رفع ابهام',
            status: 'PLANNED',
          },
        ],
      },
    },
  });

  // Question Bank
  const calculusCategory = await prisma.questionCategory.create({
    data: {
      tenantId: boysTenant.id,
      lessonId: calculusLesson.id,
      name: 'فصل اول: توابع و روابط بین متغیرها',
      orderIndex: 1,
    },
  });

  const q1 = await prisma.question.create({
    data: {
      tenantId: boysTenant.id,
      lessonId: calculusLesson.id,
      categoryId: calculusCategory.id,
      createdById: teacherUser.id,
      type: 'MULTIPLE_CHOICE',
      difficulty: 'MEDIUM',
      text: 'دامنه تابع f(x) = sqrt(x - 2) / (x - 5) کدام است؟',
      defaultScore: 2.0,
      suggestedTimeSeconds: 90,
      solutionExplanation: 'زیر رادیکال زوج باید نامنفی باشد (x >= 2) و مخرج کسر نباید صفر شود (x != 5). پس دامنه: [2, +inf) - {5}',
      options: {
        create: [
          { text: '[2, +inf) - {5}', isCorrect: true, orderIndex: 1 },
          { text: '(2, +inf)', isCorrect: false, orderIndex: 2 },
          { text: '[2, 5)', isCorrect: false, orderIndex: 3 },
          { text: 'R - {5}', isCorrect: false, orderIndex: 4 },
        ],
      },
    },
  });

  const q2 = await prisma.question.create({
    data: {
      tenantId: boysTenant.id,
      lessonId: calculusLesson.id,
      categoryId: calculusCategory.id,
      createdById: teacherUser.id,
      type: 'MULTIPLE_CHOICE',
      difficulty: 'EASY',
      text: 'اگر f(x) = 2x + 3 و g(x) = x^2 باشد، مقدار (f o g)(2) کدام است؟',
      defaultScore: 2.0,
      suggestedTimeSeconds: 60,
      solutionExplanation: 'g(2) = 2^2 = 4 -> f(4) = 2(4) + 3 = 11',
      options: {
        create: [
          { text: '11', isCorrect: true, orderIndex: 1 },
          { text: '49', isCorrect: false, orderIndex: 2 },
          { text: '14', isCorrect: false, orderIndex: 3 },
          { text: '7', isCorrect: false, orderIndex: 4 },
        ],
      },
    },
  });

  // Exam
  const calculusExam = await prisma.exam.create({
    data: {
      tenantId: boysTenant.id,
      academicYearId: academicYear.id,
      lessonId: calculusLesson.id,
      teacherId: teacherProfile.id,
      title: 'آزمون آنلاین مبحثی فصل اول حسابان',
      description: 'آزمون تستی زمان‌دار با تصحیح خودکار',
      examType: 'ONLINE',
      durationMinutes: 45,
      startTime: new Date('2026-09-01T00:00:00.000Z'),
      endTime: new Date('2026-10-30T23:59:59.000Z'),
      totalScore: 4.0,
      shuffleQuestions: true,
      shuffleOptions: true,
      status: 'RUNNING',
      isPublished: true,
      classrooms: {
        create: [{ tenantId: boysTenant.id, classroomId: classroom10M1.id }],
      },
      questions: {
        create: [
          { questionId: q1.id, orderIndex: 1, score: 2.0 },
          { questionId: q2.id, orderIndex: 2, score: 2.0 },
        ],
      },
    },
  });

  // Grade Entries (Gradebook)
  await prisma.gradeEntry.create({
    data: {
      tenantId: boysTenant.id,
      academicYearId: academicYear.id,
      classroomId: classroom10M1.id,
      lessonId: calculusLesson.id,
      studentId: studentProfile.id,
      teacherId: teacherProfile.id,
      gradeType: 'CLASS_ACTIVITY',
      title: 'فعالیت کلاسی و حل تمرین پای تخته',
      score: 19.5,
      maxScore: 20,
      weight: 1.0,
      recordedById: teacherUser.id,
    },
  });

  console.log('✅ Phase 1, Phase 2, Phase 3 & Phase 4 Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
