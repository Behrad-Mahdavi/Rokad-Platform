import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import * as jalaali from 'jalaali-js';
import { PrismaService } from '../../prisma/prisma.service';
import { ISmsProvider, SmsSendResult } from './interfaces/sms-provider.interface';
import { SandboxSmsProvider } from './providers/sandbox-sms.provider';
import { KavenegarSmsProvider } from './providers/kavenegar-sms.provider';
import {
  SendManualSmsDto,
  ManualSmsTargetType,
  TargetRoleAudience,
  ClassAudienceType,
  UpsertSmsTemplateDto,
} from './dto/send-manual-sms.dto';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly primaryProvider: ISmsProvider;
  private readonly fallbackProvider: ISmsProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly sandboxProvider: SandboxSmsProvider,
    private readonly kavenegarProvider: KavenegarSmsProvider,
  ) {
    const activeProviderName = this.configService.get<string>('SMS_PROVIDER') || 'SANDBOX';
    if (activeProviderName.toUpperCase() === 'KAVENEGAR') {
      this.primaryProvider = this.kavenegarProvider;
      this.fallbackProvider = this.sandboxProvider;
    } else {
      this.primaryProvider = this.sandboxProvider;
      this.fallbackProvider = this.sandboxProvider;
    }
  }

  // ==========================================
  // Core Dispatcher with Failover
  // ==========================================
  async dispatchSms(to: string, message: string, tenantId?: string): Promise<SmsSendResult> {
    try {
      const res = await this.primaryProvider.sendSingle({ to, message, tenantId });
      if (res.success) {
        return res;
      }
      this.logger.warn(`Primary provider ${this.primaryProvider.name} failed. Attempting fallback...`);
      return await this.fallbackProvider.sendSingle({ to, message, tenantId });
    } catch (err: any) {
      this.logger.error(`Error in dispatchSms: ${err.message}. Triggering fallback.`);
      return await this.fallbackProvider.sendSingle({ to, message, tenantId });
    }
  }

  // Helper to record SMS Log
  private async recordLog(data: {
    tenantId: string;
    recipientPhone: string;
    recipientName?: string;
    recipientUserId?: string;
    type: any;
    message: string;
    provider: string;
    status: 'SENT' | 'FAILED' | 'DELIVERED' | 'QUEUED';
    errorMessage?: string;
    metadata?: any;
    senderId?: string;
  }) {
    try {
      return await this.prisma.smsLog.create({
        data: {
          tenantId: data.tenantId,
          recipientPhone: data.recipientPhone,
          recipientName: data.recipientName,
          recipientUserId: data.recipientUserId,
          type: data.type,
          message: data.message,
          provider: data.provider,
          status: data.status,
          errorMessage: data.errorMessage,
          metadata: data.metadata || {},
          senderId: data.senderId,
        },
      });
    } catch (e: any) {
      this.logger.error(`Failed to save SMS log: ${e.message}`);
    }
  }

  // =========================================================================
  // 1. AUTOMATED: Student Absence / Tardy SMS to Parents
  // =========================================================================
  @OnEvent('attendance.student_absence', { async: true })
  async handleStudentAbsence(event: {
    tenantId: string;
    studentId: string;
    date: string;
    periodNumber?: number;
    status: string;
    delayMinutes?: number;
  }) {
    this.logger.log(
      `Received attendance.student_absence event for student ${event.studentId} (${event.status}) on ${event.date}`,
    );

    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { id: event.studentId },
      include: {
        user: true,
        parentLinks: {
          include: {
            parent: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!studentProfile) {
      this.logger.warn(`Student profile not found for absence SMS: ${event.studentId}`);
      return;
    }

    const studentName = `${studentProfile.user.firstName || ''} ${studentProfile.user.lastName || ''}`.trim() || 'فرزند شما';

    // Get active template or default
    const template = await this.prisma.smsTemplate.findFirst({
      where: { tenantId: event.tenantId, type: 'AUTO_ABSENCE' },
    });

    if (template && !template.isEnabled) {
      this.logger.log(`Absence SMS is disabled by tenant template configuration.`);
      return;
    }

    const statusText = event.status === 'ABSENT' ? 'غیبت در کلاس' : `تأخیر ورود (${event.delayMinutes || 0} دقیقه)`;
    const periodText = event.periodNumber ? `زنگ ${event.periodNumber}` : 'کل روز';

    let messageText =
      template?.body ||
      `ولی محترم؛ به اطلاع می‌رساند {نام_دانش‌آموز} در تاریخ {تاریخ} در {زنگ}، وضعیت «{وضعیت}» برای ایشان ثبت گردیده است.\nمدرسه رُکاد`;

    messageText = messageText
      .replace(/{نام_دانش‌آموز}/g, studentName)
      .replace(/{نام}/g, studentName)
      .replace(/{تاریخ}/g, event.date)
      .replace(/{زنگ}/g, periodText)
      .replace(/{وضعیت}/g, statusText)
      .replace(/{تاخیر}/g, String(event.delayMinutes || 0));

    // Collect parent phone numbers
    const parentPhones: Array<{ phone: string; name: string; userId?: string }> = [];
    if (studentProfile.parentLinks?.length > 0) {
      for (const link of studentProfile.parentLinks) {
        const parentUser = link.parent?.user;
        const phone = parentUser?.phone || link.parent?.workPhone;
        if (phone) {
          parentPhones.push({
            phone,
            name: `${parentUser?.firstName || ''} ${parentUser?.lastName || ''}`.trim() || 'ولی محترم',
            userId: parentUser?.id,
          });
        }
      }
    }

    // Fallback: If no parent linked, send to student phone if available
    if (parentPhones.length === 0 && studentProfile.user.phone) {
      parentPhones.push({
        phone: studentProfile.user.phone,
        name: studentName,
        userId: studentProfile.user.id,
      });
    }

    // Send SMS to all parent phones
    for (const recipient of parentPhones) {
      const result = await this.dispatchSms(recipient.phone, messageText, event.tenantId);
      await this.recordLog({
        tenantId: event.tenantId,
        recipientPhone: recipient.phone,
        recipientName: recipient.name,
        recipientUserId: recipient.userId,
        type: 'AUTO_ABSENCE',
        message: messageText,
        provider: result.provider,
        status: result.success ? 'SENT' : 'FAILED',
        errorMessage: result.errorMessage,
        metadata: {
          studentId: event.studentId,
          studentName,
          date: event.date,
          periodNumber: event.periodNumber,
          attendanceStatus: event.status,
          delayMinutes: event.delayMinutes,
        },
      });
    }
  }

  // =========================================================================
  // 2. AUTOMATED: Cheque Maturity & Due Date Reminder
  // =========================================================================
  async processChequeDueReminders(tenantId?: string): Promise<{ checkedCount: number; sentCount: number }> {
    this.logger.log(`Executing Cheque Due Date Reminder Job (Tenant: ${tenantId || 'ALL'})...`);

    const now = new Date();
    // Query cheques due in the next 3 days or today
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 4);

    const whereClause: any = {
      method: 'CHEQUE',
      checkStatus: 'PENDING',
      checkDueDate: {
        lte: threeDaysLater,
      },
    };

    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const pendingCheques = await this.prisma.feePayment.findMany({
      where: whereClause,
      include: {
        feeContract: {
          include: {
            student: {
              include: {
                user: true,
                parentLinks: {
                  include: {
                    parent: {
                      include: {
                        user: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    let sentCount = 0;

    for (const cheque of pendingCheques) {
      if (!cheque.checkDueDate) continue;

      const dueDate = new Date(cheque.checkDueDate);
      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Remind at: 3 days before, 1 day before, and on the due date (0)
      if (diffDays !== 3 && diffDays !== 1 && diffDays !== 0) {
        continue;
      }

      const jalaliDue = jalaali.toJalaali(dueDate.getFullYear(), dueDate.getMonth() + 1, dueDate.getDate());
      const jalaliDateStr = `${jalaliDue.jy}/${String(jalaliDue.jm).padStart(2, '0')}/${String(jalaliDue.jd).padStart(2, '0')}`;

      const timingTitle = diffDays === 0 ? 'امروز' : diffDays === 1 ? 'فردا' : '۳ روز آینده';
      const student = cheque.feeContract?.student;
      const studentName = student ? `${student.user.firstName || ''} ${student.user.lastName || ''}`.trim() : '';

      const ownerName = cheque.checkOwnerName || 'صادرکننده محترم';
      const bankTitle = `${cheque.bankName || 'بانک'} ${cheque.branchName || ''}`.trim();
      const amountFormatted = Number(cheque.amount).toLocaleString('fa-IR');

      let messageText = `صادرکننده محترم (${ownerName})؛\nیادآوری سررسید چک صیادی:\nچک شماره: ${cheque.checkSayadId || cheque.checkNumber || '-'}\nمبلغ: ${amountFormatted} تومان\nبانک: ${bankTitle}\nموعد سررسید: ${timingTitle} (${jalaliDateStr})\nلطفاً جهت پاس شدن چک، نسبت به تأمین موجودی اقدام فرمایید.\nمدرسه رُکاد`;

      // Find recipient phone
      let targetPhone = '';
      let targetUserId: string | undefined;

      if (student?.parentLinks?.length) {
        const parentUser = student.parentLinks[0]?.parent?.user;
        targetPhone = parentUser?.phone || student.parentLinks[0]?.parent?.workPhone || '';
        targetUserId = parentUser?.id;
      }

      if (!targetPhone && student?.user?.phone) {
        targetPhone = student.user.phone;
        targetUserId = student.user.id;
      }

      if (targetPhone) {
        const res = await this.dispatchSms(targetPhone, messageText, cheque.tenantId);
        await this.recordLog({
          tenantId: cheque.tenantId,
          recipientPhone: targetPhone,
          recipientName: ownerName,
          recipientUserId: targetUserId,
          type: 'AUTO_CHEQUE_DUE',
          message: messageText,
          provider: res.provider,
          status: res.success ? 'SENT' : 'FAILED',
          errorMessage: res.errorMessage,
          metadata: {
            chequeId: cheque.id,
            checkNumber: cheque.checkNumber,
            sayadId: cheque.checkSayadId,
            dueDays: diffDays,
            dueDate: jalaliDateStr,
            amount: cheque.amount,
            studentName,
          },
        });
        sentCount++;
      }
    }

    return { checkedCount: pendingCheques.length, sentCount };
  }

  // =========================================================================
  // 3. AUTOMATED: Birthday Greetings Job
  // =========================================================================
  async processBirthdayGreetings(tenantId?: string): Promise<{ matchedBirthdays: number; sentCount: number }> {
    this.logger.log(`Executing Birthday Greeting Dispatcher (Tenant: ${tenantId || 'ALL'})...`);

    const now = new Date();
    const currentJalali = jalaali.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    const whereClause: any = {
      status: 'ACTIVE',
    };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    // Fetch active users with student, teacher, or staff profiles
    const users = await this.prisma.user.findMany({
      where: whereClause,
      include: {
        studentProfile: true,
        teacherProfile: true,
        staffProfile: true,
      },
    });

    let matchedCount = 0;
    let sentCount = 0;

    for (const user of users) {
      const birthDate = user.studentProfile?.birthDate;
      if (!birthDate) continue;

      const bDate = new Date(birthDate);
      const bJalali = jalaali.toJalaali(bDate.getFullYear(), bDate.getMonth() + 1, bDate.getDate());

      const isJalaliMatch = bJalali.jm === currentJalali.jm && bJalali.jd === currentJalali.jd;
      const isGregorianMatch = bDate.getMonth() + 1 === currentMonth && bDate.getDate() === currentDay;

      if (isJalaliMatch || isGregorianMatch) {
        matchedCount++;
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'عزیز';
        const phone = user.phone;

        const messageText = `${fullName} عزیز؛\nشکفتن گل وجودت و زادروز زیبایت را صمیمانه شادباش می‌گوییم. 🎉🎂\nامیدواریم در پناه ایزد یکتا سالی سرشار از نشاط، تندرستی و سربلندی داشته باشی.\nخانواده بزرگ رُکاد`;

        if (phone) {
          const res = await this.dispatchSms(phone, messageText, user.tenantId);
          await this.recordLog({
            tenantId: user.tenantId,
            recipientPhone: phone,
            recipientName: fullName,
            recipientUserId: user.id,
            type: 'AUTO_BIRTHDAY',
            message: messageText,
            provider: res.provider,
            status: res.success ? 'SENT' : 'FAILED',
            errorMessage: res.errorMessage,
            metadata: {
              role: user.role,
              birthDate: bDate.toISOString(),
            },
          });
          sentCount++;
        }
      }
    }

    return { matchedBirthdays: matchedCount, sentCount };
  }

  // =========================================================================
  // 4. MANUAL SMS DISPATCH (INDIVIDUAL, ROLE, CLASS, DIRECT PHONES)
  // =========================================================================
  async sendManualSms(tenantId: string, senderId: string, dto: SendManualSmsDto) {
    if (!dto.message || !dto.message.trim()) {
      throw new BadRequestException('متن پیامک نمی‌تواند خالی باشد');
    }

    const recipientsToDispatch: Array<{ phone: string; name?: string; userId?: string }> = [];

    // Mode A: DIRECT_PHONE / DIRECT_PHONES
    if (dto.targetType === ManualSmsTargetType.DIRECT_PHONE) {
      if (dto.directPhone) {
        recipientsToDispatch.push({ phone: dto.directPhone.trim() });
      }
      if (dto.directPhones?.length) {
        dto.directPhones.forEach((p) => {
          if (p.trim()) recipientsToDispatch.push({ phone: p.trim() });
        });
      }
      if (recipientsToDispatch.length === 0) {
        throw new BadRequestException('حداقل یک شماره تلفن مستقیم معتبر الزامی است');
      }
    }

    // Mode B: INDIVIDUAL (User by ID)
    else if (dto.targetType === ManualSmsTargetType.INDIVIDUAL) {
      if (!dto.targetUserId) {
        throw new BadRequestException('شناسه کاربر گیرنده الزامی است');
      }
      const user = await this.prisma.user.findFirst({
        where: { id: dto.targetUserId, tenantId },
      });
      if (!user || !user.phone) {
        throw new NotFoundException('کاربر موردنظر یافت نشد یا فاقد شماره موبایل ثبت‌شده است');
      }
      recipientsToDispatch.push({
        phone: user.phone,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        userId: user.id,
      });
    }

    // Mode C: ROLE / GROUP
    else if (dto.targetType === ManualSmsTargetType.ROLE) {
      const roleFilter: any = { tenantId, status: 'ACTIVE', phone: { not: null } };

      if (dto.targetRole === TargetRoleAudience.STUDENTS) {
        roleFilter.role = 'STUDENT';
      } else if (dto.targetRole === TargetRoleAudience.PARENTS) {
        roleFilter.role = 'PARENT';
      } else if (dto.targetRole === TargetRoleAudience.TEACHERS) {
        roleFilter.role = 'TEACHER';
      } else if (dto.targetRole === TargetRoleAudience.STAFF) {
        roleFilter.role = { in: ['STAFF', 'SCHOOL_ADMIN', 'COACH'] };
      }

      const users = await this.prisma.user.findMany({
        where: roleFilter,
        select: { id: true, firstName: true, lastName: true, phone: true },
      });

      users.forEach((u) => {
        if (u.phone) {
          recipientsToDispatch.push({
            phone: u.phone,
            name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
            userId: u.id,
          });
        }
      });
    }

    // Mode D: CLASS
    else if (dto.targetType === ManualSmsTargetType.CLASS) {
      if (!dto.classroomId) {
        throw new BadRequestException('انتخاب شناسه کلاس الزامی است');
      }

      const enrollments = await this.prisma.classEnrollment.findMany({
        where: {
          classroomId: dto.classroomId,
          tenantId,
          status: 'ACTIVE',
        },
        include: {
          student: {
            include: {
              user: true,
              parentLinks: {
                include: {
                  parent: {
                    include: {
                      user: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const audience = dto.classAudience || ClassAudienceType.STUDENTS;

      for (const enr of enrollments) {
        const studentUser = enr.student.user;

        // Add students
        if (audience === ClassAudienceType.STUDENTS || audience === ClassAudienceType.BOTH) {
          if (studentUser.phone) {
            recipientsToDispatch.push({
              phone: studentUser.phone,
              name: `${studentUser.firstName || ''} ${studentUser.lastName || ''}`.trim(),
              userId: studentUser.id,
            });
          }
        }

        // Add parents
        if (audience === ClassAudienceType.PARENTS || audience === ClassAudienceType.BOTH) {
          for (const link of enr.student.parentLinks) {
            const pUser = link.parent.user;
            const pPhone = pUser?.phone || link.parent.workPhone;
            if (pPhone) {
              recipientsToDispatch.push({
                phone: pPhone,
                name: `${pUser?.firstName || ''} ${pUser?.lastName || ''}`.trim() || 'ولی محترم',
                userId: pUser?.id,
              });
            }
          }
        }
      }
    }

    // Remove duplicate phones
    const uniqueRecipients = Array.from(
      new Map(recipientsToDispatch.map((r) => [r.phone, r])).values(),
    );

    if (uniqueRecipients.length === 0) {
      throw new BadRequestException('هیچ گیرنده معتبری با شماره تلفن همراه یافت نشد.');
    }

    // Dispatch & Log
    let sentCount = 0;
    let failedCount = 0;

    for (const rec of uniqueRecipients) {
      const res = await this.dispatchSms(rec.phone, dto.message, tenantId);
      const isOk = res.success;
      if (isOk) sentCount++;
      else failedCount++;

      await this.recordLog({
        tenantId,
        recipientPhone: rec.phone,
        recipientName: rec.name,
        recipientUserId: rec.userId,
        type:
          dto.targetType === ManualSmsTargetType.INDIVIDUAL
            ? 'MANUAL_INDIVIDUAL'
            : dto.targetType === ManualSmsTargetType.ROLE
              ? 'MANUAL_ROLE'
              : dto.targetType === ManualSmsTargetType.CLASS
                ? 'MANUAL_CLASS'
                : 'MANUAL_BULK',
        message: dto.message,
        provider: res.provider,
        status: isOk ? 'SENT' : 'FAILED',
        errorMessage: res.errorMessage,
        senderId,
        metadata: {
          targetType: dto.targetType,
          classroomId: dto.classroomId,
          targetRole: dto.targetRole,
        },
      });
    }

    return {
      message: `پیامک به ${sentCount} نفر با موفقیت ارسال شد.${failedCount > 0 ? ` (${failedCount} ارسال ناموفق)` : ''}`,
      totalRecipients: uniqueRecipients.length,
      sentCount,
      failedCount,
    };
  }

  // ==========================================
  // Logs, Stats & Templates
  // ==========================================
  async getSmsLogs(tenantId: string, page = 1, limit = 30, type?: string, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = { tenantId };

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { recipientPhone: { contains: search } },
        { recipientName: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, logs] = await Promise.all([
      this.prisma.smsLog.count({ where }),
      this.prisma.smsLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      logs,
    };
  }

  async getSmsStats(tenantId: string) {
    const total = await this.prisma.smsLog.count({ where: { tenantId } });
    const sent = await this.prisma.smsLog.count({ where: { tenantId, status: 'SENT' } });
    const failed = await this.prisma.smsLog.count({ where: { tenantId, status: 'FAILED' } });

    const absenceCount = await this.prisma.smsLog.count({ where: { tenantId, type: 'AUTO_ABSENCE' } });
    const chequeCount = await this.prisma.smsLog.count({ where: { tenantId, type: 'AUTO_CHEQUE_DUE' } });
    const birthdayCount = await this.prisma.smsLog.count({ where: { tenantId, type: 'AUTO_BIRTHDAY' } });
    const manualCount = await this.prisma.smsLog.count({
      where: { tenantId, type: { in: ['MANUAL_INDIVIDUAL', 'MANUAL_ROLE', 'MANUAL_CLASS', 'MANUAL_BULK'] } },
    });

    return {
      total,
      sent,
      failed,
      breakdown: {
        autoAbsence: absenceCount,
        autoChequeDue: chequeCount,
        autoBirthday: birthdayCount,
        manual: manualCount,
      },
      activeProvider: this.primaryProvider.name,
    };
  }

  async getTemplates(tenantId: string) {
    const templates = await this.prisma.smsTemplate.findMany({
      where: { tenantId },
    });

    // Default templates definition if not stored in DB yet
    const defaults = [
      {
        type: 'AUTO_ABSENCE',
        title: 'اعلان غیبت و تأخیر به والدین',
        body: 'ولی محترم؛ به اطلاع می‌رساند {نام_دانش‌آموز} در تاریخ {تاریخ} در {زنگ}، وضعیت «{وضعیت}» برای ایشان ثبت گردیده است.\nمدرسه رُکاد',
        isEnabled: true,
      },
      {
        type: 'AUTO_CHEQUE_DUE',
        title: 'یادآوری سررسید چک‌های صیادی',
        body: 'صادرکننده محترم ({نام})؛ یادآوری سررسید چک صیادی به مبلغ {مبلغ} ریال موعد {تاریخ_سررسید}. لطفاً نسبت به تأمین موجودی اقدام فرمایید.\nمدرسه رُکاد',
        isEnabled: true,
      },
      {
        type: 'AUTO_BIRTHDAY',
        title: 'تبریک زادروز',
        body: '{نام} عزیز؛ شکفتن گل وجودت و زادروز زیبایت را صمیمانه شادباش می‌گوییم. 🎉🎂\nخانواده بزرگ رُکاد',
        isEnabled: true,
      },
    ];

    return defaults.map((def) => {
      const found = templates.find((t) => t.type === def.type);
      return (
        found || {
          id: `default-${def.type}`,
          tenantId,
          ...def,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      );
    });
  }

  async upsertTemplate(tenantId: string, dto: UpsertSmsTemplateDto) {
    return this.prisma.smsTemplate.upsert({
      where: {
        tenantId_type: {
          tenantId,
          type: dto.type as any,
        },
      },
      update: {
        title: dto.title,
        body: dto.body,
        isEnabled: dto.isEnabled ?? true,
      },
      create: {
        tenantId,
        type: dto.type as any,
        title: dto.title,
        body: dto.body,
        isEnabled: dto.isEnabled ?? true,
      },
    });
  }
}
