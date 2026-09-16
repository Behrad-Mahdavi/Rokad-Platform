import React, { useEffect, useState, useMemo } from 'react';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { PersianDatePicker } from '../../../components/ui/PersianDatePicker';
import { CoachingDossierModal } from './CoachingDossierModal';
import {
  gregorianToJalaliStr,
  jalaliToGregorianDate,
  formatJalaliDisplay,
  toPersianDigits,
} from '../../../utils/jalali';
import {
  Target,
  Calendar,
  Clock,
  UserCheck,
  UserX,
  FileText,
  Sparkles,
  Plus,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Users,
  Send,
  CalendarDays,
  Flame,
  Search,
  ExternalLink,
  ChevronLeft,
  GraduationCap,
  MessageSquare,
  ShieldCheck,
  BellRing,
  Phone,
} from 'lucide-react';

const PERSIAN_DAY_NAMES = [
  'شنبه',
  'یک‌شنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
];

export const CoachingPage: React.FC = () => {
  const currentUser = useAuthStore((s) => s.user);
  const isStudent = currentUser?.role === 'STUDENT';
  const isManager = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'STAFF', 'TEACHER'].includes(currentUser?.role || '');

  const [contextData, setContextData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Active Tab for Coach/Admin
  const [activeTab, setActiveTab] = useState<'today' | 'students' | 'extra-requests'>('today');

  // Dossier Modal
  const [dossierStudentId, setDossierStudentId] = useState<string | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  // Student: Extra Request Modal
  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
  const [extraReason, setExtraReason] = useState('');
  const [extraPreferredDate, setExtraPreferredDate] = useState('');
  const [isSubmittingExtra, setIsSubmittingExtra] = useState(false);

  // Coach: Session Notes Modal
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [coachNotes, setCoachNotes] = useState('');
  const [actionItems, setActionItems] = useState('');
  const [sessionAttendance, setSessionAttendance] = useState<'PRESENT' | 'ABSENT' | 'EXCUSED'>('PRESENT');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Coach: Respond Extra Request Modal
  const [isRespondModalOpen, setIsRespondModalOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [respondStatus, setRespondStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [respondDate, setRespondDate] = useState(gregorianToJalaliStr(new Date()));
  const [respondTime, setRespondTime] = useState('11:00');
  const [respondNote, setRespondNote] = useState('');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  // Admin: Assign Coach Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [availableCoaches, setAvailableCoaches] = useState<any[]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<any[]>([]);
  const [assignStudentId, setAssignStudentId] = useState('');
  const [assignCoachId, setAssignCoachId] = useState('');
  const [assignDayOfWeek, setAssignDayOfWeek] = useState(0);
  const [assignStartTime, setAssignStartTime] = useState('10:20');
  const [assignEndTime, setAssignEndTime] = useState('10:40');
  const [isSavingAssign, setIsSavingAssign] = useState(false);

  const fetchContext = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/coaching/my-context');
      if (res && res.data) {
        setContextData(res.data);
      }
    } catch (err) {
      console.error('Failed to load coaching context', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContext();
  }, []);

  // Fetch coach and student lists when assign modal opens
  const handleOpenAssignModal = async () => {
    try {
      const [coachesRes, studentsRes] = await Promise.all([
        apiClient.get('/coaching/coaches'),
        apiClient.get('/coaching/students-directory'),
      ]);
      setAvailableCoaches(coachesRes.data || []);
      setUnassignedStudents(studentsRes.data || []);
      if (coachesRes.data?.length > 0) setAssignCoachId(coachesRes.data[0].id);
      if (studentsRes.data?.length > 0) setAssignStudentId(studentsRes.data[0].id);
      setIsAssignModalOpen(true);
    } catch (err) {
      console.error('Failed to load assign options', err);
    }
  };

  // Student Submit Extra Request
  const handleSubmitExtraRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraReason.trim()) return;

    setIsSubmittingExtra(true);
    try {
      await apiClient.post('/coaching/extra-request', {
        reason: extraReason.trim(),
        preferredDate: extraPreferredDate.trim() || undefined,
      });
      setIsExtraModalOpen(false);
      setExtraReason('');
      setExtraPreferredDate('');
      await fetchContext();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'خطا در ثبت درخواست');
    } finally {
      setIsSubmittingExtra(false);
    }
  };

  // Coach Quick Attendance
  const handleMarkAttendance = async (sessionId: string, status: 'PRESENT' | 'ABSENT' | 'EXCUSED') => {
    try {
      await apiClient.patch(`/coaching/sessions/${sessionId}`, {
        attendanceStatus: status,
      });
      await fetchContext();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'خطا در ثبت حضور و غیاب');
    }
  };

  // Coach Open Notes Modal
  const handleOpenNotes = (session: any) => {
    setActiveSession(session);
    setCoachNotes(session.coachNotes || '');
    setActionItems(session.actionItems || '');
    setSessionAttendance(session.attendanceStatus === 'PENDING' ? 'PRESENT' : session.attendanceStatus);
    setIsNotesModalOpen(true);
  };

  // Coach Save Notes
  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;

    setIsSavingNotes(true);
    try {
      await apiClient.patch(`/coaching/sessions/${activeSession.id}`, {
        attendanceStatus: sessionAttendance,
        coachNotes: coachNotes.trim() || undefined,
        actionItems: actionItems.trim() || undefined,
      });
      setIsNotesModalOpen(false);
      await fetchContext();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'خطا در ذخیره یادداشت');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Coach Open Respond Modal
  const handleOpenRespond = (req: any) => {
    setActiveRequest(req);
    setRespondStatus('APPROVED');
    setRespondDate(gregorianToJalaliStr(new Date()));
    setRespondTime('11:00');
    setRespondNote('');
    setIsRespondModalOpen(true);
  };

  // Coach Submit Respond to Extra Request
  const handleSaveRespond = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest) return;

    setIsSubmittingResponse(true);
    try {
      let scheduledDateIso: string | undefined = undefined;
      if (respondStatus === 'APPROVED') {
        const dObj = jalaliToGregorianDate(respondDate);
        const [h, m] = respondTime.split(':').map(Number);
        dObj.setHours(h || 11, m || 0, 0, 0);
        scheduledDateIso = dObj.toISOString();
      }

      await apiClient.post(`/coaching/extra-requests/${activeRequest.id}/respond`, {
        status: respondStatus,
        coachResponse: respondNote.trim() || undefined,
        scheduledDate: scheduledDateIso,
        durationMinutes: 20,
      });

      setIsRespondModalOpen(false);
      await fetchContext();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'خطا در پاسخ به درخواست');
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  // Admin Save Assign Coach
  const handleSaveAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignStudentId || !assignCoachId) return;

    setIsSavingAssign(true);
    try {
      await apiClient.post('/coaching/assign', {
        studentId: assignStudentId,
        coachId: assignCoachId,
        slotDayOfWeek: Number(assignDayOfWeek),
        slotStartTime: assignStartTime,
        slotEndTime: assignEndTime,
        slotDurationMinutes: 20,
      });
      setIsAssignModalOpen(false);
      await fetchContext();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'خطا در تخصیص کوچ');
    } finally {
      setIsSavingAssign(false);
    }
  };

  const openDossier = (studentId: string) => {
    setDossierStudentId(studentId);
    setIsDossierOpen(true);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border-3 border-zinc-900 bg-white p-6 shadow-[6px_6px_0px_0px_#18181b] dark:border-zinc-100 dark:bg-zinc-900 dark:shadow-[6px_6px_0px_0px_#f4f4f5] md:p-8">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-wide mb-2">
              <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              <span>پلتفرم جامع هدایت و مربی‌گری فردی (کوچینگ)</span>
            </div>
            <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight md:text-4xl">
              {isStudent ? 'میز کار کوچینگ و جلسات من' : 'داشبورد مربی‌گری و کوچینگ هنرجویان'}
            </h1>
            <p className="mt-2 max-w-2xl text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
              {isStudent
                ? 'مشاهده زمان‌بندی ثابت جلسات ۲۰ دقیقه‌ای دو هفته یک‌بار، یادآورها، تاریخچه حضور و غیاب، و ثبت درخواست جلسات فوق‌العاده.'
                : 'حضور و غیاب جلسات روز جاری، یادداشت‌های راهبردی هر جلسه، پرونده تحلیلی جامع دانش‌آموزان و مدیریت جلسات فوق‌العاده.'}
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {isStudent && (
              <Button
                onClick={() => setIsExtraModalOpen(true)}
                variant="primary"
                className="gap-2 px-5 py-3 text-base font-black border-3 border-zinc-900 shadow-[4px_4px_0px_0px_#18181b] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                <Plus className="w-5 h-5" />
                درخواست جلسه فوق‌العاده
              </Button>
            )}

            {isManager && ['SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(currentUser?.role || '') && (
              <Button
                onClick={handleOpenAssignModal}
                variant="primary"
                className="gap-2 px-4 py-3 text-sm font-black border-3 border-zinc-900 shadow-[4px_4px_0px_0px_#18181b]"
              >
                <Plus className="w-4 h-4" />
                تخصیص کوچ جدید
              </Button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-zinc-900 border-t-transparent dark:border-zinc-100" />
          <p className="mt-3 text-sm font-bold text-zinc-600 dark:text-zinc-400">در حال دریافت اطلاعات کوچینگ...</p>
        </div>
      ) : isStudent ? (
        /* ================= STUDENT VIEW ================= */
        <div className="space-y-8">
          {/* Active Coach Card & Next Session Countdown Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coach Card */}
            <div className="rounded-2xl border-3 border-zinc-900 bg-white p-6 shadow-[5px_5px_0px_0px_#18181b] dark:border-zinc-100 dark:bg-zinc-900 dark:shadow-[5px_5px_0px_0px_#f4f4f5]">
              <div className="flex items-center gap-2 text-xs font-black text-indigo-600 dark:text-indigo-400 mb-4">
                <ShieldCheck className="w-4 h-4" />
                <span>کوچ و مربی اختصاصی شما</span>
              </div>

              {contextData?.link?.coach ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-full border-2 border-zinc-900 bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center font-black text-xl text-primary overflow-hidden shadow-[2px_2px_0px_0px_#18181b]">
                      {contextData.link.coach.avatarUrl ? (
                        <img src={contextData.link.coach.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span>{contextData.link.coach.firstName?.[0] || 'ک'}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">
                        {contextData.link.coach.firstName} {contextData.link.coach.lastName}
                      </h3>
                      <p className="text-xs font-bold text-zinc-500">مشاور و راهنمای هدایت تحصیلی</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2 text-xs font-bold text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center justify-between">
                      <span>برنامه ثابت جلسات:</span>
                      <span className="font-black text-zinc-900 dark:text-zinc-100">
                        هر دو هفته یک‌بار ({PERSIAN_DAY_NAMES[contextData.link.slotDayOfWeek] || 'نامشخص'})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>ساعت جلسه:</span>
                      <span className="font-black text-zinc-900 dark:text-zinc-100">
                        {toPersianDigits(contextData.link.slotStartTime)} الی {toPersianDigits(contextData.link.slotEndTime)} (۲۰ دقیقه)
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs font-bold text-zinc-500 space-y-2">
                  <AlertCircle className="mx-auto w-8 h-8 text-amber-500 mb-1" />
                  <p>هنوز مربی یا کوچی برای شما تخصیص داده نشده است.</p>
                  <p className="text-[11px] text-zinc-400">پس از اتمام نظرسنجی، مربی شما ثبت خواهد شد.</p>
                </div>
              )}
            </div>

            {/* Next Session Reminder & Countdown */}
            <div className="lg:col-span-2 rounded-2xl border-3 border-zinc-900 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 shadow-[5px_5px_0px_0px_#18181b] dark:border-zinc-100 dark:from-zinc-900 dark:to-zinc-800 dark:shadow-[5px_5px_0px_0px_#f4f4f5] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black border-2 border-indigo-600 bg-white text-indigo-700 shadow-[2px_2px_0px_0px_#4f46e5] dark:bg-zinc-800 dark:text-indigo-300">
                    <BellRing className="w-3.5 h-3.5 animate-bounce" />
                    سیستم یادآور هوشمند جلسات
                  </span>
                  <span className="text-xs font-bold text-zinc-500">
                    نرخ حضور: ٪{toPersianDigits(contextData?.stats?.attendanceRate || 100)}
                  </span>
                </div>

                <h3 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-50 leading-snug">
                  {contextData?.nextSession ? (
                    <>جلسه بعدی شما: {formatJalaliDisplay(contextData.nextSession.scheduledDate, true)} ساعت {new Date(contextData.nextSession.scheduledDate).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</>
                  ) : (
                    <>جلسه پیش‌رو در حال حاضر ثبت نشده است</>
                  )}
                </h3>

                <p className="mt-2 text-xs md:text-sm text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                  طبق الگوی دو هفته یک‌بار، روز جلسه به مدت ۲۰ دقیقه با کوچ اختصاصی خود هماهنگ هستید. در صورت داشتن سوال یا بحران تحصیلی فوری، می‌توانید دکمه درخواست جلسه فوق‌العاده را لمس فرمایید.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-600 dark:text-zinc-300">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>یادآوری صبح روز جلسه نیز به صورت اعلان پیامکی و نوتیفیکیشن برای شما ارسال می‌شود.</span>
                </div>
                <Button
                  onClick={() => setIsExtraModalOpen(true)}
                  variant="outline"
                  className="gap-2 text-xs font-black border-2 border-zinc-900 bg-white shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900 dark:shadow-[2px_2px_0px_0px_#f4f4f5]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  درخواست جلسه خارج از نوبت
                </Button>
              </div>
            </div>
          </div>

          {/* Past Sessions History */}
          <div className="rounded-2xl border-3 border-zinc-900 bg-white p-6 shadow-[5px_5px_0px_0px_#18181b] dark:border-zinc-100 dark:bg-zinc-900 dark:shadow-[5px_5px_0px_0px_#f4f4f5] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                <span>سابقه جلسات و حضور و غیاب</span>
              </h3>
              <span className="text-xs font-bold text-zinc-500">
                کل جلسات: {toPersianDigits(contextData?.pastSessions?.length || 0)}
              </span>
            </div>

            {contextData?.pastSessions?.length === 0 ? (
              <div className="py-8 text-center text-xs font-bold text-zinc-400 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                هنوز جلسه‌ای برگزار نشده است.
              </div>
            ) : (
              <div className="space-y-3">
                {contextData?.pastSessions?.map((s: any) => {
                  const jalaliDate = formatJalaliDisplay(s.scheduledDate, true);
                  const time = new Date(s.scheduledDate).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

                  let statusBadge = (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black border border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      حاضر
                    </span>
                  );
                  if (s.attendanceStatus === 'ABSENT') {
                    statusBadge = (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black border border-rose-400 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        غایب
                      </span>
                    );
                  } else if (s.attendanceStatus === 'EXCUSED') {
                    statusBadge = (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black border border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        غایب موجه
                      </span>
                    );
                  }

                  return (
                    <div
                      key={s.id}
                      className="rounded-xl border-2 border-zinc-900 bg-white p-4 shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900 dark:shadow-[2px_2px_0px_0px_#f4f4f5] flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                            {jalaliDate}
                          </span>
                          <span className="text-xs font-bold text-zinc-500">ساعت {time}</span>
                          {s.sessionType === 'EXTRA' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black border border-purple-400 bg-purple-50 text-purple-800">
                              فوق‌العاده
                            </span>
                          )}
                        </div>
                        {s.actionItems && (
                          <p className="text-xs text-indigo-700 dark:text-indigo-300 font-bold">
                            تکلیف و هدف تعیین‌شده: {s.actionItems}
                          </p>
                        )}
                      </div>
                      <div>{statusBadge}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Extra Requests Status Tracker */}
          {contextData?.extraRequests?.length > 0 && (
            <div className="rounded-2xl border-2 border-zinc-900 bg-zinc-50 p-5 shadow-[3px_3px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-800/60 dark:shadow-[3px_3px_0px_0px_#f4f4f5] space-y-3">
              <h4 className="text-xs font-black text-zinc-700 dark:text-zinc-300">
                وضعیت درخواست‌های جلسه فوق‌العاده شما:
              </h4>
              <div className="space-y-2">
                {contextData.extraRequests.map((r: any) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-zinc-300 bg-white p-3 text-xs dark:border-zinc-700 dark:bg-zinc-900 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                  >
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">موضوع: {r.reason}</span>
                      {r.coachResponse && (
                        <p className="text-zinc-500 mt-0.5">پاسخ کوچ: {r.coachResponse}</p>
                      )}
                    </div>
                    <div>
                      {r.status === 'PENDING' ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold border border-amber-400 bg-amber-50 text-amber-800">
                          در انتظار بررسی
                        </span>
                      ) : r.status === 'APPROVED' ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold border border-emerald-400 bg-emerald-50 text-emerald-800">
                          تایید و زمان‌بندی شد
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold border border-rose-400 bg-rose-50 text-rose-800">
                          رد شده
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ================= COACH / ADMIN VIEW ================= */
        <div className="space-y-6">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <button
              onClick={() => setActiveTab('today')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                activeTab === 'today'
                  ? 'border-zinc-900 bg-zinc-900 text-white shadow-[3px_3px_0px_0px_#000] dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border-zinc-300 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
              }`}
            >
              <Calendar className="w-4 h-4" />
              جلسات امروز ({toPersianDigits(contextData?.todaySessions?.length || 0)})
            </button>

            <button
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                activeTab === 'students'
                  ? 'border-zinc-900 bg-zinc-900 text-white shadow-[3px_3px_0px_0px_#000] dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border-zinc-300 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
              }`}
            >
              <Users className="w-4 h-4" />
              دانش‌آموزان من ({toPersianDigits(contextData?.myStudents?.length || 0)})
            </button>

            <button
              onClick={() => setActiveTab('extra-requests')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                activeTab === 'extra-requests'
                  ? 'border-zinc-900 bg-zinc-900 text-white shadow-[3px_3px_0px_0px_#000] dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border-zinc-300 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              درخواست‌های فوق‌العاده ({toPersianDigits(contextData?.pendingExtraRequests?.length || 0)})
            </button>
          </div>

          {/* TAB 1: TODAY'S SESSIONS */}
          {activeTab === 'today' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                  جلسات کوچینگ زمان‌بندی‌شده برای امروز:
                </h3>
                <span className="text-xs font-bold text-zinc-500">
                  {toPersianDigits(contextData?.todaySessions?.length || 0)} جلسه ۲۰ دقیقه‌ای
                </span>
              </div>

              {contextData?.todaySessions?.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-zinc-300 p-12 text-center text-xs font-bold text-zinc-500 dark:border-zinc-700">
                  امروز جلسه کوچینگ زمان‌بندی شده‌ای برای شما وجود ندارد.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contextData.todaySessions.map((session: any) => {
                    const time = new Date(session.scheduledDate).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div
                        key={session.id}
                        className="rounded-2xl border-3 border-zinc-900 bg-white p-5 shadow-[4px_4px_0px_0px_#18181b] dark:border-zinc-100 dark:bg-zinc-900 dark:shadow-[4px_4px_0px_0px_#f4f4f5] flex flex-col justify-between space-y-4"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="inline-flex items-center gap-1 text-xs font-black text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                              <Clock className="w-3.5 h-3.5" />
                              ساعت {time} ({toPersianDigits(session.durationMinutes)} دقیقه)
                            </span>
                            {session.sessionType === 'EXTRA' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black border border-purple-400 bg-purple-50 text-purple-800">
                                فوق‌العاده
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full border-2 border-zinc-900 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-black text-primary text-base overflow-hidden">
                              {session.student.avatarUrl ? (
                                <img src={session.student.avatarUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span>{session.student.firstName?.[0] || 'د'}</span>
                              )}
                            </div>
                            <div>
                              <h4 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                                {session.student.firstName} {session.student.lastName}
                              </h4>
                              {session.student.studentProfile?.studentCode && (
                                <p className="text-xs text-zinc-500 font-bold">
                                  کد: {toPersianDigits(session.student.studentProfile.studentCode)}
                                </p>
                              )}
                            </div>
                          </div>

                          {session.coachNotes && (
                            <div className="mt-3 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-400">
                              <span className="font-bold text-zinc-900 dark:text-zinc-200">یادداشت: </span>
                              {session.coachNotes}
                            </div>
                          )}
                        </div>

                        {/* Attendance & Notes Actions */}
                        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleMarkAttendance(session.id, 'PRESENT')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-black border transition-all ${
                                session.attendanceStatus === 'PRESENT'
                                  ? 'border-emerald-600 bg-emerald-600 text-white'
                                  : 'border-zinc-300 text-zinc-600 hover:border-emerald-500 hover:text-emerald-700'
                              }`}
                            >
                              حاضر
                            </button>
                            <button
                              onClick={() => handleMarkAttendance(session.id, 'ABSENT')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-black border transition-all ${
                                session.attendanceStatus === 'ABSENT'
                                  ? 'border-rose-600 bg-rose-600 text-white'
                                  : 'border-zinc-300 text-zinc-600 hover:border-rose-500 hover:text-rose-700'
                              }`}
                            >
                              غایب
                            </button>
                            <button
                              onClick={() => handleMarkAttendance(session.id, 'EXCUSED')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-black border transition-all ${
                                session.attendanceStatus === 'EXCUSED'
                                  ? 'border-amber-600 bg-amber-600 text-white'
                                  : 'border-zinc-300 text-zinc-600 hover:border-amber-500 hover:text-amber-700'
                              }`}
                            >
                              موجه
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenNotes(session)}
                              className="inline-flex items-center gap-1 text-xs font-black text-primary hover:underline"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>یادداشت جلسه</span>
                            </button>
                            <button
                              onClick={() => openDossier(session.student.id)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400"
                            >
                              <Target className="w-3.5 h-3.5" />
                              <span>پرونده</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MY STUDENTS LIST & DOSSIER ACCESS */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                  فهرست دانش‌آموزان متصل و زمان‌بندی ثابت دوهفته‌ای:
                </h3>
                {['SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(currentUser?.role || '') && (
                  <Button
                    onClick={handleOpenAssignModal}
                    variant="outline"
                    className="gap-1.5 text-xs font-black border-2 border-zinc-900"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    تخصیص کوچ به دانش‌آموز
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contextData?.myStudents?.map((link: any) => (
                  <div
                    key={link.id}
                    className="rounded-2xl border-3 border-zinc-900 bg-white p-5 shadow-[4px_4px_0px_0px_#18181b] dark:border-zinc-100 dark:bg-zinc-900 dark:shadow-[4px_4px_0px_0px_#f4f4f5] flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black border border-indigo-200 bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                          {PERSIAN_DAY_NAMES[link.slotDayOfWeek] || 'نامشخص'} ساعت {toPersianDigits(link.slotStartTime)}
                        </span>
                        <span className="text-[11px] font-bold text-zinc-400">دو هفته یک‌بار</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full border-2 border-zinc-900 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-black text-primary overflow-hidden">
                          {link.student.avatarUrl ? (
                            <img src={link.student.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span>{link.student.firstName?.[0] || 'د'}</span>
                          )}
                        </div>
                        <div>
                          <h4 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                            {link.student.firstName} {link.student.lastName}
                          </h4>
                          <p className="text-xs text-zinc-500 font-bold">
                            {link.student.studentProfile?.enrollments?.[0]?.classroom?.name || 'کلاس عمومی'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                      <Button
                        onClick={() => openDossier(link.student.id)}
                        variant="outline"
                        className="w-full gap-2 text-xs font-black border-2 border-zinc-900 shadow-[2px_2px_0px_0px_#18181b]"
                      >
                        <Target className="w-3.5 h-3.5 text-primary" />
                        مشاهده پرونده و کارنامه مربی‌گری
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: EXTRA SESSION REQUESTS QUEUE */}
          {activeTab === 'extra-requests' && (
            <div className="space-y-4">
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                درخواست‌های جلسه فوق‌العاده در انتظار بررسی:
              </h3>

              {contextData?.pendingExtraRequests?.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-zinc-300 p-12 text-center text-xs font-bold text-zinc-500 dark:border-zinc-700">
                  درخواست جلسه فوق‌العاده‌ای در صف بررسی وجود ندارد.
                </div>
              ) : (
                <div className="space-y-3">
                  {contextData.pendingExtraRequests.map((req: any) => (
                    <div
                      key={req.id}
                      className="rounded-2xl border-3 border-zinc-900 bg-white p-5 shadow-[4px_4px_0px_0px_#18181b] dark:border-zinc-100 dark:bg-zinc-900 dark:shadow-[4px_4px_0px_0px_#f4f4f5] flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                            {req.student.firstName} {req.student.lastName}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-black border border-amber-400 bg-amber-50 text-amber-800">
                            در انتظار زمان‌بندی
                          </span>
                        </div>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-bold">
                          علت درخواست: {req.reason}
                        </p>
                        {req.preferredDate && (
                          <p className="text-[11px] text-zinc-500">
                            زمان پیشنهادی دانش‌آموز: {req.preferredDate}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleOpenRespond(req)}
                          variant="primary"
                          className="gap-1.5 text-xs font-black border-2 border-zinc-900 shadow-[2px_2px_0px_0px_#18181b]"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          تعیین زمان و تایید جلسه
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= STUDENT: EXTRA REQUEST MODAL ================= */}
      <Modal
        isOpen={isExtraModalOpen}
        onClose={() => setIsExtraModalOpen(false)}
        title="درخواست جلسه فوق‌العاده با کوچ"
      >
        <form onSubmit={handleSubmitExtraRequest} className="space-y-4">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            در صورت مواجهه با چالش درسی، اضطراب امتحانات یا نیاز به مشاوره فوری، درخواست خود را همراه با علت ثبت نمایید تا کوچ در اولین فرصت زمان جلسه را برای شما تنظیم کند.
          </p>

          <div>
            <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
              موضوع و علت درخواست جلسه فوق‌العاده *
            </label>
            <textarea
              required
              rows={4}
              value={extraReason}
              onChange={(e) => setExtraReason(e.target.value)}
              placeholder="مثال: نیاز به راهنمایی در برنامه‌ریزی امتحانات نوبت اول..."
              className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-sm font-medium shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
              زمان پیشنهادی شما (اختیاری)
            </label>
            <input
              type="text"
              value={extraPreferredDate}
              onChange={(e) => setExtraPreferredDate(e.target.value)}
              placeholder="مثال: چهارشنبه بعد از ساعت ۱۲"
              className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-sm font-medium shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsExtraModalOpen(false)}
              className="border-2 border-zinc-900 font-bold"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmittingExtra}
              className="border-2 border-zinc-900 font-black px-5 shadow-[3px_3px_0px_0px_#18181b]"
            >
              {isSubmittingExtra ? 'در حال ارسال...' : 'ارسال درخواست به کوچ'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= COACH: SESSION NOTES MODAL ================= */}
      <Modal
        isOpen={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
        title="ثبت یادداشت و ارزیابی جلسه کوچینگ"
      >
        <form onSubmit={handleSaveNotes} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
              وضعیت حضور و غیاب دانش‌آموز
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSessionAttendance('PRESENT')}
                className={`flex-1 py-2 rounded-xl text-xs font-black border-2 transition-all ${
                  sessionAttendance === 'PRESENT'
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-zinc-300 text-zinc-600'
                }`}
              >
                حاضر
              </button>
              <button
                type="button"
                onClick={() => setSessionAttendance('ABSENT')}
                className={`flex-1 py-2 rounded-xl text-xs font-black border-2 transition-all ${
                  sessionAttendance === 'ABSENT'
                    ? 'border-rose-600 bg-rose-600 text-white'
                    : 'border-zinc-300 text-zinc-600'
                }`}
              >
                غایب
              </button>
              <button
                type="button"
                onClick={() => setSessionAttendance('EXCUSED')}
                className={`flex-1 py-2 rounded-xl text-xs font-black border-2 transition-all ${
                  sessionAttendance === 'EXCUSED'
                    ? 'border-amber-600 bg-amber-600 text-white'
                    : 'border-zinc-300 text-zinc-600'
                }`}
              >
                غایب موجه
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
              نکات و مشاهدات کوچ (محرمانه در پرونده مربی‌گری)
            </label>
            <textarea
              rows={4}
              value={coachNotes}
              onChange={(e) => setCoachNotes(e.target.value)}
              placeholder="نقاط قوت، چالش‌های فردی یا تحصیلی مطرح‌شده در جلسه..."
              className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-sm font-medium shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
              اهداف و برنامه‌های تعیین‌شده برای جلسه بعد
            </label>
            <input
              type="text"
              value={actionItems}
              onChange={(e) => setActionItems(e.target.value)}
              placeholder="مثال: افزایش ساعت مطالعه به ۳ ساعت در روز، تحویل تمرین ریاضی..."
              className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-sm font-medium shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNotesModalOpen(false)}
              className="border-2 border-zinc-900 font-bold"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSavingNotes}
              className="border-2 border-zinc-900 font-black px-5 shadow-[3px_3px_0px_0px_#18181b]"
            >
              {isSavingNotes ? 'در حال ثبت...' : 'ذخیره در پرونده جلسه'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= COACH: RESPOND EXTRA REQUEST MODAL ================= */}
      <Modal
        isOpen={isRespondModalOpen}
        onClose={() => setIsRespondModalOpen(false)}
        title="پاسخ و زمان‌بندی جلسه فوق‌العاده"
      >
        <form onSubmit={handleSaveRespond} className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRespondStatus('APPROVED')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black border-2 transition-all ${
                respondStatus === 'APPROVED'
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-zinc-300 text-zinc-600'
              }`}
            >
              تایید و هماهنگی جلسه
            </button>
            <button
              type="button"
              onClick={() => setRespondStatus('REJECTED')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black border-2 transition-all ${
                respondStatus === 'REJECTED'
                  ? 'border-rose-600 bg-rose-600 text-white'
                  : 'border-zinc-300 text-zinc-600'
              }`}
            >
              رد درخواست
            </button>
          </div>

          {respondStatus === 'APPROVED' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
                  تاریخ برگزاری جلسه فوق‌العاده
                </label>
                <PersianDatePicker
                  value={respondDate}
                  onChange={(d) => setRespondDate(d)}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
                  ساعت شروع جلسه
                </label>
                <input
                  type="time"
                  value={respondTime}
                  onChange={(e) => setRespondTime(e.target.value)}
                  className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-sm font-bold shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
              پیام یا توضیحات کوچ برای دانش‌آموز
            </label>
            <textarea
              rows={3}
              value={respondNote}
              onChange={(e) => setRespondNote(e.target.value)}
              placeholder="مثال: جلسه در محل اتاق مشاوره برگزار می‌شود..."
              className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-sm font-medium shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRespondModalOpen(false)}
              className="border-2 border-zinc-900 font-bold"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmittingResponse}
              className="border-2 border-zinc-900 font-black px-5 shadow-[3px_3px_0px_0px_#18181b]"
            >
              {isSubmittingResponse ? 'در حال ذخیره...' : 'ثبت و ارسال نوتیفیکیشن'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= ADMIN: ASSIGN COACH MODAL ================= */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="تخصیص کوچ به دانش‌آموز با برنامه دو هفته یک‌بار"
      >
        <form onSubmit={handleSaveAssign} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
              انتخاب دانش‌آموز *
            </label>
            <select
              required
              value={assignStudentId}
              onChange={(e) => setAssignStudentId(e.target.value)}
              className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-sm font-bold shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900"
            >
              {unassignedStudents.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.firstName} {st.lastName} ({st.studentProfile?.enrollments?.[0]?.classroom?.name || 'کلاس عمومی'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
              انتخاب مربی / کوچ *
            </label>
            <select
              required
              value={assignCoachId}
              onChange={(e) => setAssignCoachId(e.target.value)}
              className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-sm font-bold shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900"
            >
              {availableCoaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName} ({c.role})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
                روز هفته
              </label>
              <select
                value={assignDayOfWeek}
                onChange={(e) => setAssignDayOfWeek(Number(e.target.value))}
                className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-sm font-bold shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900"
              >
                {PERSIAN_DAY_NAMES.map((name, idx) => (
                  <option key={idx} value={idx}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
                ساعت شروع
              </label>
              <input
                type="time"
                value={assignStartTime}
                onChange={(e) => setAssignStartTime(e.target.value)}
                className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-sm font-bold shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
                ساعت پایان
              </label>
              <input
                type="time"
                value={assignEndTime}
                onChange={(e) => setAssignEndTime(e.target.value)}
                className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-sm font-bold shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAssignModalOpen(false)}
              className="border-2 border-zinc-900 font-bold"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSavingAssign}
              className="border-2 border-zinc-900 font-black px-5 shadow-[3px_3px_0px_0px_#18181b]"
            >
              {isSavingAssign ? 'در حال ثبت...' : 'ثبت و زمان‌بندی جلسات دوهفته‌ای'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= DOSSIER REPORT MODAL ================= */}
      <CoachingDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        studentId={dossierStudentId}
      />
    </div>
  );
};
