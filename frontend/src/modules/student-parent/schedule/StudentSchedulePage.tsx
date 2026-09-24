import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { toPersianDigits } from '../../../utils/jalali';
import { generateSchedulePdf } from './schedulePdfGenerator';
import {
  CalendarDays,
  Clock,
  BookOpen,
  UserCheck,
  FileCheck,
  HelpCircle,
  FolderDown,
  ChevronRight,
  ChevronLeft,
  FileDown,
} from 'lucide-react';

export type DayOfWeekKey =
  | 'SATURDAY'
  | 'SUNDAY'
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY';

export interface DayDef {
  key: DayOfWeekKey;
  label: string;
  dayIndex: number;
}

export const DAYS: DayDef[] = [
  { key: 'SATURDAY', label: 'شنبه', dayIndex: 6 },
  { key: 'SUNDAY', label: 'یکشنبه', dayIndex: 0 },
  { key: 'MONDAY', label: 'دوشنبه', dayIndex: 1 },
  { key: 'TUESDAY', label: 'سه‌شنبه', dayIndex: 2 },
  { key: 'WEDNESDAY', label: 'چهارشنبه', dayIndex: 3 },
  { key: 'THURSDAY', label: 'پنج‌شنبه', dayIndex: 4 },
];

export const PERIOD_LABELS: Record<number, string> = {
  1: 'زنگ اول',
  2: 'زنگ دوم',
  3: 'زنگ سوم',
  4: 'زنگ چهارم',
};

export const STANDARD_PERIODS = [
  { number: 1, label: 'زنگ اول', startTime: '07:30', endTime: '09:00' },
  { number: 2, label: 'زنگ دوم', startTime: '09:20', endTime: '10:40' },
  { number: 3, label: 'زنگ سوم', startTime: '11:00', endTime: '12:10' },
  { number: 4, label: 'زنگ چهارم', startTime: '12:30', endTime: '13:35' },
];

export interface StudentScheduleItem {
  id: string;
  classroomId: string;
  lessonId: string;
  teacherId: string;
  isSplitPeriod?: boolean;
  secondLessonId?: string;
  secondTeacherId?: string;
  secondLesson?: {
    id: string;
    name: string;
    code?: string;
  };
  secondTeacher?: {
    user: {
      firstName: string;
      lastName: string;
      phone?: string;
    };
  };
  dayOfWeek: DayOfWeekKey;
  periodNumber: number;
  startTime: string;
  endTime: string;
  lesson: {
    id: string;
    name: string;
    code?: string;
  };
  teacher?: {
    user: {
      firstName: string;
      lastName: string;
      phone?: string;
    };
  };
}

