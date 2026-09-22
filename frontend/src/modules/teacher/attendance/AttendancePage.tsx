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
  AlertCircle,
  Filter,
  Check,
  Building2,
  Sparkles,
  ArrowRight,
  BookOpen,
  Calendar,
  Radio,
  RotateCcw,
  SlidersHorizontal,
  X,
  ChevronDown,
  Award,
  Star,
  FileText,
  History,
  TrendingUp,
  AlertTriangle,
  GraduationCap,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
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

export type DisciplinaryRewardType =
  | 'POSITIVE'
  | 'NEGATIVE'
  | 'WARNING'
  | 'HOMEWORK_INCOMPLETE'
  | 'EXCELLENT'
  | 'NONE';

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
  oralGrade?: number | null;
  rewardDisciplineType?: DisciplinaryRewardType | null;
  rewardDisciplineNote?: string | null;
  sessionNote?: string | null;
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

  // 1. Live system time (updates every second for real-time period highlight)
  const [liveSystemTime, setLiveSystemTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveSystemTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Jalali date selection
  const todayJalali = useMemo(() => {
    const { year, month, day } = getCurrentJalaliYearMonth();
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayJalali);
  const [showDatePickerModal, setShowDatePickerModal] = useState<boolean>(false);

  // Active top navigation tab: 'today_schedule' | 'all_classes' | 'staff_attendance'
  const [activeTab, setActiveTab] = useState<'today_schedule' | 'all_classes' | 'staff_attendance'>('today_schedule');

  // Active classroom session
  const [activeSession, setActiveSession] = useState<{
    classroomId: string;
    classroomName: string;
    lessonId?: string;
    lessonName?: string;
    periodNumber: number;
    startTime?: string;
    endTime?: string;
  } | null>(null);

  // Search & edit state for attendance roster
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AttendanceStatus>('ALL');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [studentsList, setStudentsList] = useState<LocalStudentAttendance[]>([]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Modal / Bottom Sheet State for Student Evaluation & Track Record History
  // ─────────────────────────────────────────────────────────────────────────────
  const [evaluationModalStudent, setEvaluationModalStudent] = useState<LocalStudentAttendance | null>(null);
  const [modalTab, setModalTab] = useState<'EVALUATE' | 'HISTORY'>('EVALUATE');

  // Evaluation Form State
  const [modalOralGrade, setModalOralGrade] = useState<string>('');
  const [modalDisciplineType, setModalDisciplineType] = useState<DisciplinaryRewardType>('NONE');
  const [modalDisciplineNote, setModalDisciplineNote] = useState<string>('');
  const [modalSessionNote, setModalSessionNote] = useState<string>('');
  const [modalDelayMinutes, setModalDelayMinutes] = useState<number>(0);
  const [modalReason, setModalReason] = useState<string>('');

  // 3. Date Navigation Helpers
  const isSelectedDateToday = selectedDate === todayJalali;

  const navigateDate = (deltaDays: number) => {
    try {
      const gDate = jalaliToGregorianDate(selectedDate);
      gDate.setDate(gDate.getDate() + deltaDays);
      setSelectedDate(gregorianToJalaliStr(gDate));
      setActiveSession(null);
    } catch (e) {
      console.error('Failed to navigate date', e);
    }
  };

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

  const selectWeekday = (targetDayKey: string) => {
    try {
      const gDate = jalaliToGregorianDate(selectedDate);
      const currentDay = gDate.getDay();
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

  // 4. Live time calculation
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
      return 'CURRENT';
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

  const activeNowSlot = useMemo(() => {
    if (!isSelectedDateToday) return null;
    return schedulesList.find((s) => checkSlotStatus(s.startTime, s.endTime) === 'CURRENT') || null;
  }, [schedulesList, isSelectedDateToday, currentMinutes]);

  // 6. Query: All Classrooms
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
        oralGrade: st.oralGrade !== undefined ? st.oralGrade : null,
        rewardDisciplineType: st.rewardDisciplineType || 'NONE',
        rewardDisciplineNote: st.rewardDisciplineNote || '',
        sessionNote: st.sessionNote || '',
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
    const graded = studentsList.filter((s) => s.oralGrade !== null && s.oralGrade !== undefined).length;
    const positiveMatters = studentsList.filter((s) => s.rewardDisciplineType === 'POSITIVE' || s.rewardDisciplineType === 'EXCELLENT').length;
    const recorded = studentsList.filter((s) => s.isRecorded).length;
    return { total, present, absent, tardy, excused, graded, positiveMatters, recorded };
  }, [studentsList]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return studentsList.filter((s) => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const fullName = `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.toLowerCase();
      const code = s.studentCode || '';
      const national = s.nationalCode || '';
      return fullName.includes(q) || code.includes(q) || national.includes(q);
    });
  }, [studentsList, searchQuery, statusFilter]);

  // 9. Query: Student Track Record / History in Subject
  const {
    data: studentHistoryData,
    isLoading: isLoadingStudentHistory,
  } = useQuery({
    enabled: !!evaluationModalStudent && modalTab === 'HISTORY',
    queryKey: [
      'student-subject-history',
      evaluationModalStudent?.studentId,
      activeSession?.classroomId,
      activeSession?.lessonId,
    ],
    queryFn: async () => {
      if (!evaluationModalStudent || !activeSession) return null;
      let url = `/attendance/student-history?studentId=${evaluationModalStudent.studentId}&classroomId=${activeSession.classroomId}`;
      if (activeSession.lessonId) {
        url += `&lessonId=${activeSession.lessonId}`;
      }
      const res: any = await apiClient.get(url);
      return res?.data || res;
    },
  });

  // 10. Bulk Save Attendance & Gradebook Session Mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession) return;
      const payload = {
        classroomId: activeSession.classroomId,
        lessonId: activeSession.lessonId,
        date: selectedDate,
        periodNumber: activeSession.periodNumber,
        attendances: studentsList.map((s) => ({
          studentId: s.studentId,
          status: s.status,
          delayMinutes: s.status === 'TARDY' ? s.delayMinutes : 0,
          reason: s.reason || '',
          oralGrade: s.oralGrade !== null && s.oralGrade !== undefined ? Number(s.oralGrade) : undefined,
          rewardDisciplineType: s.rewardDisciplineType || undefined,
          rewardDisciplineNote: s.rewardDisciplineNote || undefined,
          sessionNote: s.sessionNote || undefined,
        })),
      };
      const res: any = await apiClient.post('/attendance/students/bulk', payload);
      return res?.data || res;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'دفتر کلاسی با موفقیت ثبت و ذخیره شد', {
        description: `کلاس ${activeSession?.classroomName} - زنگ ${toPersianDigits(activeSession?.periodNumber)}`,
      });
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['classroom-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-daily-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
    },
    onError: (err: any) => {
      toast.error('خطا در ثبت اطلاعات دفتر کلاسی', {
        description: err?.response?.data?.message || 'لطفاً اتصال اینترنت را بررسی فرمایید',
      });
    },
  });

  const handleMarkAllPresent = () => {
    setStudentsList((prev) =>
      prev.map((s) => ({
        ...s,
        status: 'PRESENT',
        delayMinutes: 0,
      })),
    );
    setHasUnsavedChanges(true);
    toast.info('تمامی دانش‌آموزان به عنوان «حاضر» مشخص شدند');
  };

  const handleResetToSaved = () => {
    refetchRoster();
    setHasUnsavedChanges(false);
    toast.info('تغییرات به آخرین وضعیت ذخیره‌شده بازگردانی شد');
  };

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

  // Open Evaluation Modal for Student
  const handleOpenEvaluationModal = (st: LocalStudentAttendance) => {
    setEvaluationModalStudent(st);
    setModalTab('EVALUATE');
    setModalOralGrade(st.oralGrade !== null && st.oralGrade !== undefined ? String(st.oralGrade) : '');
    setModalDisciplineType(st.rewardDisciplineType || 'NONE');
    setModalDisciplineNote(st.rewardDisciplineNote || '');
    setModalSessionNote(st.sessionNote || '');
    setModalDelayMinutes(st.delayMinutes || 0);
    setModalReason(st.reason || '');
  };

  // Save Modal Details
  const handleSaveModalEvaluation = () => {
    if (!evaluationModalStudent) return;
    const parsedGrade = modalOralGrade.trim() !== '' ? parseFloat(modalOralGrade) : null;
    if (parsedGrade !== null && (isNaN(parsedGrade) || parsedGrade < 0 || parsedGrade > 20)) {
      toast.error('نمره پرسش کلاسی باید عددی بین ۰ تا ۲۰ باشد');
      return;
    }

    setStudentsList((prev) =>
      prev.map((s) => {
        if (s.studentId === evaluationModalStudent.studentId) {
          return {
            ...s,
            oralGrade: parsedGrade,
            rewardDisciplineType: modalDisciplineType,
            rewardDisciplineNote: modalDisciplineNote.trim(),
            sessionNote: modalSessionNote.trim(),
            delayMinutes: modalDelayMinutes,
            reason: modalReason.trim(),
          };
        }
        return s;
      }),
    );
    setHasUnsavedChanges(true);
    setEvaluationModalStudent(null);
    toast.success('ارزیابی و اطلاعات جلسه دانش‌آموز ثبت شد');
  };

  // Quick Oral Grade Setter buttons
  const QUICK_GRADES = [20, 19.5, 19, 18.5, 18, 17, 16, 15, 14, 12, 10, 0];

  // 11. Query: Staff Attendance
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
    <div className="space-y-4 sm:space-y-6 pb-24 md:pb-16 max-w-7xl mx-auto overflow-x-hidden">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP APP BAR & LIVE SYSTEM TIME
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-card border-2 sm:border-3 border-black dark:border-white/20 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-[4px_4px_0px_#000] sm:shadow-[6px_6px_0px_#000] space-y-3.5">
        
        {/* Row 1: Header & Live System Time */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-13 sm:h-13 rounded-xl sm:rounded-2xl bg-amber-400 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000] shrink-0 text-black">
              <BookOpen className="w-5 h-5 sm:w-7 sm:h-7" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-base sm:text-2xl font-black text-foreground truncate">
                  دفتر کلاسی هوشمند
                </h1>
                <Badge variant="college" className="text-[10px] sm:text-xs font-bold border border-black px-1.5 py-0 sm:px-2">
                  رُکاد
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs font-bold text-muted-foreground truncate hidden xs:block">
                حضور و غیاب، پرسش کلاسی، انضباطی و سوابق دانش‌آموزان
              </p>
            </div>
          </div>

          {/* Live System Time Chip */}
          <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 px-2 sm:px-3 py-1 rounded-xl border border-black/30 dark:border-white/20 shrink-0">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
            <span className="font-mono text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400">
              {toPersianDigits(
                liveSystemTime.toLocaleTimeString('fa-IR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }),
              )}
            </span>
          </div>
        </div>

        {/* Row 2: Jalali Date Navigator Bar */}
        <div className="grid grid-cols-1 sm:flex sm:items-center sm:justify-between gap-2 pt-1">
          {/* Date Navigator Bar */}
          <div className="flex items-center bg-neutral-50 dark:bg-neutral-900 border-2 border-black dark:border-white/20 rounded-xl sm:rounded-2xl p-1 shadow-[2px_2px_0px_#000] justify-between">
            <button
              type="button"
              onClick={() => navigateDate(1)}
              title="روز بعد"
              className="p-1.5 sm:p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg sm:rounded-xl transition-all shrink-0"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
            </button>

            <div
              onClick={() => setShowDatePickerModal(!showDatePickerModal)}
              className="px-2 py-0.5 text-center cursor-pointer hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-0"
            >
              <CalendarDays className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="text-xs sm:text-sm font-black text-foreground truncate">
                <span className="text-amber-600 dark:text-amber-400 ml-1">{currentDayOfWeekInfo.name}</span>
                {formatJalaliDisplay(selectedDate, false)}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </div>

            <button
              type="button"
              onClick={() => navigateDate(-1)}
              title="روز قبل"
              className="p-1.5 sm:p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg sm:rounded-xl transition-all shrink-0"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
            </button>
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center gap-2">
            {!isSelectedDateToday && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedDate(todayJalali);
                  setActiveSession(null);
                }}
                className="w-full sm:w-auto border-2 border-black font-black text-xs h-9 sm:h-10 shadow-[2px_2px_0px_#000]"
              >
                بازگشت به امروز
              </Button>
            )}

            {isSelectedDateToday && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                امروز
              </span>
            )}
          </div>
        </div>

        {/* Modal / Popup for Persian Date Picker */}
        {showDatePickerModal && (
          <div className="p-3 bg-neutral-100 dark:bg-neutral-900 border-2 border-black rounded-2xl shadow-[3px_3px_0px_#000] flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="w-full sm:w-72">
              <PersianDatePicker
                value={selectedDate}
                onChange={(d) => {
                  setSelectedDate(d);
                  setActiveSession(null);
                  setShowDatePickerModal(false);
                }}
                placeholder="انتخاب مستقیم تاریخ شمسی"
                className="h-10 text-xs font-bold w-full"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDatePickerModal(false)}
              className="w-full sm:w-auto border-2 border-black text-xs font-bold"
            >
              بستن
            </Button>
          </div>
        )}

        {/* Row 3: Horizontal Scrollable Weekday Pill Strip */}
        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
            {WEEK_DAYS_INFO.map((day) => {
              const isCurrentDay = currentDayOfWeekInfo.key === day.key;
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => selectWeekday(day.key)}
                  className={`px-3 py-1 rounded-xl text-xs font-black border-2 shrink-0 transition-all ${
                    isCurrentDay
                      ? 'bg-amber-400 text-black border-black shadow-[2px_2px_0px_#000]'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-foreground border-transparent hover:border-black/30'
                  }`}
                >
                  {day.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 4: Top Navigation Tabs */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl border border-black/20 dark:border-white/20">
          <button
            type="button"
            onClick={() => {
              setActiveTab('today_schedule');
              setActiveSession(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-black transition-all text-center ${
              activeTab === 'today_schedule'
                ? 'bg-white dark:bg-card text-foreground border-2 border-black shadow-[2px_2px_0px_#000]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            برنامه زنگ‌های امروز
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('all_classes');
              setActiveSession(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-black transition-all text-center ${
              activeTab === 'all_classes'
                ? 'bg-white dark:bg-card text-foreground border-2 border-black shadow-[2px_2px_0px_#000]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            تمام کلاس‌های تحت تدریس
          </button>
          {isManagerOrAdmin && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('staff_attendance');
                setActiveSession(null);
              }}
              className={`col-span-2 sm:col-span-1 py-2 px-3 rounded-lg text-xs font-black transition-all text-center ${
                activeTab === 'staff_attendance'
                  ? 'bg-white dark:bg-card text-foreground border-2 border-black shadow-[2px_2px_0px_#000]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              تردد کادر مدرسه
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. ACTIVE LIVE PERIOD CALLOUT BANNER
      ───────────────────────────────────────────────────────────── */}
      {activeNowSlot && !activeSession && (
        <div className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 dark:from-amber-600 dark:to-amber-700 border-2 sm:border-3 border-black p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-[4px_4px_0px_#000] sm:shadow-[6px_6px_0px_#000] text-black">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000]">
                <Radio className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="bg-black text-amber-400 text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    هم‌اکنون در حال برگزاری (زنگ جاری)
                  </span>
                  <span className="text-[11px] font-bold text-black/80">
                    {toPersianDigits(activeNowSlot.startTime)} تا {toPersianDigits(activeNowSlot.endTime)}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black mt-1 truncate">
                  زنگ {toPersianDigits(activeNowSlot.periodNumber)}: {activeNowSlot.classroomName} — درس {activeNowSlot.lessonName}
                </h3>
              </div>
            </div>

            <Button
              onClick={() =>
                setActiveSession({
                  classroomId: activeNowSlot.classroomId,
                  classroomName: activeNowSlot.classroomName,
                  lessonId: activeNowSlot.lessonId,
                  lessonName: activeNowSlot.lessonName,
                  periodNumber: activeNowSlot.periodNumber,
                  startTime: activeNowSlot.startTime,
                  endTime: activeNowSlot.endTime,
                })
              }
              className="w-full sm:w-auto bg-black text-white hover:bg-neutral-900 border-2 border-black shadow-[2px_2px_0px_#fff] font-black text-xs sm:text-sm py-2 sm:py-2.5 rounded-xl sm:rounded-2xl shrink-0"
            >
              ورود به دفتر کلاسی این زنگ
              <ArrowRight className="w-4 h-4 mr-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. ACTIVE CLASSROOM COCKPIT SESSION (ROSTER + EVALUATION)
      ───────────────────────────────────────────────────────────── */}
      {activeSession ? (
        <div className="space-y-4">
          {/* Active Session Header Banner */}
          <div className="bg-white dark:bg-card border-2 sm:border-3 border-black dark:border-white/20 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-[4px_4px_0px_#000] sm:shadow-[6px_6px_0px_#000]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveSession(null)}
                  className="p-2 sm:p-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border-2 border-black rounded-xl sm:rounded-2xl shadow-[2px_2px_0px_#000] transition-all shrink-0"
                  title="بازگشت به برنامه زنگ‌ها"
                >
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-xl font-black text-foreground truncate">
                      {activeSession.classroomName}
                    </h2>
                    <Badge variant="ecosystem" className="text-[10px] sm:text-xs font-black border border-black">
                      زنگ {toPersianDigits(activeSession.periodNumber)}
                    </Badge>
                  </div>
                  <p className="text-[11px] sm:text-xs text-muted-foreground font-bold mt-0.5 truncate">
                    {activeSession.lessonName ? `درس: ${activeSession.lessonName} • ` : ''}
                    {currentDayOfWeekInfo.name} {formatJalaliDisplay(selectedDate, false)}
                  </p>
                </div>
              </div>

              {/* Action Buttons (Desktop) */}
              <div className="hidden sm:flex items-center gap-2">
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
                  className="bg-emerald-500 hover:bg-emerald-600 text-black border-2 border-black font-black text-xs px-3 sm:px-4 py-2 shadow-[2px_2px_0px_#000]"
                >
                  {saveAttendanceMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin ml-1.5" />
                  ) : (
                    <Send className="w-4 h-4 ml-1.5" />
                  )}
                  ثبت نهایی دفتر کلاسی
                </Button>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800 sm:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllPresent}
                disabled={studentsList.length === 0}
                className="w-full border-2 border-black font-black text-xs h-9 shadow-[1.5px_1.5px_0px_#000]"
              >
                <CheckCircle2 className="w-3.5 h-3.5 ml-1 text-emerald-500" />
                همه حاضرند
              </Button>
              <Button
                size="sm"
                onClick={() => saveAttendanceMutation.mutate()}
                disabled={saveAttendanceMutation.isPending || studentsList.length === 0}
                className="w-full bg-emerald-500 text-black border-2 border-black font-black text-xs h-9 shadow-[1.5px_1.5px_0px_#000]"
              >
                {saveAttendanceMutation.isPending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin ml-1" />
                ) : (
                  <Send className="w-3.5 h-3.5 ml-1" />
                )}
                ثبت نهایی
              </Button>
            </div>
          </div>

          {/* Compact Responsive Stats Bar */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-3 bg-white dark:bg-card border-2 border-black dark:border-white/20 p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-[3px_3px_0px_#000]">
            <div
              onClick={() => setStatusFilter('ALL')}
              className={`cursor-pointer text-center p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-neutral-200 dark:bg-neutral-800 border-2 border-black'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <div className="text-[10px] sm:text-xs font-bold text-muted-foreground">کل</div>
              <div className="text-sm sm:text-lg font-black text-foreground">
                {toPersianDigits(rosterStats.total)}
              </div>
            </div>

            <div
              onClick={() => setStatusFilter(statusFilter === 'PRESENT' ? 'ALL' : 'PRESENT')}
              className={`cursor-pointer text-center p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all ${
                statusFilter === 'PRESENT'
                  ? 'bg-emerald-100 dark:bg-emerald-950/70 border-2 border-emerald-600'
                  : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
              }`}
            >
              <div className="text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400">حاضر</div>
              <div className="text-sm sm:text-lg font-black text-emerald-700 dark:text-emerald-300">
                {toPersianDigits(rosterStats.present)}
              </div>
            </div>

            <div
              onClick={() => setStatusFilter(statusFilter === 'ABSENT' ? 'ALL' : 'ABSENT')}
              className={`cursor-pointer text-center p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all ${
                statusFilter === 'ABSENT'
                  ? 'bg-rose-100 dark:bg-rose-950/70 border-2 border-rose-600'
                  : 'hover:bg-rose-50 dark:hover:bg-rose-950/30'
              }`}
            >
              <div className="text-[10px] sm:text-xs font-bold text-rose-600 dark:text-rose-400">غایب</div>
              <div className="text-sm sm:text-lg font-black text-rose-700 dark:text-rose-300">
                {toPersianDigits(rosterStats.absent)}
              </div>
            </div>

            <div
              onClick={() => setStatusFilter(statusFilter === 'TARDY' ? 'ALL' : 'TARDY')}
              className={`cursor-pointer text-center p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all ${
                statusFilter === 'TARDY'
                  ? 'bg-amber-100 dark:bg-amber-950/70 border-2 border-amber-600'
                  : 'hover:bg-amber-50 dark:hover:bg-amber-950/30'
              }`}
            >
              <div className="text-[10px] sm:text-xs font-bold text-amber-600 dark:text-amber-400">تاخیر</div>
              <div className="text-sm sm:text-lg font-black text-amber-700 dark:text-amber-300">
                {toPersianDigits(rosterStats.tardy)}
              </div>
            </div>

            <div
              onClick={() => setStatusFilter(statusFilter === 'EXCUSED_ABSENT' ? 'ALL' : 'EXCUSED_ABSENT')}
              className={`cursor-pointer text-center p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all ${
                statusFilter === 'EXCUSED_ABSENT'
                  ? 'bg-sky-100 dark:bg-sky-950/70 border-2 border-sky-600'
                  : 'hover:bg-sky-50 dark:hover:bg-sky-950/30'
              }`}
            >
              <div className="text-[10px] sm:text-xs font-bold text-sky-600 dark:text-sky-400">موجه</div>
              <div className="text-sm sm:text-lg font-black text-sky-700 dark:text-sky-300">
                {toPersianDigits(rosterStats.excused)}
              </div>
            </div>
          </div>

          {/* Student Roster Card */}
          <div className="bg-white dark:bg-card border-2 sm:border-3 border-black dark:border-white/20 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-[4px_4px_0px_#000] sm:shadow-[6px_6px_0px_#000]">
            
            {/* Search Input Bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجوی نام یا کد دانش‌آموزی..."
                  className="pr-10 border-2 border-black font-bold text-xs h-10 w-full"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Students List */}
            {isLoadingRoster ? (
              <div className="py-16 text-center space-y-2">
                <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
                <p className="font-black text-xs sm:text-sm text-foreground">در حال بارگذاری لیست دانش‌آموزان...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl p-4">
                <Users className="w-8 h-8 text-muted-foreground mx-auto mb-1.5 opacity-50" />
                <p className="font-black text-xs sm:text-sm text-foreground">دانش‌آموزی مطابق فیلتر یافت نشد</p>
                {statusFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className="text-xs text-primary underline font-bold mt-1"
                  >
                    پاک کردن فیلتر وضعیت
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 sm:space-y-2 divide-y sm:divide-y-0 divide-neutral-100 dark:divide-neutral-800">
                {filteredStudents.map((st, idx) => {
                  const fullName = `${st.user?.firstName || ''} ${st.user?.lastName || ''}`;
                  const hasOralGrade = st.oralGrade !== null && st.oralGrade !== undefined;
                  const hasDiscipline = st.rewardDisciplineType && st.rewardDisciplineType !== 'NONE';
                  const hasSessionNote = !!st.sessionNote;

                  return (
                    <div
                      key={st.studentId}
                      className="pt-2.5 sm:pt-0 sm:py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4 sm:hover:bg-neutral-50/80 sm:dark:hover:bg-neutral-900/40 sm:px-3 sm:rounded-2xl transition-all"
                    >
                      {/* Student Info: Avatar + Name + Evaluation Chips (Clickable to open Bottom Sheet) */}
                      <div
                        onClick={() => handleOpenEvaluationModal(st)}
                        className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 cursor-pointer group"
                        title="برای ثبت نمره پرسش، انضباطی یا یادداشت کلیک کنید"
                      >
                        <div className="w-6 text-center font-mono font-black text-xs text-muted-foreground shrink-0">
                          {toPersianDigits(idx + 1)}
                        </div>
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl border-2 border-black bg-neutral-100 dark:bg-neutral-800 overflow-hidden shrink-0 shadow-[1.5px_1.5px_0px_#000] group-hover:scale-105 transition-all">
                          {st.user?.avatarUrl ? (
                            <img
                              src={st.user.avatarUrl}
                              alt={fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-black text-sm text-foreground">
                              {st.user?.firstName?.[0] || 'د'}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate">
                              {fullName}
                            </span>
                            
                            {/* Oral Grade Chip */}
                            {hasOralGrade && (
                              <span className="bg-amber-100 dark:bg-amber-950/70 border border-amber-500 text-amber-900 dark:text-amber-200 text-[10px] font-black px-1.5 py-0.5 rounded-lg flex items-center gap-0.5">
                                <Award className="w-3 h-3 text-amber-600" />
                                نمره: {toPersianDigits(st.oralGrade!)}
                              </span>
                            )}

                            {/* Disciplinary/Reward Chip */}
                            {hasDiscipline && (
                              <span
                                className={`text-[10px] font-black px-1.5 py-0.5 rounded-lg border flex items-center gap-0.5 ${
                                  st.rewardDisciplineType === 'POSITIVE' || st.rewardDisciplineType === 'EXCELLENT'
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-500'
                                    : 'bg-rose-100 text-rose-900 border-rose-500'
                                }`}
                              >
                                {st.rewardDisciplineType === 'POSITIVE' && '🌟 مثبت'}
                                {st.rewardDisciplineType === 'EXCELLENT' && '🏆 عالی'}
                                {st.rewardDisciplineType === 'NEGATIVE' && '⚠️ منفی'}
                                {st.rewardDisciplineType === 'WARNING' && '⚡ تذکر'}
                                {st.rewardDisciplineType === 'HOMEWORK_INCOMPLETE' && '📝 بدون تکلیف'}
                              </span>
                            )}

                            {/* Note Chip */}
                            {hasSessionNote && (
                              <span className="bg-neutral-100 dark:bg-neutral-800 border border-black/30 text-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-lg flex items-center gap-0.5">
                                <MessageSquare className="w-2.5 h-2.5 text-blue-500" />
                                یادداشت
                              </span>
                            )}
                          </div>

                          <div className="text-[10px] sm:text-xs text-muted-foreground font-mono truncate mt-0.5">
                            کد: {toPersianDigits(st.studentCode)}
                            {st.reason && (
                              <span className="text-amber-600 dark:text-amber-400 font-bold mr-1">
                                • {st.reason}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Selector - 4 Neobrutalist buttons (Grid on mobile, flex on desktop) */}
                      <div className="grid grid-cols-4 sm:flex sm:items-center gap-1 sm:gap-1.5 w-full md:w-auto">
                        {/* PRESENT */}
                        <button
                          type="button"
                          onClick={() => handleUpdateStudentStatus(st.studentId, 'PRESENT')}
                          className={`py-1.5 sm:py-1 px-1.5 sm:px-3 rounded-lg sm:rounded-xl font-black text-[11px] sm:text-xs border-2 text-center transition-all ${
                            st.status === 'PRESENT'
                              ? 'bg-emerald-400 text-black border-black shadow-[1.5px_1.5px_0px_#000] scale-102 sm:scale-105'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-muted-foreground border-transparent hover:border-black/30'
                          }`}
                        >
                          <Check className="w-3 h-3 inline ml-0.5 sm:ml-1" />
                          حاضر
                        </button>

                        {/* ABSENT */}
                        <button
                          type="button"
                          onClick={() => handleUpdateStudentStatus(st.studentId, 'ABSENT')}
                          className={`py-1.5 sm:py-1 px-1.5 sm:px-3 rounded-lg sm:rounded-xl font-black text-[11px] sm:text-xs border-2 text-center transition-all ${
                            st.status === 'ABSENT'
                              ? 'bg-rose-500 text-white border-black shadow-[1.5px_1.5px_0px_#000] scale-102 sm:scale-105'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-muted-foreground border-transparent hover:border-black/30'
                          }`}
                        >
                          <UserX className="w-3 h-3 inline ml-0.5 sm:ml-1" />
                          غایب
                        </button>

                        {/* TARDY */}
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateStudentStatus(st.studentId, 'TARDY');
                            handleOpenEvaluationModal(st);
                            setModalDelayMinutes(st.delayMinutes || 15);
                          }}
                          className={`py-1.5 sm:py-1 px-1.5 sm:px-3 rounded-lg sm:rounded-xl font-black text-[11px] sm:text-xs border-2 text-center transition-all ${
                            st.status === 'TARDY'
                              ? 'bg-amber-400 text-black border-black shadow-[1.5px_1.5px_0px_#000] scale-102 sm:scale-105'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-muted-foreground border-transparent hover:border-black/30'
                          }`}
                        >
                          <Clock className="w-3 h-3 inline ml-0.5 sm:ml-1" />
                          تاخیر
                        </button>

                        {/* EXCUSED_ABSENT */}
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateStudentStatus(st.studentId, 'EXCUSED_ABSENT');
                            handleOpenEvaluationModal(st);
                          }}
                          className={`py-1.5 sm:py-1 px-1.5 sm:px-3 rounded-lg sm:rounded-xl font-black text-[11px] sm:text-xs border-2 text-center transition-all ${
                            st.status === 'EXCUSED_ABSENT'
                              ? 'bg-sky-400 text-black border-black shadow-[1.5px_1.5px_0px_#000] scale-102 sm:scale-105'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-muted-foreground border-transparent hover:border-black/30'
                          }`}
                        >
                          <ShieldAlert className="w-3 h-3 inline ml-0.5 sm:ml-1" />
                          موجه
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sticky Mobile Floating Action Footer */}
          <div className="sm:hidden fixed bottom-0 inset-x-0 bg-white/95 dark:bg-card/95 backdrop-blur-md border-t-2 border-black p-3 z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.1)] flex items-center justify-between gap-3">
            <div className="text-xs font-black">
              <span className="text-emerald-600">{toPersianDigits(rosterStats.present)} حاضر</span>
              <span className="mx-1.5 text-muted-foreground">•</span>
              <span className="text-rose-600">{toPersianDigits(rosterStats.absent)} غایب</span>
              {rosterStats.graded > 0 && (
                <>
                  <span className="mx-1.5 text-muted-foreground">•</span>
                  <span className="text-amber-600">{toPersianDigits(rosterStats.graded)} نمره</span>
                </>
              )}
            </div>

            <Button
              size="sm"
              onClick={() => saveAttendanceMutation.mutate()}
              disabled={saveAttendanceMutation.isPending || studentsList.length === 0}
              className="bg-emerald-500 hover:bg-emerald-600 text-black border-2 border-black font-black text-xs px-4 h-10 shadow-[2px_2px_0px_#000]"
            >
              {saveAttendanceMutation.isPending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin ml-1" />
              ) : (
                <Send className="w-3.5 h-3.5 ml-1" />
              )}
              ثبت دفتر کلاسی
            </Button>
          </div>
        </div>
      ) : activeTab === 'today_schedule' ? (
        /* ─────────────────────────────────────────────────────────────
            4. TEACHER'S PERIODS & DAILY SCHEDULE
        ───────────────────────────────────────────────────────────── */
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-xl font-black text-foreground">
                برنامه درسی {currentDayOfWeekInfo.name} ({formatJalaliDisplay(selectedDate, false)})
              </h2>
              <p className="text-[11px] sm:text-xs font-bold text-muted-foreground mt-0.5">
                برای ثبت حضور و نمرات، روی هر زنگ یا کلاس کلیک کنید.
              </p>
            </div>
          </div>

          {isLoadingSchedule ? (
            <div className="py-16 text-center space-y-2 bg-white dark:bg-card border-2 sm:border-3 border-black rounded-2xl sm:rounded-3xl">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
              <p className="font-black text-xs sm:text-sm text-foreground">در حال واکشی برنامه درسی...</p>
            </div>
          ) : schedulesList.length === 0 ? (
            <div className="py-12 sm:py-16 text-center border-2 sm:border-3 border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-card rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-3 shadow-[3px_3px_0px_#000]">
              <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto opacity-50" />
              <div>
                <h3 className="text-sm sm:text-base font-black text-foreground">
                  در روز {currentDayOfWeekInfo.name} زنگ درسی برای شما ثبت نشده است
                </h3>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  از تب «تمام کلاس‌های تحت تدریس» می‌توانید هر کلاسی را انتخاب و ثبت دفتر کلاسی کنید.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('all_classes')}
                className="border-2 border-black font-black text-xs shadow-[2px_2px_0px_#000]"
              >
                مشاهده تمامی کلاس‌ها
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
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
                        lessonId: slot.lessonId,
                        lessonName: slot.lessonName,
                        periodNumber: slot.periodNumber,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                      })
                    }
                    className={`cursor-pointer group relative rounded-2xl sm:rounded-3xl p-4 sm:p-5 border-2 sm:border-3 transition-all transform sm:hover:-translate-y-1 ${
                      isCurrent
                        ? 'bg-amber-100 dark:bg-amber-950/70 border-amber-500 dark:border-amber-400 shadow-[4px_4px_0px_#d97706] sm:shadow-[6px_6px_0px_#d97706] ring-2 sm:ring-4 ring-amber-400/40'
                        : isRecorded
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-black dark:border-white/20 shadow-[3px_3px_0px_#000] sm:shadow-[4px_4px_0px_#000]'
                        : 'bg-white dark:bg-card border-black dark:border-white/20 shadow-[3px_3px_0px_#000] sm:shadow-[4px_4px_0px_#000] hover:border-primary'
                    }`}
                  >
                    {/* Period Header */}
                    <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span
                          className={`font-black text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl border-2 border-black ${
                            isCurrent
                              ? 'bg-amber-400 text-black shadow-[1.5px_1.5px_0px_#000]'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-foreground'
                          }`}
                        >
                          زنگ {toPersianDigits(slot.periodNumber)}
                        </span>
                        <span className="text-[11px] sm:text-xs font-mono font-bold text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          {toPersianDigits(slot.startTime)} - {toPersianDigits(slot.endTime)}
                        </span>
                      </div>

                      {/* Live Badge */}
                      {isCurrent ? (
                        <span className="bg-red-500 text-white text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse border border-black shadow-[1px_1px_0px_#000]">
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          زنگ جاری
                        </span>
                      ) : isPassed ? (
                        <span className="text-[10px] font-bold text-muted-foreground bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-lg">
                          سپری شده
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-2 py-0.5 rounded-lg">
                          زنگ آینده
                        </span>
                      )}
                    </div>

                    {/* Class & Lesson Title */}
                    <div className="space-y-0.5 sm:space-y-1 my-2 sm:my-3">
                      <h3 className="font-black text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                        {slot.classroomName}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-muted-foreground truncate">
                        <BookOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">درس: {slot.lessonName}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t-2 border-black/10 dark:border-white/10 flex items-center justify-between text-[11px] sm:text-xs font-bold">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span>{toPersianDigits(slot.stats?.totalStudents || 0)} دانش‌آموز</span>
                      </div>

                      <div>
                        {isRecorded ? (
                          <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 sm:py-1 rounded-lg sm:rounded-xl border border-emerald-400 flex items-center gap-1 font-black">
                            <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            ثبت شده ({toPersianDigits(slot.stats?.presentCount || 0)} حاضر)
                          </span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/80 px-2 py-0.5 sm:py-1 rounded-lg sm:rounded-xl border border-amber-400 flex items-center gap-1 font-bold">
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
            5. ALL CLASSROOMS DIRECT ACCESS
        ───────────────────────────────────────────────────────────── */
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h2 className="text-base sm:text-xl font-black text-foreground">تمام کلاس‌های تحت تدریس</h2>
            <p className="text-[11px] sm:text-xs font-bold text-muted-foreground mt-0.5">
              جهت ورود به دفتر کلاسی هر کلاس و زنگ دلخواه:
            </p>
          </div>

          {isLoadingAllClassrooms ? (
            <div className="py-16 text-center space-y-2 bg-white dark:bg-card border-2 sm:border-3 border-black rounded-2xl sm:rounded-3xl">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
              <p className="font-black text-xs sm:text-sm text-foreground">در حال بارگذاری لیست کلاس‌ها...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
              {allClassroomsData?.map((cls: any) => (
                <div
                  key={cls.id}
                  className="bg-white dark:bg-card border-2 sm:border-3 border-black dark:border-white/20 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-[3px_3px_0px_#000] sm:shadow-[4px_4px_0px_#000] space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-black text-sm sm:text-base text-foreground truncate">{cls.name}</h3>
                    <Badge variant="neutral" className="text-[10px] sm:text-xs font-bold border border-black shrink-0">
                      کد {toPersianDigits(cls.code || '')}
                    </Badge>
                  </div>

                  <p className="text-[11px] sm:text-xs font-bold text-muted-foreground truncate">
                    پایه: {cls.level?.name || 'ـ'} • رشته: {cls.field?.name || 'ـ'}
                  </p>

                  {/* Responsive Quick Period Buttons */}
                  <div className="pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-800">
                    <span className="text-[10px] sm:text-[11px] font-black text-muted-foreground block mb-1.5">
                      انتخاب زنگ:
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
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
                          className="py-1 text-[11px] font-black bg-neutral-100 dark:bg-neutral-800 hover:bg-amber-400 hover:text-black border-2 border-black rounded-lg shadow-[1px_1px_0px_#000] transition-all text-center"
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
            6. STAFF ATTENDANCE MONITORING
        ───────────────────────────────────────────────────────────── */
        <div className="space-y-4">
          <div className="bg-white dark:bg-card border-2 sm:border-3 border-black dark:border-white/20 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-[4px_4px_0px_#000]">
            <h2 className="text-base sm:text-xl font-black text-foreground mb-3">
              پایش تردد همکاران ({formatJalaliDisplay(selectedDate, true)})
            </h2>

            {isLoadingStaffAttendance ? (
              <div className="py-12 text-center">
                <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                <p className="text-xs sm:text-sm font-bold text-foreground">در حال بارگذاری سوابق...</p>
              </div>
            ) : staffAttendanceData?.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground font-bold text-xs sm:text-sm">
                هیچ رکوردی برای تردد همکاران در این تاریخ ثبت نشده است.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {staffAttendanceData?.map((item: any) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-black text-xs sm:text-sm text-foreground block truncate">
                        {item.teacher?.user?.firstName} {item.teacher?.user?.lastName}
                      </span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground">
                        ورود: {item.entryTime ? toPersianDigits(item.entryTime) : 'ـ'} | خروج: {item.exitTime ? toPersianDigits(item.exitTime) : 'ـ'}
                      </span>
                    </div>
                    <Badge variant={item.status === 'PRESENT' ? 'ecosystem' : 'female'} className="text-[10px]">
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
          7. STUDENT EVALUATION & TRACK RECORD BOTTOM SHEET / MODAL
      ───────────────────────────────────────────────────────────── */}
      {evaluationModalStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-card border-t-3 sm:border-3 border-black dark:border-white/20 rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-[8px_8px_0px_#000] space-y-4 animate-in slide-in-from-bottom duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-black/10 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl border-2 border-black bg-amber-400 text-black flex items-center justify-center font-black text-base shadow-[1.5px_1.5px_0px_#000]">
                  {evaluationModalStudent.user?.firstName?.[0] || 'د'}
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-foreground">
                    {evaluationModalStudent.user?.firstName} {evaluationModalStudent.user?.lastName}
                  </h3>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    کد دانش‌آموزی: {toPersianDigits(evaluationModalStudent.studentCode)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEvaluationModalStudent(null)}
                className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs: Evaluation vs History */}
            <div className="grid grid-cols-2 gap-1.5 bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl border border-black/20">
              <button
                type="button"
                onClick={() => setModalTab('EVALUATE')}
                className={`py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  modalTab === 'EVALUATE'
                    ? 'bg-white dark:bg-card text-foreground border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Award className="w-4 h-4 text-amber-500" />
                ارزیابی جلسه امروز
              </button>
              <button
                type="button"
                onClick={() => setModalTab('HISTORY')}
                className={`py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  modalTab === 'HISTORY'
                    ? 'bg-white dark:bg-card text-foreground border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <History className="w-4 h-4 text-sky-500" />
                سابقه دانش‌آموز در این درس
              </button>
            </div>

            {/* Tab 1: Evaluate Current Session */}
            {modalTab === 'EVALUATE' ? (
              <div className="space-y-4 pt-1">
                
                {/* 1. Oral Grade (out of 20) */}
                <div className="space-y-2 bg-neutral-50 dark:bg-neutral-900/60 p-3.5 rounded-2xl border-2 border-black/20">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-500" />
                      نمره پرسش کلاسی (از ۲۰):
                    </label>
                    {modalOralGrade && (
                      <span className="font-mono text-sm font-black text-amber-600 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-lg border border-amber-400">
                        {toPersianDigits(modalOralGrade)} از ۲۰
                      </span>
                    )}
                  </div>

                  <Input
                    type="number"
                    step="0.25"
                    min="0"
                    max="20"
                    value={modalOralGrade}
                    onChange={(e) => setModalOralGrade(e.target.value)}
                    placeholder="نمره مورد نظر را وارد کنید (مثلاً ۱۹.۵)"
                    className="border-2 border-black font-bold h-10 text-center text-sm"
                  />

                  {/* Quick Grade Pills */}
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    <span className="text-[10px] font-bold text-muted-foreground ml-1">نمرات سریع:</span>
                    {QUICK_GRADES.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setModalOralGrade(String(g))}
                        className={`px-2 py-0.5 rounded-lg text-xs font-black border transition-all ${
                          modalOralGrade === String(g)
                            ? 'bg-amber-400 text-black border-black shadow-[1px_1px_0px_#000]'
                            : 'bg-white dark:bg-neutral-800 text-foreground border-neutral-300 hover:border-black'
                        }`}
                      >
                        {toPersianDigits(g)}
                      </button>
                    ))}
                    {modalOralGrade && (
                      <button
                        type="button"
                        onClick={() => setModalOralGrade('')}
                        className="px-2 py-0.5 rounded-lg text-xs font-bold text-rose-500 hover:underline"
                      >
                        پاک کردن
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Disciplinary / Encouragement Selector */}
                <div className="space-y-2 bg-neutral-50 dark:bg-neutral-900/60 p-3.5 rounded-2xl border-2 border-black/20">
                  <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-emerald-500" />
                    موارد انضباطی و تشویقی جلسه:
                  </label>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {[
                      { key: 'POSITIVE', label: '🌟 مثبت', bg: 'bg-emerald-100 text-emerald-950 border-emerald-600' },
                      { key: 'EXCELLENT', label: '🏆 عالی', bg: 'bg-amber-100 text-amber-950 border-amber-600' },
                      { key: 'NEGATIVE', label: '⚠️ منفی', bg: 'bg-rose-100 text-rose-950 border-rose-600' },
                      { key: 'WARNING', label: '⚡ تذکر', bg: 'bg-orange-100 text-orange-950 border-orange-600' },
                      { key: 'HOMEWORK_INCOMPLETE', label: '📝 بدون تکلیف', bg: 'bg-purple-100 text-purple-950 border-purple-600' },
                      { key: 'NONE', label: 'عادی', bg: 'bg-neutral-200 text-foreground border-black/40' },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setModalDisciplineType(item.key as DisciplinaryRewardType)}
                        className={`py-1.5 px-1 rounded-xl text-[11px] font-black border-2 transition-all text-center ${
                          modalDisciplineType === item.key
                            ? `${item.bg} shadow-[2px_2px_0px_#000] scale-105`
                            : 'bg-white dark:bg-neutral-800 text-muted-foreground border-transparent hover:border-black/30'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {modalDisciplineType !== 'NONE' && (
                    <Input
                      value={modalDisciplineNote}
                      onChange={(e) => setModalDisciplineNote(e.target.value)}
                      placeholder="شرح یا علت تشویق/تذکر..."
                      className="border-2 border-black font-bold h-9 text-xs mt-2"
                    />
                  )}
                </div>

                {/* 3. Session Teacher Note */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-500" />
                    یادداشت جلسه دبیر (خصوصی):
                  </label>
                  <textarea
                    rows={3}
                    value={modalSessionNote}
                    onChange={(e) => setModalSessionNote(e.target.value)}
                    placeholder="یادداشت مشاهدات، عملکرد تحصیلی یا اخلاقی دانش‌آموز در این جلسه..."
                    className="w-full rounded-2xl border-2 border-black p-3 font-bold text-xs bg-white dark:bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-[2px_2px_0px_#000]"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEvaluationModalStudent(null)}
                    className="border-2 border-black font-bold text-xs h-9"
                  >
                    انصراف
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveModalEvaluation}
                    className="bg-primary text-primary-foreground border-2 border-black font-black text-xs h-9 shadow-[2px_2px_0px_#000]"
                  >
                    تایید و ثبت در لیست جلسه
                  </Button>
                </div>
              </div>
            ) : (
              /* Tab 2: Track Record / Subject History */
              <div className="space-y-3.5 pt-1">
                {isLoadingStudentHistory ? (
                  <div className="py-12 text-center space-y-2">
                    <RefreshCw className="w-7 h-7 text-primary animate-spin mx-auto" />
                    <p className="font-black text-xs text-foreground">در حال بارگذاری سوابق دانش‌آموز در این درس...</p>
                  </div>
                ) : !studentHistoryData ? (
                  <div className="py-8 text-center text-xs font-bold text-muted-foreground">
                    اطلاعاتی یافت نشد.
                  </div>
                ) : (
                  <>
                    {/* Summary KPI Strip */}
                    <div className="grid grid-cols-4 gap-2 bg-neutral-100 dark:bg-neutral-900 p-2.5 rounded-2xl border-2 border-black/20 text-center">
                      <div className="bg-white dark:bg-card p-2 rounded-xl border border-black/10">
                        <div className="text-[10px] font-bold text-muted-foreground">میانگین نمرات</div>
                        <div className="text-sm font-black text-amber-600">
                          {studentHistoryData.summary?.oralAverage !== null
                            ? `${toPersianDigits(studentHistoryData.summary.oralAverage)} از ۲۰`
                            : 'ـ'}
                        </div>
                      </div>

                      <div className="bg-white dark:bg-card p-2 rounded-xl border border-black/10">
                        <div className="text-[10px] font-bold text-muted-foreground">حضور / غیبت</div>
                        <div className="text-sm font-black text-foreground">
                          {toPersianDigits(studentHistoryData.summary?.presentCount)} / {toPersianDigits(studentHistoryData.summary?.absentCount)}
                        </div>
                      </div>

                      <div className="bg-white dark:bg-card p-2 rounded-xl border border-black/10">
                        <div className="text-[10px] font-bold text-emerald-600">تشویقی‌ها</div>
                        <div className="text-sm font-black text-emerald-700">
                          {toPersianDigits(studentHistoryData.summary?.positiveRewardsCount || 0)} مورد
                        </div>
                      </div>

                      <div className="bg-white dark:bg-card p-2 rounded-xl border border-black/10">
                        <div className="text-[10px] font-bold text-rose-600">تذکرات</div>
                        <div className="text-sm font-black text-rose-700">
                          {toPersianDigits(studentHistoryData.summary?.negativeDisciplineCount || 0)} مورد
                        </div>
                      </div>
                    </div>

                    {/* Timeline of Previous Sessions */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      <span className="text-xs font-black text-foreground block">
                        جلسات ثبت‌شده پیشین ({toPersianDigits(studentHistoryData.sessions?.length || 0)} جلسه):
                      </span>

                      {studentHistoryData.sessions?.length === 0 ? (
                        <div className="py-6 text-center text-xs text-muted-foreground font-bold">
                          هنوز جلسه‌ای برای این دانش‌آموز در این درس ثبت نشده است.
                        </div>
                      ) : (
                        studentHistoryData.sessions.map((sess: any) => (
                          <div
                            key={sess.id}
                            className="bg-neutral-50 dark:bg-neutral-900 border-2 border-black/20 p-2.5 rounded-xl space-y-1 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-foreground">
                                  {formatJalaliDisplay(sess.date, false)}
                                </span>
                                {sess.periodNumber && (
                                  <span className="text-[10px] bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-mono">
                                    زنگ {toPersianDigits(sess.periodNumber)}
                                  </span>
                                )}
                              </div>

                              <Badge
                                variant={
                                  sess.status === 'PRESENT'
                                    ? 'ecosystem'
                                    : sess.status === 'ABSENT'
                                    ? 'female'
                                    : 'college'
                                }
                                className="text-[10px] px-1.5 py-0"
                              >
                                {sess.status === 'PRESENT' && 'حاضر'}
                                {sess.status === 'ABSENT' && 'غایب'}
                                {sess.status === 'TARDY' && `تاخیر (${toPersianDigits(sess.delayMinutes)}د)`}
                                {sess.status === 'EXCUSED_ABSENT' && 'موجه'}
                              </Badge>
                            </div>

                            {/* Details row */}
                            <div className="flex items-center gap-3 pt-1 flex-wrap text-[11px]">
                              {sess.oralGrade !== null && sess.oralGrade !== undefined && (
                                <span className="font-bold text-amber-700 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded">
                                  نمره پرسش: {toPersianDigits(sess.oralGrade)}
                                </span>
                              )}

                              {sess.rewardDisciplineType && sess.rewardDisciplineType !== 'NONE' && (
                                <span className="font-bold text-primary">
                                  مورد: {sess.rewardDisciplineType} {sess.rewardDisciplineNote && `(${sess.rewardDisciplineNote})`}
                                </span>
                              )}
                            </div>

                            {sess.sessionNote && (
                              <p className="text-[11px] text-muted-foreground pt-1 italic bg-white dark:bg-card p-1.5 rounded border border-black/10">
                                «{sess.sessionNote}»
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
