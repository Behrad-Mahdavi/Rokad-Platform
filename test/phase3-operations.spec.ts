import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Rokad Multi-Tenant Platform — Phase 3 Daily Academic Operations Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let boysAdminToken: string;
  let boysTeacherToken: string;
  let boysStudentToken: string;
  let boysParentToken: string;

  let testClassroomId: string;
  let testAcademicYearId: string;
  let testLessonId: string;
  let testStudentProfileId: string;
  let testTeacherProfileId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    // 1. Login as Boys School Admin
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-slug', 'rokad-boys')
      .send({
        identifier: '09121111111',
        password: 'RokadBoysPass2026!',
      });
    boysAdminToken = adminLogin.body.data.accessToken;

    // 2. Login as Teacher
    const teacherLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-slug', 'rokad-boys')
      .send({
        identifier: '09123000001',
        password: 'RokadPass2026!',
      });
    boysTeacherToken = teacherLogin.body.data.accessToken;

    // 3. Login as Student
    const studentLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-slug', 'rokad-boys')
      .send({
        identifier: '09124000001',
        password: 'RokadPass2026!',
      });
    boysStudentToken = studentLogin.body.data.accessToken;

    // 4. Login as Parent
    const parentLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-slug', 'rokad-boys')
      .send({
        identifier: '09125000001',
        password: 'RokadPass2026!',
      });
    boysParentToken = parentLogin.body.data.accessToken;

    // Fetch prerequisite entities
    const classrooms = await request(app.getHttpServer())
      .get('/api/v1/classes/classrooms')
      .set('Authorization', `Bearer ${boysAdminToken}`);
    testClassroomId = classrooms.body.data[0].id;
    testAcademicYearId = classrooms.body.data[0].academicYearId;

    const lessons = await request(app.getHttpServer())
      .get('/api/v1/classes/lessons')
      .set('Authorization', `Bearer ${boysAdminToken}`);
    testLessonId = lessons.body.data[0].id;

    const students = await request(app.getHttpServer())
      .get('/api/v1/members/students')
      .set('Authorization', `Bearer ${boysAdminToken}`);
    testStudentProfileId = students.body.data[0].id;

    const teachers = await request(app.getHttpServer())
      .get('/api/v1/members/teachers')
      .set('Authorization', `Bearer ${boysAdminToken}`);
    testTeacherProfileId = teachers.body.data[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Attendance Module (Student & Teacher)', () => {
    it('POST /api/v1/attendance/students/bulk should record student attendance', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/attendance/students/bulk')
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .send({
          academicYearId: testAcademicYearId,
          classroomId: testClassroomId,
          lessonId: testLessonId,
          date: '2026-09-02',
          periodNumber: 1,
          attendances: [
            {
              studentId: testStudentProfileId,
              status: 'PRESENT',
            },
          ],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(1);
    });

    it('GET /api/v1/attendance/daily-stats should return attendance statistics', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/attendance/daily-stats?date=2026-09-02')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.present).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/v1/attendance/teachers should record teacher daily attendance', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/attendance/teachers')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .send({
          teacherId: testTeacherProfileId,
          date: '2026-09-02',
          entryTime: '07:50',
          exitTime: '14:20',
          status: 'PRESENT',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PRESENT');
    });
  });

  describe('2. Homework & Grading Workflow', () => {
    let createdHomeworkId: string;
    let createdSubmissionId: string;

    it('POST /api/v1/homework should allow teacher to create homework assignment', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/homework')
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .send({
          classroomId: testClassroomId,
          lessonId: testLessonId,
          teacherId: testTeacherProfileId,
          title: 'تکلیف تستی انتگرال و کاربردها',
          description: 'پاسخ سوالات انتهای فصل',
          dueDate: '2026-09-30T23:59:59.000Z',
          maxScore: 20,
          isGraded: true,
          allowLateSubmissions: true,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('تکلیف تستی انتگرال و کاربردها');
      createdHomeworkId = res.body.data.id;
    });

    it('POST /api/v1/homework/:id/submit should allow student to submit homework', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/homework/${createdHomeworkId}/submit`)
        .set('Authorization', `Bearer ${boysStudentToken}`)
        .send({
          studentId: testStudentProfileId,
          content: 'پاسخ کلیه تمرینات ارسال شد',
          attachmentUrls: ['https://storage.rokad.ir/homework/solution.pdf'],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SUBMITTED');
      createdSubmissionId = res.body.data.id;
    });

    it('PATCH /api/v1/homework/submissions/:id/grade should allow teacher to grade and provide feedback', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/homework/submissions/${createdSubmissionId}/grade`)
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .send({
          score: 19.0,
          feedback: 'پاسخ سوال سوم بسیار ابتکاری بود. آفرین!',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.score).toBe(19.0);
      expect(res.body.data.status).toBe('GRADED');
    });
  });

  describe('3. Calendar & Events Module', () => {
    let createdEventId: string;

    it('POST /api/v1/calendar/events should create school event', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/calendar/events')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .send({
          title: 'اردوی بازدید از پارک فناوری پردیس',
          description: 'آشنایی با شرکت‌های دانش‌بنیان و استارتاپ‌های هوش مصنوعی',
          eventType: 'EXCURSION',
          startDate: '2026-10-05T08:00:00.000Z',
          endDate: '2026-10-05T16:00:00.000Z',
          targetAudience: 'STUDENTS',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toContain('پارک فناوری');
      createdEventId = res.body.data.id;
    });

    it('GET /api/v1/calendar/events should query events in date range', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/calendar/events?startDate=2026-10-01&endDate=2026-10-31')
        .set('Authorization', `Bearer ${boysStudentToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('4. Polls & Surveys Module', () => {
    let createdPollId: string;
    let firstOptionId: string;

    it('POST /api/v1/polls should create poll with options', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/polls')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .send({
          title: `نظرسنجی کیفیت امکانات ورزشی و باشگاه ${Date.now()}`,
          description: 'لطفاً نظر خود را اعلام فرمایید',
          pollType: 'SINGLE_CHOICE',
          targetAudience: 'ALL',
          startDate: new Date(Date.now() - 3600000).toISOString(),
          endDate: new Date(Date.now() + 864000000).toISOString(),
          options: [
            { text: 'عالی و استاندارد' },
            { text: 'متوسط و نیازمند بهبود' },
            { text: 'ضعیف' },
          ],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.options.length).toBe(3);
      createdPollId = res.body.data.id;
      firstOptionId = res.body.data.options[0].id;
    });

    it('POST /api/v1/polls/:id/vote should allow user to vote', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/polls/${createdPollId}/vote`)
        .set('Authorization', `Bearer ${boysStudentToken}`)
        .send({
          selectedOptionIds: [firstOptionId],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('موفقیت');
    });

    it('POST /api/v1/polls/:id/vote should reject duplicate vote by same user', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/polls/${createdPollId}/vote`)
        .set('Authorization', `Bearer ${boysStudentToken}`)
        .send({
          selectedOptionIds: [firstOptionId],
        })
        .expect(409);
    });
  });

  describe('5. Parent Visits Module', () => {
    let createdSlotId: string;

    it('POST /api/v1/parent-visits/slots should allow teacher to create visit slot', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/parent-visits/slots')
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .send({
          teacherId: testTeacherProfileId,
          date: '2026-09-18',
          startTime: '11:00',
          endTime: '11:20',
          durationMinutes: 20,
          roomLocation: 'اتاق ملاقات ۱۰۱',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      createdSlotId = res.body.data.id;
    });

    it('POST /api/v1/parent-visits/book should allow parent to book visit slot', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/parent-visits/book')
        .set('Authorization', `Bearer ${boysParentToken}`)
        .send({
          slotId: createdSlotId,
          studentId: testStudentProfileId,
          subject: 'بررسی برنامه تقویتی المپیاد ریاضی',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CONFIRMED');
    });
  });

  describe('6. Disciplinary & Commendation Matters', () => {
    it('POST /api/v1/matters should record positive and negative matters', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/matters')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .send({
          studentId: testStudentProfileId,
          academicYearId: testAcademicYearId,
          type: 'POSITIVE',
          title: 'کسب رتبه ممتاز در مسابقه کتابخوانی',
          description: 'مطالعه و خلاصه کتاب پژوهشی',
          points: 3.0,
          notifiedParents: true,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.points).toBe(3.0);
    });

    it('GET /api/v1/matters/student/:studentId should calculate student net points', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/matters/student/${testStudentProfileId}`)
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.totalPoints).toBeGreaterThanOrEqual(8.0); // 5 (seed) + 3 (new)
      expect(res.body.data.positiveCount).toBeGreaterThanOrEqual(2);
    });
  });
});
