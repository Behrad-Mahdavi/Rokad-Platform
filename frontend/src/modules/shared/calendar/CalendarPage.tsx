import React, { useEffect, useState, useMemo } from 'react';
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
  AlertCircle,
  ShieldAlert,
  Sparkles,
  Info,
  Check,
  CalendarRange,
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

  // Google Calendar View Modes:
  // 'SCHEDULE' (نمای برنامه‌ای - امضای گوگل کلندر) | 'MONTH' (ماهانه) | 'YEAR' (سالانه)
  const [viewMode, setViewMode] = useState<'SCHEDULE' | 'MONTH' | 'YEAR'>('SCHEDULE');
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
            description: 'سنجش جامع آمادگی تحصیلی هنرجویان و دانش‌آموزان پایه‌های دهم و یازدهم',
            type: 'EXAM',
            startDate: '1405-07-10T08:30:00.000Z',
            jalaliDate: '1405-07-10',
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
            description: 'ویژه هنرجویان و دانش‌آموزان رشته‌های فنی، مهندسی و علوم پایه',
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

  // Schedule / Agenda View Items: All days of current month that have holidays, occasions, or events
  const scheduleItems = useMemo(() => {
    return monthDays.filter((day) => {
      const daySchoolEvents = getDaySchoolEvents(day.jalaliStr);
      const tenantHoliday = getDayTenantHoliday(day.jalaliStr);
      const isHoliday = day.isOfficialHoliday || Boolean(tenantHoliday);
      const hasEvents = daySchoolEvents.length > 0;
      const hasOccasion = day.occasions.length > 0;

      if (filterType === 'HOLIDAYS') return isHoliday;
      if (filterType === 'SCHOOL_EVENTS') return hasEvents || Boolean(tenantHoliday);
      return isHoliday || hasEvents || hasOccasion || day.isToday;
    });
  }, [monthDays, events, tenantHolidays, filterType]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4 pb-20 md:pb-8">
      {/* 1. GOOGLE CALENDAR TOP APP BAR */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 select-none">
        {/* Left / Right (RTL): Month Title, Quick Arrows & Today Button */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          {/* Today Button (Google Calendar Style) */}
          <button
            type="button"
            onClick={handleJumpToToday}
            className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl border border-gray-300 hover:border-primary/50 bg-white hover:bg-gray-50 text-xs sm:text-sm font-bold text-gray-700 hover:text-primary transition-all flex items-center gap-1 shrink-0 shadow-2xs"
            title="پرش به تاریخ امروز"
          >
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            <span>امروز</span>
            <span className="text-[10px] sm:text-xs text-gray-400 mr-0.5">
              ({toPersianDigits(todayInfo.day)})
            </span>
          </button>

          {/* Month Steppers */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-600 hover:text-ink-darker transition-colors"
              title="ماه قبل"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-600 hover:text-ink-darker transition-colors"
              title="ماه بعد"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Month & Year Title Dropdown */}
          <div className="relative min-w-0">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-sm sm:text-base md:text-lg font-black text-ink-darker bg-transparent border-none py-1 pr-1 pl-6 focus:outline-none cursor-pointer truncate"
            >
              {PERSIAN_MONTHS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {toPersianDigits(selectedYear)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right / Left (RTL): View Mode Switcher & Staff Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Google Calendar View Mode Segmented Controls */}
          <div className="flex items-center bg-gray-100/90 p-0.5 sm:p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('SCHEDULE')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                viewMode === 'SCHEDULE'
                  ? 'bg-white text-primary shadow-xs font-black'
                  : 'text-gray-600 hover:text-ink-darker'
              }`}
              title="نمای رویدادها و برنامه زمان‌بندی"
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">برنامه</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('MONTH')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                viewMode === 'MONTH'
                  ? 'bg-white text-primary shadow-xs font-black'
                  : 'text-gray-600 hover:text-ink-darker'
              }`}
              title="نمای تقویم ماهانه"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ماهانه</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('YEAR')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                viewMode === 'YEAR'
                  ? 'bg-white text-primary shadow-xs font-black'
                  : 'text-gray-600 hover:text-ink-darker'
              }`}
              title="نمای ۱۲ ماهه سالانه"
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">سالانه</span>
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
                className="text-xs h-8 sm:h-9 border-rose-200 text-rose-700 hover:bg-rose-50"
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
                className="text-xs h-8 sm:h-9"
              >
                <Plus className="w-3.5 h-3.5 ml-1" />
                <span>رویداد جدید</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 2. SUB-FILTER BAR (Compact Pills) */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar px-1 py-0.5">
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
              filterType === 'ALL'
                ? 'bg-ink-darker text-white shadow-2xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            همه روزها ({toPersianDigits(monthDays.length)})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('HOLIDAYS')}
            className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filterType === 'HOLIDAYS'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
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
            className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filterType === 'SCHOOL_EVENTS'
                ? 'bg-primary text-white shadow-2xs'
                : 'bg-white text-primary border border-primary/30 hover:bg-primary/5'
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

        <span className="text-[11px] font-bold text-gray-400 hidden sm:inline shrink-0">
          فصل {currentMonthMeta.season} • {toPersianDigits(currentMonthMeta.days)} روز
        </span>
      </div>

      {/* 3. VIEW 1: GOOGLE CALENDAR SCHEDULE / AGENDA VIEW (Mobile-First Masterpiece) */}
      {viewMode === 'SCHEDULE' && (
        <div className="space-y-2.5 animate-in fade-in duration-200">
          {scheduleItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
              <CalendarCheck className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-gray-700">هیچ رویدادی با این فیلتر یافت نشد</h4>
              <p className="text-xs text-gray-400 mt-1">
                می‌توانید فیلتر را به «همه روزها» تغییر دهید یا رویداد جدیدی ثبت کنید.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {scheduleItems.map((day) => {
                const daySchoolEvents = getDaySchoolEvents(day.jalaliStr);
                const tenantHoliday = getDayTenantHoliday(day.jalaliStr);
                const isHoliday = day.isOfficialHoliday || Boolean(tenantHoliday);

                return (
                  <div
                    key={day.jalaliStr}
                    onClick={() => setSelectedDay(day)}
                    className={`bg-white rounded-2xl border p-3 sm:p-4 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs ${
                      day.isToday
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.02]'
                        : isHoliday
                        ? 'border-rose-200/80 bg-rose-50/20 hover:border-rose-300'
                        : 'border-gray-200 hover:border-gray-300'
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
                            ? 'bg-rose-100 text-rose-700 font-bold'
                            : 'bg-gray-100 text-ink-darker font-bold'
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
                              isHoliday ? 'text-rose-600' : 'text-gray-800'
                            }`}
                          >
                            {day.dayOfWeekName}
                          </span>
                          {day.isToday && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-primary text-white font-bold">
                              امروز
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
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

                      {/* Official Holiday Reason */}
                      {day.holidayReason && !tenantHoliday && (
                        <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <strong className="font-bold shrink-0">تعطیل رسمی:</strong>
                          <span className="truncate">{day.holidayReason}</span>
                        </div>
                      )}

                      {/* School Events */}
                      {daySchoolEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className="p-2 rounded-xl bg-gray-50 border border-gray-200/80 text-xs flex items-center justify-between gap-2"
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
                            <span className="font-bold text-ink-darker truncate">{ev.title}</span>
                          </div>
                          {ev.location && (
                            <span className="text-[10px] text-gray-400 shrink-0 hidden sm:inline">
                              {ev.location}
                            </span>
                          )}
                        </div>
                      ))}

                      {/* Other Occasions */}
                      {day.occasions.length > 0 && !day.holidayReason && (
                        <div className="text-[11px] text-gray-600 flex items-center gap-1.5 py-0.5 truncate">
                          <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                          <span className="truncate">{day.occasions.join(' • ')}</span>
                        </div>
                      )}

                      {!day.holidayReason && daySchoolEvents.length === 0 && day.occasions.length === 0 && (
                        <span className="text-xs text-gray-400 italic">روزِ آموزشی عادی بدون رویداد خاص</span>
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
                          className="text-[11px] font-bold text-primary hover:bg-primary/10 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
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
        <div className="space-y-4 animate-in fade-in duration-200">
          <Card className="p-2 sm:p-4 bg-white border border-gray-200/80 shadow-xs rounded-2xl">
            {/* Weekday Strip */}
            <div className="grid grid-cols-7 border-b border-gray-100 pb-2 mb-2 text-center text-xs font-bold text-gray-500">
              {WEEK_DAYS.map((wd) => (
                <div key={wd.id} className={wd.id === 6 ? 'text-rose-600 font-black' : ''}>
                  <span className="hidden sm:inline">{wd.name}</span>
                  <span className="sm:hidden">{wd.short}</span>
                </div>
              ))}
            </div>

            {/* 7-Col Calendar Matrix */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {/* Blanks */}
              {Array.from({ length: leadingBlankDays }).map((_, i) => (
                <div
                  key={`blank-${i}`}
                  className="h-12 sm:h-16 md:h-20 rounded-xl bg-gray-50/40 border border-dashed border-gray-100"
                />
              ))}

              {/* Month Days */}
              {monthDays.map((day) => {
                const isSelected = selectedDay?.day === day.day;
                const daySchoolEvents = getDaySchoolEvents(day.jalaliStr);
                const tenantHoliday = getDayTenantHoliday(day.jalaliStr);
                const isHoliday = day.isOfficialHoliday || Boolean(tenantHoliday);

                return (
                  <div
                    key={day.day}
                    onClick={() => setSelectedDay(day)}
                    className={`h-12 sm:h-16 md:h-20 p-1 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                      isSelected
                        ? 'ring-2 ring-primary border-primary bg-primary/[0.03] shadow-xs'
                        : isHoliday
                        ? 'bg-rose-50/40 border-rose-100 hover:border-rose-200'
                        : 'bg-white border-gray-100 hover:border-gray-300 hover:bg-gray-50/50'
                    }`}
                  >
                    {/* Day Number Circle */}
                    <div className="flex items-center justify-center">
                      <span
                        className={`text-xs sm:text-sm font-bold flex items-center justify-center ${
                          day.isToday
                            ? 'w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary text-white font-black shadow-2xs'
                            : isHoliday
                            ? 'text-rose-600 font-black'
                            : 'text-gray-800'
                        }`}
                      >
                        {toPersianDigits(day.day)}
                      </span>
                    </div>

                    {/* Desktop Occasion Pill / Snippet */}
                    <div className="hidden md:block overflow-hidden my-auto px-0.5">
                      {day.holidayReason ? (
                        <p
                          className="text-[9px] text-rose-700 font-medium truncate"
                          title={day.holidayReason}
                        >
                          {day.holidayReason}
                        </p>
                      ) : day.occasions.length > 0 ? (
                        <p
                          className="text-[9px] text-gray-500 truncate"
                          title={day.occasions.join('، ')}
                        >
                          {day.occasions[0]}
                        </p>
                      ) : null}
                    </div>

                    {/* Indicator Dots (Mobile & Desktop) */}
                    <div className="flex items-center justify-center gap-0.5 sm:gap-1 mt-auto pb-0.5">
                      {isHoliday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      )}
                      {tenantHoliday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-800 shrink-0" />
                      )}
                      {daySchoolEvents.map((ev) => (
                        <span
                          key={ev.id}
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            ev.type === 'EXAM'
                              ? 'bg-amber-500'
                              : ev.type === 'MEETING'
                              ? 'bg-purple-500'
                              : 'bg-primary'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Google Calendar Split Day Details (Immediately visible under month grid) */}
          {selectedDay && (
            <Card className="p-3.5 sm:p-5 bg-white border border-gray-200/80 shadow-xs rounded-2xl animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-ink-darker">
                      {selectedDay.dayOfWeekName} {toPersianDigits(selectedDay.day)}{' '}
                      {currentMonthMeta.name} {toPersianDigits(selectedYear)}
                    </h3>
                    {selectedDay.isToday && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-white font-bold">
                        امروز
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    {selectedDay.gregorianStr} • فصل {currentMonthMeta.season}
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
                      className="text-xs h-8"
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
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">مناسبت تعطیلی رسمی: </span>
                      <span>{selectedDay.holidayReason}</span>
                    </div>
                  </div>
                )}

                {/* Occasions List */}
                {selectedDay.occasions.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-gray-700 block">مناسبت‌های روز:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedDay.occasions.map((occ, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-700 flex items-center gap-1.5"
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
                    <span className="text-xs font-bold text-gray-700 block">برنامه‌ها و آزمون‌های مدرسه:</span>
                    {getDaySchoolEvents(selectedDay.jalaliStr).map((ev) => (
                      <div
                        key={ev.id}
                        className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 text-xs flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-ink-darker">{ev.title}</p>
                          {ev.description && (
                            <p className="text-gray-500 text-[11px] mt-0.5">{ev.description}</p>
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
                    <p className="text-xs text-gray-400 py-2 text-center">
                      هیچ رویداد یا مناسبت رسمی برای این روز ثبت نشده است.
                    </p>
                  )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* 5. VIEW 3: GOOGLE CALENDAR YEARLY OVERVIEW */}
      {viewMode === 'YEAR' && (
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {PERSIAN_MONTHS.map((m) => {
              const daysInMonth = getMonthDays1405(m.id, selectedYear);
              const holidaysCount = daysInMonth.filter((d) => d.isOfficialHoliday).length;
              const isCurrent = m.id === selectedMonth;

              return (
                <div
                  key={m.id}
                  onClick={() => {
                    setSelectedMonth(m.id);
                    setViewMode('MONTH');
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isCurrent
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.02]'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-xs bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-sm text-ink-darker">{m.name}</h4>
                    <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-2 py-0.5 rounded-md">
                      {m.season}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 mb-2">
                    {toPersianDigits(m.days)} روز • {toPersianDigits(holidaysCount)} روز تعطیل
                  </p>

                  <div className="pt-2 border-t border-gray-100 text-left">
                    <span className="text-xs font-bold text-primary hover:underline">
                      مشاهده تقویم ماه &larr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
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
        description="افزودن برنامه، آزمون هماهنگ یا جلسه به گاه‌شماری مدرسه"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateEvent} className="space-y-3.5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
              {error}
            </div>
          )}

          <Input
            label="عنوان رویداد"
            placeholder="مثال: آزمون هماهنگ درس ریاضی پایه یازدهم"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-dark mb-1">نوع رویداد</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full h-10 rounded-xl border border-gray-300 bg-white px-3 text-xs text-ink-normal focus:ring-2 focus:ring-primary"
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
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-dark mb-1">توضیحات تکمیلی</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="نکات ضروری و جزئیات شرکت..."
              className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs text-ink-normal focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
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
        description="ثبت روز تعطیل اختصاصی ناشی از برودت هوا یا مصوبات شورای مدرسه"
        maxWidth="md"
      >
        <form onSubmit={handleCreateTenantHoliday} className="space-y-3.5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
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
          />

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsHolidayModalOpen(false)}>
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              className="bg-rose-600 hover:bg-rose-700"
            >
              ثبت تعطیلی
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
