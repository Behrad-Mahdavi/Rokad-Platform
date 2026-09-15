import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ResponsivePageHeader } from '../../../components/ui/ResponsivePageHeader';
import { toPersianDigits } from '../../../utils/jalali';
import {
  CalendarDays,
  Clock,
  GraduationCap,
  BookOpen,
  UserCheck,
  FileCheck,
  HelpCircle,
  FolderDown,
  ArrowUpRight,
  Calendar,
  Sparkles,
  MapPin,
  Users,
} from 'lucide-react';

export type DayOfWeekKey =
  | 'SATURDAY'
  | 'SUNDAY'
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY';

interface DayDef {
  key: DayOfWeekKey;
  label: string;
  dayIndex: number;
}

const DAYS: DayDef[] = [
  { key: 'SATURDAY', label: 'شنبه', dayIndex: 6 },
  { key: 'SUNDAY', label: 'یکشنبه', dayIndex: 0 },
  { key: 'MONDAY', label: 'دوشنبه', dayIndex: 1 },
  { key: 'TUESDAY', label: 'سه‌شنبه', dayIndex: 2 },
  { key: 'WEDNESDAY', label: 'چهارشنبه', dayIndex: 3 },
  { key: 'THURSDAY', label: 'پنج‌شنبه', dayIndex: 4 },
];

const PERIOD_LABELS: Record<number, string> = {
  1: 'زنگ اول',
  2: 'زنگ دوم',
  3: 'زنگ سوم',
  4: 'زنگ چهارم',
  5: 'زنگ پنجم',
  6: 'زنگ ششم',
};

interface StudentScheduleItem {
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
  const [viewMode, setViewMode] = useState<'TAB' | 'WEEKLY'>('TAB');

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

  const daySchedules = schedules
    .filter((s) => s.dayOfWeek === selectedDay)
    .sort((a, b) => {
      if (a.periodNumber !== b.periodNumber) return a.periodNumber - b.periodNumber;
      return a.startTime.localeCompare(b.startTime);
    });

