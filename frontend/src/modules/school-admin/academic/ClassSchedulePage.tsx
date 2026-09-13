import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ResponsivePageHeader } from '../../../components/ui/ResponsivePageHeader';
import { useAuthStore } from '../../../lib/auth/auth-store';
import {
  CalendarDays,
  Clock,
  User,
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Printer,
  AlertCircle,
  Building2,
  GraduationCap,
  Sparkles,
  Lock,
} from 'lucide-react';

interface DayDef {
  key: string;
  label: string;
}

interface PeriodDef {
  number: number;
  label: string;
  defaultStart: string;
  defaultEnd: string;
}

const DAYS: DayDef[] = [
  { key: 'SATURDAY', label: 'شنبه' },
  { key: 'SUNDAY', label: 'یکشنبه' },
  { key: 'MONDAY', label: 'دوشنبه' },
  { key: 'TUESDAY', label: 'سه‌شنبه' },
  { key: 'WEDNESDAY', label: 'چهارشنبه' },
  { key: 'THURSDAY', label: 'پنج‌شنبه' },
];

const PERIODS: PeriodDef[] = [
  { number: 1, label: 'زنگ اول', defaultStart: '07:45', defaultEnd: '09:00' },
  { number: 2, label: 'زنگ دوم', defaultStart: '09:15', defaultEnd: '10:30' },
  { number: 3, label: 'زنگ سوم', defaultStart: '10:45', defaultEnd: '12:00' },
  { number: 4, label: 'زنگ چهارم', defaultStart: '12:30', defaultEnd: '13:45' },
  { number: 5, label: 'زنگ پنجم', defaultStart: '14:00', defaultEnd: '15:15' },
  { number: 6, label: 'زنگ ششم', defaultStart: '15:30', defaultEnd: '16:45' },
];

interface ClassSchedulePageProps {
  readOnly?: boolean;
  classroomId?: string;
}

