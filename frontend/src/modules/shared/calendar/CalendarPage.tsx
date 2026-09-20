import React, { useEffect, useState, useMemo, useRef } from 'react';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { PersianDatePicker } from '../../../components/ui/PersianDatePicker';
import {
  gregorianToJalaliStr,
  jalaliToGregorianDate,
  formatJalaliDisplay,
  toPersianDigits,
} from '../../../utils/jalali';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  AlertCircle,
  ShieldAlert,
  Sparkles,
  Info,
  Check,
  ListOrdered,
  Sun,
  Flame,
  CloudSun,
  Snowflake,
  Search,
} from 'lucide-react';
import {
  PERSIAN_MONTHS,
  WEEK_DAYS,
  getMonthDays1405,
  DayCalendarInfo,
  OFFICIAL_OCCASIONS_1405,
  CalendarOccasion,
  getTodayJalali,
} from './data/persian-calendar-1405';

export const CalendarPage: React.FC = () => {
  const currentUser = useAuthStore((s) => s.user);
  const isStaff = ['SCHOOL_ADMIN', 'STAFF', 'TEACHER', 'SUPER_ADMIN'].includes(currentUser?.role || '');

  // Exact Today info from system date
  const todayInfo = useMemo(() => getTodayJalali(), []);

  // Year & Month Selection (Default: Current Year and Month)
  const [selectedYear, setSelectedYear] = useState<number>(todayInfo.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(todayInfo.month);
  const [selectedDay, setSelectedDay] = useState<DayCalendarInfo | null>(null);

  // Month Picker Popover State & Outside Click Handling
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const monthPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(event.target as Node)) {
        setIsMonthPickerOpen(false);
      }
    };
    if (isMonthPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMonthPickerOpen]);

  // Google Calendar View Modes:
  // 'MONTH' (ماهانه - پیش‌فرض) | 'SCHEDULE' (مناسبت‌ها)
  const [viewMode, setViewMode] = useState<'SCHEDULE' | 'MONTH'>('MONTH');
  const [filterType, setFilterType] = useState<'ALL' | 'HOLIDAYS' | 'SCHOOL_EVENTS'>('ALL');

  // Backend Events & Tenant Holidays
  const [events, setEvents] = useState<any[]>([]);
  const [tenantHolidays, setTenantHolidays] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals & FAB
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form: Create Event
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'EVENT',
    startDate: todayInfo.jalaliStr,
    startTime: '08:00',
    endDate: todayInfo.jalaliStr,
    endTime: '10:00',
    location: 'سالن همایش‌های مدرسه',
  });

  // Form: Create Tenant Holiday
  const [holidayForm, setHolidayForm] = useState({
    date: todayInfo.jalaliStr,
    titleFa: 'تعطیلی به علت برودت شدید هوا و یخبندان معابر',
  });

  // Fetch Events and Tenant Holidays from API
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [eventsRes, holidaysRes] = await Promise.allSettled([
        apiClient.get('/calendar/events'),
        apiClient.get('/calendar/tenant-holidays'),
      ]);

      if (eventsRes.status === 'fulfilled') {
        setEvents(eventsRes.value.data || []);
      } else {
        // Fallback events for 1405
        setEvents([
          {
            id: 'ev-1',
            title: 'آزمون هماهنگ آغاز سال تحصیلی و سنجش ورودی',
            description: 'سنجش جامع آمادگی تحصیلی دانش‌آموزان و دانش‌آموزان پایه‌های دهم و یازدهم',
            type: 'EXAM',
            startDate: '1405-07-11T08:30:00.000Z',
            jalaliDate: '1405-07-11',
            location: 'سالن امتحانات شماره ۱',
          },
          {
            id: 'ev-2',
            title: 'جلسه مجمع عمومی انجمن اولیاء و مربیان',
            description: 'ارائه گزارش عملکرد سالانه، تدوین برنامه‌های انضباطی و آموزشی سال تحصیلی',
            type: 'MEETING',
            startDate: '1405-07-25T16:00:00.000Z',
            jalaliDate: '1405-07-25',
            location: 'سالن همایش‌های مرکزی مدرسه',
          },
          {
            id: 'ev-3',
            title: 'اردوی علمی-پژوهشی نمایشگاه دستاوردهای هوافضا و هوش مصنوعی',
            description: 'ویژه دانش‌آموزان و دانش‌آموزان رشته‌های فنی، مهندسی و علوم پایه',
            type: 'EVENT',
            startDate: '1405-08-18T09:00:00.000Z',
            jalaliDate: '1405-08-18',
            location: 'مرکز نوآوری و پارک علم و فناوری',
          },
          {
            id: 'ev-4',
            title: 'امتحانات نوبت اول (دی‌ماه ۱۴۰۵)',
            description: 'شروع امتحانات هماهنگ پایانی نوبت اول کلیه مقاطع تحصیلی',
            type: 'EXAM',
            startDate: '1405-10-06T08:00:00.000Z',
            jalaliDate: '1405-10-06',
            location: 'حوزه‌های امتحانی مدرسه',
          },
          {
            id: 'ev-5',
            title: 'جشن استقبال از بهار و تقدیر از ستارگان برتر المپیاد و مهارت',
            description: 'آیین باشکوه تجلیل از نخبگان مسابقات ملی مهارت و کنکور',
            type: 'EVENT',
            startDate: '1405-12-25T10:00:00.000Z',
            jalaliDate: '1405-12-25',
            location: 'آمفی‌تئاتر فرهنگسرای اندیشه',
          },
        ]);
      }

      if (holidaysRes.status === 'fulfilled') {
        setTenantHolidays(holidaysRes.value.data || []);
      }
    } catch (err) {
      console.error('Failed to load calendar data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute month days for the selected month in 1405
  const monthDays = useMemo(
    () => getMonthDays1405(selectedMonth, selectedYear),
    [selectedMonth, selectedYear]
  );
  const currentMonthMeta = PERSIAN_MONTHS.find((m) => m.id === selectedMonth) || PERSIAN_MONTHS[0];

  // First day of month offset (شنبه = 0, یک‌شنبه = 1, ..., جمعه = 6)
  const leadingBlankDays = monthDays.length > 0 ? monthDays[0].dayOfWeek : 0;

  // Default selected day on month change
  useEffect(() => {
    if (monthDays.length > 0) {
      const todayInMonth = monthDays.find((d) => d.isToday);
      setSelectedDay(todayInMonth || monthDays[0]);
    }
  }, [selectedMonth, selectedYear, monthDays]);

  // Jump to today
  const handleJumpToToday = () => {
    setSelectedYear(todayInfo.year);
    setSelectedMonth(todayInfo.month);
    const days = getMonthDays1405(todayInfo.month, todayInfo.year);
    const today = days.find((d) => d.isToday) || days.find((d) => d.day === todayInfo.day) || days[0];
    setSelectedDay(today);
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    setSelectedMonth((prev) => (prev > 1 ? prev - 1 : 12));
  };

  const handleNextMonth = () => {
    setSelectedMonth((prev) => (prev < 12 ? prev + 1 : 1));
  };

  // Check if a day has school events
  const getDaySchoolEvents = (jalaliStr: string) => {
    return events.filter((ev) => {
      if (ev.jalaliDate && ev.jalaliDate.startsWith(jalaliStr)) return true;
      if (ev.startDate) {
        const evJalali = gregorianToJalaliStr(ev.startDate);
        return evJalali === jalaliStr;
      }
      return false;
    });
  };

  // Check if a day has a tenant (custom school) holiday
  const getDayTenantHoliday = (jalaliStr: string) => {
    return tenantHolidays.find((th) => {
      if (th.jalaliInfo?.formatted === jalaliStr) return true;
      if (th.date) {
        return gregorianToJalaliStr(th.date) === jalaliStr;
      }
      return false;
    });
  };

  // Create Event Submit
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const startDateObj = jalaliToGregorianDate(form.startDate);
      const [sh, sm] = form.startTime.split(':').map(Number);
      startDateObj.setHours(sh || 8, sm || 0, 0, 0);

      const endDateObj = jalaliToGregorianDate(form.endDate);
      const [eh, em] = form.endTime.split(':').map(Number);
      endDateObj.setHours(eh || 10, em || 0, 0, 0);

      await apiClient.post('/calendar/events', {
        title: form.title,
        description: form.description,
        eventType: form.type,
        startDate: startDateObj.toISOString(),
        endDate: endDateObj.toISOString(),
        location: form.location,
      });

      setIsCreateOpen(false);
      setForm({
        title: '',
        description: '',
        type: 'EVENT',
        startDate: todayInfo.jalaliStr,
        startTime: '08:00',
        endDate: todayInfo.jalaliStr,
        endTime: '10:00',
        location: 'سالن همایش‌های مدرسه',
      });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'خطا در ثبت رویداد.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create Tenant Holiday Submit
  const handleCreateTenantHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/calendar/tenant-holidays', {
        date: holidayForm.date,
        titleFa: holidayForm.titleFa,
      });
      setIsHolidayModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'خطا در ثبت تعطیلی مدرسه.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Schedule / Agenda View Items: All days of current month that strictly have occasions, events, or real official holidays
  // Fridays without occasions are completely excluded from the occasions list
  const scheduleItems = useMemo(() => {
    return monthDays.filter((day) => {
      const daySchoolEvents = getDaySchoolEvents(day.jalaliStr);
      const tenantHoliday = getDayTenantHoliday(day.jalaliStr);

      // Filter out 'تعطیل هفتگی (جمعه)' from occasions if present
      const realOccasions = (day.occasions || []).filter(
        (occ) => occ && occ !== 'تعطیل هفتگی (جمعه)'
      );
      const hasRealOccasions = realOccasions.length > 0;
      const hasEvents = daySchoolEvents.length > 0;

      const isRealOfficialHoliday =
        (Boolean(day.isOfficialHoliday) &&
          Boolean(day.holidayReason) &&
          day.holidayReason !== 'تعطیل هفتگی (جمعه)') ||
        Boolean(tenantHoliday);

      // Any Friday that has NO actual occasions MUST be excluded from the occasions list!
      if (day.isFriday && !hasRealOccasions) {
        return false;
      }

      // Reject any day that has no occasion, no school event, and no real official holiday
      const hasAnyContent = hasRealOccasions || hasEvents || isRealOfficialHoliday;
      if (!hasAnyContent) {
        return false;
      }

      if (filterType === 'HOLIDAYS') return isRealOfficialHoliday;
      if (filterType === 'SCHOOL_EVENTS') return hasEvents || Boolean(tenantHoliday);
      return true;
    });
  }, [monthDays, events, tenantHolidays, filterType]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4 pb-20 md:pb-8">
      {/* 1. GOOGLE CALENDAR TOP APP BAR */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-xs p-3 sm:px-5 sm:py-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 select-none">
        {/* Right (RTL): Month Title Dropdown, Steppers & Today Button */}
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
          {/* Custom Month & Year Picker Popover */}
          <div className="relative" ref={monthPickerRef}>
            <button
              type="button"
              onClick={() => setIsMonthPickerOpen((prev) => !prev)}
              className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl border transition-all flex items-center gap-2 select-none shrink-0 ${
                isMonthPickerOpen
                  ? 'bg-primary/10 dark:bg-primary/20 border-primary dark:border-primary text-primary dark:text-primary-light ring-2 ring-primary/20'
                  : 'bg-gray-50 dark:bg-zinc-800/80 hover:bg-gray-100 dark:hover:bg-zinc-800 border-gray-200/80 dark:border-zinc-700/80 text-ink-darker dark:text-white'
              }`}
              title="انتخاب سریع ماه و سال"
            >
              <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm sm:text-base font-black truncate">
                {PERSIAN_MONTHS.find((m) => m.id === selectedMonth)?.name} {toPersianDigits(selectedYear)}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 dark:text-zinc-400 transition-transform duration-200 shrink-0 ${
                  isMonthPickerOpen ? 'rotate-180 text-primary' : ''
                }`}
              />
            </button>

            {/* Custom Month & Year Picker Floating Menu */}
            {isMonthPickerOpen && (
              <div className="absolute right-0 top-full mt-2 z-40 w-72 sm:w-80 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-2xl animate-in fade-in zoom-in-95 duration-150 select-none">
                {/* Year Stepper Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-zinc-800">
                  <span className="text-xs font-bold text-gray-500 dark:text-zinc-400">
                    انتخاب ماه و سال
                  </span>
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-800/90 p-1 rounded-xl border border-gray-200/60 dark:border-zinc-700/60">
                    <button
                      type="button"
                      onClick={() => setSelectedYear((y) => y - 1)}
                      className="h-7 w-7 rounded-lg hover:bg-white dark:hover:bg-zinc-700 flex items-center justify-center text-gray-600 dark:text-zinc-300 transition-colors"
                      title="سال قبل"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-black px-2 text-ink-darker dark:text-white font-mono">
                      {toPersianDigits(selectedYear)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedYear((y) => y + 1)}
                      className="h-7 w-7 rounded-lg hover:bg-white dark:hover:bg-zinc-700 flex items-center justify-center text-gray-600 dark:text-zinc-300 transition-colors"
                      title="سال بعد"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 12-Month Grid */}
                <div className="grid grid-cols-3 gap-1.5">
                  {PERSIAN_MONTHS.map((m) => {
                    const isSelected = m.id === selectedMonth;
                    const isCurrentRealMonth = m.id === todayInfo.month && selectedYear === todayInfo.year;

                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedMonth(m.id);
                          setIsMonthPickerOpen(false);
                        }}
                        className={`min-h-[42px] px-2 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center relative ${
                          isSelected
                            ? 'bg-primary text-white shadow-xs font-black scale-102 z-10'
                            : 'bg-gray-50 dark:bg-zinc-800/70 hover:bg-gray-100 dark:hover:bg-zinc-700 text-ink-darker dark:text-zinc-200 border border-transparent hover:border-gray-200 dark:hover:border-zinc-600'
                        }`}
                      >
                        <span>{m.name}</span>

                        {isCurrentRealMonth && !isSelected && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" title="ماه جاری" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Footer Jump to Today / Current Month */}
                <div className="pt-3 mt-3 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedYear(todayInfo.year);
                      setSelectedMonth(todayInfo.month);
                      setIsMonthPickerOpen(false);
                    }}
                    className="text-xs font-bold text-primary dark:text-primary-light hover:underline flex items-center gap-1"
                  >
                    <span>ماه جاری ({todayInfo.monthName} {toPersianDigits(todayInfo.year)})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMonthPickerOpen(false)}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300"
                  >
                    بستن
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Month Stepper Arrows */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl border border-gray-200 dark:border-zinc-700/80 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-zinc-300 hover:text-ink-darker dark:hover:text-white transition-colors"
              title="ماه قبل"
              aria-label="ماه قبل"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl border border-gray-200 dark:border-zinc-700/80 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-zinc-300 hover:text-ink-darker dark:hover:text-white transition-colors"
              title="ماه بعد"
              aria-label="ماه بعد"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Today Button */}
          <button
            type="button"
            onClick={handleJumpToToday}
            className="h-10 sm:h-11 px-3 sm:px-3.5 rounded-xl border border-gray-200 dark:border-zinc-700/80 hover:border-primary/40 bg-gray-50 dark:bg-zinc-800/80 hover:bg-primary/5 dark:hover:bg-primary/10 text-xs sm:text-sm font-bold text-gray-700 dark:text-zinc-200 hover:text-primary dark:hover:text-primary-light transition-all flex items-center gap-1.5 shrink-0 shadow-2xs"
            title="پرش به تاریخ امروز"
          >
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            <span>امروز</span>
            <span className="text-[10px] sm:text-xs text-gray-400 dark:text-zinc-400 mr-0.5 font-mono">
              ({toPersianDigits(todayInfo.day)})
            </span>
          </button>
        </div>

        {/* Left (RTL): View Mode Switcher & Staff Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Google Calendar View Mode Segmented Controls */}
          <div className="flex items-center bg-gray-100/90 dark:bg-zinc-800/90 p-1 rounded-xl text-xs font-bold w-full md:w-auto border border-gray-200/60 dark:border-zinc-700/60">
            {/* 1. راست: مناسبت‌ها */}
            <button
              type="button"
              onClick={() => setViewMode('SCHEDULE')}
              className={`flex-1 md:flex-initial min-h-[44px] px-3.5 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                viewMode === 'SCHEDULE'
                  ? 'bg-white dark:bg-zinc-900 text-primary dark:text-primary-light shadow-xs font-black'
                  : 'text-gray-600 dark:text-zinc-400 hover:text-ink-darker dark:hover:text-white'
              }`}
              title="نمای مناسبت‌ها و رویدادها"
            >
              <ListOrdered className="w-4 h-4 shrink-0" />
              <span>مناسبت‌ها</span>
            </button>

            {/* 2. چپ: تقویم */}
            <button
              type="button"
              onClick={() => setViewMode('MONTH')}
              className={`flex-1 md:flex-initial min-h-[44px] px-3.5 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                viewMode === 'MONTH'
                  ? 'bg-white dark:bg-zinc-900 text-primary dark:text-primary-light shadow-xs font-black'
                  : 'text-gray-600 dark:text-zinc-400 hover:text-ink-darker dark:hover:text-white'
              }`}
              title="نمای تقویم"
            >
              <CalendarDays className="w-4 h-4 shrink-0" />
              <span>تقویم</span>
            </button>
          </div>

          {/* Desktop Staff Action */}
          {isStaff && (
            <div className="hidden md:flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedDay) setHolidayForm((p) => ({ ...p, date: selectedDay.jalaliStr }));
                  setIsHolidayModalOpen(true);
                }}
                className="text-xs min-h-[44px] px-3.5 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <ShieldAlert className="w-3.5 h-3.5 ml-1 text-rose-600" />
                <span>تعطیلی مدرسه</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (selectedDay) {
                    setForm((p) => ({
                      ...p,
                      startDate: selectedDay.jalaliStr,
                      endDate: selectedDay.jalaliStr,
                    }));
                  }
                  setIsCreateOpen(true);
                }}
                className="text-xs min-h-[44px] px-3.5"
              >
                <Plus className="w-3.5 h-3.5 ml-1" />
                <span>رویداد جدید</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 3. VIEW 1: GOOGLE CALENDAR OCCASIONS / SCHEDULE VIEW */}
      {viewMode === 'SCHEDULE' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* Sub-Filter Bar (Exclusively for Occasions View) */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar px-1 py-0.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`min-h-[40px] sm:min-h-[44px] px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 inline-flex items-center justify-center ${
                  filterType === 'ALL'
                    ? 'bg-ink-darker dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs'
                    : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700'
                }`}
              >
                همه روزها ({toPersianDigits(monthDays.length)})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('HOLIDAYS')}
                className={`min-h-[40px] sm:min-h-[44px] px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 inline-flex items-center gap-1.5 ${
                  filterType === 'HOLIDAYS'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-zinc-800 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    filterType === 'HOLIDAYS' ? 'bg-white' : 'bg-rose-500'
                  }`}
                />
                <span>تعطیلات رسمی</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterType('SCHOOL_EVENTS')}
                className={`min-h-[40px] sm:min-h-[44px] px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 inline-flex items-center gap-1.5 ${
                  filterType === 'SCHOOL_EVENTS'
                    ? 'bg-primary text-white shadow-2xs'
                    : 'bg-white dark:bg-zinc-800 text-primary dark:text-primary-light border border-primary/30 dark:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    filterType === 'SCHOOL_EVENTS' ? 'bg-white' : 'bg-primary'
                  }`}
                />
                <span>رویدادهای مدرسه ({toPersianDigits(events.length)})</span>
              </button>
            </div>

            <span className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 hidden sm:inline shrink-0">
              {toPersianDigits(currentMonthMeta.days)} روز
            </span>
          </div>

          {scheduleItems.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-8 text-center">
              <CalendarCheck className="w-12 h-12 text-gray-300 dark:text-zinc-600 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-gray-700 dark:text-zinc-200">هیچ مناسبت یا رویدادی با این فیلتر یافت نشد</h4>
              <p className="text-xs text-gray-400 dark:text-zinc-400 mt-1">
                می‌توانید فیلتر را به «همه روزها» تغییر دهید یا مناسبت جدیدی را مشاهده فرمایید.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {scheduleItems.map((day) => {
                const daySchoolEvents = getDaySchoolEvents(day.jalaliStr);
                const tenantHoliday = getDayTenantHoliday(day.jalaliStr);
                const isHoliday =
                  (day.isOfficialHoliday && day.holidayReason !== 'تعطیل هفتگی (جمعه)') ||
                  Boolean(tenantHoliday);

                return (
                  <div
                    key={day.jalaliStr}
                    onClick={() => setSelectedDay(day)}
                    className={`bg-white dark:bg-zinc-900 rounded-2xl border p-3 sm:p-4 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs cursor-pointer ${
                      day.isToday
                        ? 'border-primary dark:border-primary-light ring-2 ring-primary/20 dark:ring-primary-light/25 bg-primary/[0.02] dark:bg-primary/[0.08]'
                        : isHoliday
                        ? 'border-rose-200/80 dark:border-rose-800/60 bg-rose-50/20 dark:bg-rose-950/40 hover:border-rose-300 dark:hover:border-rose-700'
                        : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    {/* Date Block (Right) */}
                    <div className="flex items-center gap-3 w-full sm:w-56 shrink-0">
                      {/* Day Number Pill */}
                      <div
                        className={`h-11 w-11 rounded-2xl flex flex-col items-center justify-center shrink-0 ${
                          day.isToday
                            ? 'bg-primary text-white font-black shadow-xs'
                            : isHoliday
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold border border-rose-200/50 dark:border-rose-800/50'
                            : 'bg-gray-100 dark:bg-zinc-800 text-ink-darker dark:text-zinc-100 font-bold'
                        }`}
                      >
                        <span className="text-base leading-none">{toPersianDigits(day.day)}</span>
                        <span className="text-[9px] mt-0.5 leading-none opacity-80">
                          {currentMonthMeta.name}
                        </span>
                      </div>

                      {/* Day Name & Badges */}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-black ${
                              isHoliday ? 'text-rose-600 dark:text-rose-400' : 'text-gray-800 dark:text-zinc-200'
                            }`}
                          >
                            {day.dayOfWeekName}
                          </span>
                          {day.isToday && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-primary text-white font-bold">
                              امروز
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 dark:text-zinc-400 font-mono block mt-0.5">
                          {day.gregorianStr}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Event & Occasion Cards */}
                    <div className="flex-1 w-full space-y-1.5 min-w-0">
                      {/* Emergency / Tenant Holiday */}
                      {tenantHoliday && (
                        <div className="p-2 sm:p-2.5 rounded-xl bg-rose-600 text-white text-xs flex items-center gap-2 shadow-2xs">
                          <ShieldAlert className="w-4 h-4 shrink-0" />
                          <span className="font-bold">تعطیلی اعلام‌شده مدرسه:</span>
                          <span className="truncate">{tenantHoliday.titleFa}</span>
                        </div>
                      )}

                      {/* Official Holiday Reason (excludes plain Friday) */}
                      {day.holidayReason && day.holidayReason !== 'تعطیل هفتگی (جمعه)' && !tenantHoliday && (
                        <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                          <strong className="font-bold shrink-0">تعطیل رسمی:</strong>
                          <span className="truncate">{day.holidayReason}</span>
                        </div>
                      )}

                      {/* School Events */}
                      {daySchoolEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className="p-2 rounded-xl bg-gray-50 dark:bg-zinc-800/80 border border-gray-200/80 dark:border-zinc-700/60 text-xs flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                ev.type === 'EXAM'
                                  ? 'bg-amber-500'
                                  : ev.type === 'MEETING'
                                  ? 'bg-purple-500'
                                  : 'bg-primary'
                              }`}
                            />
                            <span className="font-bold text-ink-darker dark:text-zinc-100 truncate">{ev.title}</span>
                          </div>
                          {ev.location && (
                            <span className="text-[10px] text-gray-400 dark:text-zinc-400 shrink-0 hidden sm:inline">
                              {ev.location}
                            </span>
                          )}
                        </div>
                      ))}

                      {/* Occasions List */}
                      {day.occasions.filter((occ) => occ !== day.holidayReason && occ !== 'تعطیل هفتگی (جمعه)').length > 0 && (
                        <div className="text-[11px] text-gray-600 dark:text-zinc-300 flex items-center gap-1.5 py-0.5 truncate">
                          <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                          <span className="truncate">
                            {day.occasions.filter((occ) => occ !== day.holidayReason && occ !== 'تعطیل هفتگی (جمعه)').join(' • ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Left: Quick Action Button */}
                    {isStaff && (
                      <div className="shrink-0 pt-1 sm:pt-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setForm((p) => ({
                              ...p,
                              startDate: day.jalaliStr,
                              endDate: day.jalaliStr,
                            }));
                            setIsCreateOpen(true);
                          }}
                          className="min-h-[38px] px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>ثبت رویداد</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. VIEW 2: GOOGLE CALENDAR MONTH VIEW (Clean 7-Col Grid + Split Inspector) */}
      {viewMode === 'MONTH' && (
        <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-200">
          <Card className="p-2 sm:p-3 md:p-4 bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-xs rounded-2xl overflow-hidden">
            {/* Weekday Strip */}
            <div className="grid grid-cols-7 bg-gray-50/90 dark:bg-zinc-800/80 py-1.5 sm:py-2 px-1 rounded-xl mb-1.5 sm:mb-2 border border-gray-200/60 dark:border-zinc-700/80 text-center text-xs sm:text-sm font-bold text-gray-500 dark:text-zinc-300">
              {WEEK_DAYS.map((wd) => (
                <div key={wd.id} className={wd.id === 6 ? 'text-rose-600 dark:text-rose-400 font-black' : ''}>
                  <span className="hidden sm:inline">{wd.name}</span>
                  <span className="sm:hidden">{wd.short}</span>
                </div>
              ))}
            </div>

            {/* 7-Col Calendar Matrix */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2">
              {/* Blanks */}
              {Array.from({ length: leadingBlankDays }).map((_, i) => (
                <div
                  key={`blank-${i}`}
                  className="min-h-[48px] sm:min-h-[62px] md:min-h-[72px] rounded-xl sm:rounded-2xl bg-gray-50/40 dark:bg-zinc-800/25 border border-dashed border-gray-200/50 dark:border-zinc-800/80"
                />
              ))}

              {/* Month Days */}
              {monthDays.map((day) => {
                const isSelected = selectedDay?.day === day.day;
                const daySchoolEvents = getDaySchoolEvents(day.jalaliStr);
                const tenantHoliday = getDayTenantHoliday(day.jalaliStr);
                const isHoliday = day.isOfficialHoliday || Boolean(tenantHoliday);
                const hasIndicators = isHoliday || Boolean(tenantHoliday) || daySchoolEvents.length > 0;

                return (
                  <div
                    key={day.day}
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[48px] sm:min-h-[62px] md:min-h-[72px] p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border transition-all duration-150 cursor-pointer flex flex-col justify-between select-none relative group ${
                      day.isToday
                        ? 'border-primary dark:border-primary-light ring-2 ring-primary/30 dark:ring-primary-light/40 bg-primary/[0.04] dark:bg-primary/[0.12] shadow-xs'
                        : isSelected
                        ? 'ring-2 ring-primary dark:ring-primary-light border-primary dark:border-primary-light bg-primary/5 dark:bg-primary/20 shadow-xs'
                        : isHoliday
                        ? 'bg-rose-50/40 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-800/60 hover:border-rose-300 dark:hover:border-rose-700'
                        : 'bg-white dark:bg-zinc-900 border-gray-200/80 dark:border-zinc-800 hover:border-primary/40 dark:hover:border-zinc-700 hover:bg-gray-50/50 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    {/* Day Number Row - Center Aligned */}
                    <div className="relative flex items-center justify-center w-full">
                      {day.isToday ? (
                        <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary text-white text-xs sm:text-sm font-black shadow-xs flex items-center justify-center leading-none">
                          {toPersianDigits(day.day)}
                        </span>
                      ) : (
                        <span
                          className={`text-base sm:text-lg md:text-xl font-black leading-none text-center flex items-center justify-center ${
                            isHoliday
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-ink-darker dark:text-zinc-100 group-hover:text-primary dark:group-hover:text-primary-light transition-colors'
                          }`}
                        >
                          {toPersianDigits(day.day)}
                        </span>
                      )}

                      {/* Floating Badges */}
                      {day.isToday && (
                        <span className="hidden sm:inline absolute left-0 top-1/2 -translate-y-1/2 text-[9px] font-bold text-primary dark:text-primary-light bg-primary/10 dark:bg-primary/20 px-1.5 py-0.5 rounded-full">
                          امروز
                        </span>
                      )}
                      {isHoliday && !day.isToday && (
                        <span className="hidden sm:inline absolute left-0 top-1/2 -translate-y-1/2 text-[9px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100/70 dark:bg-rose-950/60 px-1.5 py-0.5 rounded-full">
                          تعطیل
                        </span>
                      )}
                    </div>

                    {/* Middle: Desktop Event / Occasion Snippet */}
                    <div className="hidden sm:flex flex-col gap-0.5 my-auto overflow-hidden w-full">
                      {daySchoolEvents.slice(0, 1).map((ev) => (
                        <div
                          key={ev.id}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold truncate ${
                            ev.type === 'EXAM'
                              ? 'bg-amber-100/80 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60'
                              : ev.type === 'MEETING'
                              ? 'bg-purple-100/80 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60'
                              : 'bg-primary/10 text-primary-darker dark:bg-primary/20 dark:text-primary-light border border-primary/20 dark:border-primary/40'
                          }`}
                          title={ev.title}
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-current" />
                          <span className="truncate">{ev.title}</span>
                        </div>
                      ))}
                      {daySchoolEvents.length > 1 && (
                        <span className="text-[9px] font-bold text-primary dark:text-primary-light truncate px-0.5">
                          +{toPersianDigits(daySchoolEvents.length - 1)} دیگر
                        </span>
                      )}
                      {(day.holidayReason || tenantHoliday) && daySchoolEvents.length === 0 && (
                        <p
                          className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-950/60 px-1.5 py-0.5 rounded truncate border border-rose-200/50 dark:border-rose-800/60"
                          title={tenantHoliday?.titleFa || day.holidayReason}
                        >
                          {tenantHoliday?.titleFa || day.holidayReason}
                        </p>
                      )}
                    </div>

                    {/* Indicator Dots / Mobile summary (only rendered if indicators exist) */}
                    {hasIndicators && (
                      <div className="flex items-center justify-center gap-1 mt-auto pt-0.5 w-full">
                        {isHoliday && (
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 shrink-0 shadow-2xs" title="تعطیل" />
                        )}
                        {tenantHoliday && (
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-800 dark:bg-rose-400 shrink-0 shadow-2xs" title="تعطیلی اعلام‌شده" />
                        )}
                        {daySchoolEvents.map((ev) => (
                          <span
                            key={ev.id}
                            className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 shadow-2xs ${
                              ev.type === 'EXAM'
                                ? 'bg-amber-500'
                                : ev.type === 'MEETING'
                                ? 'bg-purple-500'
                                : 'bg-primary'
                            }`}
                            title={ev.title}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Google Calendar Split Day Details (Immediately visible under month grid) */}
          {selectedDay && (
            <Card className="p-3.5 sm:p-5 bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-xs rounded-2xl animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-ink-darker dark:text-white">
                      {selectedDay.dayOfWeekName} {toPersianDigits(selectedDay.day)}{' '}
                      {currentMonthMeta.name} {toPersianDigits(selectedYear)}
                    </h3>
                    {selectedDay.isToday && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-white font-bold">
                        امروز
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-zinc-400 font-mono mt-0.5">
                    {selectedDay.gregorianStr}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={selectedDay.isOfficialHoliday ? 'destructive' : 'neutral'}
                    className="text-xs"
                  >
                    {selectedDay.isOfficialHoliday ? 'تعطیل رسمی' : 'روزِ آموزشی'}
                  </Badge>

                  {isStaff && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setForm((p) => ({
                          ...p,
                          startDate: selectedDay.jalaliStr,
                          endDate: selectedDay.jalaliStr,
                        }));
                        setIsCreateOpen(true);
                      }}
                      className="text-xs min-h-[38px] px-3 border-gray-300 dark:border-zinc-700"
                    >
                      <Plus className="w-3.5 h-3.5 ml-1 text-primary" />
                      <span>ثبت رویداد</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Day Contents */}
              <div className="pt-3 space-y-2">
                {selectedDay.holidayReason && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">مناسبت تعطیلی رسمی: </span>
                      <span>{selectedDay.holidayReason}</span>
                    </div>
                  </div>
                )}

                {/* Occasions List */}
                {selectedDay.occasions.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-gray-700 dark:text-zinc-300 block">مناسبت‌های روز:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedDay.occasions.map((occ, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 text-xs text-gray-700 dark:text-zinc-200 flex items-center gap-1.5"
                        >
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>{occ}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* School Events */}
                {getDaySchoolEvents(selectedDay.jalaliStr).length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-xs font-bold text-gray-700 dark:text-zinc-300 block">برنامه‌ها و آزمون‌های مدرسه:</span>
                    {getDaySchoolEvents(selectedDay.jalaliStr).map((ev) => (
                      <div
                        key={ev.id}
                        className="p-2.5 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 text-xs flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-ink-darker dark:text-zinc-100">{ev.title}</p>
                          {ev.description && (
                            <p className="text-gray-500 dark:text-zinc-400 text-[11px] mt-0.5">{ev.description}</p>
                          )}
                        </div>
                        <Badge variant="neutral" className="text-[10px]">
                          {ev.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {!selectedDay.holidayReason &&
                  selectedDay.occasions.length === 0 &&
                  getDaySchoolEvents(selectedDay.jalaliStr).length === 0 && (
                    <p className="text-xs text-gray-400 dark:text-zinc-500 py-2 text-center">
                      هیچ رویداد یا مناسبت رسمی برای این روز ثبت نشده است.
                    </p>
                  )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* 6. FLOATING ACTION BUTTON (FAB) FOR MOBILE STAFF */}
      {isStaff && (
        <div className="fixed bottom-6 left-5 z-40 md:hidden flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => {
              if (selectedDay) {
                setForm((p) => ({
                  ...p,
                  startDate: selectedDay.jalaliStr,
                  endDate: selectedDay.jalaliStr,
                }));
              }
              setIsCreateOpen(true);
            }}
            className="h-12 w-12 rounded-2xl bg-primary text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
            title="ثبت رویداد جدید"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* MODAL: CREATE EVENT */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="ثبت رویداد جدید در تقویم"
        description="افزودن برنامه، آزمون یا جلسه به تقویم"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateEvent} className="space-y-3.5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-rose-950/40 text-red-700 dark:text-red-300 text-xs border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          <Input
            label="عنوان رویداد"
            placeholder="مثال: آزمون هماهنگ ریاضی یازدهم"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            className="min-h-[44px]"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink-dark dark:text-zinc-300 mb-1">نوع رویداد</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-xs text-ink-normal dark:text-zinc-100 focus:ring-2 focus:ring-primary"
              >
                <option value="EVENT">رویداد عمومی / اردو</option>
                <option value="EXAM">آزمون و امتحان هماهنگ</option>
                <option value="MEETING">جلسه اولیاء و مربیان</option>
                <option value="CEREMONY">جشن و مراسم مدرسه</option>
              </select>
            </div>

            <Input
              label="مکان برگزاری"
              placeholder="مثال: سالن اجتماعات"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PersianDatePicker
              label="تاریخ برگزاری"
              value={form.startDate}
              onChange={(d) => setForm({ ...form, startDate: d, endDate: d })}
            />
            <Input
              label="ساعت شروع"
              type="time"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              required
              className="min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-dark dark:text-zinc-300 mb-1">توضیحات تکمیلی</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="نکات ضروری و جزئیات شرکت..."
              className="w-full rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2.5 text-xs text-ink-normal dark:text-zinc-100 focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreateOpen(false)}
              className="min-h-[44px] px-4"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              className="min-h-[44px] px-5"
            >
              ثبت رویداد
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CREATE TENANT (EMERGENCY) HOLIDAY */}
      <Modal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        title="اعلام تعطیلی مدرسه"
        description="ثبت روز تعطیل اختصاصی یا مصوب مدرسه"
        maxWidth="md"
      >
        <form onSubmit={handleCreateTenantHoliday} className="space-y-3.5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-rose-950/40 text-red-700 dark:text-red-300 text-xs border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          <PersianDatePicker
            label="تاریخ روز تعطیل"
            value={holidayForm.date}
            onChange={(d) => setHolidayForm({ ...holidayForm, date: d })}
          />

          <Input
            label="علت تعطیلی مدرسه"
            placeholder="مثال: برودت شدید هوا و یخبندان معابر"
            value={holidayForm.titleFa}
            onChange={(e) => setHolidayForm({ ...holidayForm, titleFa: e.target.value })}
            required
            className="min-h-[44px]"
          />

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsHolidayModalOpen(false)}
              className="min-h-[44px] px-4"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              className="bg-rose-600 hover:bg-rose-700 min-h-[44px] px-5"
            >
              ثبت تعطیلی
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