export const StudentSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [classroom, setClassroom] = useState<any>(null);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [schedules, setSchedules] = useState<StudentScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentJsDay = new Date().getDay();
  const todayDayDef = DAYS.find((d) => d.dayIndex === currentJsDay) || DAYS[0];
  const [selectedDay, setSelectedDay] = useState<DayOfWeekKey>(todayDayDef.key);

  useEffect(() => {
    const fetchSchedule = async () => {
      setIsLoading(true);
      try {
        const res = await apiClient.get<any>('/classes/my-schedule');
        const data = res.data;
        setClassroom(data?.classroom || null);
        setStudentInfo(data?.student || null);
        const items = data?.schedules || (Array.isArray(data) ? data : []);
        setSchedules(items);
      } catch (err: any) {
        console.error('Failed to load student schedule:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedule();
  }, []);

  // Filter and sort schedules for the selected day
  const daySchedules = schedules
    .filter((s) => s.dayOfWeek === selectedDay)
    .sort((a, b) => {
      if (a.periodNumber !== b.periodNumber) return a.periodNumber - b.periodNumber;
      return a.startTime.localeCompare(b.startTime);
    });

  // Navigation handlers for next and previous day
  const currentDayIndex = DAYS.findIndex((d) => d.key === selectedDay);
  const currentDayDef = DAYS[currentDayIndex] || DAYS[0];
  const isSelectedDayToday = selectedDay === todayDayDef.key;

  const handlePrevDay = () => {
    // In Persian RTL: "روز قبل" moves back in the week (right arrow)
    if (currentDayIndex > 0) {
      setSelectedDay(DAYS[currentDayIndex - 1].key);
    } else {
      setSelectedDay(DAYS[DAYS.length - 1].key);
    }
  };

  const handleNextDay = () => {
    // In Persian RTL: "روز بعد" moves forward in the week (left arrow)
    if (currentDayIndex < DAYS.length - 1) {
      setSelectedDay(DAYS[currentDayIndex + 1].key);
    } else {
      setSelectedDay(DAYS[0].key);
    }
  };

  // PDF Export
  const handleDownloadPdf = () => {
    generateSchedulePdf({
      classroomName: classroom?.name,
      studentName: studentInfo
        ? `${studentInfo.user?.firstName} ${studentInfo.user?.lastName}`
        : `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      schedules,
      days: DAYS,
      periodLabels: PERIOD_LABELS,
    });
  };

  const isSlotActiveNow = (slot: StudentScheduleItem) => {
    if (slot.dayOfWeek !== todayDayDef.key) return false;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = slot.startTime.split(':').map(Number);
    const [endH, endM] = slot.endTime.split(':').map(Number);

    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    return currentMinutes >= startTotal && currentMinutes <= endTotal;
  };

  const isParent = user?.role === 'PARENT';

  return (
    <div className="space-y-3.5 pb-12">
      {/* 1. Header & Controls Master Panel (Aligned with Messages Page) */}
      <div className="bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-[#242F42] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] p-4 sm:p-5 print:hidden">
        {/* Top Row: Title & Action Button side-by-side on all viewports */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black shadow-2xs shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <h1 className="text-lg sm:text-2xl font-black text-ink-darker dark:text-white truncate">
                برنامه هفتگی
              </h1>
              {classroom && (
                <Badge variant="college" className="text-[11px] sm:text-xs font-bold shrink-0">
                  {classroom.name}
                </Badge>
              )}
              {studentInfo && isParent && (
                <Badge variant="female" className="text-[11px] sm:text-xs font-bold shrink-0">
                  {studentInfo.user?.firstName} {studentInfo.user?.lastName}
                </Badge>
              )}
            </div>
          </div>

          {/* Action Button: Top-Left (Left side of header) with Green Accent */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="h-10 px-3.5 sm:px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-black text-xs sm:text-sm border-[1.5px] border-primary-dark shadow-[2px_2px_0_#438C83] dark:shadow-[2px_2px_0_#1F413D] hover:shadow-[2.5px_2.5px_0_#438C83] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer inline-flex items-center gap-1.5 sm:gap-2 shrink-0"
              title="دریافت نسخه رسمی و چاپ هفتگی به صورت PDF"
            >
              <FileDown className="w-4 h-4 shrink-0" />
              <span>دانلود (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Day Navigation Bar: Arrow buttons flanking the Day Title Box */}
      <div className="flex items-center justify-between gap-3 p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs">
        {/* Right Arrow: روز قبل (Previous Day in RTL) */}
        <button
          type="button"
          onClick={handlePrevDay}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold border border-gray-200 dark:border-[#242F42] bg-gray-50 dark:bg-[#1C2536] hover:bg-gray-100 dark:hover:bg-[#242F42] text-foreground dark:text-slate-200 active:scale-95 shadow-2xs group transition-colors"
          title="روز قبل"
          aria-label="روز قبل"
        >
          <ChevronRight className="w-4 h-4 text-primary" />
          <span className="hidden sm:inline">روز قبل</span>
        </button>

        {/* Center: Day Title Box */}
        <div className="flex-1 max-w-sm mx-auto flex items-center justify-center gap-2 py-1 px-3.5 rounded-xl bg-gray-50 dark:bg-[#1C2536] border border-gray-200 dark:border-[#242F42] text-center">
          <CalendarDays className="w-4 h-4 text-primary shrink-0" />
          <span className="text-base sm:text-lg font-black text-foreground dark:text-white">
            {currentDayDef.label}
          </span>
          {isSelectedDayToday && (
            <Badge variant="success" className="text-[10px] py-0.5 px-2">
              امروز
            </Badge>
          )}
        </div>

        {/* Left Arrow: روز بعد (Next Day in RTL) */}
        <button
          type="button"
          onClick={handleNextDay}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold border border-gray-200 dark:border-[#242F42] bg-gray-50 dark:bg-[#1C2536] hover:bg-gray-100 dark:hover:bg-[#242F42] text-foreground dark:text-slate-200 active:scale-95 shadow-2xs group transition-colors"
          title="روز بعد"
          aria-label="روز بعد"
        >
          <span className="hidden sm:inline">روز بعد</span>
          <ChevronLeft className="w-4 h-4 text-primary" />
        </button>
      </div>

      {/* 3. Daily Class Slots Section */}
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="space-y-2.5">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        ) : daySchedules.length === 0 ? (
          <div className="text-center py-14 bg-gray-50/50 dark:bg-[#151C28]/60 rounded-2xl border border-dashed border-gray-200 dark:border-[#242F42]">
            <CalendarDays className="w-10 h-10 text-muted-foreground dark:text-slate-500 mx-auto mb-2.5 opacity-60" />
            <h3 className="text-sm sm:text-base font-semibold text-foreground dark:text-white">
              در روز {currentDayDef.label} هیچ کلاسی تشکیل نمی‌شود
            </h3>
            <p className="text-xs text-muted-foreground dark:text-slate-400 mt-1">
              برای مشاهده زنگ‌های سایر ایام هفته، از دکمه‌های روز قبل یا روز بعد استفاده فرمایید.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {daySchedules.map((slot) => {
              const isNow = isSlotActiveNow(slot);
              const periodLabel = PERIOD_LABELS[slot.periodNumber] || `زنگ ${slot.periodNumber}`;
              const formattedStartTime = toPersianDigits(slot.startTime);
              const formattedEndTime = toPersianDigits(slot.endTime);
              const teacherFullName = slot.teacher?.user
                ? `${slot.teacher.user.firstName} ${slot.teacher.user.lastName}`
                : null;

              return (
                <Card
                  key={slot.id}
                  className={`p-3 sm:p-4 border shadow-xs relative overflow-hidden rounded-2xl transition-colors ${
                    isNow
                      ? 'border-emerald-500/70 dark:border-emerald-500/50 bg-gradient-to-r from-emerald-500/10 via-white to-white dark:from-emerald-950/30 dark:via-[#151C28] dark:to-[#151C28] ring-1 ring-emerald-500/40 dark:ring-emerald-500/30'
                      : 'border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28]'
                  }`}
                >
                  {isNow && (
                    <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500 shadow-sm" />
                  )}

                  <div className="flex flex-col justify-between gap-3">
                    {/* Slot Information */}
                    <div className="space-y-2 flex-1 min-w-0">
                      {/* Period Badge & Time Badge */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="default" className="font-bold text-xs py-0.5">
                          {periodLabel}
                        </Badge>

                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-gray-50 dark:bg-[#1C2536] border border-gray-200 dark:border-[#242F42] text-xs font-bold text-foreground dark:text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>
                            {formattedStartTime} تا {formattedEndTime}
                          </span>
                        </div>

                        {isNow && (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            کلاس در حال برگزاری
                          </span>
                        )}
                      </div>

                      {/* Lesson Details */}
                      {slot.isSplitPeriod ? (
                        <div className="space-y-2 pt-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-primary/10 dark:bg-primary-950/40 text-primary dark:text-primary-light border border-primary/20 dark:border-primary/40 px-2 py-0.5 rounded-md font-bold">
                              تک‌زنگ (۲ درس ۴۵ دقیقه‌ای)
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {/* Part 1 */}
                            <div className="p-2.5 bg-primary-50/30 dark:bg-primary-950/30 rounded-xl border border-primary/20 dark:border-primary/30 space-y-1">
                              <span className="text-[10px] font-bold text-primary dark:text-primary-light block">۴۵ دقیقه اول</span>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-extrabold text-base text-foreground dark:text-white flex items-center gap-1.5">
                                  <BookOpen className="w-4 h-4 text-primary shrink-0" />
                                  <span>{slot.lesson?.name}</span>
                                </h3>
                                {slot.teacher?.user && (
                                  <span className="inline-flex items-center gap-1 bg-gray-50 dark:bg-[#1C2536] px-2 py-0.5 rounded-md border border-gray-200 dark:border-[#242F42] text-[11px] font-medium text-muted-foreground dark:text-slate-300">
                                    <UserCheck className="w-3 h-3 text-blue-500 shrink-0" />
                                    <span>
                                      {slot.teacher.user.firstName} {slot.teacher.user.lastName}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Part 2 */}
                            <div className="p-2.5 bg-purple-50/30 dark:bg-purple-950/30 rounded-xl border border-purple-200/60 dark:border-purple-800/40 space-y-1">
                              <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 block">۴۵ دقیقه دوم</span>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-extrabold text-base text-foreground dark:text-white flex items-center gap-1.5">
                                  <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                  <span>{slot.secondLesson?.name || '—'}</span>
                                </h3>
                                {slot.secondTeacher?.user && (
                                  <span className="inline-flex items-center gap-1 bg-gray-50 dark:bg-[#1C2536] px-2 py-0.5 rounded-md border border-gray-200 dark:border-[#242F42] text-[11px] font-medium text-muted-foreground dark:text-slate-300">
                                    <UserCheck className="w-3 h-3 text-purple-500 shrink-0" />
                                    <span>
                                      {slot.secondTeacher.user.firstName} {slot.secondTeacher.user.lastName}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                          <h2 className="text-lg sm:text-xl font-black text-foreground dark:text-white flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-primary shrink-0" />
                            <span>{slot.lesson?.name}</span>
                          </h2>

                          {/* Teacher Name beside lesson name (without 'استاد:') */}
                          {teacherFullName && (
                            <span className="inline-flex items-center gap-1 bg-gray-50 dark:bg-[#1C2536] px-2.5 py-0.5 rounded-lg border border-gray-200 dark:border-[#242F42] text-xs font-semibold text-muted-foreground dark:text-slate-300">
                              <UserCheck className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                              <span>{teacherFullName}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick Actions for Student - Full width 3-column row */}
                    {!isParent && (
                      <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-gray-100 dark:border-[#242F42] w-full">
                        {/* 1. Right Box (First in RTL): محتوای آموزشی (رنگ بنفش زنده و مشخص هم‌تراز با دو دکمه دیگر) */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(
                              `/app/student/materials?lessonId=${slot.lessonId}&lessonName=${encodeURIComponent(slot.lesson?.name || '')}`
                            )
                          }
                          className="text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 h-8 w-full px-1 sm:px-2 rounded-xl border-purple-400/60 dark:border-purple-500/50 bg-purple-100/85 dark:bg-purple-600/25 text-purple-800 dark:text-purple-200 hover:bg-purple-200/80 dark:hover:bg-purple-600/35 shadow-2xs font-bold transition-colors"
                          title={`دانلود محتوای آموزشی ${slot.lesson?.name}`}
                        >
                          <FolderDown className="w-3.5 h-3.5 text-purple-700 dark:text-purple-300 shrink-0" />
                          <span className="whitespace-nowrap">محتوای آموزشی</span>
                        </Button>

                        {/* 2. Center Box: تکالیف (تونالیته زرد دیزاین سیستم) */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(
                              `/app/student/homework?lessonId=${slot.lessonId}&lessonName=${encodeURIComponent(slot.lesson?.name || '')}`
                            )
                          }
                          className="text-[10.5px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 h-8 w-full px-1 sm:px-2 rounded-xl border-third/40 bg-third-light/70 dark:bg-third/15 text-third-dark dark:text-third hover:bg-third-light dark:hover:bg-third/25 dark:border-third/40 shadow-2xs font-bold transition-colors"
                          title={`مشاهده و ارسال تکالیف ${slot.lesson?.name}`}
                        >
                          <FileCheck className="w-3.5 h-3.5 text-third-dark dark:text-third shrink-0" />
                          <span className="whitespace-nowrap">تکالیف</span>
                        </Button>

                        {/* 3. Left Box: آزمون‌ها (تونالیته صورتی/قرمز دیزاین سیستم) */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(
                              `/app/student/exams?lessonId=${slot.lessonId}&lessonName=${encodeURIComponent(slot.lesson?.name || '')}`
                            )
                          }
                          className="text-[10.5px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 h-8 w-full px-1 sm:px-2 rounded-xl border-girl/40 bg-girl-light/70 dark:bg-girl/15 text-girl-dark dark:text-girl-light hover:bg-girl-light dark:hover:bg-girl/25 dark:border-girl/40 shadow-2xs font-bold transition-colors"
                          title={`آزمون‌های آنلاین درس ${slot.lesson?.name}`}
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-girl dark:text-girl-light shrink-0" />
                          <span className="whitespace-nowrap">آزمون‌ها</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
