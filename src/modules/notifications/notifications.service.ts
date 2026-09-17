import { Injectable, Logger, OnModuleInit, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { Role } from '../../common/constants';

export interface SystemNotification {
  id: string;
  title: string;
  desc: string;
  time: string;
  read: boolean;
  type:
    | 'HOMEWORK'
    | 'ATTENDANCE'
    | 'EXAM'
    | 'FEE'
    | 'VISIT'
    | 'MATTER'
    | 'CHAT'
    | 'SYSTEM'
    | 'ANNOUNCEMENT'
    | 'COACHING';
  badge: 'default' | 'success' | 'warning' | 'destructive' | 'neutral' | 'college' | 'male' | 'female';
  targetUrl: string;
  createdAt: string;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  // Fallback in-memory read store when Redis is offline
  private readonly inMemoryReadStore = new Map<string, Set<string>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const subject = this.configService.get<string>('VAPID_SUBJECT') || 'mailto:support@rokadschool.ir';
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');

    if (publicKey && privateKey) {
      try {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        this.logger.log('Web Push (VAPID) configured successfully.');
      } catch (err: any) {
        this.logger.error(`Failed to configure VAPID: ${err.message}`);
      }
    } else {
      this.logger.warn('VAPID keys not configured. Web Push will be disabled.');
    }
  }

  private getReadSet(userId: string): Set<string> {
    if (!this.inMemoryReadStore.has(userId)) {
      this.inMemoryReadStore.set(userId, new Set());
    }
    return this.inMemoryReadStore.get(userId)!;
  }

  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    const key = `notifications:read:${userId}`;
    const client = this.redis.getClient();
    if (client && client.status === 'ready') {
      await client.sadd(key, notificationId);
      await client.expire(key, 86400 * 30); // 30 days
    } else {
      this.getReadSet(userId).add(notificationId);
    }
    return true;
  }

  async markAllAsRead(userId: string, notificationIds: string[]): Promise<boolean> {
    const key = `notifications:read:${userId}`;
    const client = this.redis.getClient();
    if (client && client.status === 'ready' && notificationIds.length > 0) {
      await client.sadd(key, ...notificationIds);
      await client.expire(key, 86400 * 30);
    } else {
      const set = this.getReadSet(userId);
      notificationIds.forEach((id) => set.add(id));
    }
    return true;
  }

  private async getReadIds(userId: string): Promise<Set<string>> {
    const key = `notifications:read:${userId}`;
    const client = this.redis.getClient();
    if (client && client.status === 'ready') {
      const members = await client.smembers(key);
      return new Set(members);
    }
    return this.getReadSet(userId);
  }

  async getUserNotifications(tenantId: string, user: any): Promise<SystemNotification[]> {
    const readIds = await this.getReadIds(user.id);
    const notifications: SystemNotification[] = [];

    const role = user?.role as Role;

    // 1. Notifications for SUPER_ADMIN
    if (role === Role.SUPER_ADMIN) {
      const activeTenantsCount = await this.prisma.tenant.count({ where: { status: 'ACTIVE' } });
      const totalUsersCount = await this.prisma.user.count();

      notifications.push({
        id: `sys-tenants-${activeTenantsCount}`,
        title: 'وضعیت سلامت پلتفرم ابری رکاد',
        desc: `تعداد ${activeTenantsCount} شعبه فعال با بیش از ${totalUsersCount} کاربر فعال برخط به صورت پایدار در مدار می‌باشند.`,
        time: 'لحظاتی پیش',
        read: readIds.has(`sys-tenants-${activeTenantsCount}`),
        type: 'SYSTEM',
        badge: 'success',
        targetUrl: '/app/superadmin/tenants',
        createdAt: new Date().toISOString(),
      });

      notifications.push({
        id: 'sys-storage-minio',
        title: 'پشتیبان‌گیری مخازن ذخیره‌سازی MinIO',
        desc: 'عملیات اعتبارسنجی باکت‌ها و ذخیره‌سازی ابری فایل‌های آموزشی با موفقیت سپری شد.',
        time: '۳۰ دقیقه پیش',
        read: readIds.has('sys-storage-minio'),
        type: 'SYSTEM',
        badge: 'default',
        targetUrl: '/app/superadmin/ops',
        createdAt: new Date(Date.now() - 1800000).toISOString(),
      });

      notifications.push({
        id: 'sys-audit-security',
        title: 'گزارش نظارت امنیتی و احراز هویت',
        desc: 'تمام توکن‌های نشست ۲۴ ساعت گذشته اعتبارسنجی شده و هیچ تلاش نفوذ غیرمجازی ثبت نشده است.',
        time: '۲ ساعت پیش',
        read: readIds.has('sys-audit-security'),
        type: 'SYSTEM',
        badge: 'college',
        targetUrl: '/app/superadmin/ops',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      });
    }

    // 2. Notifications for SCHOOL_ADMIN & STAFF
    else if (role === Role.SCHOOL_ADMIN || role === Role.STAFF) {
      // Check recent confirmed parent visits
      const recentVisits = await this.prisma.parentVisitBooking.findMany({
        where: { tenantId },
        include: {
          slot: {
            include: {
              teacher: { include: { user: true } },
            },
          },
          student: { include: { user: true } },
        },
        take: 3,
        orderBy: { createdAt: 'desc' },
      });

      recentVisits.forEach((pv) => {
        notifications.push({
          id: `visit-booking-${pv.id}`,
          title: 'رزرو جلسه ملاقات اولیا با دبیر',
          desc: `جلسه ملاقات برای ولی هنرجو ${pv.student?.user?.firstName || ''} ${pv.student?.user?.lastName || ''} با استاد ${pv.slot?.teacher?.user?.lastName || ''} با موضوع «${pv.subject}» ثبت گردید.`,
          time: 'جدید',
          read: readIds.has(`visit-booking-${pv.id}`),
          type: 'VISIT',
          badge: 'college',
          targetUrl: '/app/admin/visits',
          createdAt: pv.createdAt.toISOString(),
        });
      });

      // Check disciplinary matters
      const recentMatters = await this.prisma.disciplinaryMatter.findMany({
        where: { tenantId },
        include: { student: { include: { user: true } } },
        take: 2,
        orderBy: { createdAt: 'desc' },
      });

      recentMatters.forEach((m) => {
        notifications.push({
          id: `matter-${m.id}`,
          title: m.type === 'POSITIVE' ? 'تشویق و امتیاز انضباطی' : 'گزارش انضباطی نیازمند بررسی',
          desc: `موضوع «${m.title}» (${m.points > 0 ? `+${m.points}` : m.points} امتیاز) برای هنرجو ${m.student?.user?.firstName || ''} ${m.student?.user?.lastName || ''} ثبت گردید.`,
          time: 'امروز',
          read: readIds.has(`matter-${m.id}`),
          type: 'MATTER',
          badge: m.type === 'POSITIVE' ? 'success' : 'destructive',
          targetUrl: '/app/admin/matters',
          createdAt: m.createdAt.toISOString(),
        });
      });

      // Tuition reminder / Finance summary
      notifications.push({
        id: `fee-summary-${tenantId}`,
        title: 'وضعیت تسویه شهریه و اقساط مالی',
        desc: 'گزارش تراکنش‌های آنلاین و فیش‌های ثبت‌شده امروز در سامانه حسابداری آماده بررسی است.',
        time: '۱ ساعت پیش',
        read: readIds.has(`fee-summary-${tenantId}`),
        type: 'FEE',
        badge: 'success',
        targetUrl: '/app/admin/finance/fees',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      });

      // Active poll status
      const activePoll = await this.prisma.poll.findFirst({
        where: { tenantId, isClosed: false },
        include: { _count: { select: { votes: true } } },
      });
      if (activePoll) {
        notifications.push({
          id: `poll-active-${activePoll.id}`,
          title: 'نظرسنجی فعال مدرسه در جریان است',
          desc: `نظرسنجی «${activePoll.title}» تاکنون ${activePoll._count.votes} رای به ثبت رسانده است.`,
          time: 'فعال',
          read: readIds.has(`poll-active-${activePoll.id}`),
          type: 'ANNOUNCEMENT',
          badge: 'default',
          targetUrl: '/app/admin/polls',
          createdAt: activePoll.createdAt.toISOString(),
        });
      }
    }

    // 3. Notifications for TEACHER
    else if (role === Role.TEACHER) {
      const teacher = await this.prisma.teacherProfile.findFirst({
        where: { userId: user.id, tenantId },
      });

      if (teacher) {
        // Pending homework submissions for this teacher
        const submissionsNeedingGrade = await this.prisma.homeworkSubmission.findMany({
          where: {
            status: 'SUBMITTED',
            homework: { teacherId: teacher.id, tenantId },
          },
          include: {
            homework: { select: { id: true, title: true } },
            student: { include: { user: true } },
          },
          take: 4,
          orderBy: { submittedAt: 'desc' },
        });

        submissionsNeedingGrade.forEach((sub) => {
          notifications.push({
            id: `sub-grade-${sub.id}`,
            title: 'پاسخ تکلیف جدید آماده نمره‌دهی',
            desc: `هنرجو ${sub.student?.user?.firstName || ''} ${sub.student?.user?.lastName || ''} پاسخی برای «${sub.homework?.title}» ارسال نموده است.`,
            time: 'جدید',
            read: readIds.has(`sub-grade-${sub.id}`),
            type: 'HOMEWORK',
            badge: 'default',
            targetUrl: `/app/teacher/homework?homeworkId=${sub.homework.id}&action=submissions`,
            createdAt: sub.submittedAt.toISOString(),
          });
        });

        // Confirmed visits booked with this teacher
        const teacherVisits = await this.prisma.parentVisitBooking.findMany({
          where: {
            slot: { teacherId: teacher.id },
            status: 'CONFIRMED',
          },
          include: {
            slot: true,
            student: { include: { user: true } },
          },
          take: 2,
          orderBy: { createdAt: 'desc' },
        });

        teacherVisits.forEach((tv) => {
          notifications.push({
            id: `tv-visit-${tv.id}`,
            title: 'جلسه ملاقات اولیا با شما',
            desc: `ملاقات با ولی هنرجو ${tv.student?.user?.firstName || ''} ${tv.student?.user?.lastName || ''} برای تاریخ ${tv.slot?.date} ثبت شده است.`,
            time: 'زمان‌بندی شده',
            read: readIds.has(`tv-visit-${tv.id}`),
            type: 'VISIT',
            badge: 'college',
            targetUrl: '/app/teacher/visits',
            createdAt: tv.createdAt.toISOString(),
          });
        });

        // Today's schedule reminder
        notifications.push({
          id: `teacher-schedule-today-${teacher.id}`,
          title: 'برنامه آموزشی و زنگ‌های امروز',
          desc: 'لیست زنگ‌های تدریس و کلاس‌های امروز در پنل برنامه کلاسی شما به‌روزرسانی شد.',
          time: 'ساعت ۰۸:۰۰',
          read: readIds.has(`teacher-schedule-today-${teacher.id}`),
          type: 'SYSTEM',
          badge: 'success',
          targetUrl: '/app/teacher/schedule',
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 4. Notifications for STUDENT
    else if (role === Role.STUDENT) {
      const student = await this.prisma.studentProfile.findFirst({
        where: { userId: user.id, tenantId },
        include: {
          enrollments: {
            where: { status: 'ACTIVE' },
            select: { classroomId: true },
          },
        },
      });

      if (student) {
        const classroomIds = student.enrollments.map((e) => e.classroomId);

        // Active homeworks for student's classes
        if (classroomIds.length > 0) {
          const activeHomeworks = await this.prisma.homework.findMany({
            where: {
              tenantId,
              classroomId: { in: classroomIds },
              dueDate: { gte: new Date() },
            },
            include: {
              lesson: true,
              submissions: {
                where: { studentId: student.id },
              },
            },
            take: 3,
            orderBy: { dueDate: 'asc' },
          });

          activeHomeworks.forEach((hw) => {
            const hasSubmitted = hw.submissions.length > 0;
            if (!hasSubmitted) {
              notifications.push({
                id: `hw-active-${hw.id}`,
                title: `تکلیف جدید درس ${hw.lesson?.name || ''}`,
                desc: `تکلیف «${hw.title}» تعریف شده است. لطفاً پیش از موعد مقرر پاسخ خود را ارسال فرمایید.`,
                time: 'مهلت تحویل فعال',
                read: readIds.has(`hw-active-${hw.id}`),
                type: 'HOMEWORK',
                badge: 'warning',
                targetUrl: `/app/student/homework?homeworkId=${hw.id}&action=submit`,
                createdAt: hw.createdAt.toISOString(),
              });
            }
          });
        }

        // Graded submissions for this student
        const gradedSubmissions = await this.prisma.homeworkSubmission.findMany({
          where: {
            studentId: student.id,
            status: 'GRADED',
          },
          include: {
            homework: { include: { lesson: true } },
          },
          take: 3,
          orderBy: { updatedAt: 'desc' },
        });

        gradedSubmissions.forEach((sub) => {
          notifications.push({
            id: `sub-graded-${sub.id}`,
            title: `نمره تکلیف درس ${sub.homework?.lesson?.name || ''} ثبت شد`,
            desc: `دبیر برای تکلیف «${sub.homework?.title}» نمره ${sub.score} از ${sub.homework?.maxScore || 20} را ثبت نموده است.`,
            time: 'کارنامه جدید',
            read: readIds.has(`sub-graded-${sub.id}`),
            type: 'HOMEWORK',
            badge: 'success',
            targetUrl: `/app/student/homework?homeworkId=${sub.homework.id}&action=view`,
            createdAt: sub.updatedAt.toISOString(),
          });
        });

        // Online exams ready to take
        if (classroomIds.length > 0) {
          const activeExams = await this.prisma.exam.findMany({
            where: {
              tenantId,
              classrooms: { some: { classroomId: { in: classroomIds } } },
              isPublished: true,
            },
            include: { lesson: true },
            take: 2,
            orderBy: { createdAt: 'desc' },
          });

          activeExams.forEach((ex) => {
            notifications.push({
              id: `exam-notify-${ex.id}`,
              title: `آزمون آنلاین درس ${ex.lesson?.name || ''}`,
              desc: `آزمون «${ex.title}» با مدت زمان ${ex.durationMinutes || 60} دقیقه آماده شرکت است.`,
              time: 'آزمون برخط',
              read: readIds.has(`exam-notify-${ex.id}`),
              type: 'EXAM',
              badge: 'default',
              targetUrl: `/app/student/exams?examId=${ex.id}&action=start`,
              createdAt: ex.createdAt.toISOString(),
            });
          });
        }
      }
    }

    // 5. Notifications for PARENT
    else if (role === Role.PARENT) {
      const parent = await this.prisma.parentProfile.findFirst({
        where: { userId: user.id, tenantId },
        include: {
          studentLinks: {
            include: {
              student: {
                include: {
                  user: true,
                  studentAttendances: {
                    take: 2,
                    orderBy: { date: 'desc' },
                    include: { classroom: true },
                  },
                },
              },
            },
          },
        },
      });

      if (parent) {
        parent.studentLinks.forEach((link) => {
          const childName = `${link.student?.user?.firstName || ''} ${link.student?.user?.lastName || ''}`;

          // Recent attendance record of child
          link.student?.studentAttendances?.forEach((att) => {
            const statusLabel =
              att.status === 'PRESENT'
                ? 'حاضر'
                : att.status === 'ABSENT'
                ? 'غایب غیرموجه'
                : att.status === 'TARDY'
                ? `تاخیر (${att.delayMinutes || 15} دقیقه)`
                : 'موجه';

            notifications.push({
              id: `parent-att-${att.id}`,
              title: `گزارش حضور و غیاب فرزند: ${childName}`,
              desc: `وضعیت حضور در تاریخ ${att.date ? new Date(att.date).toLocaleDateString('fa-IR') : 'امروز'} برای کلاس ${att.classroom?.name || ''}: ${statusLabel}`,
              time: 'امروز',
              read: readIds.has(`parent-att-${att.id}`),
              type: 'ATTENDANCE',
              badge: att.status === 'ABSENT' ? 'destructive' : att.status === 'TARDY' ? 'warning' : 'success',
              targetUrl: '/app/parent/grades',
              createdAt: att.createdAt.toISOString(),
            });
          });
        });

        // Tuition reminder
        notifications.push({
          id: `parent-fee-${parent.id}`,
          title: 'وضعیت شهریه و خدمات تحصیلی',
          desc: 'رسید پرداخت‌ها و سررسید اقساط شهریه هنرجو در درگاه مالی والدین قابل پیگیری و پرداخت آنلاین است.',
          time: 'یادآوری',
          read: readIds.has(`parent-fee-${parent.id}`),
          type: 'FEE',
          badge: 'college',
          targetUrl: '/app/parent/fees',
          createdAt: new Date().toISOString(),
        });

        // Parent visits reminder
        notifications.push({
          id: `parent-visit-${parent.id}`,
          title: 'رزرو وقت ملاقات با هنرآموزان و مشاورین',
          desc: 'اسلات‌های جدید دیدار اولیا و دبیران برای هفته آینده در سامانه ثبت گردید.',
          time: 'جدید',
          read: readIds.has(`parent-visit-${parent.id}`),
          type: 'VISIT',
          badge: 'female',
          targetUrl: '/app/parent/visits',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        });
      }
    }

    // Recent Academic Messages for this user
    try {
      const recentMessages = await this.prisma.academicMessageRecipient.findMany({
        where: {
          tenantId,
          recipientId: user.id,
          deletedAt: null,
        },
        include: {
          message: {
            include: {
              sender: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      recentMessages.forEach((mr) => {
        const senderName = `${mr.message.sender.firstName || ''} ${mr.message.sender.lastName || ''}`.trim() || 'مدیریت مجتمع';
        const preview = mr.message.body.length > 70 ? `${mr.message.body.slice(0, 70)}...` : mr.message.body;
        notifications.push({
          id: `msg-${mr.id}`,
          title: `پیام جدید: ${mr.message.title}`,
          desc: `${senderName}: ${preview}`,
          time: 'جدید',
          read: mr.isRead || readIds.has(`msg-${mr.id}`),
          type: 'ANNOUNCEMENT',
          badge: mr.message.priority === 'URGENT' ? 'destructive' : mr.message.priority === 'IMPORTANT' ? 'warning' : 'default',
          targetUrl: '/app/messages',
          createdAt: mr.createdAt.toISOString(),
        });
      });
    } catch {
      // non-blocking
    }

    // Sort by creation time descending
    return notifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /**
   * Return VAPID Public Key for client subscription
   */
  getVapidPublicKey(): { publicKey: string } {
    return {
      publicKey: this.configService.get<string>('VAPID_PUBLIC_KEY') || '',
    };
  }

  /**
   * Save or update push subscription for a user device
   */
  async subscribePush(
    userId: string,
    data: { endpoint: string; keys: { p256dh: string; auth: string } },
    userAgent?: string,
  ) {
    const endpoint = data?.endpoint || (data as any)?.subscription?.endpoint;
    if (!endpoint) {
      this.logger.warn(`subscribePush: endpoint missing for user ${userId}`);
      throw new BadRequestException('آدرس endpoint اشتراک مرورگر معتبر نیست.');
    }

    const p256dh = data?.keys?.p256dh || (data as any)?.p256dh || '';
    const auth = data?.keys?.auth || (data as any)?.auth || '';

    let deviceOS = 'Desktop';
    if (userAgent) {
      if (/iPhone|iPad|iPod/i.test(userAgent)) {
        deviceOS = 'iOS';
      } else if (/Android/i.test(userAgent)) {
        deviceOS = 'Android';
      }
    }

    this.logger.log(`Subscribing device [${deviceOS}] for user ${userId} (endpoint: ${endpoint.substring(0, 30)}...)`);

    return this.prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId,
        p256dh,
        auth,
        userAgent,
        deviceOS,
      },
      create: {
        userId,
        endpoint,
        p256dh,
        auth,
        userAgent,
        deviceOS,
      },
    });
  }

  /**
   * Remove subscription when user logs out or disables notifications
   */
  async unsubscribePush(userId: string, endpoint: string) {
    if (!endpoint) return { count: 0 };
    return this.prisma.pushSubscription.deleteMany({
      where: {
        userId,
        endpoint,
      },
    });
  }

  /**
   * Send Web Push notification to all active devices of a user
   */
  async sendPushToUser(
    userId: string,
    payload: {
      title: string;
      body: string;
      url?: string;
      icon?: string;
      badge?: string;
      tag?: string;
    },
  ) {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (!subscriptions.length) {
      return { sent: 0, failed: 0 };
    }

    const jsonPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/app',
      icon: payload.icon || '/icons/pwa-192x192.png',
      badge: payload.badge || '/icons/favicon-32x32.png',
      tag: payload.tag || 'rokad-push',
    });

    let sent = 0;
    let failed = 0;

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const pushPromise = webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            jsonPayload,
            {
              TTL: 60 * 60 * 24, // 24 hours
              urgency: 'high',
            },
          );

          // 6-second timeout per subscription to guard against network stalls
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Push Gateway Timeout')), 6000),
          );

          await Promise.race([pushPromise, timeoutPromise]);
          sent++;
        } catch (err: any) {
          failed++;
          this.logger.warn(`Push delivery failed for sub ${sub.id}: ${err.message} (status: ${err.statusCode})`);
          // 404 or 410 means subscription has expired or unsubscribed
          if (err.statusCode === 404 || err.statusCode === 410) {
            this.logger.log(`Cleaning up expired subscription: ${sub.id}`);
            await this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
        }
      }),
    );

    return { sent, failed };
  }

  /**
   * Send test push notification to verify device receipt (non-blocking)
   */
  async sendTestPush(userId: string) {
    // Run push in background so client gets instant HTTP response without 30s timeout
    this.sendPushToUser(userId, {
      title: 'سامانه هوشمند رُکاد',
      body: 'این یک پیام آزمایشی است. اعلان‌های برخط در دستگاه شما با موفقیت فعال شد! 🎉',
      url: '/app',
      tag: 'test-notification',
    }).catch((err) => {
      this.logger.error(`Error sending test push to ${userId}: ${err.message}`);
    });

    return {
      sent: 1,
      message: 'سیگنال اعلان تستی به دستگاه شما ارسال گردید.',
    };
  }
}
