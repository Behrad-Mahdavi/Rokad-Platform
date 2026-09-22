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
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../../lib/api/client';
import { toPersianDigits, formatToJalali } from '../../../lib/utils';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { StatCard } from '../../../components/ui/StatCard';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';

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

export const AttendancePage: React.FC = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isManagerOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN' || user?.role === 'STAFF';

  // Active Main Tab: Student Attendance vs Teacher Attendance
  const [activeMainTab, setActiveMainTab] = useState<'students' | 'teachers'>('students');

  // Date selection: YYYY-MM-DD
  const getTodayIso = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayIso());
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Local state for students attendance editable grid
  const [studentsList, setStudentsList] = useState<LocalStudentAttendance[]>([]);

  // 1. Fetch Classrooms list
  const { data: classroomsData, isLoading: isLoadingClassrooms } = useQuery({
    queryKey: ['classrooms-attendance'],
    queryFn: async () => {
      const res: any = await apiClient.get('/classes/classrooms');
      const list = res?.data || res || [];
      return Array.isArray(list) ? list : [];
    },
  });

  // Automatically select first classroom when loaded
  useEffect(() => {
    if (classroomsData && classroomsData.length > 0 && !selectedClassroomId) {
      setSelectedClassroomId(classroomsData[0].id);
    }
  }, [classroomsData, selectedClassroomId]);

  // 2. Fetch Classroom Attendance for selected date and period
  const {
    data: attendanceData,
    isLoading: isLoadingAttendance,
    isFetching: isFetchingAttendance,
    refetch: refetchAttendance,
  } = useQuery({
    queryKey: ['classroom-attendance', selectedClassroomId, selectedDate, selectedPeriod],
    queryFn: async () => {
      if (!selectedClassroomId) return null;
      const res: any = await apiClient.get(
        `/attendance/classroom/${selectedClassroomId}?date=${selectedDate}&periodNumber=${selectedPeriod}`,
      );
      return res?.data || res;
    },
    enabled: !!selectedClassroomId,
  });

  // Sync loaded attendance data to local editable state
  useEffect(() => {
    if (attendanceData && Array.isArray(attendanceData.students)) {
      const mapped = attendanceData.students.map((st: any) => ({
        studentId: st.studentId,
        studentCode: st.studentCode || '',
        nationalCode: st.nationalCode || '',
        fatherPhone: st.fatherPhone || '',
        motherPhone: st.motherPhone || '',
        user: st.user,
        status: (st.status || 'PRESENT') as AttendanceStatus,
        delayMinutes: st.delayMinutes || 0,
        reason: st.reason || '',
        isRecorded: !!st.isRecorded,
      }));
      setStudentsList(mapped);
      setHasUnsavedChanges(false);
    }
  }, [attendanceData]);

  // Quick Date Navigation Helpers
  const changeDateByDays = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // Status Changer for single student
  const handleStatusChange = (studentId: string, newStatus: AttendanceStatus) => {
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

  const handleDelayMinutesChange = (studentId: string, minutes: number) => {
    setStudentsList((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, delayMinutes: minutes } : s)),
    );
    setHasUnsavedChanges(true);
  };

  const handleReasonChange = (studentId: string, reason: string) => {
    setStudentsList((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, reason } : s)),
    );
    setHasUnsavedChanges(true);
  };

  // Quick Bulk Actions
  const handleMarkAll = (status: AttendanceStatus) => {
    setStudentsList((prev) =>
      prev.map((s) => ({
        ...s,
        status,
        delayMinutes: status === 'TARDY' ? 15 : 0,
      })),
    );
    setHasUnsavedChanges(true);
    toast.info(`تمام دانش‌آموزان به عنوان «${getStatusLabel(status)}» تنظیم شدند`);
  };

  const getStatusLabel = (st: AttendanceStatus) => {
    switch (st) {
      case 'PRESENT': return 'حاضر';
      case 'ABSENT': return 'غایب';
      case 'TARDY': return 'تاخیر';
      case 'EXCUSED_ABSENT': return 'غیبت موجه';
      case 'EXPELLED': return 'اخراج از کلاس';
      default: return 'حاضر';
    }
  };

  // 3. Save Mutation (Bulk Record Attendance)
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClassroomId) throw new Error('لطفاً یک کلاس انتخاب نمایید');
      const payload = {
        classroomId: selectedClassroomId,
        date: selectedDate,
        periodNumber: selectedPeriod,
        attendances: studentsList.map((s) => ({
          studentId: s.studentId,
          status: s.status,
          delayMinutes: s.status === 'TARDY' ? s.delayMinutes : 0,
          reason: s.reason || undefined,
        })),
      };
      const res: any = await apiClient.post('/attendance/students/bulk', payload);
      return res?.data || res;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'حضور و غیاب با موفقیت در سامانه ذخیره شد');
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['classroom-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
      refetchAttendance();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || 'خطا در ثبت حضور و غیاب');
    },
  });

  // Calculate Live KPI Metrics from local state
  const liveStats = useMemo(() => {
    const total = studentsList.length;
    const present = studentsList.filter((s) => s.status === 'PRESENT').length;
    const absent = studentsList.filter((s) => s.status === 'ABSENT').length;
    const tardy = studentsList.filter((s) => s.status === 'TARDY').length;
    const excused = studentsList.filter((s) => s.status === 'EXCUSED_ABSENT').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, tardy, excused, percentage };
  }, [studentsList]);

  // Filtered Students for display
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return studentsList;
    const q = searchQuery.toLowerCase().trim();
    return studentsList.filter((s) => {
      const fullName = `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.toLowerCase();
      const code = s.studentCode.toLowerCase();
      const nat = (s.nationalCode || '').toLowerCase();
      return fullName.includes(q) || code.includes(q) || nat.includes(q);
    });
  }, [studentsList, searchQuery]);

  // 4. Teacher Attendance Tab State & Queries (for Admin/Staff)
  const { data: teacherAttendanceData, refetch: refetchTeacherAttendance } = useQuery({
    queryKey: ['teachers-attendance', selectedDate],
    queryFn: async () => {
      const res: any = await apiClient.get(`/attendance/teachers?date=${selectedDate}`);
      return res?.data || res || [];
    },
    enabled: isManagerOrAdmin && activeMainTab === 'teachers',
  });

  const { data: teachersList } = useQuery({
    queryKey: ['members-teachers-list'],
    queryFn: async () => {
      const res: any = await apiClient.get('/members/teachers');
      return res?.data || res || [];
    },
    enabled: isManagerOrAdmin && activeMainTab === 'teachers',
  });

  return (
    <div className="space-y-6 select-none">
      {/* 1. Header Banner & Switcher */}
      <div className="bg-white dark:bg-[#121824] border border-[#EAEAEA] dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-[3px_3px_0_#202A5A] dark:shadow-[3px_3px_0_#59BBAF]/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-ecosystem-light dark:bg-ecosystem-darker/60 border border-primary/30 flex items-center justify-center text-primary shadow-[2px_2px_0_#59BBAF] shrink-0">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-ink-darker dark:text-white">
                سامانه هوشمند حضور و غیاب
              </h1>
              <Badge variant="ecosystem" className="text-[10px] font-bold">
                نسخه هوشمند و متصل
              </Badge>
            </div>
            <p className="text-xs text-ink-normal/60 dark:text-gray-400 mt-1">
              ثبت آنلاین تردد کلاسی، ثبت تاخیرها، همگام‌سازی کارنامه و پیامک لحظه‌ای به والدین
            </p>
          </div>
        </div>

        {/* Tab Switcher for Admin/Staff */}
        {isManagerOrAdmin && (
          <div className="flex items-center bg-gray-100/80 dark:bg-gray-800/80 p-1.5 rounded-2xl border border-gray-200/80 dark:border-gray-700 w-full sm:w-auto self-stretch sm:self-auto justify-center">
            <button
              type="button"
              onClick={() => setActiveMainTab('students')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] ${
                activeMainTab === 'students'
                  ? 'bg-white dark:bg-[#161D2A] text-ink-darker dark:text-white shadow-[2px_2px_0_#202A5A] dark:shadow-[2px_2px_0_#59BBAF]'
                  : 'text-gray-500 hover:text-ink-darker dark:hover:text-gray-200'
              }`}
            >
              <Users className="w-4 h-4 text-primary" />
              <span>حضور و غیاب دانش‌آموزان</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMainTab('teachers')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] ${
                activeMainTab === 'teachers'
                  ? 'bg-white dark:bg-[#161D2A] text-ink-darker dark:text-white shadow-[2px_2px_0_#202A5A] dark:shadow-[2px_2px_0_#59BBAF]'
                  : 'text-gray-500 hover:text-ink-darker dark:hover:text-gray-200'
              }`}
            >
              <Briefcase className="w-4 h-4 text-blue-500" />
              <span>تردد کادر آموزشی و اساتید</span>
            </button>
          </div>
        )}
      </div>

      {activeMainTab === 'students' ? (
        <>
          {/* 2. Controls & Filter Bar */}
          <div className="bg-white dark:bg-[#121824] border border-[#EAEAEA] dark:border-gray-800 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Right: Classroom Selector & Period */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Classroom Dropdown */}
              <div className="w-full sm:w-64">
                <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1">
                  کلاس درس مورد نظر:
                </label>
                <div className="relative">
                  <select
                    value={selectedClassroomId}
                    onChange={(e) => setSelectedClassroomId(e.target.value)}
                    disabled={isLoadingClassrooms}
                    className="w-full h-11 px-3 py-2 bg-gray-50 dark:bg-[#161D2A] border-2 border-gray-300 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-bold text-ink-darker dark:text-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  >
                    {isLoadingClassrooms && <option>در حال بارگذاری کلاس‌ها...</option>}
                    {classroomsData && classroomsData.length === 0 && (
                      <option value="">کلاسی یافت نشد</option>
                    )}
                    {classroomsData?.map((cls: any) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} {cls.level?.name ? `(${cls.level.name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Period Selector */}
              <div className="w-full sm:w-44">
                <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1">
                  زنگ کلاسی:
                </label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                  className="w-full h-11 px-3 py-2 bg-gray-50 dark:bg-[#161D2A] border-2 border-gray-300 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-bold text-ink-darker dark:text-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  <option value={1}>زنگ اول (صبح)</option>
                  <option value={2}>زنگ دوم</option>
                  <option value={3}>زنگ سوم</option>
                  <option value={4}>زنگ چهارم (عصر)</option>
                </select>
              </div>
            </div>

            {/* Left: Date Navigation & Quick Jump */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-700 rounded-xl p-1 gap-1">
                <button
                  type="button"
                  onClick={() => changeDateByDays(1)}
                  title="روز بعد"
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="px-2 text-xs font-black text-ink-darker dark:text-white font-mono flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-primary" />
                  <span>{toPersianDigits(selectedDate)}</span>
                </div>

                <button
                  type="button"
                  onClick={() => changeDateByDays(-1)}
                  title="روز قبل"
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(getTodayIso())}
                className="h-10 text-xs font-bold"
              >
                امروز
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchAttendance()}
                isLoading={isFetchingAttendance}
                className="h-10 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingAttendance ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* 3. Live KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Total Students */}
            <div className="bg-white dark:bg-[#121824] border-2 border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-[2px_2px_0_#202A5A]">
              <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-1">
                <span>کل هنرجویان</span>
                <Users className="w-4 h-4 text-sec" />
              </div>
              <div className="text-2xl font-black text-ink-darker dark:text-white font-mono">
                {toPersianDigits(liveStats.total)}
              </div>
              <div className="text-[10px] text-gray-400 mt-1">ظرفیت ثبت‌نام کلاس</div>
            </div>

            {/* Present Students */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border-2 border-emerald-400 dark:border-emerald-700 p-4 rounded-2xl shadow-[2px_2px_0_#59BBAF]">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                <span>حاضرین</span>
                <UserCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                {toPersianDigits(liveStats.present)}
                <span className="text-xs font-normal mr-1">({toPersianDigits(liveStats.percentage)}٪)</span>
              </div>
              <div className="text-[10px] text-emerald-600/80 mt-1">حضور سر کلاس</div>
            </div>

            {/* Absent Students */}
            <div className="bg-rose-50/70 dark:bg-rose-950/30 border-2 border-rose-400 dark:border-rose-700 p-4 rounded-2xl shadow-[2px_2px_0_#E0195B]">
              <div className="flex items-center justify-between text-xs font-bold text-rose-800 dark:text-rose-300 mb-1">
                <span>غایبین</span>
                <UserX className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-black text-rose-700 dark:text-rose-300 font-mono">
                {toPersianDigits(liveStats.absent)}
              </div>
              <div className="text-[10px] text-rose-600/80 mt-1">عدم حضور غیرموجه</div>
            </div>

            {/* Tardy Students */}
            <div className="bg-amber-50/70 dark:bg-amber-950/30 border-2 border-amber-400 dark:border-amber-700 p-4 rounded-2xl shadow-[2px_2px_0_#F8A41D]">
              <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
                <span>تاخیر ورود</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono">
                {toPersianDigits(liveStats.tardy)}
              </div>
              <div className="text-[10px] text-amber-600/80 mt-1">ورود با تاخیر</div>
            </div>

            {/* Excused Absents */}
            <div className="bg-sky-50/70 dark:bg-sky-950/30 border-2 border-sky-400 dark:border-sky-700 p-4 rounded-2xl shadow-[2px_2px_0_#3B82F6] col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-xs font-bold text-sky-800 dark:text-sky-300 mb-1">
                <span>غیبت موجه</span>
                <ShieldAlert className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-2xl font-black text-sky-700 dark:text-sky-300 font-mono">
                {toPersianDigits(liveStats.excused)}
              </div>
              <div className="text-[10px] text-sky-600/80 mt-1">با هماهنگی/گواهی</div>
            </div>
          </div>

          {/* 4. Action Controls & Quick Bulk Buttons */}
          <div className="bg-white dark:bg-[#121824] border border-[#EAEAEA] dark:border-gray-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی نام یا شماره دانش‌آموزی..."
                className="w-full h-10 pr-9 pl-3 text-xs bg-gray-50 dark:bg-[#161D2A] border border-gray-300 dark:border-gray-700 rounded-xl text-ink-darker dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Bulk Buttons & Final Submit */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMarkAll('PRESENT')}
                className="text-xs h-10 border-emerald-400 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 hover:bg-emerald-100"
              >
                <Check className="w-3.5 h-3.5 ml-1 text-emerald-600" />
                <span>همه حاضرند</span>
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={() => saveMutation.mutate()}
                isLoading={saveMutation.isPending}
                className="h-10 text-xs sm:text-sm font-bold shadow-[2px_2px_0_#202A5A] px-5"
              >
                <CheckCircle2 className="w-4 h-4 ml-1.5" />
                <span>ذخیره و ثبت نهایی حضور و غیاب</span>
              </Button>
            </div>
          </div>

          {/* Unsaved Changes Banner */}
          {hasUnsavedChanges && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 rounded-xl p-3 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>شما تغییرات ذخیره‌نشده در لیست حضور و غیاب دارید.</span>
              </div>
              <span className="text-[11px] underline cursor-pointer" onClick={() => saveMutation.mutate()}>
                برای اعمال در سامانه کلیک کنید
              </span>
            </div>
          )}

          {/* 5. Main Attendance Table */}
          <div className="bg-white dark:bg-[#121824] border-2 border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden shadow-[3px_3px_0_#202A5A]">
            {isLoadingAttendance ? (
              <div className="p-12 text-center text-gray-500 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-sm font-bold">در حال بارگذاری لیست کلاسی و بررسی ترددها...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-12 text-center text-gray-500 space-y-3">
                <Users className="w-10 h-10 mx-auto text-gray-400" />
                <p className="text-sm font-bold text-ink-darker dark:text-white">دانش‌آموزی در این کلاس یافت نشد</p>
                <p className="text-xs text-gray-400">از منوی مدیریت کلاس‌ها، مطمئن شوید هنرجویان در این کلاس ثبت‌نام شده‌اند.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-gray-100/80 dark:bg-[#161D2A] border-b-2 border-gray-200 dark:border-gray-800 text-ink-darker dark:text-gray-300 font-black">
                      <th className="py-3.5 px-4 w-12 text-center">#</th>
                      <th className="py-3.5 px-4">مشخصات هنرجو</th>
                      <th className="py-3.5 px-4 text-center">شماره دانش‌آموزی</th>
                      <th className="py-3.5 px-4 text-center">وضعیت حضور و غیاب</th>
                      <th className="py-3.5 px-4 text-center">جزئیات (تاخیر / علت)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                    {filteredStudents.map((st, idx) => {
                      const fullName = `${st.user?.firstName || ''} ${st.user?.lastName || ''}`.trim() || 'هنرجو';
                      return (
                        <tr
                          key={st.studentId}
                          className={`transition-colors hover:bg-gray-50/70 dark:hover:bg-gray-800/40 ${
                            st.status === 'ABSENT'
                              ? 'bg-rose-50/30 dark:bg-rose-950/10'
                              : st.status === 'TARDY'
                                ? 'bg-amber-50/30 dark:bg-amber-950/10'
                                : st.status === 'EXCUSED_ABSENT'
                                  ? 'bg-sky-50/30 dark:bg-sky-950/10'
                                  : ''
                          }`}
                        >
                          {/* Row Number */}
                          <td className="py-3 px-4 text-center font-mono font-bold text-gray-400">
                            {toPersianDigits(idx + 1)}
                          </td>

                          {/* Student Info */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-sec/10 dark:bg-sec/20 border border-sec/30 flex items-center justify-center font-bold text-sec dark:text-indigo-400 text-xs shrink-0 overflow-hidden">
                                {st.user?.avatarUrl ? (
                                  <img src={st.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span>{fullName.slice(0, 2)}</span>
                                )}
                              </div>
                              <div>
                                <span className="font-black text-ink-darker dark:text-white block text-sm">
                                  {fullName}
                                </span>
                                {st.fatherPhone && (
                                  <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                                    تماس ولی: {toPersianDigits(st.fatherPhone)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Student Code */}
                          <td className="py-3 px-4 text-center font-mono font-bold text-ink-darker dark:text-gray-300">
                            {toPersianDigits(st.studentCode || st.nationalCode || '---')}
                          </td>

                          {/* Interactive Status Switcher (4 Buttons) */}
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* PRESENT */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(st.studentId, 'PRESENT')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border ${
                                  st.status === 'PRESENT'
                                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-[1.5px_1.5px_0_#202A5A] scale-105'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-transparent hover:border-gray-300'
                                }`}
                              >
                                <Check className="w-3 h-3" />
                                <span>حاضر</span>
                              </button>

                              {/* ABSENT */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(st.studentId, 'ABSENT')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border ${
                                  st.status === 'ABSENT'
                                    ? 'bg-rose-600 text-white border-rose-700 shadow-[1.5px_1.5px_0_#202A5A] scale-105'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-transparent hover:border-gray-300'
                                }`}
                              >
                                <UserX className="w-3 h-3" />
                                <span>غایب</span>
                              </button>

                              {/* TARDY */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(st.studentId, 'TARDY')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border ${
                                  st.status === 'TARDY'
                                    ? 'bg-amber-500 text-white border-amber-600 shadow-[1.5px_1.5px_0_#202A5A] scale-105'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-transparent hover:border-gray-300'
                                }`}
                              >
                                <Clock className="w-3 h-3" />
                                <span>تاخیر</span>
                              </button>

                              {/* EXCUSED_ABSENT */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(st.studentId, 'EXCUSED_ABSENT')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border ${
                                  st.status === 'EXCUSED_ABSENT'
                                    ? 'bg-sky-600 text-white border-sky-700 shadow-[1.5px_1.5px_0_#202A5A] scale-105'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-transparent hover:border-gray-300'
                                }`}
                              >
                                <ShieldAlert className="w-3 h-3" />
                                <span>موجه</span>
                              </button>
                            </div>
                          </td>

                          {/* Details: Delay Minutes or Excused Reason */}
                          <td className="py-3 px-4 text-center">
                            {st.status === 'TARDY' ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <input
                                  type="number"
                                  min={1}
                                  max={240}
                                  value={st.delayMinutes}
                                  onChange={(e) => handleDelayMinutesChange(st.studentId, Number(e.target.value))}
                                  className="w-16 h-8 text-center bg-white dark:bg-[#161D2A] border-2 border-amber-400 rounded-lg text-xs font-mono font-bold text-ink-darker dark:text-white"
                                />
                                <span className="text-[10px] text-gray-500">دقیقه</span>
                              </div>
                            ) : st.status === 'EXCUSED_ABSENT' ? (
                              <input
                                type="text"
                                value={st.reason}
                                onChange={(e) => handleReasonChange(st.studentId, e.target.value)}
                                placeholder="علت موجه (مثلاً بیماری)..."
                                className="w-36 h-8 px-2 text-center bg-white dark:bg-[#161D2A] border border-sky-400 rounded-lg text-[11px] text-ink-darker dark:text-white"
                              />
                            ) : st.status === 'ABSENT' ? (
                              <span className="text-[10px] text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">
                                آماده ارسال پیامک غیبت
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                                حضور عادی
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* 6. Teacher Attendance Tab (for School Admin / Staff) */
        <div className="bg-white dark:bg-[#121824] border-2 border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-[3px_3px_0_#202A5A] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-500" />
              <h2 className="text-base font-black text-ink-darker dark:text-white">
                پایش حضور و تردد کادر آموزشی و دبیران (تاریخ: {toPersianDigits(selectedDate)})
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchTeacherAttendance()}
              className="text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 ml-1" />
              <span>به‌روزرسانی</span>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-gray-100/80 dark:bg-[#161D2A] border-b border-gray-200 dark:border-gray-800 text-ink-darker dark:text-gray-300 font-black">
                  <th className="py-3 px-4">استاد / دبیر</th>
                  <th className="py-3 px-4 text-center">شماره تماس</th>
                  <th className="py-3 px-4 text-center">ساعت ورود</th>
                  <th className="py-3 px-4 text-center">ساعت خروج</th>
                  <th className="py-3 px-4 text-center">وضعیت تردد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                {teachersList?.map((t: any) => {
                  const teacherName = `${t.user?.firstName || ''} ${t.user?.lastName || ''}`.trim();
                  const rec = teacherAttendanceData?.find((r: any) => r.teacherId === t.id);
                  return (
                    <tr key={t.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                      <td className="py-3 px-4 font-bold text-ink-darker dark:text-white">
                        {teacherName}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-gray-500">
                        {toPersianDigits(t.user?.phone || '---')}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {rec?.entryTime ? toPersianDigits(rec.entryTime) : '۰۷:۴۵'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {rec?.exitTime ? toPersianDigits(rec.exitTime) : '۱۴:۱۵'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="success" className="text-[10px]">
                          حاضر در آموزشگاه
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
