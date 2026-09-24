import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
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
  X,
  Filter,
  ArrowUpRight,
  ExternalLink,
  RotateCcw,
  ArrowUpDown,
  ChevronDown,
  Check,
} from 'lucide-react';
import { INITIAL_SAMPLE_EVENTS } from './constants/sample-events';

export interface SchoolEventItem {
  id: string;
  title: string;
  description: string;
  eventType: 'ACADEMIC' | 'HOLIDAY' | 'EXAM' | 'MEETING' | 'CULTURAL' | 'SPORTS' | 'EXCURSION' | 'STARTUP_WEEKEND';
  categoryKey?: string;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  targetAudience: 'ALL' | 'STUDENTS' | 'TEACHERS' | 'PARENTS' | 'STAFF' | 'SPECIFIC_CLASSES';
  location?: string;
  coverUrl?: string;
  tags?: string[];
  workflowModules?: { key: string; step: number; enabled?: boolean }[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: {
    firstName: string;
    lastName: string;
    role: string;
    avatarUrl?: string;
  };
}

export interface EventCategoryConfig {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  activeClass: string;
  badgeClass: string;
}

export const EVENT_CATEGORIES: EventCategoryConfig[] = [
  {
    key: 'ALL',
    label: 'همه رویدادها',
    icon: Layers,
    colorClass: 'text-primary bg-primary/10 border-primary/20',
    activeClass: 'bg-primary text-white border-primary shadow-sm',
    badgeClass: 'bg-primary/10 text-primary border-primary/20',
  },
  {
    key: 'STARTUP_WEEKEND',
    label: 'استارت‌آپ ویکند',
    icon: Rocket,
    colorClass: 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/60',
    activeClass: 'bg-amber-500 text-white border-amber-500 shadow-sm',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700',
  },
  {
    key: 'ACADEMIC',
    label: 'آموزشی و مهارت',
    icon: BookOpen,
    colorClass: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60',
    activeClass: 'bg-blue-600 text-white border-blue-600 shadow-sm',
    badgeClass: 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  {
    key: 'CULTURAL',
    label: 'فرهنگی و جشن‌ها',
    icon: PartyPopper,
    colorClass: 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60',
    activeClass: 'bg-purple-600 text-white border-purple-600 shadow-sm',
    badgeClass: 'bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  {
    key: 'SPORTS',
    label: 'مسابقات و ورزش',
    icon: Trophy,
    colorClass: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60',
    activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  {
    key: 'EXAM',
    label: 'آزمون‌ها و سنجش',
    icon: Flame,
    colorClass: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60',
    activeClass: 'bg-amber-500 text-white border-amber-500 shadow-sm',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  {
    key: 'EXCURSION',
    label: 'اردو و بازدید علمی',
    icon: CompassIcon,
    colorClass: 'text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/60',
    activeClass: 'bg-cyan-600 text-white border-cyan-600 shadow-sm',
    badgeClass: 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
  },
  {
    key: 'MEETING',
    label: 'جلسات و شورا',
    icon: Users,
    colorClass: 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60',
    activeClass: 'bg-indigo-600 text-white border-indigo-600 shadow-sm',
    badgeClass: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  },
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

interface FilterOption {
  value: string;
  label: string;
  colorDot?: string;
}

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'ALL', label: 'همه وضعیت‌ها' },
  { value: 'UPCOMING', label: 'فقط پیش‌رو', colorDot: 'bg-cyan-500' },
  { value: 'LIVE', label: 'در حال برگزاری', colorDot: 'bg-emerald-500' },
  { value: 'COMPLETED', label: 'برگزار شده', colorDot: 'bg-slate-400' },
];

const AUDIENCE_OPTIONS: FilterOption[] = [
  { value: 'ALL', label: 'همه مخاطبین' },
  { value: 'STUDENTS', label: 'صرفاً دانش‌آموزان', colorDot: 'bg-blue-500' },
  { value: 'TEACHERS', label: 'کادر آموزشی و مربیان', colorDot: 'bg-purple-500' },
  { value: 'PARENTS', label: 'اولیاء گرامی', colorDot: 'bg-amber-500' },
  { value: 'STAFF', label: 'کادر اجرایی', colorDot: 'bg-emerald-500' },
];

const SORT_OPTIONS: FilterOption[] = [
  { value: 'START_DATE_ASC', label: 'نزدیک‌ترین زمان برگزاری' },
  { value: 'START_DATE_DESC', label: 'دورترین زمان برگزاری' },
  { value: 'TITLE_ASC', label: 'بر اساس عنوان رویداد (الفبا)' },
];

interface CustomFilterDropdownProps {
  label: string;
  labelIcon: React.ComponentType<{ className?: string }>;
  iconColorClass?: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

const CustomFilterDropdown: React.FC<CustomFilterDropdownProps> = ({
  label,
  labelIcon: LabelIcon,
  iconColorClass = 'text-primary',
  options,
  value,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={`relative ${isOpen ? 'z-50' : 'z-10'}`} ref={containerRef}>
      <label className="flex items-center gap-1.5 text-xs font-bold text-ink-normal/80 dark:text-gray-300 mb-1.5">
        <LabelIcon className={`w-3.5 h-3.5 shrink-0 ${iconColorClass}`} />
        <span>{label}</span>
      </label>

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between text-xs sm:text-[13px] font-bold h-11 px-3.5 rounded-xl border transition-all duration-150 cursor-pointer select-none text-right ${
          isOpen
            ? 'border-primary ring-2 ring-primary/20 dark:ring-primary/30 bg-white dark:bg-[#1C2536] text-ink-darker dark:text-white shadow-xs'
            : 'bg-[#FAFAFA] dark:bg-[#1C2536] border-gray-200 dark:border-[#242F42] text-ink-darker dark:text-white hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          {selectedOption?.colorDot && (
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${selectedOption.colorDot}`} />
          )}
          <span className="truncate">{selectedOption?.label || label}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-[#151C28] rounded-xl border border-gray-200 dark:border-[#242F42] shadow-xl p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 max-h-56 overflow-y-auto">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-[13px] transition-colors cursor-pointer text-right ${
                  isSelected
                    ? 'bg-primary/10 text-primary dark:text-primary font-black'
                    : 'text-ink-darker dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-[#1C2536] font-bold'
                }`}
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  {opt.colorDot && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${opt.colorDot}`} />
                  )}
                  <span className="truncate">{opt.label}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const EventsRoadmapPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const isManager = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'STAFF'].includes(currentUser?.role || '');

  const [events, setEvents] = useState<SchoolEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UPCOMING' | 'LIVE' | 'COMPLETED'>('ALL');
  const [audienceFilter, setAudienceFilter] = useState<string>('ALL');
  const [sortOption, setSortOption] = useState<string>('START_DATE_ASC');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'roadmap' | 'grid'>('roadmap');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    audienceFilter !== 'ALL' ||
    selectedCategory !== 'ALL' ||
    sortOption !== 'START_DATE_ASC' ||
    Boolean(searchQuery.trim());

  const resetFilters = () => {
    setStatusFilter('ALL');
    setAudienceFilter('ALL');
    setSelectedCategory('ALL');
    setSortOption('START_DATE_ASC');
    setSearchQuery('');
  };

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
    setIsLoading(true);
    try {
      const res = await apiClient.get('/calendar/events');
      let loadedEvents: SchoolEventItem[] = [];
      if (res && Array.isArray(res.data)) {
        loadedEvents = res.data;
      }
      const hasStartup = loadedEvents.some(
        (e: any) => e.eventType === 'STARTUP_WEEKEND' || e.id === 'evt_startup_weekend_2026'
      );
      let combined = loadedEvents;
      if (!hasStartup) {
        let startupEventToInclude = INITIAL_SAMPLE_EVENTS.find((s) => s.id === 'evt_startup_weekend_2026');
        try {
          const cached = localStorage.getItem('rokad_calendar_events');
          if (cached) {
            const parsed = JSON.parse(cached);
            const foundCached = Array.isArray(parsed) ? parsed.find((p: any) => p.id === 'evt_startup_weekend_2026' || p.eventType === 'STARTUP_WEEKEND') : null;
            if (foundCached) startupEventToInclude = foundCached;
          }
        } catch {}
        combined = startupEventToInclude ? [startupEventToInclude, ...loadedEvents] : [...INITIAL_SAMPLE_EVENTS, ...loadedEvents];
      }
      setEvents(combined);
      try {
        localStorage.setItem('rokad_calendar_events', JSON.stringify(combined));
      } catch {}
    } catch (err) {
      console.error('Failed to load roadmap events', err);
      try {
        const cached = localStorage.getItem('rokad_calendar_events');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const hasStartup = parsed.some(
              (e: any) => e.eventType === 'STARTUP_WEEKEND' || e.id === 'evt_startup_weekend_2026'
            );
            setEvents(hasStartup ? parsed : [...INITIAL_SAMPLE_EVENTS, ...parsed]);
            return;
          }
        }
      } catch {}
      setEvents(INITIAL_SAMPLE_EVENTS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Event status calculator
  const getEventStatus = (startDate: string, endDate: string) => {
    const now = new Date().getTime();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    if (now < start) {
      return {
        key: 'UPCOMING',
        label: 'پیش‌رو',
        dotColor: 'bg-cyan-500',
        badgeClass: 'bg-cyan-50 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
      };
    } else if (now >= start && now <= end) {
      return {
        key: 'LIVE',
        label: 'در حال برگزاری',
        dotColor: 'bg-emerald-500 animate-pulse',
        badgeClass: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-sm animate-pulse',
      };
    } else {
      return {
        key: 'COMPLETED',
        label: 'برگزار شده',
        dotColor: 'bg-slate-400',
        badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      };
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

  const completedCount = useMemo(() => {
    const now = new Date().getTime();
    return events.filter((e) => new Date(e.endDate).getTime() < now).length;
  }, [events]);

  // Filtered & sorted events
  const filteredEvents = useMemo(() => {
    return events
      .filter((ev) => {
        const matchCat = selectedCategory === 'ALL' || ev.eventType === selectedCategory;
        const matchAudience = audienceFilter === 'ALL' || ev.targetAudience === audienceFilter;

        let matchStatus = true;
        if (statusFilter !== 'ALL') {
          const s = getEventStatus(ev.startDate, ev.endDate);
          matchStatus = s.key === statusFilter;
        }

        const matchSearch =
          !searchQuery ||
          ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (ev.description && ev.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (ev.location && ev.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (ev.tags && ev.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

        return matchCat && matchAudience && matchStatus && matchSearch;
      })
      .sort((a, b) => {
        if (sortOption === 'START_DATE_ASC') {
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        }
        if (sortOption === 'START_DATE_DESC') {
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        }
        if (sortOption === 'TITLE_ASC') {
          return a.title.localeCompare(b.title, 'fa');
        }
        return 0;
      });
  }, [events, selectedCategory, statusFilter, audienceFilter, searchQuery, sortOption]);

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

  // Undoable Delete Mutation
  const { execute: executeUndoableDeleteEvent } = useUndoableMutation<SchoolEventItem>({
    undoLabel: (ev) => TOAST_MESSAGES.operations.calendarEventDeleted(ev.title),
    delayMs: 5000,
    optimisticUpdate: (ev) => {
      setEvents((prev) => prev.filter((item) => item.id !== ev.id));
    },
    mutationFn: async (ev) => {
      await apiClient.delete(`/calendar/events/${ev.id}`);
    },
    undoFn: async (ev) => {
      await apiClient.patch(`/calendar/events/${ev.id}/restore`);
      await fetchEvents();
    },
    revertUpdate: (ev) => {
      setEvents((prev) => {
        if (prev.some((item) => item.id === ev.id)) return prev;
        return [ev, ...prev];
      });
      toast.info(`رویداد «${ev.title}» بازگردانی شد.`);
    },
    onError: (err, ev) => {
      toast.error(err?.response?.data?.message || `خطا در حذف رویداد «${ev.title}»`);
    },
  });

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
        await apiClient.patch(`/calendar/events/${editingId}`, payload);
        toast.success(TOAST_MESSAGES.operations.calendarEventUpdated(form.title));
      } else {
        await apiClient.post('/calendar/events', payload);
        toast.success(TOAST_MESSAGES.operations.calendarEventCreated(form.title));
      }

      setIsModalOpen(false);
      await fetchEvents();
    } catch (err: any) {
      console.error('Event submit error', err);
      const msg = err?.response?.data?.message || 'خطا در ذخیره‌سازی رویداد';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Top Header Toolbar */}
      <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Title & Icon (No count badge, as requested) */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-ink-darker dark:text-white tracking-tight">
              نقشۀ رویدادها
            </h1>
          </div>

          {/* Action Buttons: Search, Filter Toggle, View Switcher, and Create Event Button */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-64 min-w-[160px]">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در رویدادها..."
                className="w-full h-10 pr-9 pl-8 text-xs rounded-xl border-[1.5px] border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-ink-darker dark:text-white outline-none focus:border-primary focus:bg-white dark:focus:bg-gray-900 transition-colors shadow-2xs font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded-md cursor-pointer"
                  title="پاک کردن جستجو"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Toggle Button (Matching Homework & Messages Page) */}
            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className={`relative cursor-pointer select-none flex items-center justify-center w-10 h-10 rounded-xl border-[1.5px] transition-all duration-150 active:translate-x-[1px] active:translate-y-[1px] shrink-0 ${
                isFilterOpen || hasActiveFilters
                  ? 'bg-primary text-white border-primary-dark shadow-[2px_2px_0_#438C83]'
                  : 'bg-gray-50 dark:bg-[#1C2536] text-muted-foreground dark:text-slate-300 border-gray-200 dark:border-[#242F42] hover:bg-gray-100 dark:hover:bg-[#253248] shadow-[2px_2px_0_#CBD5E1] dark:shadow-[2px_2px_0_#0F172A]'
              }`}
              title={isFilterOpen ? 'بستن فیلترها' : 'نمایش فیلترها'}
              aria-label={isFilterOpen ? 'بستن فیلترها' : 'نمایش فیلترها'}
            >
              <Filter className="w-4 h-4 shrink-0" />
              {hasActiveFilters && (
                <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#151C28]" />
              )}
            </button>

            {/* View Mode Switcher: Timeline vs Grid */}
            <div className="flex items-center p-1 rounded-xl bg-gray-100 dark:bg-[#1C2536] border border-gray-200/60 dark:border-gray-700/60 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('roadmap')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'roadmap'
                    ? 'bg-white dark:bg-[#151C28] text-primary shadow-sm border border-primary/20 dark:border-gray-700'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
                title="نمایش تایم‌لاین"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">تایم‌لاین</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-[#151C28] text-primary shadow-sm border border-primary/20 dark:border-gray-700'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
                title="نمایش شبکه کارت‌ها"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">شبکه کارت‌ها</span>
              </button>
            </div>

            {/* Create Event Button (Staff / Admin only) */}
            {isManager && (
              <Button
                onClick={handleOpenCreate}
                variant="primary"
                className="h-10 px-4 rounded-xl text-xs sm:text-sm font-bold rokad-btn-primary shrink-0 gap-1.5 shadow-ecosystem"
              >
                <Plus className="w-4 h-4" />
                <span>رویداد جدید</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Category Filter Pills (Horizontal Scrolling Bar - Always Visible & Fast Access) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
        {EVENT_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.key;
          const Icon = cat.icon;
          const count =
            cat.key === 'ALL'
              ? events.length
              : events.filter((e) => e.eventType === cat.key).length;

          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              className={`min-h-[40px] flex items-center gap-2 whitespace-nowrap px-3.5 py-2 rounded-xl text-xs sm:text-[13px] font-bold border transition-all duration-150 cursor-pointer select-none active:scale-98 ${
                isSelected
                  ? cat.activeClass
                  : 'bg-white dark:bg-[#151C28] text-gray-600 dark:text-gray-300 border-gray-200/80 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{cat.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                {toPersianDigits(count)}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Collapsible Filter & Sort Panel (Dedicated 3-column card with smooth animation matching HomeworkPage) */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isFilterOpen
            ? 'grid-rows-[1fr] opacity-100 translate-y-0'
            : 'grid-rows-[0fr] opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <div className={`min-h-0 ${isFilterOpen ? 'overflow-visible' : 'overflow-hidden'}`}>
          <div className="bg-white dark:bg-[#151C28] rounded-2xl border border-gray-200/80 dark:border-[#242F42] p-4 sm:p-5 shadow-xs space-y-4 relative overflow-visible">
            {/* Filter Dropdowns Grid: 3 Balanced Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 relative z-20">
              {/* Status Filter */}
              <CustomFilterDropdown
                label="وضعیت برگزاری:"
                labelIcon={Clock}
                iconColorClass="text-cyan-500"
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={(val) => setStatusFilter(val as any)}
              />

              {/* Target Audience Filter */}
              <CustomFilterDropdown
                label="مخاطبین هدف:"
                labelIcon={Users}
                iconColorClass="text-purple-500"
                options={AUDIENCE_OPTIONS}
                value={audienceFilter}
                onChange={setAudienceFilter}
              />

              {/* Sort Order Filter */}
              <CustomFilterDropdown
                label="ترتیب نمایش:"
                labelIcon={ArrowUpDown}
                iconColorClass="text-primary"
                options={SORT_OPTIONS}
                value={sortOption}
                onChange={setSortOption}
              />
            </div>

            {/* Footer Row: Result Counter & Reset Button */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800/80">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                تعداد {toPersianDigits(filteredEvents.length)} رویداد با این مشخصات یافت شد.
              </span>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs h-8 px-3 gap-1.5 inline-flex items-center text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer font-bold"
                  title="پاک کردن تمام فیلترها"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>بازنشانی فیلترها</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Content Display */}
      {isLoading ? (
        <div className="py-24 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-primary border-t-transparent" />
          <p className="mt-3 text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400">
            در حال بارگذاری رویدادهای سالانه...
          </p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 p-12 text-center bg-white/40 dark:bg-[#151C28]/40">
          <CalendarDays className="mx-auto w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
          <h3 className="text-base font-black text-ink-darker dark:text-white">رویدادی با این مشخصات یافت نشد</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            می‌توانید فیلترهای دسته‌بندی و وضعیت را تغییر دهید یا عنوان دیگری را جستجو کنید.
          </p>
          {isManager && (
            <Button
              onClick={handleOpenCreate}
              variant="primary"
              className="rokad-btn-primary mt-4 gap-2 text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن رویداد جدید</span>
            </Button>
          )}
        </div>
      ) : viewMode === 'roadmap' ? (
        /* ================= ANNUAL ROADMAP TIMELINE VIEW ================= */
        <div className="space-y-10 sm:space-y-12">
          {roadmapGroups.map((group) => (
            <div key={`${group.year}-${group.monthIndex}`} className="space-y-5">
              {/* Month Header Banner */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 rounded-xl bg-primary text-white px-4 py-2 font-black text-sm shadow-sm border border-primary/30">
                  <Flag className="w-4 h-4" />
                  <span>{group.monthName}</span>
                  <span className="text-xs opacity-80">{toPersianDigits(group.year)}</span>
                </div>
                <div className="h-0.5 flex-1 bg-gradient-to-l from-transparent via-gray-200 dark:via-gray-800 to-transparent" />
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#1C2536] px-3 py-1 rounded-full border border-gray-200/60 dark:border-gray-700/60">
                  {toPersianDigits(group.events.length)} رویداد
                </span>
              </div>

              {/* Spine & Events Container */}
              <div className="relative mr-4 sm:mr-6 space-y-5 border-r-2 border-primary/20 dark:border-primary/25 pr-6 sm:pr-8">
                {group.events.map((ev) => {
                  const status = getEventStatus(ev.startDate, ev.endDate);
                  const jalaliStartFormatted = formatJalaliDisplay(ev.startDate, true);
                  const sTime = new Date(ev.startDate).toLocaleTimeString('fa-IR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const categoryMeta = EVENT_CATEGORIES.find((c) => c.key === ev.eventType) || EVENT_CATEGORIES[0];
                  const CategoryIcon = categoryMeta.icon;

                  return (
                    <div
                      key={ev.id}
                      onClick={() => navigate(`/app/events/${ev.id}`)}
                      className="group relative cursor-pointer"
                    >
                      {/* Timeline Node Dot */}
                      <div className="absolute -right-[31px] sm:-right-[39px] top-6 h-4 w-4 rounded-full border-2 border-white dark:border-[#0B0F17] bg-primary shadow-sm transition-transform duration-200 group-hover:scale-125" />

                      {/* Event Card */}
                      <div className="overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                        <div className="flex flex-col lg:flex-row">
                          {/* Left Cover visual */}
                          {ev.coverUrl ? (
                            <div className="h-44 w-full lg:h-auto lg:w-64 flex-shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
                              <img
                                src={ev.coverUrl}
                                alt={ev.title}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent lg:hidden" />
                            </div>
                          ) : (
                            <div className="flex h-32 w-full lg:h-auto lg:w-48 flex-shrink-0 items-center justify-center bg-gradient-to-br from-primary/10 via-indigo-500/10 to-teal-500/10 dark:from-primary/20 dark:to-indigo-900/30">
                              <CategoryIcon className="w-10 h-10 text-primary/70 transition-transform duration-300 group-hover:scale-110" />
                            </div>
                          )}

                          {/* Event Body */}
                          <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between">
                            <div>
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  {/* Status badge */}
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${status.badgeClass}`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                                    <span>{status.label}</span>
                                  </span>

                                  {/* Category badge */}
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${categoryMeta.badgeClass}`}
                                  >
                                    <CategoryIcon className="w-3 h-3" />
                                    <span>{categoryMeta.label}</span>
                                  </span>

                                  {/* Audience */}
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                    <Users className="w-3 h-3 text-gray-400" />
                                    <span>{AUDIENCE_MAP[ev.targetAudience] || ev.targetAudience}</span>
                                  </span>
                                </div>

                                {/* Admin Action Buttons */}
                                {isManager && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      title="ویرایش رویداد"
                                      onClick={(e) => handleOpenEdit(ev, e)}
                                      className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-white transition-colors"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      title="حذف رویداد"
                                      onClick={(e) => handleDeleteEvent(ev, e)}
                                      className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              <h3 className="text-base sm:text-lg font-black text-ink-darker dark:text-white group-hover:text-primary transition-colors">
                                {ev.title}
                              </h3>

                              <p className="mt-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed font-medium">
                                {ev.description}
                              </p>
                            </div>

                            {/* Event Metadata Footer */}
                            <div className="mt-4 pt-3.5 border-t border-gray-100 dark:border-gray-800/80 flex flex-wrap items-center justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-bold text-gray-600 dark:text-gray-300">
                                <span className="flex items-center gap-1.5 text-ink-darker dark:text-gray-200">
                                  <CalendarDays className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span>{jalaliStartFormatted}</span>
                                </span>
                                <span className="flex items-center gap-1 text-gray-500">
                                  <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <span>ساعت {sTime}</span>
                                </span>
                                {ev.location && (
                                  <span className="flex items-center gap-1 text-gray-500">
                                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                    <span>{ev.location}</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 text-xs font-bold text-primary group-hover:underline">
                                {ev.eventType === 'STARTUP_WEEKEND' ? (
                                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-black">
                                    <Rocket className="w-3.5 h-3.5" />
                                    <span>ورود به مراحل استارت‌آپ ویکند</span>
                                  </span>
                                ) : (
                                  <span>جزئیات برنامه</span>
                                )}
                                <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredEvents.map((ev) => {
            const status = getEventStatus(ev.startDate, ev.endDate);
            const jalaliStartFormatted = formatJalaliDisplay(ev.startDate);
            const sTime = new Date(ev.startDate).toLocaleTimeString('fa-IR', {
              hour: '2-digit',
              minute: '2-digit',
            });
            const categoryMeta = EVENT_CATEGORIES.find((c) => c.key === ev.eventType) || EVENT_CATEGORIES[0];
            const CategoryIcon = categoryMeta.icon;

            return (
              <div
                key={ev.id}
                onClick={() => navigate(`/app/events/${ev.id}`)}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
              >
                <div>
                  {ev.coverUrl ? (
                    <div className="h-44 w-full overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
                      <img
                        src={ev.coverUrl}
                        alt={ev.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-md bg-white/90 dark:bg-[#151C28]/90 ${status.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                          <span>{status.label}</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative flex h-36 w-full items-center justify-center bg-gradient-to-br from-primary/10 via-indigo-500/10 to-teal-500/10 dark:from-primary/20 dark:to-indigo-900/30">
                      <CategoryIcon className="w-10 h-10 text-primary/70 transition-transform duration-300 group-hover:scale-110" />
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${status.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                          <span>{status.label}</span>
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${categoryMeta.badgeClass}`}
                      >
                        <CategoryIcon className="w-2.5 h-2.5" />
                        <span>{categoryMeta.label}</span>
                      </span>
                      <span className="text-[11px] font-medium text-gray-400">
                        {AUDIENCE_MAP[ev.targetAudience]}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-ink-darker dark:text-white group-hover:text-primary transition-colors line-clamp-1">
                      {ev.title}
                    </h3>
                    <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed font-medium">
                      {ev.description}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5 text-xs font-bold text-gray-600 dark:text-gray-300">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-ink-darker dark:text-gray-200">
                        <CalendarDays className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{jalaliStartFormatted}</span>
                      </span>
                      <span className="flex items-center gap-1 text-gray-400">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{sTime}</span>
                      </span>
                    </div>
                    {ev.location && (
                      <div className="flex items-center gap-1 text-gray-400 truncate">
                        <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                    )}
                    {ev.eventType === 'STARTUP_WEEKEND' && (
                      <div className="pt-2 flex items-center justify-between text-xs font-black text-amber-600 dark:text-amber-400 border-t border-amber-100 dark:border-amber-950/60 mt-1">
                        <span className="flex items-center gap-1.5">
                          <Rocket className="w-3.5 h-3.5" />
                          <span>ورود به مراحل استارت‌آپ ویکند</span>
                        </span>
                        <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Create / Edit Modal (Modern Refined Styling) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'ویرایش رویداد سالانه' : 'تعریف رویداد جدید'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              عنوان رویداد <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="مثال: نمایشگاه پروژه‌های دانش‌آموزی و هوش مصنوعی"
              className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#1C2536] text-ink-darker dark:text-white text-xs sm:text-sm font-bold focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
            />
          </div>

          {/* Category & Target Audience */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                دسته‌بندی موضوعی
              </label>
              <select
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value as any })}
                className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#1C2536] text-xs sm:text-sm font-bold text-ink-darker dark:text-white focus:border-primary focus:outline-none"
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

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                مخاطبین هدف
              </label>
              <select
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value as any })}
                className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#1C2536] text-xs sm:text-sm font-bold text-ink-darker dark:text-white focus:border-primary focus:outline-none"
              >
                <option value="ALL">عمومی (کلیه مخاطبین)</option>
                <option value="STUDENTS">صرفاً دانش‌آموزان</option>
                <option value="TEACHERS">صرفاً مربیان و اساتید</option>
                <option value="PARENTS">صرفاً اولیاء گرامی</option>
                <option value="STAFF">صرفاً کادر اجرایی</option>
              </select>
            </div>
          </div>

          {/* Dates & Times */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                تاریخ شروع (شمسی) <span className="text-red-500">*</span>
              </label>
              <PersianDatePicker
                value={form.startDate}
                onChange={(d) => setForm({ ...form, startDate: d })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                ساعت شروع
              </label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#1C2536] text-xs sm:text-sm font-bold text-ink-darker dark:text-white focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                تاریخ پایان (شمسی)
              </label>
              <PersianDatePicker
                value={form.endDate}
                onChange={(d) => setForm({ ...form, endDate: d })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                ساعت پایان
              </label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#1C2536] text-xs sm:text-sm font-bold text-ink-darker dark:text-white focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              مکان یا بستر برگزاری
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="مثال: سالن آمفی‌تئاتر خوارزمی یا بستر وبینار آنلاین"
              className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#1C2536] text-ink-darker dark:text-white text-xs sm:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none"
            />
          </div>

          {/* Cover Image URL */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              آدرس تصویر بنر رویداد (URL)
            </label>
            <input
              type="url"
              value={form.coverUrl}
              onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
              placeholder="https://..."
              className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#1C2536] text-ink-darker dark:text-white text-xs sm:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              برچسب‌ها (با ویرگول جدا کنید)
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="المپیاد، برنامه‌نویسی، رباتیک"
              className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#1C2536] text-ink-darker dark:text-white text-xs sm:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              توضیحات و دستورالعمل رویداد
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="جزئیات برنامه، اهداف آموزشی و شرایط شرکت در رویداد..."
              className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#1C2536] text-ink-darker dark:text-white text-xs sm:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none leading-relaxed"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="rokad-btn-outline px-4 py-2 text-xs font-bold"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="rokad-btn-primary px-6 py-2 text-xs font-bold shadow-ecosystem"
            >
              {isSubmitting ? 'در حال ثبت...' : isEditing ? 'بروزرسانی رویداد' : 'افزودن به رودمپ'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
