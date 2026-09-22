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
} from 'lucide-react';
import { SchoolEventItem } from './EventsRoadmapPage';

const EVENT_CATEGORIES: Record<string, { label: string; icon: any; color: string; badge: string }> = {
  ACADEMIC: {
    label: 'آموزشی و مهارت',
    icon: BookOpen,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  },
  CULTURAL: {
    label: 'فرهنگی و آیین‌ها',
    icon: PartyPopper,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
  },
  SPORTS: {
    label: 'مسابقات و ورزش',
    icon: Trophy,
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  },
  EXAM: {
    label: 'آزمون‌ها و سنجش',
    icon: Flame,
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  },
  EXCURSION: {
    label: 'اردو و بازدید علمی',
    icon: Compass,
    color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
    badge: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
  },
  MEETING: {
    label: 'جلسات و شورا',
    icon: Users,
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
  },
  HOLIDAY: {
    label: 'تعطیلی و مناسبت',
    icon: CalendarDays,
    color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
  },
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
      }
    } catch (err) {
      console.error('Failed to fetch single event', err);
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

  // Share link handler
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Google Calendar URL generator
  const getGoogleCalendarUrl = () => {
    if (!event) return '';
    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(event.description || '');
    const location = encodeURIComponent(event.location || '');
    const sIso = new Date(event.startDate).toISOString().replace(/-|:|\.\d\d\d/g, '');
    const eIso = new Date(event.endDate).toISOString().replace(/-|:|\.\d\d\d/g, '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${sIso}/${eIso}&details=${details}&location=${location}`;
  };

  // Undoable Delete Mutation with 5-second countdown
  // Deletes on server immediately, then provides 5s window to restore!
  const { execute: executeUndoableDelete } = useUndoableMutation<void>({
    undoLabel: TOAST_MESSAGES.operations.calendarEventDeleted(event?.title || ''),
    delayMs: 5000,
    optimisticUpdate: () => {
      navigate('/app/events');
    },
    mutationFn: async () => {
      if (id) {
        await apiClient.delete(`/calendar/events/${id}`);
      }
    },
    undoFn: async () => {
      if (id) {
        await apiClient.patch(`/calendar/events/${id}/restore`);
        navigate(`/app/events/${id}`);
      }
    },
    revertUpdate: () => {
      toast.info(`رویداد «${event?.title || ''}» بازگردانی شد.`);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'خطا در حذف رویداد');
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

      await apiClient.patch(`/calendar/events/${id}`, {
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
      });

      setIsEditModalOpen(false);
      await fetchEvent();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'خطا در ویرایش رویداد');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-3 border-brand-primary border-t-transparent" />
        <p className="mt-4 text-sm font-bold text-gray-500 dark:text-gray-400">در حال بارگذاری اطلاعات رویداد...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-[#151C28]">
        <AlertCircle className="mx-auto w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-black text-gray-900 dark:text-gray-100">رویداد مورد نظر یافت نشد</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">ممکن است این رویداد حذف شده باشد یا به این مرکز آموزشی تعلق نداشته باشد.</p>
        <Link to="/app/events">
          <button className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-brand-primary text-white shadow-md hover:bg-brand-primary/90 transition-all">
            <ArrowRight className="w-4 h-4" />
            بازگشت به تقویم رویدادها
          </button>
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
    <div className="space-y-6 pb-16">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/app/events"
          className="min-h-[44px] inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت به رویدادها</span>
        </Link>

        {/* Quick Admin Actions */}
        {isManager && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenEdit}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/80 transition-all shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5" />
              ویرایش
            </button>
            <button
              onClick={handleDelete}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100/70 dark:hover:bg-rose-900/40 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              حذف
            </button>
          </div>
        )}
      </div>

      {/* Hero Card with Cover Image */}
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-[#151C28]">
        {event.coverUrl ? (
          <div className="relative h-56 w-full md:h-80 overflow-hidden bg-gray-900">
            <img
              src={event.coverUrl}
              alt={event.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </div>
        ) : (
          <div className="relative h-44 w-full md:h-56 bg-gradient-to-br from-indigo-900 via-gray-900 to-purple-950 p-6 flex items-center justify-center">
            <CalendarDays className="w-20 h-20 text-white/10" />
          </div>
        )}

        {/* Hero Content */}
        <div className="p-5 md:p-7 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Badge */}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${categoryMeta.badge || categoryMeta.color}`}>
                <CategoryIcon className="w-3.5 h-3.5" />
                {categoryMeta.label}
              </span>

              {/* Status Badge */}
              {timeLeft.status === 'live' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  در حال برگزاری
                </span>
              ) : timeLeft.status === 'upcoming' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border border-sky-500/30 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                  <Clock className="w-3.5 h-3.5 text-sky-500" />
                  پیش‌رو
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border border-gray-200 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  برگزار شده
                </span>
              )}

              {/* Target Audience */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300">
                <Users className="w-3.5 h-3.5" />
                {AUDIENCE_MAP[event.targetAudience] || event.targetAudience}
              </span>
            </div>

            {/* Share and Add to Calendar Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" />
                {copied ? 'کپی شد!' : 'اشتراک‌گذاری'}
              </button>
              <a
                href={getGoogleCalendarUrl()}
                target="_blank"
                rel="noreferrer"
              >
                <button
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-brand-primary text-white hover:bg-brand-primary/90 transition-all shadow-sm"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  گوگل کلندر
                </button>
              </a>
            </div>
          </div>

          <h1 className="text-xl md:text-3xl font-black text-gray-900 dark:text-gray-50 leading-tight">
            {event.title}
          </h1>

          {/* Countdown Widget */}
          {timeLeft.status === 'upcoming' && (
            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-[#0E131F]/70">
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-brand-primary animate-pulse" />
                <span>شمارش معکوس تا آغاز رویداد:</span>
              </div>
              <div className="grid grid-cols-4 gap-2.5 text-center max-w-md">
                <div className="rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <span className="block text-xl md:text-2xl font-black text-brand-primary">{toPersianDigits(timeLeft.days)}</span>
                  <span className="text-[11px] font-bold text-gray-500">روز</span>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <span className="block text-xl md:text-2xl font-black text-gray-900 dark:text-gray-100">{toPersianDigits(timeLeft.hours)}</span>
                  <span className="text-[11px] font-bold text-gray-500">ساعت</span>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <span className="block text-xl md:text-2xl font-black text-gray-900 dark:text-gray-100">{toPersianDigits(timeLeft.minutes)}</span>
                  <span className="text-[11px] font-bold text-gray-500">دقیقه</span>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <span className="block text-xl md:text-2xl font-black text-rose-500">{toPersianDigits(timeLeft.seconds)}</span>
                  <span className="text-[11px] font-bold text-gray-500">ثانیه</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Information Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Start Date */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#151C28]">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs mb-1">
            <CalendarDays className="w-4 h-4" />
            <span>زمان آغاز</span>
          </div>
          <p className="text-sm font-black text-gray-900 dark:text-gray-100">{jalaliStart}</p>
          <p className="text-xs font-bold text-gray-500 mt-0.5">ساعت {startTimeStr}</p>
        </div>

        {/* End Date */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#151C28]">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-xs mb-1">
            <Clock className="w-4 h-4" />
            <span>زمان پایان</span>
          </div>
          <p className="text-sm font-black text-gray-900 dark:text-gray-100">{jalaliEnd}</p>
          <p className="text-xs font-bold text-gray-500 mt-0.5">ساعت {endTimeStr}</p>
        </div>

        {/* Location */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#151C28]">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs mb-1">
            <MapPin className="w-4 h-4" />
            <span>محل برگزاری</span>
          </div>
          <p className="text-sm font-black text-gray-900 dark:text-gray-100">
            {event.location || 'سالن هنرستان'}
          </p>
          <p className="text-xs font-bold text-gray-500 mt-0.5">حضوری</p>
        </div>

        {/* Organizer */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#151C28]">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>برگزارکننده</span>
          </div>
          <p className="text-sm font-black text-gray-900 dark:text-gray-100">
            {event.createdBy ? `${event.createdBy.firstName} ${event.createdBy.lastName}` : 'مدیریت هنرستان'}
          </p>
          <p className="text-xs font-bold text-gray-500 mt-0.5">
            {event.createdBy?.role ? `نقش: ${event.createdBy.role}` : 'واحد اجرایی'}
          </p>
        </div>
      </div>

      {/* Description & Full Details */}
      <div className="rounded-3xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm dark:border-gray-800 dark:bg-[#151C28] space-y-5">
        <div>
          <h2 className="text-base font-black text-gray-900 dark:text-gray-100 mb-2.5 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            توضیحات و دستورالعمل رویداد
          </h2>
          <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed font-medium whitespace-pre-line text-xs sm:text-sm">
            {event.description || 'توضیحات تکمیلی ثبت نشده است.'}
          </div>
        </div>

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              <span>کلیدواژه‌ها و برچسب‌ها:</span>
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              {event.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-xl text-xs font-bold border border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================= EDIT MODAL ================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="ویرایش مشخصات رویداد"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500 bg-red-50 p-3 text-xs font-bold text-red-700 dark:bg-red-950/50 dark:text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              عنوان رویداد *
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full min-h-[42px] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-3.5 py-2.5 text-sm font-bold text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                دسته‌بندی
              </label>
              <select
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value as any })}
                className="w-full min-h-[42px] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-3.5 py-2.5 text-sm font-bold text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
              >
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
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                مخاطبین هدف
              </label>
              <select
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value as any })}
                className="w-full min-h-[42px] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-3.5 py-2.5 text-sm font-bold text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
              >
                <option value="ALL">عمومی (کلیه مخاطبین)</option>
                <option value="STUDENTS">دانش‌آموزان</option>
                <option value="TEACHERS">مربیان و اساتید</option>
                <option value="PARENTS">اولیاء گرامی</option>
                <option value="STAFF">کادر اجرایی</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                تاریخ شروع (شمسی) *
              </label>
              <PersianDatePicker
                value={form.startDate}
                onChange={(d) => setForm({ ...form, startDate: d })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                ساعت شروع
              </label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full min-h-[42px] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-3.5 py-2.5 text-sm font-bold text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                تاریخ پایان (شمسی)
              </label>
              <PersianDatePicker
                value={form.endDate}
                onChange={(d) => setForm({ ...form, endDate: d })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                ساعت پایان
              </label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="w-full min-h-[42px] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-3.5 py-2.5 text-sm font-bold text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              محل برگزاری
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full min-h-[42px] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-3.5 py-2.5 text-sm font-bold text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              URL تصویر بنر کاور
            </label>
            <input
              type="url"
              value={form.coverUrl}
              onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
              className="w-full min-h-[42px] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-3.5 py-2.5 text-sm font-medium text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              برچسب‌ها (با ویرگول جدا کنید)
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full min-h-[42px] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-3.5 py-2.5 text-sm font-medium text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              توضیحات رویداد
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 p-3 text-sm font-medium text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="min-h-[42px] px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[42px] px-6 py-2 rounded-xl font-black text-xs bg-brand-primary text-white hover:bg-brand-primary/90 transition-all shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
