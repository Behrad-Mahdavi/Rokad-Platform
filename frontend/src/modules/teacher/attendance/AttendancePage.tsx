import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserCheck,
  UserX,
  Clock,
  ShieldAlert,
  CalendarCheck,
  Search,
  CheckCircle2,
  RefreshCw,
  Users,
  Send,
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  Briefcase,
  AlertCircle,
  Filter,
  Check,
  Building2,
  Sparkles,
  ArrowRight,
  GraduationCap,
  BookOpen,
  Calendar,
  Radio,
  PlayCircle,
  RotateCcw,
  Timer,
  Layers,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { StatCard } from '../../../components/ui/StatCard';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { PersianDatePicker } from '../../../components/ui/PersianDatePicker';
import {
  toPersianDigits,
  formatJalaliDisplay,
  gregorianToJalaliStr,
  getCurrentJalaliYearMonth,
  jalaliToGregorianDate,
} from '../../../utils/jalali';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'TARDY' | 'EXCUSED_ABSENT' | 'EXPELLED';

interface LocalStudentAttendance {
  studentId: string;
  studentCode: string;
  nationalCode?: string;
  fatherPhone?: string;
  motherPhone?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    phone?: string;
  };
  status: AttendanceStatus;
  delayMinutes: number;
  reason: string;
  isRecorded: boolean;
}

interface ScheduleSlot {
  id: string;
  classroomId: string;
  classroomName: string;
  classroomGrade: string;
  classroomField: string;
  lessonId: string;
  lessonName: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  isSplitPeriod?: boolean;
  stats?: {
    totalStudents: number;
    recordedCount: number;
    presentCount: number;
    absentCount: number;
    tardyCount: number;
    excusedCount: number;
    isRecorded: boolean;
    isFullyRecorded: boolean;
  };
}

const WEEK_DAYS_INFO = [
  { key: 'SATURDAY', name: 'شنبه' },
  { key: 'SUNDAY', name: 'یکشنبه' },
  { key: 'MONDAY', name: 'دوشنبه' },
  { key: 'TUESDAY', name: 'سه‌شنبه' },
  { key: 'WEDNESDAY', name: 'چهارشنبه' },
  { key: 'THURSDAY', name: 'پنج‌شنبه' },
];

