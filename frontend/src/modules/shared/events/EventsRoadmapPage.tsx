import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
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
import { porscadClient } from '../../../lib/porscad/porscad-client';
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Plus,
  Search,
  Sparkles,
  ChevronLeft,
  Compass,
  Layers,
  LayoutGrid,
  CalendarCheck,
  AlertCircle,
  Tag,
  Trash2,
  Edit3,
  Image as ImageIcon,
  CheckCircle2,
  Flag,
  Flame,
  BookOpen,
  Trophy,
  PartyPopper,
  Compass as CompassIcon,
  Rocket,
} from 'lucide-react';
import { SchoolEventItem, INITIAL_SAMPLE_EVENTS } from './constants/sample-events';
export type { SchoolEventItem };

const EVENT_CATEGORIES = [
  { key: 'ALL', label: 'همه رویدادها', icon: Layers, color: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200' },
  { key: 'STARTUP_WEEKEND', label: 'استارت‌آپ ویکند', icon: Rocket, color: 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 font-black' },
  { key: 'ACADEMIC', label: 'آموزشی و مهارت', icon: BookOpen, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  { key: 'CULTURAL', label: 'فرهنگی و جشن‌ها', icon: PartyPopper, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  { key: 'SPORTS', label: 'مسابقات و ورزش', icon: Trophy, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  { key: 'EXAM', label: 'آزمون‌ها و سنجش', icon: Flame, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  { key: 'EXCURSION', label: 'اردو و بازدید علمی', icon: CompassIcon, color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300' },
  { key: 'MEETING', label: 'جلسات و شورا', icon: Users, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300' },
];

const AUDIENCE_MAP: Record<string, string> = {
  ALL: 'عمومی (کلیه اعضا)',
  STUDENTS: 'ویژه دانش‌آموزان',
  TEACHERS: 'کادر آموزشی و مربیان',
  PARENTS: 'اولیاء گرامی',
  STAFF: 'کادر اجرایی مدرسه',
  SPECIFIC_CLASSES: 'کلاس‌های منتخب',
};

const PERSIAN_MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

const EVENTS_STORAGE_KEY = 'rokad_calendar_events';

export const EventsRoadmapPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const isManager = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STAFF'].includes(currentUser?.role || '');

  const [events, setEvents] = useState<SchoolEventItem[]>(() => {
    try {
      const cached = localStorage.getItem(EVENTS_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasStartup = parsed.some((e: any) => e.eventType === 'STARTUP_WEEKEND' || e.id === 'evt_startup_weekend_2026');
          if (hasStartup) return parsed;
          return [...INITIAL_SAMPLE_EVENTS, ...parsed];
        }
      }
    } catch {}
    return INITIAL_SAMPLE_EVENTS;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'roadmap' | 'grid'>('roadmap');

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const todayJalaliStr = useMemo(() => gregorianToJalaliStr(new Date()), []);

  const [form, setForm] = useState({
    title: '',
    description: '',
    eventType: 'ACADEMIC' as SchoolEventItem['eventType'],
    startDate: todayJalaliStr,
    startTime: '08:30',
    endDate: todayJalaliStr,
    endTime: '12:00',
    isAllDay: false,
    targetAudience: 'ALL' as SchoolEventItem['targetAudience'],
    location: '',
    coverUrl: '',
    tags: '',
  });

  const fetchEvents = async () => {
    try {
      const res = await apiClient.get('/calendar/events');
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        setEvents(res.data);
        localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(res.data));
      }
    } catch (err) {
      // Fallback gracefully to local storage / sample events
      try {
        const cached = localStorage.getItem(EVENTS_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEvents(parsed);
          }
        }
      } catch {}
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchCat = selectedCategory === 'ALL' || ev.eventType === selectedCategory;
      const matchSearch =
        !searchQuery ||
        ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.description && ev.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ev.location && ev.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ev.tags && ev.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchCat && matchSearch;
    });
  }, [events, selectedCategory, searchQuery]);

  // Group events by Jalali month for the annual roadmap
  const roadmapGroups = useMemo(() => {
    const groups: { monthIndex: number; monthName: string; year: string; events: SchoolEventItem[] }[] = [];

    // Sort chronologically by start date
    const sorted = [...filteredEvents].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    sorted.forEach((ev) => {
      const jStr = gregorianToJalaliStr(ev.startDate);
      if (!jStr) return;
      const parts = jStr.split('-');
      const y = parts[0];
      const m = parseInt(parts[1], 10);
      const mName = PERSIAN_MONTH_NAMES[m - 1] || 'نامشخص';
      const key = `${y}-${m}`;

      let group = groups.find((g) => `${g.year}-${g.monthIndex}` === key);
      if (!group) {
        group = { monthIndex: m, monthName: mName, year: y, events: [] };
        groups.push(group);
      }
      group.events.push(ev);
    });

    return groups;
  }, [filteredEvents]);

  // Event status calculator
  const getEventStatus = (startDate: string, endDate: string) => {
    const now = new Date().getTime();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    if (now < start) {
      return { label: 'پیش‌رو', variant: 'info' as const, bg: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-300/40' };
    } else if (now >= start && now <= end) {
      return { label: 'در حال برگزاری', variant: 'success' as const, bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/40 animate-pulse' };
    } else {
      return { label: 'برگزار شده', variant: 'outline' as const, bg: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700' };
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingId(null);
    setForm({
      title: '',
      description: '',
      eventType: 'ACADEMIC',
      startDate: todayJalaliStr,
      startTime: '08:30',
      endDate: todayJalaliStr,
      endTime: '12:00',
      isAllDay: false,
      targetAudience: 'ALL',
      location: '',
      coverUrl: '',
      tags: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (ev: SchoolEventItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditingId(ev.id);

    const sJalali = gregorianToJalaliStr(ev.startDate);
    const eJalali = gregorianToJalaliStr(ev.endDate);
    const sDate = new Date(ev.startDate);
    const eDate = new Date(ev.endDate);

    const sTime = `${String(sDate.getHours()).padStart(2, '0')}:${String(sDate.getMinutes()).padStart(2, '0')}`;
    const eTime = `${String(eDate.getHours()).padStart(2, '0')}:${String(eDate.getMinutes()).padStart(2, '0')}`;

    setForm({
      title: ev.title,
      description: ev.description || '',
      eventType: ev.eventType,
      startDate: sJalali,
      startTime: sTime,
      endDate: eJalali || sJalali,
      endTime: eTime,
      isAllDay: ev.isAllDay,
      targetAudience: ev.targetAudience,
      location: ev.location || '',
      coverUrl: ev.coverUrl || '',
      tags: (ev.tags || []).join('، '),
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Undoable Delete Mutation with 5-second countdown & revert on undo
  // Deletes on server & locally, then provides 5s window to restore!
  const { execute: executeUndoableDeleteEvent } = useUndoableMutation<SchoolEventItem>({
    undoLabel: (ev) => TOAST_MESSAGES.operations.calendarEventDeleted(ev.title),
    delayMs: 5000,
    optimisticUpdate: (ev) => {
      setEvents((prev) => {
        const next = prev.filter((item) => item.id !== ev.id);
        try {
          localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    mutationFn: async (ev) => {
      try {
        await apiClient.delete(`/calendar/events/${ev.id}`);
      } catch {
        // Handled gracefully in offline mode
      }
    },
    undoFn: async (ev) => {
      try {
        await apiClient.patch(`/calendar/events/${ev.id}/restore`);
      } catch {}
    },
    revertUpdate: (ev) => {
      setEvents((prev) => {
        if (prev.some((item) => item.id === ev.id)) return prev;
        const next = [ev, ...prev];
        try {
          localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
      toast.info(`رویداد «${ev.title}» بازگردانی شد.`);
    },
    onError: (_err, _ev) => {
      // Offline fallback already updated locally
    },
  });

  // Delete event handler
  const handleDeleteEvent = (ev: SchoolEventItem, e: React.MouseEvent) => {
    e.stopPropagation();
    executeUndoableDeleteEvent(ev);
  };

  // Submit Modal
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
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

      const payload = {
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

      if (isEditing && editingId) {
        try {
          await apiClient.patch(`/calendar/events/${editingId}`, payload);
        } catch {
          // fallback locally
        }

        setEvents((prev) => {
          const updated = prev.map((item) =>
            item.id === editingId
              ? {
                  ...item,
                  ...payload,
                  tags: tagsArray,
                  description: payload.description,
                  location: payload.location,
                  coverUrl: payload.coverUrl,
                }
              : item
          );
          try {
            localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        });
        toast.success(TOAST_MESSAGES.operations.calendarEventUpdated(form.title));
      } else {
        const newEventObj: SchoolEventItem = {
          id: 'ev_' + Date.now(),
          title: payload.title,
          description: payload.description,
          eventType: payload.eventType,
          startDate: payload.startDate,
          endDate: payload.endDate,
          isAllDay: payload.isAllDay,
          targetAudience: payload.targetAudience,
          location: payload.location,
          coverUrl: payload.coverUrl,
          tags: tagsArray,
          createdAt: new Date().toISOString(),
          createdBy: {
            firstName: currentUser?.firstName || 'شما',
            lastName: currentUser?.lastName || '(مدیر رویداد)',
            role: currentUser?.role || 'SCHOOL_ADMIN',
          },
        };

        try {
          const res = await apiClient.post('/calendar/events', payload);
          if (res?.data?.id) {
            newEventObj.id = res.data.id;
          }
        } catch {
          // fallback locally
        }

        setEvents((prev) => {
          const updated = [newEventObj, ...prev];
          try {
            localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        });
        toast.success(TOAST_MESSAGES.operations.calendarEventCreated(form.title));
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Event submit error', err);
      const msg = err?.response?.data?.message || 'خطا در ذخیره‌سازی رویداد';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stats calculation
  const totalCount = events.length;
  const upcomingCount = useMemo(() => {
    const now = new Date().getTime();
    return events.filter((e) => new Date(e.startDate).getTime() > now).length;
  }, [events]);
  const liveCount = useMemo(() => {
    const now = new Date().getTime();
    return events.filter((e) => new Date(e.startDate).getTime() <= now && new Date(e.endDate).getTime() >= now).length;
  }, [events]);

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border-3 border-zinc-900 bg-white p-6 shadow-[6px_6px_0px_0px_#18181b] dark:border-zinc-100 dark:bg-zinc-900 dark:shadow-[6px_6px_0px_0px_#f4f4f5] md:p-8">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-wide mb-2">
              <Compass className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin-slow" />
              <span>تقویم جامع عملیاتی و آموزشی</span>
            </div>
            <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight md:text-4xl">
              رودمپ رویدادهای سالانه
            </h1>
            <p className="mt-2 max-w-2xl text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
              نمای زمان‌بندی تمام رویدادها، هکاتون‌ها، کارگاه‌های مهارتی، آزمون‌ها و آیین‌های شاخص هنرستان در طول سال تحصیلی با جزئیات کامل و سینگل پیج اختصاصی.
            </p>

            {/* Quick Metrics */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black border-2 border-zinc-900 bg-zinc-100 text-zinc-900 dark:border-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 shadow-[2px_2px_0px_0px_#18181b] dark:shadow-[2px_2px_0px_0px_#f4f4f5]">
                <Layers className="w-3.5 h-3.5" />
                کل رویدادها: {toPersianDigits(totalCount)}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black border-2 border-zinc-900 bg-cyan-100 text-cyan-900 dark:border-zinc-200 dark:bg-cyan-950 dark:text-cyan-300 shadow-[2px_2px_0px_0px_#18181b] dark:shadow-[2px_2px_0px_0px_#f4f4f5]">
                <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                پیش‌رو: {toPersianDigits(upcomingCount)}
              </span>
              {liveCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black border-2 border-zinc-900 bg-emerald-100 text-emerald-900 dark:border-zinc-200 dark:bg-emerald-950 dark:text-emerald-300 shadow-[2px_2px_0px_0px_#18181b] dark:shadow-[2px_2px_0px_0px_#f4f4f5] animate-pulse">
                  <Flame className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  در حال برگزاری: {toPersianDigits(liveCount)}
                </span>
              )}
            </div>
          </div>

          {/* Action Button for Admins */}
          <div className="flex flex-wrap items-center gap-3">
            {isManager && (
              <Button
                onClick={handleOpenCreate}
                variant="primary"
                className="gap-2 px-5 py-3 text-base font-black border-3 border-zinc-900 shadow-[4px_4px_0px_0px_#18181b] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                <Plus className="w-5 h-5" />
                تعریف رویداد جدید
              </Button>
            )}
            <Link to="/app/calendar">
              <Button
                variant="outline"
                className="gap-2 px-4 py-3 font-bold border-2 border-zinc-900 bg-zinc-50 dark:bg-zinc-800 shadow-[2px_2px_0px_0px_#18181b] dark:shadow-[2px_2px_0px_0px_#f4f4f5]"
              >
                <CalendarDays className="w-4 h-4" />
                مشاهده تقویم ماهانه
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Filter and View Controls Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در عنوان، مکان یا کلیدواژه‌ها..."
            className="w-full rounded-xl border-2 border-zinc-900 bg-white pr-10 pl-4 py-2.5 text-sm font-medium placeholder:text-zinc-400 shadow-[3px_3px_0px_0px_#18181b] focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-200 dark:bg-zinc-900 dark:shadow-[3px_3px_0px_0px_#f4f4f5]"
          />
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <div className="flex rounded-xl border-2 border-zinc-900 bg-white p-1 shadow-[3px_3px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900 dark:shadow-[3px_3px_0px_0px_#f4f4f5]">
            <button
              onClick={() => setViewMode('roadmap')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                viewMode === 'roadmap'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              <Layers className="w-4 h-4" />
              تایم‌لاین سالانه
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                viewMode === 'grid'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              شبکه کارت‌ها
            </button>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {EVENT_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                isSelected
                  ? 'border-zinc-900 bg-zinc-900 text-white shadow-[3px_3px_0px_0px_#000] dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:shadow-[3px_3px_0px_0px_#fff]'
                  : 'border-zinc-900/40 bg-white text-zinc-700 hover:border-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-200 shadow-[2px_2px_0px_0px_#18181b] dark:shadow-[2px_2px_0px_0px_#f4f4f5]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Content Display */}
      {isLoading ? (
        <div className="py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-zinc-900 border-t-transparent dark:border-zinc-100" />
          <p className="mt-3 text-sm font-bold text-zinc-600 dark:text-zinc-400">در حال دریافت رودمپ رویدادها...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <CalendarDays className="mx-auto w-12 h-12 text-zinc-400 mb-3" />
          <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">رویدادی یافت نشد</h3>
          <p className="mt-1 text-sm text-zinc-500 max-w-sm mx-auto">
            هیچ رویدادی مطابق با فیلترها و عبارت جستجوی انتخاب‌شده ثبت نشده است.
          </p>
          {isManager && (
            <Button onClick={handleOpenCreate} variant="primary" className="mt-4 gap-2 font-bold border-2 border-zinc-900">
              <Plus className="w-4 h-4" />
              افزودن اولین رویداد
            </Button>
          )}
        </div>
      ) : viewMode === 'roadmap' ? (
        /* ================= ROADMAP ANNUAL TIMELINE VIEW ================= */
        <div className="space-y-12">
          {roadmapGroups.map((group) => (
            <div key={`${group.year}-${group.monthIndex}`} className="space-y-6">
              {/* Month Header Banner */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 rounded-xl border-2 border-zinc-900 bg-primary px-4 py-2 text-white font-black text-base shadow-[3px_3px_0px_0px_#18181b] dark:border-zinc-200 dark:shadow-[3px_3px_0px_0px_#f4f4f5]">
                  <Flag className="w-4 h-4" />
                  <span>{group.monthName}</span>
                  <span className="text-xs opacity-80">{toPersianDigits(group.year)}</span>
                </div>
                <div className="h-0.5 flex-1 bg-zinc-200 dark:bg-zinc-800 border-t-2 border-dashed border-zinc-300 dark:border-zinc-700" />
                <span className="text-xs font-bold text-zinc-500">
                  {toPersianDigits(group.events.length)} رویداد
                </span>
              </div>

              {/* Events in Month */}
              <div className="relative mr-4 space-y-6 border-r-3 border-zinc-300 pr-6 dark:border-zinc-700">
                {group.events.map((ev) => {
                  const status = getEventStatus(ev.startDate, ev.endDate);
                  const jalaliStartFormatted = formatJalaliDisplay(ev.startDate, true);
                  const sTime = new Date(ev.startDate).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div
                      key={ev.id}
                      onClick={() => navigate(`/app/events/${ev.id}`)}
                      className="group relative cursor-pointer transition-all"
                    >
                      {/* Timeline Node Dot */}
                      <div className="absolute -right-[33px] top-6 h-5 w-5 rounded-full border-3 border-zinc-900 bg-white shadow-[2px_2px_0px_0px_#000] transition-transform group-hover:scale-125 dark:border-zinc-100 dark:bg-zinc-900 dark:shadow-[2px_2px_0px_0px_#fff]" />

                      {/* Event Card */}
                      <div className="overflow-hidden rounded-2xl border-3 border-zinc-900 bg-white shadow-[5px_5px_0px_0px_#18181b] transition-all hover:-translate-y-1 hover:shadow-[7px_7px_0px_0px_#18181b] dark:border-zinc-100 dark:bg-zinc-900 dark:shadow-[5px_5px_0px_0px_#f4f4f5] dark:hover:shadow-[7px_7px_0px_0px_#f4f4f5]">
                        <div className="flex flex-col lg:flex-row">
                          {/* Left Cover/Badge visual */}
                          {ev.coverUrl ? (
                            <div className="h-44 w-full lg:h-auto lg:w-64 flex-shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                              <img
                                src={ev.coverUrl}
                                alt={ev.title}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            </div>
                          ) : (
                            <div className="flex h-32 w-full lg:h-auto lg:w-48 flex-shrink-0 items-center justify-center bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-900/30 dark:to-purple-900/30">
                              <CalendarDays className="w-12 h-12 text-zinc-400 group-hover:text-primary transition-colors" />
                            </div>
                          )}

                          {/* Event Body */}
                          <div className="flex-1 p-5 md:p-6 flex flex-col justify-between">
                            <div>
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${status.bg}`}>
                                    {status.label}
                                  </span>
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                    {EVENT_CATEGORIES.find((c) => c.key === ev.eventType)?.label || ev.eventType}
                                  </span>
                                  <span className="text-xs font-bold text-zinc-500">
                                    {AUDIENCE_MAP[ev.targetAudience] || ev.targetAudience}
                                  </span>
                                </div>

                                {/* Admin Action Buttons */}
                                {isManager && (
                                  <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                                    <button
                                      title="ویرایش رویداد"
                                      onClick={(e) => handleOpenEdit(ev, e)}
                                      className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                      title="حذف رویداد"
                                      onClick={(e) => handleDeleteEvent(ev, e)}
                                      className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors">
                                {ev.title}
                              </h3>

                              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                                {ev.description}
                              </p>
                            </div>

                            {/* Event Metadata Footer */}
                            <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4">
                              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-zinc-600 dark:text-zinc-400">
                                <span className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-200">
                                  <CalendarDays className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                  <span>تاریخ شروع: {jalaliStartFormatted}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                                  <span>ساعت {sTime}</span>
                                </span>
                                {ev.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                                    <span>{ev.location}</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-900 bg-amber-300 text-zinc-950 text-[11px] font-black shadow-[1px_1px_0px_0px_#18181b]">
                                  <Sparkles className="w-3 h-3" />
                                  <span>ایده‌ها، ستاره‌دهی و بوم</span>
                                </span>

                                <div className="flex items-center gap-1 text-xs font-black text-primary group-hover:underline">
                                  <span>ورود به رویداد</span>
                                  <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ================= GRID VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((ev) => {
            const status = getEventStatus(ev.startDate, ev.endDate);
            const jalaliStartFormatted = formatJalaliDisplay(ev.startDate);
            const sTime = new Date(ev.startDate).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={ev.id}
                onClick={() => navigate(`/app/events/${ev.id}`)}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border-3 border-zinc-900 bg-white shadow-[5px_5px_0px_0px_#18181b] transition-all hover:-translate-y-1 hover:shadow-[7px_7px_0px_0px_#18181b] dark:border-zinc-100 dark:bg-zinc-900 dark:shadow-[5px_5px_0px_0px_#f4f4f5] cursor-pointer"
              >
                <div>
                  {ev.coverUrl ? (
                    <div className="h-44 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                      <img
                        src={ev.coverUrl}
                        alt={ev.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
                      <CalendarDays className="w-12 h-12 text-zinc-400 group-hover:text-primary transition-colors" />
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${status.bg}`}>
                        {status.label}
                      </span>
                      <span className="text-xs font-bold text-zinc-500">
                        {EVENT_CATEGORIES.find((c) => c.key === ev.eventType)?.label}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors line-clamp-1">
                      {ev.title}
                    </h3>
                    <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {ev.description}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2 text-xs font-bold text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-200">
                        <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{jalaliStartFormatted}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{sTime}</span>
                      </span>
                    </div>
                    {ev.location && (
                      <div className="flex items-center gap-1 truncate text-zinc-500">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-zinc-900 bg-amber-300 text-zinc-950 text-[10px] font-black shadow-[1px_1px_0px_0px_#18181b]">
                      <Sparkles className="w-3 h-3" />
                      <span>ایده، رای‌گیری و بوم</span>
                    </span>

                    <div className="flex items-center gap-1 text-xs font-black text-primary group-hover:underline">
                      <span>ورود</span>
                      <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= CREATE / EDIT MODAL ================= */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'ویرایش رویداد' : 'تعریف رویداد جدید در رودمپ سالانه'}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && (
            <div className="flex items-center gap-2 rounded-xl border-2 border-red-500 bg-red-50 p-3 text-xs font-bold text-red-700 dark:bg-red-950/50 dark:text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
              عنوان رویداد *
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="مثال: مسابقه هکاتون پاییزه هوش مصنوعی و برنامه‌نویسی"
              className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-sm font-bold shadow-[2px_2px_0px_0px_#18181b] focus:outline-none dark:border-zinc-200 dark:bg-zinc-900"
            />
          </div>

          {/* Category & Target Audience */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
                دسته‌بندی رویداد
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
                <option value="ALL">عمومی (کلیه مخاطبین هنرستان)</option>
                <option value="STUDENTS">صرفاً دانش‌آموزان</option>
                <option value="TEACHERS">صرفاً مربیان و اساتید</option>
                <option value="PARENTS">صرفاً اولیاء گرامی</option>
                <option value="STAFF">صرفاً کادر اجرایی</option>
              </select>
            </div>
          </div>

          {/* Dates & Times */}
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

          {/* Location */}
          <div>
            <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
              مکان / سالن یا لینک برگزاری آنلاین
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="مثال: سالن آمفی‌تئاتر خوارزمی یا لینک اسکای‌روم"
              className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-sm font-bold shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900"
            />
          </div>

          {/* Cover Image URL */}
          <div>
            <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
              آدرس تصویر بنر رویداد (URL کاور)
            </label>
            <input
              type="url"
              value={form.coverUrl}
              onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
              placeholder="https://images.unsplash.com/..."
              className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-sm font-medium shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
              برچسب‌ها (با کاما یا ویرگول جدا کنید)
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="هوش مصنوعی، هکاتون، کدنویسی، جایزه"
              className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-sm font-medium shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
              توضیحات و دستورالعمل رویداد
            </label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="جزئیات برنامه، اهداف، شرایط شرکت، ملزومات همراه و..."
              className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-sm font-medium shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
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
              {isSubmitting ? 'در حال ثبت...' : isEditing ? 'بروزرسانی رویداد' : 'افزودن به رودمپ سالانه'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
