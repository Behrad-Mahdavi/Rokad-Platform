import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { toPersianDigits, formatJalaliDisplay } from '../../../utils/jalali';
import {
  CalendarDays,
  Clock,
  GraduationCap,
  BookOpen,
  CalendarCheck2,
  CheckCircle2,
  FileCheck,
  Sparkles,
  Layers,
  MapPin,
  ArrowUpRight,
  ListFilter,
  Calendar,
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
  shortLabel: string;
  dayIndex: number; // 6: Sat, 0: Sun, 1: Mon, ...
}

const DAYS: DayDef[] = [
  { key: 'SATURDAY', label: 'شنبه', shortLabel: 'ش', dayIndex: 6 },
  { key: 'SUNDAY', label: 'یکشنبه', shortLabel: 'ی', dayIndex: 0 },
  { key: 'MONDAY', label: 'دوشنبه', shortLabel: 'د', dayIndex: 1 },
  { key: 'TUESDAY', label: 'سه‌شنبه', shortLabel: 'س', dayIndex: 2 },
  { key: 'WEDNESDAY', label: 'چهارشنبه', shortLabel: 'چ', dayIndex: 3 },
  { key: 'THURSDAY', label: 'پنج‌شنبه', shortLabel: 'پ', dayIndex: 4 },
];

const PERIOD_LABELS: Record<number, string> = {
  1: 'زنگ اول',
  2: 'زنگ دوم',
  3: 'زنگ سوم',
  4: 'زنگ چهارم',
  5: 'زنگ پنجم',
  6: 'زنگ ششم',
};

interface ClassScheduleItem {
  id: string;
  classroomId: string;
  lessonId: string;
  teacherId: string;
  dayOfWeek: DayOfWeekKey;
  periodNumber: number;
  startTime: string;
  endTime: string;
  classroom: {
    id: string;
    name: string;
    code?: string;
    roomNumber?: string;
  };
  lesson: {
    id: string;
    name: string;
    code?: string;
  };
}