export const AttendancePage: React.FC = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isManagerOrAdmin =
    user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN' || user?.role === 'STAFF';

  // 1. Live system time state (updates every second for real-time period highlight!)
  const [liveSystemTime, setLiveSystemTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveSystemTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Jalali date selection
  const todayJalali = useMemo(() => {
    const { year, month, day } = getCurrentJalaliYearMonth();
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayJalali);

  // Active top navigation tab: 'today_schedule' | 'all_classes' | 'staff_attendance'
  const [activeTab, setActiveTab] = useState<'today_schedule' | 'all_classes' | 'staff_attendance'>('today_schedule');

  // Active classroom sheet for recording attendance (null when on schedule list)
  const [activeSession, setActiveSession] = useState<{
    classroomId: string;
    classroomName: string;
    lessonName?: string;
    periodNumber: number;
    startTime?: string;
    endTime?: string;
  } | null>(null);

  // Search & edit state for attendance roster
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [studentsList, setStudentsList] = useState<LocalStudentAttendance[]>([]);

  // Modal for setting excuse reason or delay minutes
  const [detailModalStudent, setDetailModalStudent] = useState<LocalStudentAttendance | null>(null);
  const [modalDelayMinutes, setModalDelayMinutes] = useState<number>(0);
  const [modalReason, setModalReason] = useState<string>('');

  // 3. Date Navigation Helpers
  const isSelectedDateToday = selectedDate === todayJalali;

  const navigateDate = (deltaDays: number) => {
    try {
      const gDate = jalaliToGregorianDate(selectedDate);
      gDate.setDate(gDate.getDate() + deltaDays);
      const newJalali = gregorianToJalaliStr(gDate);
      setSelectedDate(newJalali);
      // Clear active session if date changes to avoid mismatch
      setActiveSession(null);
    } catch (e) {
      console.error('Failed to navigate date', e);
    }
  };

  // Convert current selected date to DayOfWeek name in Persian
  const currentDayOfWeekInfo = useMemo(() => {
    try {
      const gDate = jalaliToGregorianDate(selectedDate);
      const day = gDate.getDay();
      const map: Record<number, { key: string; name: string }> = {
        6: { key: 'SATURDAY', name: 'شنبه' },
        0: { key: 'SUNDAY', name: 'یکشنبه' },
        1: { key: 'MONDAY', name: 'دوشنبه' },
        2: { key: 'TUESDAY', name: 'سه‌شنبه' },
        3: { key: 'WEDNESDAY', name: 'چهارشنبه' },
        4: { key: 'THURSDAY', name: 'پنج‌شنبه' },
        5: { key: 'FRIDAY', name: 'جمعه' },
      };
      return map[day] || { key: 'SATURDAY', name: 'شنبه' };
    } catch {
      return { key: 'SATURDAY', name: 'شنبه' };
    }
  }, [selectedDate]);

  // Jump to specific weekday in the current week
  const selectWeekday = (targetDayKey: string) => {
    try {
      const gDate = jalaliToGregorianDate(selectedDate);
      const currentDay = gDate.getDay(); // 0: Sun, 1: Mon, ... 6: Sat
      // Sat is start of Persian week (day 6 -> index 0)
      const currentPersianIndex = currentDay === 6 ? 0 : currentDay + 1;
      const targetMap: Record<string, number> = {
        SATURDAY: 0,
        SUNDAY: 1,
        MONDAY: 2,
        TUESDAY: 3,
        WEDNESDAY: 4,
        THURSDAY: 5,
      };
      const targetIndex = targetMap[targetDayKey] ?? 0;
      const diff = targetIndex - currentPersianIndex;
      gDate.setDate(gDate.getDate() + diff);
      setSelectedDate(gregorianToJalaliStr(gDate));
      setActiveSession(null);
    } catch (e) {
      console.error(e);
    }
  };

  // 4. Live time calculation: check if current system time is within period slot
  const currentMinutes = useMemo(() => {
    return liveSystemTime.getHours() * 60 + liveSystemTime.getMinutes();
  }, [liveSystemTime]);

  const checkSlotStatus = (startTimeStr?: string, endTimeStr?: string) => {
    if (!startTimeStr || !endTimeStr) return 'INACTIVE';
    if (!isSelectedDateToday) return 'OTHER_DAY';

    const parseMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const start = parseMinutes(startTimeStr);
    const end = parseMinutes(endTimeStr);

    if (currentMinutes >= start && currentMinutes <= end) {
      return 'CURRENT'; // Currently active!
    } else if (currentMinutes > end) {
      return 'PASSED';
    } else {
      return 'UPCOMING';
    }
  };

  // 5. Query: Daily Schedule for Teacher
  const {
    data: dailyScheduleData,
    isLoading: isLoadingSchedule,
    refetch: refetchSchedule,
  } = useQuery({
    queryKey: ['teacher-daily-schedule', selectedDate],
    queryFn: async () => {
      const res: any = await apiClient.get(
        `/attendance/teacher-daily-schedule?date=${selectedDate}`,
      );
      return res?.data || res;
    },
  });

  const schedulesList: ScheduleSlot[] = useMemo(() => {
    return Array.isArray(dailyScheduleData?.schedules) ? dailyScheduleData.schedules : [];
  }, [dailyScheduleData]);

  // Find if there is an active running slot right now
  const activeNowSlot = useMemo(() => {
    if (!isSelectedDateToday) return null;
    return schedulesList.find((s) => checkSlotStatus(s.startTime, s.endTime) === 'CURRENT') || null;
  }, [schedulesList, isSelectedDateToday, currentMinutes]);

  // 6. Query: All Classrooms for fallback or manual selection
  const { data: allClassroomsData, isLoading: isLoadingAllClassrooms } = useQuery({
    queryKey: ['all-classrooms-attendance'],
    queryFn: async () => {
      const res: any = await apiClient.get('/classes/classrooms');
      const list = res?.data || res || [];
      return Array.isArray(list) ? list : [];
    },
  });

  // 7. Query: Roster & Attendance for Active Session
  const {
    data: sessionAttendanceData,
    isLoading: isLoadingRoster,
    isFetching: isFetchingRoster,
    refetch: refetchRoster,
  } = useQuery({
    enabled: !!activeSession?.classroomId,
    queryKey: [
      'classroom-attendance',
      activeSession?.classroomId,
      selectedDate,
      activeSession?.periodNumber,
    ],
    queryFn: async () => {
      if (!activeSession?.classroomId) return null;
      const res: any = await apiClient.get(
        `/attendance/classroom/${activeSession.classroomId}?date=${selectedDate}&periodNumber=${activeSession.periodNumber}`,
      );
      return res?.data || res;
    },
  });

  // Sync loaded attendance roster to editable state
  useEffect(() => {
    if (sessionAttendanceData && Array.isArray(sessionAttendanceData.students)) {
      const mapped = sessionAttendanceData.students.map((st: any) => ({
        studentId: st.studentId,
        studentCode: st.studentCode,
        nationalCode: st.nationalCode,
        fatherPhone: st.fatherPhone,
        motherPhone: st.motherPhone,
        user: st.user,
        status: (st.status as AttendanceStatus) || 'PRESENT',
        delayMinutes: st.delayMinutes || 0,
        reason: st.reason || '',
        isRecorded: !!st.isRecorded,
      }));
      setStudentsList(mapped);
      setHasUnsavedChanges(false);
    } else {
      setStudentsList([]);
    }
  }, [sessionAttendanceData]);

  // 8. Roster Summary Stats
  const rosterStats = useMemo(() => {
    const total = studentsList.length;
    const present = studentsList.filter((s) => s.status === 'PRESENT').length;
    const absent = studentsList.filter((s) => s.status === 'ABSENT').length;
    const tardy = studentsList.filter((s) => s.status === 'TARDY').length;
    const excused = studentsList.filter((s) => s.status === 'EXCUSED_ABSENT').length;
    const recorded = studentsList.filter((s) => s.isRecorded).length;
    return { total, present, absent, tardy, excused, recorded };
  }, [studentsList]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return studentsList;
    const q = searchQuery.toLowerCase().trim();
    return studentsList.filter((s) => {
      const fullName = `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.toLowerCase();
      const code = s.studentCode || '';
      const national = s.nationalCode || '';
      return fullName.includes(q) || code.includes(q) || national.includes(q);
    });
  }, [studentsList, searchQuery]);

  // 9. Bulk Save Attendance Mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession) return;
      const payload = {
        classroomId: activeSession.classroomId,
        date: selectedDate,
        periodNumber: activeSession.periodNumber,
        attendances: studentsList.map((s) => ({
          studentId: s.studentId,
          status: s.status,
          delayMinutes: s.status === 'TARDY' ? s.delayMinutes : 0,
          reason: s.reason || '',
        })),
      };
      const res: any = await apiClient.post('/attendance/students/bulk', payload);
      return res?.data || res;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'حضور و غیاب با موفقیت ثبت شد', {
        description: `کلاس ${activeSession?.classroomName} - زنگ ${toPersianDigits(activeSession?.periodNumber)}`,
      });
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['classroom-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-daily-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
    },
    onError: (err: any) => {
      toast.error('خطا در ثبت اطلاعات حضور و غیاب', {
        description: err?.response?.data?.message || 'لطفاً اتصال اینترنت را بررسی فرمایید',
      });
    },
  });

  // Action: Mark all present
  const handleMarkAllPresent = () => {
    setStudentsList((prev) =>
      prev.map((s) => ({
        ...s,
        status: 'PRESENT',
        delayMinutes: 0,
        reason: '',
      })),
    );
    setHasUnsavedChanges(true);
    toast.info('تمامی دانش‌آموزان به عنوان «حاضر» مشخص شدند');
  };

  // Action: Reset changes
  const handleResetToSaved = () => {
    refetchRoster();
    setHasUnsavedChanges(false);
    toast.info('تغییرات به آخرین وضعیت ذخیره‌شده بازگردانی شد');
  };

  // Action: Update single student status
  const handleUpdateStudentStatus = (studentId: string, newStatus: AttendanceStatus) => {
    setStudentsList((prev) =>
      prev.map((s) => {
        if (s.studentId === studentId) {
          return {
            ...s,
            status: newStatus,
            delayMinutes: newStatus === 'TARDY' ? (s.delayMinutes || 15) : 0,
          };
        }
        return s;
      }),
    );
    setHasUnsavedChanges(true);
  };

  // Detail Modal Save
  const handleSaveModalDetails = () => {
    if (!detailModalStudent) return;
    setStudentsList((prev) =>
      prev.map((s) => {
        if (s.studentId === detailModalStudent.studentId) {
          return {
            ...s,
            delayMinutes: modalDelayMinutes,
            reason: modalReason,
          };
        }
        return s;
      }),
    );
    setHasUnsavedChanges(true);
    setDetailModalStudent(null);
    toast.success('اطلاعات تکمیلی ثبت شد');
  };

  // 10. Query: Teacher Attendance Monitoring (for Managers/Staff)
  const { data: staffAttendanceData, isLoading: isLoadingStaffAttendance } = useQuery({
    enabled: isManagerOrAdmin && activeTab === 'staff_attendance',
    queryKey: ['teachers-attendance', selectedDate],
    queryFn: async () => {
      const res: any = await apiClient.get(`/attendance/teachers?date=${selectedDate}`);
      const list = res?.data || res || [];
      return Array.isArray(list) ? list : [];
    },
  });

  return (
    <div className="space-y-6 pb-20">
      {/* ─────────────────────────────────────────────────────────────
          TOP CONTROL BAR & JALALI HEADER
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-card border-3 border-black dark:border-white/20 p-5 rounded-3xl shadow-[6px_6px_0px_#000] dark:shadow-[6px_6px_0px_rgba(255,255,255,0.15)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Title & Live System Clock */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-400 border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_#000] shrink-0 text-black">
              <CalendarCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-foreground">
                  دفتر حضور و غیاب هوشمند
                </h1>
                <Badge variant="college" className="text-xs font-bold border-2 border-black">
                  رُکاد
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm font-bold text-muted-foreground">
                <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-xl border border-black/20 dark:border-white/20 text-foreground">
                  <Clock className="w-4 h-4 text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
                  <span>زمان سیستم:</span>
                  <span className="font-mono text-base font-black text-amber-600 dark:text-amber-400">
                    {toPersianDigits(
                      liveSystemTime.toLocaleTimeString('fa-IR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      }),
                    )}
                  </span>
                </div>
                {isSelectedDateToday && (
                  <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    تاریخ امروز
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Jalali Date Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center bg-neutral-50 dark:bg-neutral-900 border-2 border-black dark:border-white/20 rounded-2xl p-1 shadow-[3px_3px_0px_#000]">
              <button
                type="button"
                onClick={() => navigateDate(1)}
                title="روز بعد"
                className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-xl transition-all"
              >
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>

              <div className="px-3 text-center min-w-[170px]">
                <div className="text-xs font-bold text-muted-foreground">
                  {currentDayOfWeekInfo.name}
                </div>
                <div className="text-sm font-black text-foreground">
                  {formatJalaliDisplay(selectedDate, false)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigateDate(-1)}
                title="روز قبل"
                className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-xl transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* Quick Today Button */}
            {!isSelectedDateToday && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedDate(todayJalali);
                  setActiveSession(null);
                }}
                className="border-2 border-black font-black text-xs h-11 shadow-[2px_2px_0px_#000]"
              >
                امروز
              </Button>
            )}

            {/* Persian Date Picker */}
            <div className="w-36">
              <PersianDatePicker
                value={selectedDate}
                onChange={(d) => {
                  setSelectedDate(d);
                  setActiveSession(null);
                }}
                placeholder="انتخاب تاریخ"
                className="h-11 font-bold text-xs"
              />
            </div>
          </div>
        </div>

        {/* Weekdays Strip */}
        <div className="mt-5 pt-4 border-t-2 border-dashed border-neutral-200 dark:border-neutral-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-black text-muted-foreground ml-2">روزهای هفته:</span>
            {WEEK_DAYS_INFO.map((day) => {
              const isCurrentDay = currentDayOfWeekInfo.key === day.key;
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => selectWeekday(day.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 transition-all ${
                    isCurrentDay
                      ? 'bg-amber-400 text-black border-black shadow-[2px_2px_0px_#000] scale-105'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-foreground border-transparent hover:border-black/30'
                  }`}
                >
                  {day.name}
                </button>
              );
            })}
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('today_schedule');
                setActiveSession(null);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black border-2 transition-all ${
                activeTab === 'today_schedule'
                  ? 'bg-primary text-primary-foreground border-black shadow-[2px_2px_0px_#000]'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-foreground border-transparent'
              }`}
            >
              برنامه و زنگ‌های کلاسی
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('all_classes');
                setActiveSession(null);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black border-2 transition-all ${
                activeTab === 'all_classes'
                  ? 'bg-primary text-primary-foreground border-black shadow-[2px_2px_0px_#000]'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-foreground border-transparent'
              }`}
            >
              تمامی کلاس‌های من
            </button>
            {isManagerOrAdmin && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('staff_attendance');
                  setActiveSession(null);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black border-2 transition-all ${
                  activeTab === 'staff_attendance'
                    ? 'bg-primary text-primary-foreground border-black shadow-[2px_2px_0px_#000]'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-foreground border-transparent'
                }`}
              >
                تردد کادر و همکاران
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ACTIVE CALLOUT IF A PERIOD IS HAPPENING RIGHT NOW
      ───────────────────────────────────────────────────────────── */}
      {activeNowSlot && !activeSession && (
        <div className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 dark:from-amber-600 dark:to-amber-700 border-3 border-black p-5 rounded-3xl shadow-[6px_6px_0px_#000] text-black">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000]">
                <Radio className="w-6 h-6 text-amber-600 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-black text-amber-400 text-xs font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    هم‌اکنون در حال برگزاری (زنگ جاری)
                  </span>
                  <span className="text-xs font-bold text-black/80">
                    ساعت {toPersianDigits(activeNowSlot.startTime)} الی {toPersianDigits(activeNowSlot.endTime)}
                  </span>
                </div>
                <h3 className="text-lg font-black mt-1">
                  زنگ {toPersianDigits(activeNowSlot.periodNumber)}: {activeNowSlot.classroomName} — درس {activeNowSlot.lessonName}
                </h3>
              </div>
            </div>

            <Button
              onClick={() =>
                setActiveSession({
                  classroomId: activeNowSlot.classroomId,
                  classroomName: activeNowSlot.classroomName,
                  lessonName: activeNowSlot.lessonName,
                  periodNumber: activeNowSlot.periodNumber,
                  startTime: activeNowSlot.startTime,
                  endTime: activeNowSlot.endTime,
                })
              }
              className="bg-black text-white hover:bg-neutral-900 border-2 border-black shadow-[3px_3px_0px_#fff] font-black text-sm px-5 py-2.5 rounded-2xl shrink-0"
            >
              ثبت سریع حضور و غیاب همین زنگ
              <ArrowRight className="w-4 h-4 mr-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION A: CLASSROOM ATTENDANCE ACTIVE RECORDING VIEW
      ───────────────────────────────────────────────────────────── */}
      {activeSession ? (
        <div className="space-y-6">
          {/* Active Session Header Banner */}
          <div className="bg-white dark:bg-card border-3 border-black dark:border-white/20 p-5 rounded-3xl shadow-[6px_6px_0px_#000]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveSession(null)}
                  className="p-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border-2 border-black rounded-2xl shadow-[2px_2px_0px_#000] transition-all"
                  title="بازگشت به لیست زنگ‌ها"
                >
                  <ArrowRight className="w-5 h-5 text-foreground" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-foreground">
                      {activeSession.classroomName}
                    </h2>
                    <Badge variant="ecosystem" className="text-xs font-black border-2 border-black">
                      زنگ {toPersianDigits(activeSession.periodNumber)}
                    </Badge>
                    {activeSession.startTime && (
                      <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {toPersianDigits(activeSession.startTime)} الی {toPersianDigits(activeSession.endTime)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-bold mt-0.5">
                    {activeSession.lessonName ? `درس: ${activeSession.lessonName} • ` : ''}
                    تاریخ: {formatJalaliDisplay(selectedDate, true)}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllPresent}
                  disabled={studentsList.length === 0}
                  className="border-2 border-black font-black text-xs shadow-[2px_2px_0px_#000]"
                >
                  <CheckCircle2 className="w-4 h-4 ml-1.5 text-emerald-500" />
                  همه حاضرند
                </Button>

                {hasUnsavedChanges && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetToSaved}
                    className="border-2 border-black font-bold text-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5 ml-1" />
                    بازنشانی
                  </Button>
                )}

                <Button
                  onClick={() => saveAttendanceMutation.mutate()}
                  disabled={saveAttendanceMutation.isPending || studentsList.length === 0}
                  className="bg-emerald-500 hover:bg-emerald-600 text-black border-2 border-black font-black text-xs px-4 py-2 shadow-[3px_3px_0px_#000]"
                >
                  {saveAttendanceMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin ml-1.5" />
                  ) : (
                    <Send className="w-4 h-4 ml-1.5" />
                  )}
                  ثبت نهایی حضور و غیاب
                </Button>
              </div>
            </div>
          </div>

          {/* Roster Live Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <StatCard
              title="کل هنرجویان"
              value={rosterStats.total}
              icon={Users}
              theme="college"
              subtitle="لیست کلاس"
            />
            <StatCard
              title="حاضرین"
              value={rosterStats.present}
              icon={UserCheck}
              theme="ecosystem"
              subtitle={`${rosterStats.total > 0 ? Math.round((rosterStats.present / rosterStats.total) * 100) : 0}% کلاس`}
            />
            <StatCard
              title="غایبین"
              value={rosterStats.absent}
              icon={UserX}
              theme="female"
              subtitle="پیامک خودکار به اولیاء"
            />
            <StatCard
              title="تاخیر ورود"
              value={rosterStats.tardy}
              icon={Clock}
              theme="club"
              subtitle="با احتساب دقایق"
            />
            <StatCard
              title="غیبت موجه"
              value={rosterStats.excused}
              icon={ShieldAlert}
              theme="male"
              subtitle="دارای مدرک/دلیل"
            />
          </div>

          {/* Student Roster Table Card */}
          <div className="bg-white dark:bg-card border-3 border-black dark:border-white/20 rounded-3xl p-5 shadow-[6px_6px_0px_#000]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجوی نام، کد دانش‌آموزی یا کد ملی..."
                  className="pr-10 border-2 border-black font-bold text-xs"
                />
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <span>نمایش {toPersianDigits(filteredStudents.length)} از {toPersianDigits(studentsList.length)} دانش‌آموز</span>
              </div>
            </div>

            {isLoadingRoster ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
                <p className="font-black text-sm text-foreground">در حال بارگذاری لیست هنرجویان کلاس...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="font-black text-sm text-foreground">دانش‌آموزی برای نمایش یافت نشد</p>
                <p className="text-xs text-muted-foreground mt-1">
                  در صورت جستجو، عبارت را پاک کنید یا از ثبت‌نام هنرجویان در این کلاس اطمینان حاصل فرمایید.
                </p>
              </div>
            ) : (
              <div className="divide-y-2 divide-neutral-100 dark:divide-neutral-800">
                {filteredStudents.map((st, idx) => {
                  const fullName = `${st.user?.firstName || ''} ${st.user?.lastName || ''}`;
                  return (
                    <div
                      key={st.studentId}
                      className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-neutral-50/80 dark:hover:bg-neutral-900/40 px-3 rounded-2xl transition-all"
                    >
                      {/* Student Info */}
                      <div className="flex items-center gap-3.5 min-w-[220px]">
                        <div className="w-8 text-center font-mono font-black text-xs text-muted-foreground">
                          {toPersianDigits(idx + 1)}
                        </div>
                        <div className="w-12 h-12 rounded-2xl border-2 border-black bg-neutral-100 dark:bg-neutral-800 overflow-hidden shrink-0 shadow-[2px_2px_0px_#000]">
                          {st.user?.avatarUrl ? (
                            <img
                              src={st.user.avatarUrl}
                              alt={fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-black text-base text-foreground">
                              {st.user?.firstName?.[0] || 'د'}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-black text-sm text-foreground">{fullName}</div>
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">
                            کد دانش‌آموزی: {toPersianDigits(st.studentCode)}
                            {st.nationalCode && ` • کدملی: ${toPersianDigits(st.nationalCode)}`}
                          </div>
                        </div>
                      </div>

                      {/* Status Selector - 4 Neobrutalist buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* PRESENT */}
                        <button
                          type="button"
                          onClick={() => handleUpdateStudentStatus(st.studentId, 'PRESENT')}
                          className={`px-3 py-1.5 rounded-xl font-black text-xs border-2 transition-all ${
                            st.status === 'PRESENT'
                              ? 'bg-emerald-400 text-black border-black shadow-[2px_2px_0px_#000] scale-105'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-muted-foreground border-transparent hover:border-black/30'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 inline ml-1" />
                          حاضر
                        </button>

                        {/* ABSENT */}
                        <button
                          type="button"
                          onClick={() => handleUpdateStudentStatus(st.studentId, 'ABSENT')}
                          className={`px-3 py-1.5 rounded-xl font-black text-xs border-2 transition-all ${
                            st.status === 'ABSENT'
                              ? 'bg-rose-500 text-white border-black shadow-[2px_2px_0px_#000] scale-105'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-muted-foreground border-transparent hover:border-black/30'
                          }`}
                        >
                          <UserX className="w-3.5 h-3.5 inline ml-1" />
                          غایب
                        </button>

                        {/* TARDY */}
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateStudentStatus(st.studentId, 'TARDY');
                            setDetailModalStudent(st);
                            setModalDelayMinutes(st.delayMinutes || 15);
                            setModalReason(st.reason || '');
                          }}
                          className={`px-3 py-1.5 rounded-xl font-black text-xs border-2 transition-all ${
                            st.status === 'TARDY'
                              ? 'bg-amber-400 text-black border-black shadow-[2px_2px_0px_#000] scale-105'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-muted-foreground border-transparent hover:border-black/30'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5 inline ml-1" />
                          تاخیر {st.delayMinutes > 0 ? `(${toPersianDigits(st.delayMinutes)}د)` : ''}
                        </button>

                        {/* EXCUSED_ABSENT */}
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateStudentStatus(st.studentId, 'EXCUSED_ABSENT');
                            setDetailModalStudent(st);
                            setModalDelayMinutes(0);
                            setModalReason(st.reason || '');
                          }}
                          className={`px-3 py-1.5 rounded-xl font-black text-xs border-2 transition-all ${
                            st.status === 'EXCUSED_ABSENT'
                              ? 'bg-sky-400 text-black border-black shadow-[2px_2px_0px_#000] scale-105'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-muted-foreground border-transparent hover:border-black/30'
                          }`}
                        >
                          <ShieldAlert className="w-3.5 h-3.5 inline ml-1" />
                          موجه
                        </button>

                        {/* Reason / Notes Indicator */}
                        {st.reason && (
                          <span
                            title={st.reason}
                            onClick={() => {
                              setDetailModalStudent(st);
                              setModalDelayMinutes(st.delayMinutes);
                              setModalReason(st.reason);
                            }}
                            className="cursor-pointer text-xs bg-neutral-200 dark:bg-neutral-700 px-2 py-1 rounded-lg text-foreground max-w-[120px] truncate"
                          >
                            دلیل: {st.reason}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'today_schedule' ? (
        /* ─────────────────────────────────────────────────────────────
            SECTION B: TEACHER'S PERIODS & DAILY SCHEDULE
        ───────────────────────────────────────────────────────────── */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-foreground">
                برنامه درسی {currentDayOfWeekInfo.name} ({formatJalaliDisplay(selectedDate, false)})
              </h2>
              <p className="text-xs font-bold text-muted-foreground mt-0.5">
                زنگ جاری بر اساس ساعت سیستم به صورت هایلایت رنگی مشخص می‌شود. برای ثبت حضور روی هر کارت کلیک کنید.
              </p>
            </div>
          </div>

          {isLoadingSchedule ? (
            <div className="py-20 text-center space-y-3 bg-white dark:bg-card border-3 border-black rounded-3xl">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
              <p className="font-black text-sm text-foreground">در حال واکشی برنامه کلاسی دبیر...</p>
            </div>
          ) : schedulesList.length === 0 ? (
            <div className="py-16 text-center border-3 border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-card rounded-3xl p-8 space-y-4 shadow-[4px_4px_0px_#000]">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
              <div>
                <h3 className="text-base font-black text-foreground">
                  در روز {currentDayOfWeekInfo.name} برنامه کلاسی ثبت نشده است
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  می‌توانید از تب «تمامی کلاس‌های من» هر کلاسی را انتخاب و حضور و غیاب ثبت کنید، یا با دکمه‌های بالا روزهای دیگر را انتخاب نمایید.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setActiveTab('all_classes')}
                className="border-2 border-black font-black text-xs shadow-[2px_2px_0px_#000]"
              >
                مشاهده تمامی کلاس‌های من
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {schedulesList.map((slot) => {
                const slotTimingStatus = checkSlotStatus(slot.startTime, slot.endTime);
                const isCurrent = slotTimingStatus === 'CURRENT';
                const isPassed = slotTimingStatus === 'PASSED';
                const isRecorded = !!slot.stats?.isRecorded;

                return (
                  <div
                    key={slot.id}
                    onClick={() =>
                      setActiveSession({
                        classroomId: slot.classroomId,
                        classroomName: slot.classroomName,
                        lessonName: slot.lessonName,
                        periodNumber: slot.periodNumber,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                      })
                    }
                    className={`cursor-pointer group relative rounded-3xl p-5 border-3 transition-all transform hover:-translate-y-1 ${
                      isCurrent
                        ? 'bg-amber-100 dark:bg-amber-950/70 border-amber-500 dark:border-amber-400 shadow-[6px_6px_0px_#d97706] ring-4 ring-amber-400/40'
                        : isRecorded
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-black dark:border-white/20 shadow-[4px_4px_0px_#000]'
                        : 'bg-white dark:bg-card border-black dark:border-white/20 shadow-[4px_4px_0px_#000] hover:border-primary'
                    }`}
                  >
                    {/* Period Header */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-black text-xs px-2.5 py-1 rounded-xl border-2 border-black ${
                            isCurrent
                              ? 'bg-amber-400 text-black shadow-[1.5px_1.5px_0px_#000]'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-foreground'
                          }`}
                        >
                          زنگ {toPersianDigits(slot.periodNumber)}
                        </span>
                        <span className="text-xs font-mono font-bold text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {toPersianDigits(slot.startTime)} - {toPersianDigits(slot.endTime)}
                        </span>
                      </div>

                      {/* Live Badge for Current Period */}
                      {isCurrent ? (
                        <span className="bg-red-500 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse border border-black shadow-[1px_1px_0px_#000]">
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          زنگ جاری
                        </span>
                      ) : isPassed ? (
                        <span className="text-[11px] font-bold text-muted-foreground bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-lg">
                          سپری شده
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-2 py-0.5 rounded-lg">
                          زنگ آینده
                        </span>
                      )}
                    </div>

                    {/* Class & Lesson Title */}
                    <div className="space-y-1 my-3">
                      <h3 className="font-black text-base text-foreground group-hover:text-primary transition-colors">
                        {slot.classroomName}
                      </h3>
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                        <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                        <span>درس: {slot.lessonName}</span>
                      </div>
                    </div>

                    {/* Stats & Attendance Status Footer */}
                    <div className="mt-4 pt-3 border-t-2 border-black/10 dark:border-white/10 flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span>{toPersianDigits(slot.stats?.totalStudents || 0)} هنرجو</span>
                      </div>

                      <div>
                        {isRecorded ? (
                          <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 rounded-xl border border-emerald-400 flex items-center gap-1 font-black">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            ثبت شده ({toPersianDigits(slot.stats?.presentCount || 0)} حاضر)
                          </span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/80 px-2.5 py-1 rounded-xl border border-amber-400 flex items-center gap-1 font-bold">
                            در انتظار ثبت
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === 'all_classes' ? (
        /* ─────────────────────────────────────────────────────────────
            SECTION C: ALL CLASSROOMS DIRECT ACCESS
        ───────────────────────────────────────────────────────────── */
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-black text-foreground">تمامی کلاس‌های تحت تدریس</h2>
            <p className="text-xs font-bold text-muted-foreground mt-0.5">
              جهت ثبت حضور و غیاب برای هر کلاس و زنگ دلخواه خارج از برنامه روتین امروز:
            </p>
          </div>

          {isLoadingAllClassrooms ? (
            <div className="py-20 text-center space-y-3 bg-white dark:bg-card border-3 border-black rounded-3xl">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
              <p className="font-black text-sm text-foreground">در حال بارگذاری لیست کلاس‌ها...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {allClassroomsData?.map((cls: any) => (
                <div
                  key={cls.id}
                  className="bg-white dark:bg-card border-3 border-black dark:border-white/20 rounded-3xl p-5 shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] transition-all space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-base text-foreground">{cls.name}</h3>
                    <Badge variant="neutral" className="text-xs font-bold border border-black">
                      کد {toPersianDigits(cls.code || '')}
                    </Badge>
                  </div>

                  <p className="text-xs font-bold text-muted-foreground">
                    پایه: {cls.level?.name || 'ـ'} • رشته: {cls.field?.name || 'ـ'}
                  </p>

                  {/* Quick Period Buttons */}
                  <div className="pt-2 border-t-2 border-dashed border-neutral-200 dark:border-neutral-800">
                    <span className="text-[11px] font-black text-muted-foreground block mb-2">
                      انتخاب زنگ جهت ثبت حضور:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[1, 2, 3, 4, 5, 6].map((pNum) => (
                        <button
                          key={pNum}
                          type="button"
                          onClick={() =>
                            setActiveSession({
                              classroomId: cls.id,
                              classroomName: cls.name,
                              periodNumber: pNum,
                            })
                          }
                          className="px-2.5 py-1 text-xs font-black bg-neutral-100 dark:bg-neutral-800 hover:bg-amber-400 hover:text-black border-2 border-black rounded-xl shadow-[1.5px_1.5px_0px_#000] transition-all"
                        >
                          زنگ {toPersianDigits(pNum)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
            SECTION D: STAFF / TEACHER ATTENDANCE (MANAGEMENT ONLY)
        ───────────────────────────────────────────────────────────── */
        <div className="space-y-6">
          <div className="bg-white dark:bg-card border-3 border-black dark:border-white/20 rounded-3xl p-5 shadow-[6px_6px_0px_#000]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-foreground">
                پایش حضور و غیاب همکاران و اساتید ({formatJalaliDisplay(selectedDate, true)})
              </h2>
            </div>

            {isLoadingStaffAttendance ? (
              <div className="py-16 text-center">
                <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                <p className="text-sm font-bold text-foreground">در حال بارگذاری سوابق تردد همکاران...</p>
              </div>
            ) : staffAttendanceData?.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground font-bold text-sm">
                هیچ رکوردی برای تردد همکاران در این تاریخ ثبت نشده است.
              </div>
            ) : (
              <div className="divide-y-2 divide-neutral-100 dark:divide-neutral-800">
                {staffAttendanceData?.map((item: any) => (
                  <div key={item.id} className="py-3.5 flex items-center justify-between">
                    <div>
                      <span className="font-black text-sm text-foreground">
                        {item.teacher?.user?.firstName} {item.teacher?.user?.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground mr-3">
                        ورود: {item.entryTime ? toPersianDigits(item.entryTime) : 'ـ'} | خروج: {item.exitTime ? toPersianDigits(item.exitTime) : 'ـ'}
                      </span>
                    </div>
                    <Badge variant={item.status === 'PRESENT' ? 'ecosystem' : 'female'}>
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          DETAIL / EXCUSE MODAL
      ───────────────────────────────────────────────────────────── */}
      {detailModalStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-card border-3 border-black dark:border-white/20 rounded-3xl p-6 max-w-md w-full shadow-[8px_8px_0px_#000] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-foreground">
                ثبت جزییات وضعیت: {detailModalStudent.user?.firstName} {detailModalStudent.user?.lastName}
              </h3>
              <button
                type="button"
                onClick={() => setDetailModalStudent(null)}
                className="p-1 hover:bg-neutral-100 rounded-lg text-muted-foreground"
              >
                ✕
              </button>
            </div>

            {detailModalStudent.status === 'TARDY' && (
              <div className="space-y-1.5">
                <label className="text-xs font-black text-foreground">میزان تاخیر ورود (به دقیقه):</label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={modalDelayMinutes}
                  onChange={(e) => setModalDelayMinutes(parseInt(e.target.value, 10) || 0)}
                  className="border-2 border-black font-bold"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-black text-foreground">توضیح یا دلیل غیبت/تاخیر:</label>
              <Input
                value={modalReason}
                onChange={(e) => setModalReason(e.target.value)}
                placeholder="مثال: کسالت و مراجعه به پزشک..."
                className="border-2 border-black font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailModalStudent(null)}
                className="border-2 border-black font-bold"
              >
                انصراف
              </Button>
              <Button
                size="sm"
                onClick={handleSaveModalDetails}
                className="bg-primary text-primary-foreground border-2 border-black font-black shadow-[2px_2px_0px_#000]"
              >
                تایید و ذخیره
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
