import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { PersianDatePicker } from '../../../components/ui/PersianDatePicker';
import {
  gregorianToJalaliStr,
  jalaliToGregorianDate,
  formatJalaliDisplay,
  toPersianDigits,
} from '../../../utils/jalali';
import { toast } from '../../../components/ui/toast/toast';
import { useUndoableMutation } from '../../../lib/hooks/useUndoableMutation';
import { TOAST_MESSAGES } from '../../../constants/toast-messages';
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Sparkles,
  ChevronRight,
  Share2,
  CalendarPlus,
  Trash2,
  Edit3,
  AlertCircle,
  Tag,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Building2,
  CalendarCheck,
  Flame,
  BookOpen,
  PartyPopper,
  Trophy,
  Compass,
  Rocket,
} from 'lucide-react';
import { SchoolEventItem, INITIAL_SAMPLE_EVENTS } from './constants/sample-events';
import { EventStepWizard } from './components/EventStepWizard';
import {
  Workflow,
  Lightbulb,
  Star,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';

const EVENT_CATEGORIES: Record<string, { label: string; icon: any; color: string }> = {
  STARTUP_WEEKEND: { label: 'استارت‌آپ ویکند', icon: Rocket, color: 'bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950/60 dark:text-amber-300' },
  ACADEMIC: { label: 'آموزشی و مهارت', icon: BookOpen, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  CULTURAL: { label: 'فرهنگی و آیین‌ها', icon: PartyPopper, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  SPORTS: { label: 'مسابقات و ورزش', icon: Trophy, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  EXAM: { label: 'آزمون‌ها و سنجش', icon: Flame, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  EXCURSION: { label: 'اردو و بازدید علمی', icon: Compass, color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300' },
  MEETING: { label: 'جلسات و شورا', icon: Users, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300' },
  HOLIDAY: { label: 'تعطیلی و مناسبت', icon: CalendarDays, color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' },
};

const AUDIENCE_MAP: Record<string, string> = {
  ALL: 'عمومی (کلیه اعضا)',
  STUDENTS: 'ویژه دانش‌آموزان',
  TEACHERS: 'کادر آموزشی و مربیان',
  PARENTS: 'اولیاء گرامی',
  STAFF: 'کادر اجرایی مدرسه',
  SPECIFIC_CLASSES: 'کلاس‌های منتخب',
};

export const EventSinglePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const isManager = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'STAFF'].includes(currentUser?.role || '');

  const [event, setEvent] = useState<SchoolEventItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<'WORKFLOW' | 'OVERVIEW'>('WORKFLOW');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    eventType: 'ACADEMIC' as SchoolEventItem['eventType'],
    startDate: '',
    startTime: '08:30',
    endDate: '',
    endTime: '12:00',
    isAllDay: false,
    targetAudience: 'ALL' as SchoolEventItem['targetAudience'],
    location: '',
    coverUrl: '',
    tags: '',
  });

  // Countdown timer calculation
  const [timeLeft, setTimeLeft] = useState<{
    status: 'upcoming' | 'live' | 'passed';
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ status: 'upcoming', days: 0, hours: 0, minutes: 0, seconds: 0 });

  const fetchEvent = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/calendar/events/${id}`);
      if (res && res.data) {
        setEvent(res.data);
        return;
      }
    } catch (err) {
      // Gracefully load from local storage or default sample events
    }

    try {
      const cached = localStorage.getItem('rokad_calendar_events');
      let allEvents: SchoolEventItem[] = INITIAL_SAMPLE_EVENTS;
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          allEvents = parsed;
        }
      }
      const found = allEvents.find((e) => e.id === id) || allEvents[0];
      setEvent(found || null);
    } catch (e) {
      console.error('Failed to load fallback event', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [id]);

  // Live countdown timer ticking
  useEffect(() => {
    if (!event) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const start = new Date(event.startDate).getTime();
      const end = new Date(event.endDate).getTime();

      if (now < start) {
        const diff = start - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ status: 'upcoming', days, hours, minutes, seconds });
      } else if (now >= start && now <= end) {
        setTimeLeft({ status: 'live', days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setTimeLeft({ status: 'passed', days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [event]);



  // Undoable Delete Mutation with 5-second countdown
  // Deletes on server immediately, then provides 5s window to restore!
  const { execute: executeUndoableDelete } = useUndoableMutation<void>({
    undoLabel: TOAST_MESSAGES.operations.calendarEventDeleted(event?.title || ''),
    delayMs: 5000,
    optimisticUpdate: () => {
      try {
        const cached = localStorage.getItem('rokad_calendar_events');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const next = parsed.filter((e: any) => e.id !== id);
            localStorage.setItem('rokad_calendar_events', JSON.stringify(next));
          }
        }
      } catch {}
      navigate('/app/events');
    },
    mutationFn: async () => {
      if (id) {
        try {
          await apiClient.delete(`/calendar/events/${id}`);
        } catch {
          // Handled offline
        }
      }
    },
    undoFn: async () => {
      if (id && event) {
        try {
          const cached = localStorage.getItem('rokad_calendar_events');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && !parsed.some((e: any) => e.id === id)) {
              localStorage.setItem('rokad_calendar_events', JSON.stringify([event, ...parsed]));
            }
          }
        } catch {}
        try {
          await apiClient.patch(`/calendar/events/${id}/restore`);
        } catch {}
        navigate(`/app/events/${id}`);
      }
    },
    revertUpdate: () => {
      toast.info(`رویداد «${event?.title || ''}» بازگردانی شد.`);
    },
    onError: () => {
      // Offline fallback already updated locally
    },
  });

  // Delete event
  const handleDelete = () => {
    if (!id || !event) return;
    executeUndoableDelete();
  };

  // Open Edit Modal
  const handleOpenEdit = () => {
    if (!event) return;
    const sJalali = gregorianToJalaliStr(event.startDate);
    const eJalali = gregorianToJalaliStr(event.endDate);
    const sDate = new Date(event.startDate);
    const eDate = new Date(event.endDate);

    const sTime = `${String(sDate.getHours()).padStart(2, '0')}:${String(sDate.getMinutes()).padStart(2, '0')}`;
    const eTime = `${String(eDate.getHours()).padStart(2, '0')}:${String(eDate.getMinutes()).padStart(2, '0')}`;

    setForm({
      title: event.title,
      description: event.description || '',
      eventType: event.eventType,
      startDate: sJalali,
      startTime: sTime,
      endDate: eJalali || sJalali,
      endTime: eTime,
      isAllDay: event.isAllDay,
      targetAudience: event.targetAudience,
      location: event.location || '',
      coverUrl: event.coverUrl || '',
      tags: (event.tags || []).join('، '),
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  // Submit Edit Modal
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !form.title.trim()) {
      setFormError('عنوان رویداد الزامی است.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const sDateObj = jalaliToGregorianDate(form.startDate);
      const [sh, sm] = form.startTime.split(':').map(Number);
      sDateObj.setHours(sh || 8, sm || 0, 0, 0);

      const eDateObj = jalaliToGregorianDate(form.endDate);
      const [eh, em] = form.endTime.split(':').map(Number);
      eDateObj.setHours(eh || 12, em || 0, 0, 0);

      const tagsArray = form.tags
        ? form.tags.split(/[,،]+/).map((t) => t.trim()).filter(Boolean)
        : [];

      const patchPayload = {
        title: form.title.trim(),
        description: form.description.trim(),
        eventType: form.eventType,
        startDate: sDateObj.toISOString(),
        endDate: eDateObj.toISOString(),
        isAllDay: form.isAllDay,
        targetAudience: form.targetAudience,
        location: form.location.trim() || undefined,
        coverUrl: form.coverUrl.trim() || undefined,
        tags: tagsArray,
      };

      try {
        await apiClient.patch(`/calendar/events/${id}`, patchPayload);
      } catch {
        // Safe offline fallback
      }

      // Update local storage
      try {
        const cached = localStorage.getItem('rokad_calendar_events');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const next = parsed.map((item: any) =>
              item.id === id ? { ...item, ...patchPayload } : item
            );
            localStorage.setItem('rokad_calendar_events', JSON.stringify(next));
          }
        }
      } catch {}

      if (event) {
        setEvent({
          ...event,
          ...patchPayload,
          description: patchPayload.description,
          location: patchPayload.location,
          coverUrl: patchPayload.coverUrl,
          tags: tagsArray,
        });
      }

      setIsEditModalOpen(false);
      toast.success(TOAST_MESSAGES.operations.calendarEventUpdated(form.title));
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'خطا در ویرایش رویداد');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-zinc-900 border-t-transparent dark:border-zinc-100" />
        <p className="mt-4 text-sm font-black text-zinc-600 dark:text-zinc-400">در حال بارگذاری اطلاعات رویداد...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="rounded-2xl border-3 border-zinc-900 bg-white p-12 text-center shadow-[6px_6px_0px_0px_#18181b] dark:border-zinc-100 dark:bg-zinc-900 dark:shadow-[6px_6px_0px_0px_#f4f4f5]">
        <AlertCircle className="mx-auto w-12 h-12 text-red-500 mb-3" />
        <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100">رویداد مورد نظر یافت نشد</h2>
        <p className="mt-2 text-sm text-zinc-500">ممکن است این رویداد حذف شده باشد یا به تننت دیگری تعلق داشته باشد.</p>
        <Link to="/app/events">
          <Button variant="primary" className="mt-6 gap-2 font-bold border-2 border-zinc-900">
            <ArrowRight className="w-4 h-4" />
            بازگشت به رودمپ سالانه
          </Button>
        </Link>
      </div>
    );
  }

  const categoryMeta = EVENT_CATEGORIES[event.eventType] || EVENT_CATEGORIES.ACADEMIC;
  const CategoryIcon = categoryMeta.icon;
  const jalaliStart = formatJalaliDisplay(event.startDate, true);
  const jalaliEnd = formatJalaliDisplay(event.endDate, true);
  const startTimeStr = new Date(event.startDate).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  const endTimeStr = new Date(event.endDate).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-8 pb-16">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/app/events"
          className="inline-flex items-center gap-2 text-sm font-black text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت به رودمپ و تقویم رویدادها</span>
        </Link>

        {/* Quick Admin Actions */}
        {isManager && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleOpenEdit}
              variant="outline"
              className="gap-2 text-xs font-bold border-2 border-zinc-900 shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:shadow-[2px_2px_0px_0px_#f4f4f5]"
            >
              <Edit3 className="w-3.5 h-3.5" />
              ویرایش رویداد
            </Button>
            <Button
              onClick={handleDelete}
              variant="outline"
              className="gap-2 text-xs font-bold border-2 border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 shadow-[2px_2px_0px_0px_#dc2626]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              حذف رویداد
            </Button>
          </div>
        )}
      </div>

      {/* Hero Card with Cover Image */}
      <div className="overflow-hidden rounded-2xl border-3 border-zinc-900 bg-white shadow-[6px_6px_0px_0px_#18181b] dark:border-zinc-100 dark:bg-zinc-900 dark:shadow-[6px_6px_0px_0px_#f4f4f5]">
        {event.coverUrl ? (
          <div className="relative h-64 w-full md:h-96 overflow-hidden bg-zinc-900">
            <img
              src={event.coverUrl}
              alt={event.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </div>
        ) : (
          <div className="relative h-48 w-full md:h-64 bg-gradient-to-br from-indigo-900 via-zinc-900 to-purple-950 p-8 flex items-center justify-center">
            <CalendarDays className="w-24 h-24 text-white/20" />
          </div>
        )}

        {/* Hero Content Overlap */}
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Category Badge */}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black border border-zinc-300 dark:border-zinc-700 ${categoryMeta.color}`}>
                <CategoryIcon className="w-3.5 h-3.5" />
                {categoryMeta.label}
              </span>

              {/* Status Badge */}
              {timeLeft.status === 'live' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black border-2 border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 animate-pulse">
                  <Flame className="w-3.5 h-3.5 text-emerald-600" />
                  هم‌اکنون در حال برگزاری
                </span>
              ) : timeLeft.status === 'upcoming' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black border-2 border-cyan-500 bg-cyan-50 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
                  <Clock className="w-3.5 h-3.5 text-cyan-600" />
                  رویداد پیش‌رو
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black border border-zinc-400 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  برگزار شده
                </span>
              )}

              {/* Target Audience */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300">
                <Users className="w-3.5 h-3.5" />
                {AUDIENCE_MAP[event.targetAudience] || event.targetAudience}
              </span>
            </div>

          </div>

          <h1 className="text-2xl md:text-4xl font-black text-zinc-900 dark:text-zinc-50 leading-tight">
            {event.title}
          </h1>

          {/* Countdown Widget */}
          {timeLeft.status === 'upcoming' && (
            <div className="rounded-2xl border-2 border-zinc-900 bg-zinc-50 p-4 md:p-6 shadow-[4px_4px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-800/80 dark:shadow-[4px_4px_0px_0px_#f4f4f5]">
              <div className="text-xs font-black text-zinc-500 dark:text-zinc-400 mb-3 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary animate-pulse" />
                <span>شمارش معکوس تا آغاز رویداد:</span>
              </div>
              <div className="grid grid-cols-4 gap-3 text-center max-w-md">
                <div className="rounded-xl border-2 border-zinc-900 bg-white p-3 shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-300 dark:bg-zinc-900">
                  <span className="block text-2xl md:text-3xl font-black text-primary">{toPersianDigits(timeLeft.days)}</span>
                  <span className="text-[11px] font-bold text-zinc-500">روز</span>
                </div>
                <div className="rounded-xl border-2 border-zinc-900 bg-white p-3 shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-300 dark:bg-zinc-900">
                  <span className="block text-2xl md:text-3xl font-black text-zinc-900 dark:text-zinc-100">{toPersianDigits(timeLeft.hours)}</span>
                  <span className="text-[11px] font-bold text-zinc-500">ساعت</span>
                </div>
                <div className="rounded-xl border-2 border-zinc-900 bg-white p-3 shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-300 dark:bg-zinc-900">
                  <span className="block text-2xl md:text-3xl font-black text-zinc-900 dark:text-zinc-100">{toPersianDigits(timeLeft.minutes)}</span>
                  <span className="text-[11px] font-bold text-zinc-500">دقیقه</span>
                </div>
                <div className="rounded-xl border-2 border-zinc-900 bg-white p-3 shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-300 dark:bg-zinc-900">
                  <span className="block text-2xl md:text-3xl font-black text-rose-600">{toPersianDigits(timeLeft.seconds)}</span>
                  <span className="text-[11px] font-bold text-zinc-500">ثانیه</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation (Shown only for STARTUP_WEEKEND events) */}
      {event.eventType === 'STARTUP_WEEKEND' && (
        <div className="flex flex-wrap items-center gap-3 p-2 rounded-2xl border-3 border-zinc-900 bg-white shadow-[4px_4px_0px_0px_#18181b] dark:border-zinc-100 dark:bg-zinc-900 dark:shadow-[4px_4px_0px_0px_#f4f4f5]">
          <button
            onClick={() => setActiveMainTab('WORKFLOW')}
            className={`flex-1 min-w-[200px] flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-black transition-all ${
              activeMainTab === 'WORKFLOW'
                ? 'bg-amber-400 text-zinc-950 border-2 border-zinc-900 shadow-[3px_3px_0px_0px_#18181b]'
                : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            <Workflow className="w-4 h-4" />
            <span>چرخه گام‌به‌گام رویداد (ایده ➔ رای‌گیری ➔ تشکیل تیم ➔ بوم)</span>
          </button>

          <button
            onClick={() => setActiveMainTab('OVERVIEW')}
            className={`flex-1 min-w-[180px] flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-black transition-all ${
              activeMainTab === 'OVERVIEW'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 shadow-[3px_3px_0px_0px_#18181b] dark:shadow-[3px_3px_0px_0px_#f4f4f5]'
                : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>شناسنامه و زمان‌بندی کامل رویداد</span>
          </button>
        </div>
      )}

      {/* Render Active Tab Content */}
      {event.eventType === 'STARTUP_WEEKEND' && activeMainTab === 'WORKFLOW' ? (
        <EventStepWizard eventId={event.id} eventTitle={event.title} />
      ) : (
        <div className="space-y-8">
          {/* Information Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Start Date */}
            <div className="rounded-2xl border-2 border-zinc-900 bg-white p-5 shadow-[3px_3px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900 dark:shadow-[3px_3px_0px_0px_#f4f4f5]">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs mb-1">
                <CalendarDays className="w-4 h-4" />
                <span>زمان آغاز</span>
              </div>
              <p className="text-base font-black text-zinc-900 dark:text-zinc-100">{jalaliStart}</p>
              <p className="text-xs font-bold text-zinc-500 mt-1">ساعت {startTimeStr}</p>
            </div>

            {/* End Date */}
            <div className="rounded-2xl border-2 border-zinc-900 bg-white p-5 shadow-[3px_3px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900 dark:shadow-[3px_3px_0px_0px_#f4f4f5]">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-xs mb-1">
                <Clock className="w-4 h-4" />
                <span>زمان پایان</span>
              </div>
              <p className="text-base font-black text-zinc-900 dark:text-zinc-100">{jalaliEnd}</p>
              <p className="text-xs font-bold text-zinc-500 mt-1">ساعت {endTimeStr}</p>
            </div>

            {/* Location */}
            <div className="rounded-2xl border-2 border-zinc-900 bg-white p-5 shadow-[3px_3px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900 dark:shadow-[3px_3px_0px_0px_#f4f4f5]">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs mb-1">
                <MapPin className="w-4 h-4" />
                <span>محل برگزاری</span>
              </div>
              <p className="text-base font-black text-zinc-900 dark:text-zinc-100">
                {event.location || 'سالن اصلی هنرستان'}
              </p>
              <p className="text-xs font-bold text-zinc-500 mt-1">حضوری / هماهنگ‌شده</p>
            </div>

            {/* Organizer */}
            <div className="rounded-2xl border-2 border-zinc-900 bg-white p-5 shadow-[3px_3px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900 dark:shadow-[3px_3px_0px_0px_#f4f4f5]">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>برگزارکننده</span>
              </div>
              <p className="text-base font-black text-zinc-900 dark:text-zinc-100">
                {event.createdBy ? `${event.createdBy.firstName} ${event.createdBy.lastName}` : 'مدیریت هنرستان'}
              </p>
              <p className="text-xs font-bold text-zinc-500 mt-1">
                {event.createdBy?.role ? `نقش: ${event.createdBy.role}` : 'واحد امور اجرایی و آموزشی'}
              </p>
            </div>
          </div>

          {/* Description & Full Details */}
          <div className="rounded-2xl border-3 border-zinc-900 bg-white p-6 md:p-8 shadow-[5px_5px_0px_0px_#18181b] dark:border-zinc-100 dark:bg-zinc-900 dark:shadow-[5px_5px_0px_0px_#f4f4f5] space-y-6">
            <div>
              <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                توضیحات و دستورالعمل رویداد
              </h2>
              <div className="prose dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium whitespace-pre-line text-sm md:text-base">
                {event.description || 'توضیحات تکمیلی برای این رویداد ثبت نشده است.'}
              </div>
            </div>

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                <h4 className="text-xs font-black text-zinc-500 dark:text-zinc-400 mb-3 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  <span>کلیدواژه‌ها و برچسب‌های مرتبط:</span>
                </h4>
                <div className="flex flex-wrap items-center gap-2">
                  {event.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-xl text-xs font-bold border-2 border-zinc-900 bg-zinc-100 text-zinc-800 dark:border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 shadow-[2px_2px_0px_0px_#18181b] dark:shadow-[2px_2px_0px_0px_#f4f4f5]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= EDIT MODAL ================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="ویرایش مشخصات رویداد"
      >
        <form onSubmit={handleEditSubmit} className="space-y-5">
          {formError && (
            <div className="flex items-center gap-2 rounded-xl border-2 border-red-500 bg-red-50 p-3 text-xs font-bold text-red-700 dark:bg-red-950/50 dark:text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
              عنوان رویداد *
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-sm font-bold shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
                دسته‌بندی
              </label>
              <select
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value as any })}
                className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-sm font-bold shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900"
              >
                <option value="STARTUP_WEEKEND">استارت‌آپ ویکند</option>
                <option value="ACADEMIC">آموزشی و مهارت</option>
                <option value="CULTURAL">فرهنگی و آیین‌ها</option>
                <option value="SPORTS">مسابقات و ورزش</option>
                <option value="EXAM">آزمون و ارزشیابی</option>
                <option value="EXCURSION">اردو و بازدید علمی</option>
                <option value="MEETING">جلسه و نشست</option>
                <option value="HOLIDAY">تعطیلی و مناسبت</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
                مخاطبین هدف
              </label>
              <select
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value as any })}
                className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-sm font-bold shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900"
              >
                <option value="ALL">عمومی (کلیه مخاطبین)</option>
                <option value="STUDENTS">دانش‌آموزان</option>
                <option value="TEACHERS">مربیان و اساتید</option>
                <option value="PARENTS">اولیاء گرامی</option>
                <option value="STAFF">کادر اجرایی</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
                تاریخ شروع (شمسی) *
              </label>
              <PersianDatePicker
                value={form.startDate}
                onChange={(d) => setForm({ ...form, startDate: d })}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
                ساعت شروع
              </label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-sm font-bold shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
                تاریخ پایان (شمسی)
              </label>
              <PersianDatePicker
                value={form.endDate}
                onChange={(d) => setForm({ ...form, endDate: d })}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
                ساعت پایان
              </label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-sm font-bold shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
              محل برگزاری
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-sm font-bold shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
              URL تصویر بنر کاور
            </label>
            <input
              type="url"
              value={form.coverUrl}
              onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
              className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-sm font-medium shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
              برچسب‌ها (با ویرگول جدا کنید)
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-sm font-medium shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
              توضیحات رویداد
            </label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-sm font-medium shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              className="border-2 border-zinc-900 font-bold"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="border-2 border-zinc-900 font-black px-6 shadow-[3px_3px_0px_0px_#18181b]"
            >
              {isSubmitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