export const TeacherSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [schedules, setSchedules] = useState<ClassScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Determine today's day of week
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
        const items = data?.schedules || (Array.isArray(data) ? data : []);
        setSchedules(items);
      } catch (err: any) {
        console.error('Failed to load teacher schedule:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedule();
  }, []);

  // Filter schedules for the selected day
  const daySchedules = schedules
    .filter((s) => s.dayOfWeek === selectedDay)
    .sort((a, b) => {
      if (a.periodNumber !== b.periodNumber) return a.periodNumber - b.periodNumber;
      return a.startTime.localeCompare(b.startTime);
    });

  // Calculate stats
  const totalWeeklySessions = schedules.length;
  const uniqueClassrooms = Array.from(new Set(schedules.map((s) => s.classroomId))).length;
  const todaySessionsCount = schedules.filter((s) => s.dayOfWeek === todayDayDef.key).length;

  // Check if a class slot is currently in progress
  const isSlotActiveNow = (slot: ClassScheduleItem) => {
    if (slot.dayOfWeek !== todayDayDef.key) return false;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = slot.startTime.split(':').map(Number);
    const [endH, endM] = slot.endTime.split(':').map(Number);

    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    return currentMinutes >= startTotal && currentMinutes <= endTotal;
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface/40 p-6 rounded-2xl border border-border/50 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                برنامه هفتگی تدریس من
              </h1>
              <Badge variant="college">
                استاد: {user?.firstName} {user?.lastName}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              مشاهده زنگ‌ها و ساعات کلاسی هفتگی به صورت اسلاتی و بر اساس روزهای هفته
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('TAB')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              viewMode === 'TAB'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-surface/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            نمای روزانه (تبی)
          </button>
          <button
            onClick={() => setViewMode('WEEKLY')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              viewMode === 'WEEKLY'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-surface/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            نمای کل هفته
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border border-border/60 bg-surface/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">کل جلسات هفتگی</span>
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">
            {toPersianDigits(totalWeeklySessions)} <span className="text-xs font-normal text-muted-foreground">زنگ درس</span>
          </div>
        </Card>

        <Card className="p-4 border border-border/60 bg-surface/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">کلاس‌های امروز ({todayDayDef.label})</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">
            {toPersianDigits(todaySessionsCount)} <span className="text-xs font-normal text-muted-foreground">کلاس تدریس</span>
          </div>
        </Card>

        <Card className="p-4 border border-border/60 bg-surface/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">کلاس‌ها و کارگاه‌های تحت تدریس</span>
            <GraduationCap className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">
            {toPersianDigits(uniqueClassrooms)} <span className="text-xs font-normal text-muted-foreground">کلاس مجزا</span>
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
                      {toPersianDigits(count)} کلاس
                    </span>
                  ) : (
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                        isSelected ? 'bg-white/10 text-white/80' : 'text-muted-foreground/60'
                      }`}
                    >
                      خالی
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

          {/* Slot Cards for the Selected Day */}
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </div>
          ) : daySchedules.length === 0 ? (
            <div className="text-center py-16 bg-surface/20 rounded-2xl border border-dashed border-border/60">
              <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-semibold text-foreground">
                برای روز {DAYS.find((d) => d.key === selectedDay)?.label} کلاسی در برنامه شما ثبت نشده است
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                می‌توانید سایر روزهای هفته را از تب‌های بالا بررسی نمایید.
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
                    {/* Live Indicator Accent */}
                    {isNow && (
                      <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-emerald-500 to-teal-400 animate-pulse" />
                    )}

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left/Main Slot Information */}
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

                        {/* Lesson Title */}
                        <div className="pt-1">
                          <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-primary shrink-0" />
                            <span>{slot.lesson?.name}</span>
                            {slot.lesson?.code && (
                              <span className="text-xs font-normal text-muted-foreground">
                                (کد درس: {toPersianDigits(slot.lesson.code)})
                              </span>
                            )}
                          </h2>
                        </div>

                        {/* Classroom & Location Badges */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                          <div className="flex items-center gap-1.5 bg-surface/60 px-2.5 py-1 rounded-md border border-border/40 font-semibold text-foreground">
                            <GraduationCap className="w-4 h-4 text-purple-500" />
                            <span>کلاس: {slot.classroom?.name}</span>
                          </div>

                          {slot.classroom?.roomNumber && (
                            <div className="flex items-center gap-1.5 bg-surface/60 px-2.5 py-1 rounded-md border border-border/40">
                              <MapPin className="w-3.5 h-3.5 text-amber-500" />
                              <span>محل: {slot.classroom.roomNumber}</span>
                            </div>
                          )}

                          <span className="text-xs text-muted-foreground">
                            روز: {DAYS.find((d) => d.key === slot.dayOfWeek)?.label}
                          </span>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-border/40 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(`/app/teacher/attendance?classroomId=${slot.classroomId}`)
                          }
                          className="text-xs flex items-center gap-1.5 h-9"
                          title={`ثبت حضور و غیاب ${slot.classroom?.name}`}
                        >
                          <CalendarCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>ثبت حضور و غیاب</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(
                              `/app/teacher/homework?classroomId=${slot.classroomId}&lessonId=${slot.lessonId}&lessonName=${encodeURIComponent(slot.lesson?.name || '')}&classroomName=${encodeURIComponent(slot.classroom?.name || '')}`
                            )
                          }
                          className="text-xs flex items-center gap-1.5 h-9"
                          title={`تکالیف درس ${slot.lesson?.name} برای کلاس ${slot.classroom?.name}`}
                        >
                          <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                          <span>تکالیف کلاس</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(
                              `/app/teacher/lessons?tab=PLANS&lessonId=${slot.lessonId}&lessonName=${encodeURIComponent(slot.lesson?.name || '')}`
                            )
                          }
                          className="text-xs flex items-center gap-1.5 h-9"
                          title={`مشاهده و تدوین طرح درس ${slot.lesson?.name}`}
                        >
                          <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                          <span>دیدن طرح درس</span>
                        </Button>
                      </div>
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
                      {toPersianDigits(daySlots.length)} کلاس
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
                            <span>کلاس: {slot.classroom?.name}</span>
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