  const totalWeeklySessions = schedules.length;
  const todaySessionsCount = schedules.filter((s) => s.dayOfWeek === todayDayDef.key).length;
  const uniqueLessonsCount = Array.from(new Set(schedules.map((s) => s.lessonId))).length;

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
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Banner */}
      <ResponsivePageHeader
        icon={CalendarDays}
        title={isParent ? 'برنامه هفتگی فرزند' : 'برنامه هفتگی کلاس من'}
        description="زمان‌بندی زنگ‌های درسی، ساعات شروع و پایان کلاس‌ها و مربیان هر مبحث"
        badge={
          <div className="flex flex-wrap items-center gap-1.5">
            {classroom && (
              <Badge variant="college" className="text-[11px]">
                کلاس: {classroom.name}
              </Badge>
            )}
            {studentInfo && isParent && (
              <Badge variant="female" className="text-[11px]">
                دانش‌آموز: {studentInfo.user?.firstName} {studentInfo.user?.lastName}
              </Badge>
            )}
          </div>
        }
        actions={
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setViewMode('TAB')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'TAB'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              نمای روزانه (تبی)
            </button>
            <button
              onClick={() => setViewMode('WEEKLY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'WEEKLY'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              نمای کل هفته
            </button>
          </div>
        }
      />

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border border-border/60 bg-surface/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">کل ساعات و زنگ‌های هفتگی</span>
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">
            {toPersianDigits(totalWeeklySessions)}{' '}
            <span className="text-xs font-normal text-muted-foreground">زنگ آموزشی</span>
          </div>
        </Card>

        <Card className="p-4 border border-border/60 bg-surface/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">کلاس‌های امروز ({todayDayDef.label})</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">
            {toPersianDigits(todaySessionsCount)}{' '}
            <span className="text-xs font-normal text-muted-foreground">زنگ درس</span>
          </div>
        </Card>

        <Card className="p-4 border border-border/60 bg-surface/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">تعداد عناوین درسی</span>
            <BookOpen className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">
            {toPersianDigits(uniqueLessonsCount)}{' '}
            <span className="text-xs font-normal text-muted-foreground">عنوان درس</span>
          </div>
        </Card>
      </div>

      {/* View Mode: Day Tabs */}
      {viewMode === 'TAB' && (
        <div className="space-y-4">
          {/* Day of the Week Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border/60 scrollbar-none">
            {DAYS.map((day) => {
              const count = schedules.filter((s) => s.dayOfWeek === day.key).length;
              const isSelected = selectedDay === day.key;
              const isToday = todayDayDef.key === day.key;

              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setSelectedDay(day.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-sm scale-105'
                      : 'bg-surface/50 text-muted-foreground hover:bg-surface hover:text-foreground'
                  }`}
                >
                  <span>{day.label}</span>
                  {count > 0 ? (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-surface-hover text-foreground/80'
                      }`}
                    >
                      {toPersianDigits(count)} زنگ
                    </span>
                  ) : (
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                        isSelected ? 'bg-white/10 text-white/80' : 'text-muted-foreground/60'
                      }`}
                    >
                      بدون کلاس
                    </span>
                  )}

                  {isToday && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSelected ? 'bg-emerald-300' : 'bg-emerald-500'
                      }`}
                      title="امروز"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Slot Cards for Selected Day */}
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </div>
          ) : daySchedules.length === 0 ? (
            <div className="text-center py-16 bg-surface/20 rounded-2xl border border-dashed border-border/60">
              <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-semibold text-foreground">
                در روز {DAYS.find((d) => d.key === selectedDay)?.label} هیچ کلاسی تشکیل نمی‌شود
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                برای مشاهده زنگ‌های سایر ایام هفته، تب‌های بالا را انتخاب فرمایید.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {daySchedules.map((slot) => {
                const isNow = isSlotActiveNow(slot);
                const periodLabel = PERIOD_LABELS[slot.periodNumber] || `زنگ ${slot.periodNumber}`;
                const formattedStartTime = toPersianDigits(slot.startTime);
                const formattedEndTime = toPersianDigits(slot.endTime);

                return (
                  <Card
                    key={slot.id}
                    className={`p-6 border transition-all duration-200 shadow-xs relative overflow-hidden ${
                      isNow
                        ? 'border-emerald-500/60 bg-gradient-to-r from-emerald-500/10 via-surface/60 to-surface ring-1 ring-emerald-500/30'
                        : 'border-border/60 hover:border-primary/40 bg-surface/40'
                    }`}
                  >
                    {isNow && (
                      <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-emerald-500 to-teal-400 animate-pulse" />
                    )}

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Slot Information */}
                      <div className="space-y-2.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="default" className="font-bold">
                            {periodLabel}
                          </Badge>

                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface/80 border border-border/50 text-xs font-bold text-foreground">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            <span>
                              {DAYS.find((d) => d.key === slot.dayOfWeek)?.label} - ساعت {formattedStartTime} تا {formattedEndTime}
                            </span>
                          </div>

                          {isNow && (
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full animate-pulse">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              کلاس در حال برگزاری (اکنون)
                            </span>
                          )}
                        </div>

                        {/* Lesson Title & Info */}
                        {slot.isSplitPeriod ? (
                          <div className="space-y-3 pt-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md font-bold">
                                تک‌زنگ (۲ درس ۴۵ دقیقه‌ای)
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Part 1 */}
                              <div className="p-3 bg-primary-50/20 rounded-xl border border-primary/20 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-primary">۴۵ دقیقه اول</span>
                                  {slot.lesson?.code && (
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      کد: {toPersianDigits(slot.lesson.code)}
                                    </span>
                                  )}
                                </div>
                                <h3 className="font-extrabold text-base text-foreground flex items-center gap-1.5">
                                  <BookOpen className="w-4 h-4 text-primary shrink-0" />
                                  <span>{slot.lesson?.name}</span>
                                </h3>
                                {slot.teacher?.user && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <UserCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                    <span>
                                      استاد: {slot.teacher.user.firstName} {slot.teacher.user.lastName}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Part 2 */}
                              <div className="p-3 bg-purple-50/30 rounded-xl border border-purple-200/60 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-purple-700">۴۵ دقیقه دوم</span>
                                  {slot.secondLesson?.code && (
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      کد: {toPersianDigits(slot.secondLesson.code)}
                                    </span>
                                  )}
                                </div>
                                <h3 className="font-extrabold text-base text-foreground flex items-center gap-1.5">
                                  <BookOpen className="w-4 h-4 text-purple-600 shrink-0" />
                                  <span>{slot.secondLesson?.name || '—'}</span>
                                </h3>
                                {slot.secondTeacher?.user && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <UserCheck className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                    <span>
                                      استاد: {slot.secondTeacher.user.firstName} {slot.secondTeacher.user.lastName}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                              {classroom && (
                                <div className="flex items-center gap-1.5 bg-surface/60 px-2.5 py-1 rounded-md border border-border/40">
                                  <GraduationCap className="w-4 h-4 text-purple-500" />
                                  <span>کلاس: {classroom.name}</span>
                                </div>
                              )}
                              <span className="text-xs text-muted-foreground">
                                روز: {DAYS.find((d) => d.key === slot.dayOfWeek)?.label}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="pt-1">
                              <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-primary shrink-0" />
                                <span>{slot.lesson?.name}</span>
                                {slot.lesson?.code && (
                                  <span className="text-xs font-normal text-muted-foreground">
                                    (کد: {toPersianDigits(slot.lesson.code)})
                                  </span>
                                )}
                              </h2>
                            </div>

                            {/* Teacher and Classroom Information */}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                              {slot.teacher?.user && (
                                <div className="flex items-center gap-1.5 bg-surface/60 px-2.5 py-1 rounded-md border border-border/40 font-semibold text-foreground">
                                  <UserCheck className="w-4 h-4 text-blue-500" />
                                  <span>
                                    استاد: {slot.teacher.user.firstName} {slot.teacher.user.lastName}
                                  </span>
                                </div>
                              )}

                              {classroom && (
                                <div className="flex items-center gap-1.5 bg-surface/60 px-2.5 py-1 rounded-md border border-border/40">
                                  <GraduationCap className="w-4 h-4 text-purple-500" />
                                  <span>کلاس: {classroom.name}</span>
                                </div>
                              )}

                              <span className="text-xs text-muted-foreground">
                                روز: {DAYS.find((d) => d.key === slot.dayOfWeek)?.label}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Quick Actions for Student */}
                      {!isParent && (
                        <div className="flex flex-wrap items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-border/40 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/app/student/homework?lessonId=${slot.lessonId}&lessonName=${encodeURIComponent(slot.lesson?.name || '')}`
                              )
                            }
                            className="text-xs flex items-center gap-1.5 h-9"
                            title={`مشاهده و ارسال تکالیف ${slot.lesson?.name}`}
                          >
                            <FileCheck className="w-3.5 h-3.5 text-amber-500" />
                            <span>تکالیف درس</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/app/student/materials?lessonId=${slot.lessonId}&lessonName=${encodeURIComponent(slot.lesson?.name || '')}`
                              )
                            }
                            className="text-xs flex items-center gap-1.5 h-9"
                            title={`دانلود جزوات و ویدیوهای ${slot.lesson?.name}`}
                          >
                            <FolderDown className="w-3.5 h-3.5 text-purple-500" />
                            <span>جزوات و فایل‌ها</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/app/student/exams?lessonId=${slot.lessonId}&lessonName=${encodeURIComponent(slot.lesson?.name || '')}`
                              )
                            }
                            className="text-xs flex items-center gap-1.5 h-9"
                            title={`آزمون‌های آنلاین درس ${slot.lesson?.name}`}
                          >
                            <HelpCircle className="w-3.5 h-3.5 text-primary" />
                            <span>آزمون‌ها</span>
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
      )}

      {/* View Mode: Weekly Matrix */}
      {viewMode === 'WEEKLY' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DAYS.map((day) => {
            const daySlots = schedules
              .filter((s) => s.dayOfWeek === day.key)
              .sort((a, b) => a.periodNumber - b.periodNumber);

            const isToday = todayDayDef.key === day.key;

            return (
              <Card
                key={day.key}
                className={`p-5 border transition-all flex flex-col justify-between ${
                  isToday
                    ? 'border-primary/50 bg-primary/5 shadow-xs'
                    : 'border-border/60 bg-surface/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-foreground text-base">{day.label}</h3>
                      {isToday && <Badge variant="success">امروز</Badge>}
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {toPersianDigits(daySlots.length)} زنگ
                    </span>
                  </div>

                  {daySlots.length === 0 ? (
                    <p className="text-xs text-muted-foreground/70 py-6 text-center">
                      بدون کلاس در این روز
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {daySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="p-2.5 rounded-xl border border-border/50 bg-surface/60 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">{slot.lesson?.name}</span>
                            <span className="text-[11px] font-semibold text-muted-foreground">
                              {toPersianDigits(slot.startTime)} - {toPersianDigits(slot.endTime)}
                            </span>
                          </div>
                          <div className="text-muted-foreground text-[11px] flex items-center justify-between">
                            <span>
                              استاد:{' '}
                              {slot.teacher?.user
                                ? `${slot.teacher.user.firstName} ${slot.teacher.user.lastName}`
                                : '-'}
                            </span>
                            <span className="text-primary font-medium">
                              {PERIOD_LABELS[slot.periodNumber] || `زنگ ${slot.periodNumber}`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-border/30">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDay(day.key);
                      setViewMode('TAB');
                    }}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>مشاهده جزئیات این روز</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