export const ClassSchedulePage: React.FC<ClassSchedulePageProps> = ({
  readOnly = false,
  classroomId: initialClassroomId,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const isStudent = currentUser?.role === 'STUDENT';
  const isParent = currentUser?.role === 'PARENT';
  const isStaffOrAdmin = ['SCHOOL_ADMIN', 'STAFF', 'SUPER_ADMIN'].includes(currentUser?.role || '');
  const canManageSchedule = !readOnly && isStaffOrAdmin;

  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>(initialClassroomId || '');
  const [schedules, setSchedules] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);
  const [mobileSelectedDay, setMobileSelectedDay] = useState<string>('SATURDAY');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    scheduleId: '',
    dayOfWeek: 'SATURDAY',
    periodNumber: 1,
    lessonId: '',
    teacherId: '',
    startTime: '07:45',
    endTime: '09:00',
  });

  // 1. Initial Load: Classrooms, Lessons, Teachers
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        const [classesRes, lessonsRes, teachersRes] = await Promise.all([
          apiClient.get('/classes/classrooms'),
          apiClient.get('/classes/lessons'),
          apiClient.get('/members/teachers'),
        ]);

        const classList = classesRes.data || [];
        setClassrooms(classList);
        setLessons(lessonsRes.data || []);
        setTeachers(teachersRes.data || []);

        if (classList.length > 0) {
          setSelectedClassroomId(classList[0].id);
        }
      } catch (err) {
        console.error('Failed to load initial timetable data', err);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // 2. Fetch Class Schedule whenever selectedClassroomId changes
  const fetchClassSchedule = async (classroomId: string) => {
    if (!classroomId) return;
    try {
      setIsScheduleLoading(true);
      const res = await apiClient.get(`/classes/classrooms/${classroomId}/schedule`);
      setSchedules(res.data || []);
    } catch (err) {
      console.error('Failed to load classroom schedule', err);
      setSchedules([]);
    } finally {
      setIsScheduleLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClassroomId) {
      fetchClassSchedule(selectedClassroomId);
    }
  }, [selectedClassroomId]);

  const selectedClassroom = classrooms.find((c) => c.id === selectedClassroomId);

  // Filter lessons relevant to this classroom's level and field
  const relevantLessons = lessons.filter((l) => {
    if (!selectedClassroom) return true;
    if (l.levelId && selectedClassroom.levelId && l.levelId !== selectedClassroom.levelId) {
      return false;
    }
    if (l.fieldId && selectedClassroom.fieldId && l.fieldId !== selectedClassroom.fieldId) {
      return false;
    }
    return true;
  });

  const availableLessons = relevantLessons.length > 0 ? relevantLessons : lessons;

  // Open Modal to Create or Edit
  const handleOpenSlotModal = (dayKey: string, periodNum: number, existingSchedule?: any) => {
    if (!canManageSchedule) return;
    setError(null);
    const periodDef = PERIODS.find((p) => p.number === periodNum)!;

    if (existingSchedule) {
      setForm({
        scheduleId: existingSchedule.id,
        dayOfWeek: dayKey,
        periodNumber: periodNum,
        lessonId: existingSchedule.lessonId || existingSchedule.lesson?.id || '',
        teacherId: existingSchedule.teacherId || existingSchedule.teacher?.id || '',
        startTime: existingSchedule.startTime || periodDef.defaultStart,
        endTime: existingSchedule.endTime || periodDef.defaultEnd,
      });
    } else {
      const defaultLesson = availableLessons[0];
      const matchingTeachers = teachers.filter((t) =>
        t.teacherLessons?.some((tl: any) => (tl.lessonId || tl.lesson?.id) === defaultLesson?.id),
      );
      const defaultTeacher = matchingTeachers[0] || teachers[0];

      setForm({
        scheduleId: '',
        dayOfWeek: dayKey,
        periodNumber: periodNum,
        lessonId: defaultLesson?.id || '',
        teacherId: defaultTeacher?.id || '',
        startTime: periodDef.defaultStart,
        endTime: periodDef.defaultEnd,
      });
    }
    setIsModalOpen(true);
  };

  // Handle lesson change in modal: auto-suggest matching teacher
  const handleLessonChange = (lessonId: string) => {
    const matchingTeachers = teachers.filter((t) =>
      t.teacherLessons?.some((tl: any) => (tl.lessonId || tl.lesson?.id) === lessonId),
    );

    setForm((prev) => ({
      ...prev,
      lessonId,
      teacherId: matchingTeachers.length > 0 ? matchingTeachers[0].id : prev.teacherId || teachers[0]?.id || '',
    }));
  };

  // Submit Schedule
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageSchedule) return;
    if (!selectedClassroomId || !form.lessonId || !form.teacherId) {
      setError('لطفاً درس و دبیر را انتخاب کنید.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/classes/schedules', {
        classroomId: selectedClassroomId,
        lessonId: form.lessonId,
        teacherId: form.teacherId,
        dayOfWeek: form.dayOfWeek,
        periodNumber: form.periodNumber,
        startTime: form.startTime,
        endTime: form.endTime,
        replaceExisting: true,
      });

      setIsModalOpen(false);
      await fetchClassSchedule(selectedClassroomId);
    } catch (err: any) {
      setError(err.message || 'خطا در تخصیص ساعت درسی.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Schedule
  const handleDeleteSlot = async (scheduleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canManageSchedule) return;
    if (!window.confirm('آیا از حذف این درس از برنامه هفتگی این کلاس اطمینان دارید؟')) {
      return;
    }
    try {
      await apiClient.delete(`/classes/schedules/${scheduleId}`);
      await fetchClassSchedule(selectedClassroomId);
    } catch (err: any) {
      alert(err.message || 'خطا در حذف برنامه درسی.');
    }
  };

  // Print Timetable
  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Classroom Selector */}
      <ResponsivePageHeader
        icon={CalendarDays}
        title={isStudent ? 'برنامه هفتگی کلاس من' : 'برنامه هفتگی و ساعات درسی'}
        description={
          canManageSchedule
            ? 'تنظیم ساعات ۶ زنگ درسی روزانه (شنبه تا پنج‌شنبه)، تخصیص درس و دبیر و بررسی تداخل'
            : 'مشاهده ساعات ۶ زنگ درسی روزانه، اسامی دروس و هنرآموزان مدرس'
        }
        badge={
          isStudent ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold">
              <GraduationCap className="h-3.5 w-3.5" />
              <span>هنرجو: {currentUser?.firstName} {currentUser?.lastName}</span>
            </span>
          ) : !canManageSchedule ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
              <Lock className="h-3 w-3 text-amber-600" />
              <span>حالت فقط مشاهده {isParent ? '(اولیاء)' : ''}</span>
            </span>
          ) : null
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isStudent ? (
              selectedClassroom ? (
                <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary px-2.5 py-1.5 rounded-xl text-xs font-bold">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  <span>کلاس شما: {selectedClassroom.name}</span>
                </div>
              ) : null
            ) : isParent && classrooms.length <= 1 ? (
              selectedClassroom ? (
                <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary px-2.5 py-1.5 rounded-xl text-xs font-bold">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  <span>کلاس فرزند شما: {selectedClassroom.name}</span>
                </div>
              ) : null
            ) : classrooms.length > 0 ? (
              <div className="flex items-center space-x-2 space-x-reverse">
                <label className="text-xs font-bold text-ink-dark">
                  {isParent ? 'کلاس فرزند:' : 'کلاس درس:'}
                </label>
                <select
                  value={selectedClassroomId}
                  onChange={(e) => setSelectedClassroomId(e.target.value)}
                  className="h-8.5 rounded-lg border border-gray-300 bg-gray-50 px-2.5 text-xs font-bold text-ink-dark focus:outline-none focus:ring-2 focus:ring-primary min-w-[160px]"
                >
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {classrooms.length > 0 && (
              <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-1.5 text-xs">
                <Printer className="h-3.5 w-3.5" />
                <span>چاپ برنامه</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Empty State when student or user has no classroom */}
      {classrooms.length === 0 && !isLoading && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center shadow-xs">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-ink-darker">
            {isStudent
              ? 'شما هنوز به هیچ کلاسی تخصیص داده نشده‌اید'
              : 'هیچ کلاس درسی یافت نشد'}
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mt-2 leading-relaxed">
            {isStudent
              ? 'هنرجوی گرامی، کلاس درس شما هنوز توسط مسئولین آموزش و مدیریت هنرستان در سامانه ثبت نهایی نشده است. پس از تخصیص قطعی به کلاس، برنامه هفتگی زنگ‌های کلاسی به صورت اختصاصی در این صفحه نمایش داده خواهد شد.'
              : 'در حال حاضر هیچ کلاسی در این سال تحصیلی یا برای شما ثبت نشده است.'}
          </p>
        </div>
      )}

      {/* Classroom Info Banner */}
      {selectedClassroom && (
        <div className="bg-gradient-to-l from-primary/5 via-blue-50/50 to-white p-4 rounded-xl border border-primary/20 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-1.5 space-x-reverse text-ink-darker font-bold text-base">
              <Building2 className="h-5 w-5 text-primary" />
              <span>{selectedClassroom.name}</span>
            </div>
            {selectedClassroom.level?.name && (
              <Badge variant="default">پایه {selectedClassroom.level.name}</Badge>
            )}
            {selectedClassroom.field?.name ? (
              <Badge variant="college">{selectedClassroom.field.name}</Badge>
            ) : (
              <Badge variant="neutral">عمومی</Badge>
            )}
            {selectedClassroom.roomNumber && (
              <span className="text-xs text-gray-500 bg-white px-2.5 py-1 rounded border border-gray-200">
                مکان: {selectedClassroom.roomNumber}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs font-medium text-gray-600">
            <span>ساعات تکمیل‌شده:</span>
            <span className="font-bold text-primary text-sm font-mono bg-white px-2 py-0.5 rounded border border-primary/30">
              {schedules.length} از ۳۶ ساعت هفتگی
            </span>
          </div>
        </div>
      )}

      {/* Printable Heading (Only shows in print) */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-xl font-bold">برنامه هفتگی کلاس درس {selectedClassroom?.name}</h1>
        <p className="text-sm text-gray-600 mt-1">
          پایه {selectedClassroom?.level?.name || '—'} | رشته {selectedClassroom?.field?.name || 'عمومی'}
        </p>
      </div>

      {/* 1. Mobile Adaptive Timetable View (Day Pills + Timeline Cards) */}
      <div className="block md:hidden space-y-3.5 print:hidden">
        {/* Day Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 touch-pan-x scrollbar-none">
          {DAYS.map((d) => {
            const dayCount = schedules.filter((s) => s.dayOfWeek === d.key).length;
            const isSelected = mobileSelectedDay === d.key;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => setMobileSelectedDay(d.key)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span>{d.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {dayCount}/۶
                </span>
              </button>
            );
          })}
        </div>

        {/* 6 Periods for Active Day */}
        <div className="space-y-2.5">
          {PERIODS.map((period) => {
            const item = schedules.find(
              (s) => s.dayOfWeek === mobileSelectedDay && s.periodNumber === period.number,
            );

            return (
              <div
                key={period.number}
                className="bg-white rounded-2xl border border-gray-200 p-3.5 shadow-xs transition-all"
              >
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-lg bg-primary-light text-primary flex items-center justify-center text-xs font-bold font-mono">
                      {period.number}
                    </span>
                    <span className="text-xs font-bold text-ink-darker">{period.label}</span>
                  </div>
                  <span className="font-mono text-[10px] text-gray-500 dir-ltr bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                    {item ? `${item.startTime} - ${item.endTime}` : `${period.defaultStart} - ${period.defaultEnd}`}
                  </span>
                </div>

                {item ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs sm:text-sm text-ink-darker truncate">
                          {item.lesson?.name}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                            item.lesson?.type === 'SPECIALIZED'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : item.lesson?.type === 'PRACTICAL'
                              ? 'bg-purple-50 text-purple-800 border border-purple-200'
                              : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {item.lesson?.type === 'SPECIALIZED'
                            ? 'تخصصی'
                            : item.lesson?.type === 'PRACTICAL'
                            ? 'کارگاهی'
                            : 'عمومی'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <User className="h-3 w-3 text-primary shrink-0" />
                        <span className="truncate">
                          {item.teacher?.user?.firstName} {item.teacher?.user?.lastName}
                        </span>
                      </div>
                    </div>

                    {canManageSchedule && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenSlotModal(mobileSelectedDay, period.number, item)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-primary hover:bg-gray-100 transition-colors"
                          title="ویرایش"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSlot(item.id, e)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : canManageSchedule ? (
                  <button
                    type="button"
                    onClick={() => handleOpenSlotModal(mobileSelectedDay, period.number)}
                    className="w-full py-2.5 rounded-xl border border-dashed border-primary/40 bg-primary-50/10 hover:bg-primary-50/30 text-primary flex items-center justify-center gap-1.5 text-xs font-bold transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>تخصیص درس برای این زنگ</span>
                  </button>
                ) : (
                  <div className="py-2 text-center text-xs text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-100">
                    فاقد درس
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Desktop & Tablet 6x6 Timetable Grid (hidden on mobile) */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-xs">
        <table className="w-full border-collapse text-right">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200">
              <th className="p-3 text-xs font-bold text-ink-dark border-l border-gray-200 w-28 text-center">
                روز / زنگ
              </th>
              {PERIODS.map((period) => (
                <th key={period.number} className="p-3 text-center border-l border-gray-200 last:border-l-0">
                  <div className="font-bold text-xs text-ink-darker">{period.label}</div>
                  <div className="font-mono text-[10px] text-gray-400 mt-0.5 dir-ltr">
                    {period.defaultStart} - {period.defaultEnd}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day) => (
              <tr key={day.key} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/40 transition-colors">
                {/* Day Header Column */}
                <td className="p-3 bg-gray-50/60 font-bold text-xs text-ink-dark border-l border-gray-200 text-center">
                  <span className="inline-block py-1 px-2 rounded-md bg-white border border-gray-200 shadow-2xs">
                    {day.label}
                  </span>
                </td>

                {/* 6 Periods */}
                {PERIODS.map((period) => {
                  const item = schedules.find(
                    (s) => s.dayOfWeek === day.key && s.periodNumber === period.number,
                  );

                  return (
                    <td
                      key={period.number}
                      className="p-2 border-l border-gray-200 last:border-l-0 align-top min-w-[150px] max-w-[180px]"
                    >
                      {item ? (
                        /* Filled Slot Card */
                        <div
                          onClick={() => {
                            if (canManageSchedule) {
                              handleOpenSlotModal(day.key, period.number, item);
                            }
                          }}
                          className={`group relative h-28 rounded-lg p-2.5 bg-white border border-primary/30 flex flex-col justify-between transition-all ${
                            canManageSchedule
                              ? 'cursor-pointer hover:border-primary hover:shadow-md'
                              : 'cursor-default shadow-2xs'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-bold text-xs text-ink-darker line-clamp-1">
                                {item.lesson?.name}
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                                  item.lesson?.type === 'SPECIALIZED'
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : item.lesson?.type === 'PRACTICAL'
                                    ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                                }`}
                              >
                                {item.lesson?.type === 'SPECIALIZED'
                                  ? 'تخصصی'
                                  : item.lesson?.type === 'PRACTICAL'
                                  ? 'کارگاهی'
                                  : 'عمومی'}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1 space-x-reverse text-[11px] text-gray-600 mt-1.5">
                              <User className="h-3 w-3 text-primary shrink-0" />
                              <span className="truncate">
                                {item.teacher?.user?.firstName} {item.teacher?.user?.lastName}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                            <span className="font-mono text-[10px] text-gray-400 flex items-center gap-1 dir-ltr">
                              <Clock className="h-2.5 w-2.5" />
                              {item.startTime} - {item.endTime}
                            </span>

                            {/* Quick Action Buttons on Hover (Admins / Staff only) */}
                            {canManageSchedule && (
                              <div className="flex items-center space-x-1 space-x-reverse opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                                <button
                                  type="button"
                                  title="ویرایش"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenSlotModal(day.key, period.number, item);
                                  }}
                                  className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-primary"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  title="حذف ساعت درسی"
                                  onClick={(e) => handleDeleteSlot(item.id, e)}
                                  className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : canManageSchedule ? (
                        /* Empty Slot Box (Clickable to Assign - Admins/Staff only) */
                        <button
                          type="button"
                          onClick={() => handleOpenSlotModal(day.key, period.number)}
                          className="w-full h-28 rounded-lg border-2 border-dashed border-gray-200 hover:border-primary/60 hover:bg-primary-50/20 transition-all flex flex-col items-center justify-center p-2 text-gray-400 hover:text-primary group print:border-gray-100"
                        >
                          <div className="h-7 w-7 rounded-full bg-gray-50 group-hover:bg-primary/10 flex items-center justify-center transition-colors mb-1">
                            <Plus className="h-4 w-4" />
                          </div>
                          <span className="text-[11px] font-bold">تخصیص درس</span>
                          <span className="font-mono text-[9px] text-gray-400 mt-0.5 dir-ltr">
                            {period.defaultStart} - {period.defaultEnd}
                          </span>
                        </button>
                      ) : (
                        /* Empty Slot Box (Read-Only for Students / Non-Staff) */
                        <div className="w-full h-28 rounded-lg border border-dashed border-gray-200 bg-gray-50/40 flex flex-col items-center justify-center p-2 text-gray-400 select-none print:border-gray-100">
                          <span className="text-base font-bold text-gray-300">—</span>
                          <span className="text-[10px] text-gray-400 mt-0.5">فاقد درس</span>
                          <span className="font-mono text-[9px] text-gray-400 mt-1 dir-ltr">
                            {period.defaultStart} - {period.defaultEnd}
                          </span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Assignment Modal (Guarded for Authorized Users Only) */}
      {canManageSchedule && (
        <Modal
          isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setError(null);
        }}
        title={`تخصیص درس به ${DAYS.find((d) => d.key === form.dayOfWeek)?.label || ''} - ${
          PERIODS.find((p) => p.number === form.periodNumber)?.label || ''
        }`}
        description={`کلاس هدف: ${selectedClassroom?.name || ''}`}
        maxWidth="md"
      >
        {error && (
          <div className="mb-4 flex items-center space-x-2 space-x-reverse rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSaveSchedule} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">
              انتخاب عنوان درس <span className="text-red-500">*</span>
            </label>
            <select
              value={form.lessonId}
              onChange={(e) => handleLessonChange(e.target.value)}
              className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary font-bold"
              required
            >
              <option value="" disabled>
                -- انتخاب درس --
              </option>
              {availableLessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.code}) — {l.field?.name || 'عمومی'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">
              انتخاب دبیر مدرس <span className="text-red-500">*</span>
            </label>
            <select
              value={form.teacherId}
              onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
              className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary font-bold"
              required
            >
              <option value="" disabled>
                -- انتخاب دبیر --
              </option>
              {teachers.map((t) => {
                const teachesThisLesson = t.teacherLessons?.some(
                  (tl: any) => (tl.lessonId || tl.lesson?.id) === form.lessonId,
                );
                return (
                  <option key={t.id} value={t.id}>
                    {t.user?.firstName} {t.user?.lastName} ({t.specialization || 'عمومی'}){' '}
                    {teachesThisLesson ? '[مدرس مصوب این درس]' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">
                ساعت شروع
              </label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm font-mono text-center text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">
                ساعت پایان
              </label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm font-mono text-center text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsModalOpen(false);
                setError(null);
              }}
            >
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {form.scheduleId ? 'بروزرسانی زنگ درسی' : 'ثبت در برنامه کلاسی'}
            </Button>
          </div>
        </form>
      </Modal>
      )}
    </div>
  );
};
