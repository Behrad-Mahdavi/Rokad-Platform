import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { formatJalaliDisplay, toPersianDigits } from '../../../utils/jalali';
import {
  Printer,
  Calendar,
  Clock,
  UserCheck,
  UserX,
  FileText,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  GraduationCap,
  CalendarDays,
  Target,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface CoachingDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string | null;
}

const PERSIAN_DAY_NAMES = [
  'شنبه',
  'یک‌شنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
];

export const CoachingDossierModal: React.FC<CoachingDossierModalProps> = ({
  isOpen,
  onClose,
  studentId,
}) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !studentId) return;

    const fetchReport = async () => {
      setIsLoading(true);
      try {
        const res = await apiClient.get(`/coaching/students/${studentId}/report`);
        if (res && res.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Failed to load coaching dossier report', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [isOpen, studentId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="کارنامه و پرونده تحلیلی جلسات مربی‌گری (کوچینگ)"
    >
      {isLoading ? (
        <div className="py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-zinc-900 border-t-transparent dark:border-zinc-100" />
          <p className="mt-3 text-xs font-bold text-zinc-500">در حال دریافت پرونده جلسات دانش‌آموز...</p>
        </div>
      ) : !data ? (
        <div className="py-8 text-center text-sm font-bold text-zinc-500">
          اطلاعات پرونده در دسترس نیست.
        </div>
      ) : (
        <div className="space-y-6 print:m-0 print:p-0">
          {/* Header Card / Printable banner */}
          <div className="rounded-2xl border-2 border-zinc-900 bg-zinc-50 p-5 shadow-[3px_3px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-800/60 dark:shadow-[3px_3px_0px_0px_#f4f4f5]">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-black text-indigo-600 dark:text-indigo-400 mb-1">
                  <Target className="w-4 h-4" />
                  <span>گزارش رسمی فرآیند مربی‌گری و هدایت تحصیلی</span>
                </div>
                <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50">
                  {data.student?.firstName} {data.student?.lastName}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-bold text-zinc-600 dark:text-zinc-400">
                  <span>کلاس: {data.student?.classroom}</span>
                  {data.student?.studentCode && (
                    <span>شماره دانش‌آموزی: {toPersianDigits(data.student?.studentCode)}</span>
                  )}
                  {data.activeCoach && (
                    <span className="text-primary font-black">
                      مربی/کوچ: {data.activeCoach.firstName} {data.activeCoach.lastName}
                    </span>
                  )}
                </div>
              </div>

              {/* Print Action */}
              <div className="print:hidden">
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  className="gap-2 text-xs font-black border-2 border-zinc-900 bg-white shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900 dark:shadow-[2px_2px_0px_0px_#f4f4f5]"
                >
                  <Printer className="w-4 h-4" />
                  چاپ گزارش / ذخیره PDF
                </Button>
              </div>
            </div>

            {/* Fixed Schedule Slot */}
            {data.schedule && (
              <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700 flex flex-wrap items-center gap-4 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <span className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                  <CalendarDays className="w-4 h-4" />
                  برنامه ثابت: هر دو هفته یک‌بار، {PERSIAN_DAY_NAMES[data.schedule.slotDayOfWeek] || 'نامشخص'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  ساعت {toPersianDigits(data.schedule.slotStartTime)} الی {toPersianDigits(data.schedule.slotEndTime)}
                </span>
                <span className="bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded text-[11px]">
                  جلسات {toPersianDigits(data.schedule.slotDurationMinutes)} دقیقه‌ای
                </span>
              </div>
            )}
          </div>

          {/* KPI Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border-2 border-zinc-900 bg-white p-3 text-center shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900">
              <span className="block text-2xl font-black text-zinc-900 dark:text-zinc-100">
                {toPersianDigits(data.stats?.totalSessions)}
              </span>
              <span className="text-[11px] font-bold text-zinc-500">کل جلسات ثبت‌شده</span>
            </div>
            <div className="rounded-xl border-2 border-emerald-600 bg-emerald-50 p-3 text-center shadow-[2px_2px_0px_0px_#059669] dark:bg-emerald-950/40">
              <span className="block text-2xl font-black text-emerald-700 dark:text-emerald-300">
                {toPersianDigits(data.stats?.attended)}
              </span>
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">جلسات حضور یافته</span>
            </div>
            <div className="rounded-xl border-2 border-rose-600 bg-rose-50 p-3 text-center shadow-[2px_2px_0px_0px_#e11d48] dark:bg-rose-950/40">
              <span className="block text-2xl font-black text-rose-700 dark:text-rose-300">
                {toPersianDigits(data.stats?.absent)}
              </span>
              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400">جلسات غیبت</span>
            </div>
            <div className="rounded-xl border-2 border-indigo-600 bg-indigo-50 p-3 text-center shadow-[2px_2px_0px_0px_#4f46e5] dark:bg-indigo-950/40">
              <span className="block text-2xl font-black text-indigo-700 dark:text-indigo-300">
                ٪{toPersianDigits(data.stats?.attendanceRate)}
              </span>
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400">نرخ مشارکت و حضور</span>
            </div>
          </div>

          {/* Sessions List Table & Notes */}
          <div className="space-y-3">
            <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span>ریز جلسات برگزارشده و یادداشت‌های تفصیلی مربی:</span>
            </h4>

            {data.sessions?.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-xs font-bold text-zinc-400">
                هنوز جلسه‌ای برای این دانش‌آموز ثبت نشده است.
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {data.sessions.map((s: any) => {
                  const jalaliDate = formatJalaliDisplay(s.scheduledDate, true);
                  const time = new Date(s.scheduledDate).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

                  let statusBadge = (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black border border-zinc-300 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      در انتظار برگزاری
                    </span>
                  );
                  if (s.attendanceStatus === 'PRESENT') {
                    statusBadge = (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black border border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        حاضر
                      </span>
                    );
                  } else if (s.attendanceStatus === 'ABSENT') {
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
                      className="rounded-xl border-2 border-zinc-900 bg-white p-4 shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900 dark:shadow-[2px_2px_0px_0px_#f4f4f5] space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                            {jalaliDate}
                          </span>
                          <span className="text-[11px] font-bold text-zinc-500">
                            ساعت {time} ({toPersianDigits(s.durationMinutes)} دقیقه)
                          </span>
                          {s.sessionType === 'EXTRA' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black border border-purple-400 bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                              فوق‌العاده
                            </span>
                          )}
                        </div>
                        <div>{statusBadge}</div>
                      </div>

                      {/* Coach Notes */}
                      {s.coachNotes ? (
                        <div className="text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 leading-relaxed font-medium">
                          <span className="block font-black text-primary mb-1">یادداشت و مشاهدات مربی:</span>
                          {s.coachNotes}
                        </div>
                      ) : (
                        <p className="text-[11px] text-zinc-400 italic">یادداشتی برای این جلسه درج نشده است.</p>
                      )}

                      {/* Action items */}
                      {s.actionItems && (
                        <div className="text-xs text-indigo-900 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-800 leading-relaxed font-bold">
                          <span>اهداف و تکالیف تعیین‌شده: </span>
                          <span>{s.actionItems}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
