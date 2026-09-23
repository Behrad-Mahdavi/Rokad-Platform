import React, { useEffect, useState, useMemo, useRef } from 'react';
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
  Upload,
  X,
} from 'lucide-react';
import { SchoolEventItem, EventCategoryItem, hydrateEvent } from './constants/sample-events';
import {
  EventCoverCropModal,
  EVENT_COVER_SPEC_LABEL,
  EVENT_COVER_MAX_BYTES,
  needsCoverCrop,
  uploadCoverBlob,
} from './components/EventCoverCropModal';
import {
  canViewEventAudience,
  isEventManagerRole,
  isServerRejection,
  extractApiErrorMessage,
} from './constants/event-access';
import {
  EVENT_MODULE_LIST,
  DEFAULT_WORKFLOW_MODULES,
  normalizeWorkflowModules,
  renumberWorkflowModules,
  EventModuleKey,
  WorkflowModuleEntry,
} from './constants/event-modules';
export type { SchoolEventItem, EventCategoryItem };

const FALLBACK_CATEGORIES = [
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
  const canManageEvents = isEventManagerRole(currentUser?.role);

  const [events, setEvents] = useState<SchoolEventItem[]>(() => {
    try {
      const cached = localStorage.getItem(EVENTS_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed.map(hydrateEvent);
      }
    } catch {}
    return [];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'roadmap' | 'grid'>('roadmap');

  // Custom Event Categories (backend CRUD via Tenant.settings)
  const [customCategories, setCustomCategories] = useState<EventCategoryItem[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({ key: '', label: '', icon: 'Tag', color: '' });

  const allCategoryTabs = useMemo(() => {
    // After a successful backend load, trust that list only (deleted categories must not reappear).
    // FALLBACK is offline/initial UI only.
    if (!categoriesLoaded) {
      return [
        { key: 'ALL', label: 'همه رویدادها', icon: Layers, color: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200', isCustom: false },
        ...FALLBACK_CATEGORIES.map((f) => ({
          key: f.key,
          label: f.label,
          icon: f.icon,
          color: f.color,
          isCustom: false,
        })),
      ];
    }

    const fromBackend = customCategories.map((c) => ({
      key: c.key,
      label: c.label,
      icon: Layers,
      color: c.color || 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
      isCustom: true,
    }));
    return [
      { key: 'ALL', label: 'همه رویدادها', icon: Layers, color: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200', isCustom: false },
      ...fromBackend,
    ];
  }, [customCategories, categoriesLoaded]);

  const categoryLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    allCategoryTabs.forEach((c) => {
      map[c.key] = c.label;
    });
    return map;
  }, [allCategoryTabs]);

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
    categoryKey: '',
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

  const [workflowModules, setWorkflowModules] = useState<WorkflowModuleEntry[]>([]);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropFileName, setCropFileName] = useState<string | undefined>(undefined);

  const uploadCoverBlobDirect = async (file: File) => {
    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('moduleName', 'calendar');
      let coverUrl = '';
      try {
        const uploadRes = await apiClient.post('/storage/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const uploadData = uploadRes.data?.data || uploadRes.data;
        coverUrl = uploadData?.fileUrl || uploadData?.url || '';
      } catch {
        coverUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }
      if (coverUrl) {
        setForm((f) => ({ ...f, coverUrl }));
        toast.success('عکس بنر رویداد آپلود شد');
      }
    } catch {
      toast.error('خطا در آپلود عکس بنر');
    } finally {
      setIsUploadingCover(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  };

  const handleCoverFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('فقط فایل تصویری انتخاب کنید');
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
      return;
    }
    if (file.size > EVENT_COVER_MAX_BYTES) {
      toast.error('حداکثر حجم عکس ۵ مگابایت است');
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
      return;
    }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('read fail'));
        reader.readAsDataURL(file);
      });
      const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => reject(new Error('img fail'));
        img.src = dataUrl;
      });
      if (needsCoverCrop(dims.w, dims.h)) {
        setCropImageSrc(dataUrl);
        setCropFileName(file.name);
        return;
      }
      await uploadCoverBlobDirect(file);
    } catch {
      toast.error('خطا در خواندن فایل تصویری');
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  };

  const handleCoverCropConfirm = async (blob: Blob) => {
    setIsUploadingCover(true);
    try {
      const coverUrl = await uploadCoverBlob(blob, cropFileName || 'event-cover.jpg');
      if (coverUrl) {
        setForm((f) => ({ ...f, coverUrl }));
        toast.success('عکس بنر بریده و آپلود شد');
      }
    } catch {
      toast.error('خطا در آپلود عکس بنر');
    } finally {
      setIsUploadingCover(false);
      setCropImageSrc(null);
      setCropFileName(undefined);
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await apiClient.get('/calendar/events');
      if (res && Array.isArray(res.data)) {
        const hydrated = res.data.map(hydrateEvent);
        setEvents(hydrated);
        localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(hydrated));
        return;
      }
    } catch (err) {
      // Fallback gracefully to local storage / sample events
    }
    try {
      const cached = localStorage.getItem(EVENTS_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) setEvents(parsed.map(hydrateEvent));
      }
    } catch {}
  };

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/calendar/event-categories');
      if (Array.isArray(res?.data)) {
        setCustomCategories(res.data);
        setCategoriesLoaded(true);
      }
    } catch {
      // Backend offline — keep FALLBACK chips until a successful load
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchCategories();
  }, []);

  // Filtered events (category + search + targetAudience)
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const eventCatKey = ev.categoryKey || ev.eventType;
      const matchCat = selectedCategory === 'ALL' || eventCatKey === selectedCategory || ev.eventType === selectedCategory;
      const matchSearch =
        !searchQuery ||
        ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.description && ev.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ev.location && ev.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ev.tags && ev.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
      const matchAudience = canViewEventAudience(ev.targetAudience, currentUser?.role);
      return matchCat && matchSearch && matchAudience;
    });
  }, [events, selectedCategory, searchQuery, currentUser?.role]);

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
      categoryKey: '',
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
    setWorkflowModules([]);
    setIsModalOpen(true);
  };

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
      categoryKey: ev.categoryKey || '',
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
    setWorkflowModules(
      Array.isArray(ev.workflowModules)
        ? normalizeWorkflowModules(ev.workflowModules)
        : ev.eventType === 'STARTUP_WEEKEND'
        ? [...DEFAULT_WORKFLOW_MODULES]
        : []
    );
    setFormError(null);
    setIsModalOpen(true);
  };

  // Category CRUD handlers (backend)
  const openCategoryCreate = () => {
    setEditingCategoryKey(null);
    setCategoryForm({ key: '', label: '', icon: 'Tag', color: '' });
    setCategoryError(null);
    setIsCategoryModalOpen(true);
    void fetchCategories();
  };

  const openCategoryEdit = (cat: EventCategoryItem) => {
    setEditingCategoryKey(cat.key);
    setCategoryForm({
      key: cat.key,
      label: cat.label,
      icon: cat.icon || 'Tag',
      color: cat.color || '',
    });
    setCategoryError(null);
    setIsCategoryModalOpen(true);
    void fetchCategories();
  };

  const resetCategoryForm = () => {
    setEditingCategoryKey(null);
    setCategoryForm({ key: '', label: '', icon: 'Tag', color: '' });
    setCategoryError(null);
  };

  const allCategoriesForManage = useMemo(() => {
    // Prefer backend list when loaded. FALLBACK only as offline placeholder —
    // those keys still map to backend defaults and remain deletable via API.
    if (categoriesLoaded) {
      return customCategories.map((c) => ({
        key: c.key,
        label: c.label,
        icon: c.icon || 'Tag',
        color: c.color || '',
        removable: c.removable !== false,
        isBuiltIn: false,
      }));
    }
    return FALLBACK_CATEGORIES.map((c) => ({
      key: c.key,
      label: c.label,
      icon: 'Tag',
      color: '',
      removable: true,
      isBuiltIn: false,
    }));
  }, [customCategories, categoriesLoaded]);

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError(null);

    const key = categoryForm.key.trim().toUpperCase().replace(/\s+/g, '_');
    const label = categoryForm.label.trim();
    if (!key || !label) {
      setCategoryError('کلید و عنوان دسته‌بندی الزامی است');
      return;
    }

    setIsSubmittingCategory(true);
    try {
      if (editingCategoryKey) {
        await apiClient.patch(`/calendar/event-categories/${editingCategoryKey}`, {
          label,
          icon: categoryForm.icon || undefined,
          color: categoryForm.color || undefined,
        });
        setCustomCategories((prev) =>
          prev.map((c) =>
            c.key === editingCategoryKey
              ? { ...c, label, icon: categoryForm.icon, color: categoryForm.color }
              : c
          )
        );
        toast.success('دسته‌بندی با موفقیت ویرایش شد');
        resetCategoryForm();
      } else {
        await apiClient.post('/calendar/event-categories', {
          category: {
            key,
            label,
            icon: categoryForm.icon || undefined,
            color: categoryForm.color || undefined,
            removable: true,
          },
        });
        setCustomCategories((prev) => [
          ...prev,
          { key, label, icon: categoryForm.icon, color: categoryForm.color, removable: true },
        ]);
        toast.success('دسته‌بندی جدید ایجاد شد');
        resetCategoryForm();
      }
    } catch (err: any) {
      const msg =
        err?.message ||
        err?.response?.data?.message ||
        'خطا در ذخیره‌سازی دسته‌بندی';
      setCategoryError(msg);
      toast.error(msg);
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleCategoryDelete = async (cat: EventCategoryItem) => {
    if (cat.removable === false) {
      toast.error('این دسته‌بندی قابل حذف نیست.');
      return;
    }
    try {
      await apiClient.delete(`/calendar/event-categories/${encodeURIComponent(cat.key)}`);
      setCustomCategories((prev) => prev.filter((c) => c.key !== cat.key));
      if (selectedCategory === cat.key) setSelectedCategory('ALL');
      if (editingCategoryKey === cat.key) resetCategoryForm();
      toast.success('دسته‌بندی حذف شد');
      await fetchCategories();
    } catch (err: any) {
      const msg =
        err?.message ||
        err?.response?.data?.message ||
        err?.data?.message ||
        'خطا در حذف دسته‌بندی';
      toast.error(msg);
      await fetchCategories();
    }
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
      await apiClient.delete(`/calendar/events/${ev.id}`);
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
        categoryKey: form.categoryKey || undefined,
        startDate: sDateObj.toISOString(),
        endDate: eDateObj.toISOString(),
        isAllDay: form.isAllDay,
        targetAudience: form.targetAudience,
        location: form.location.trim() || undefined,
        coverUrl: form.coverUrl.trim() || undefined,
        tags: tagsArray,
        workflowModules: renumberWorkflowModules(
          workflowModules.filter((m) => m.enabled !== false)
        ).map((m) => ({ key: m.key, step: m.step, enabled: true })),
      };

      if (isEditing && editingId) {
        try {
          await apiClient.patch(`/calendar/events/${editingId}`, payload);
        } catch (err: any) {
          // Server rejected — surface the error instead of silently falling back
          if (isServerRejection(err)) throw err;
          // Network/offline — local fallback continues below
        }

        setEvents((prev) => {
          const updated = prev.map((item) =>
            item.id === editingId
              ? {
                  ...item,
                  ...payload,
                  categoryKey: form.categoryKey || undefined,
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
          categoryKey: payload.categoryKey,
          startDate: payload.startDate,
          endDate: payload.endDate,
          isAllDay: payload.isAllDay,
          targetAudience: payload.targetAudience,
          location: payload.location,
          coverUrl: payload.coverUrl,
          tags: tagsArray,
          workflowModules: payload.workflowModules,
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
        } catch (err: any) {
          // Server rejected — surface the error instead of silently falling back
          if (isServerRejection(err)) throw err;
          // Network/offline — local fallback continues below
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
      const msg = extractApiErrorMessage(err, 'خطا در ذخیره‌سازی رویداد');
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
      <div className="relative overflow-hidden rounded-2xl border-[1.5px] border-[#EAEAEA] bg-white p-6 shadow-[2.75px_2.75px_0_#202A5A] dark:border-[#242F42] dark:bg-[#151C28] dark:shadow-[2.75px_2.75px_0_#59BBAF] md:p-8">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-wide mb-2">
              <Compass className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin-slow" />
              <span>تقویم جامع عملیاتی و آموزشی</span>
            </div>
            <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight md:text-4xl">
              رودمپ رویدادهای سالانه
            </h1>
            <p className="mt-2 max-w-2xl text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
              نمای زمان‌بندی تمام رویدادها، هکاتون‌ها، کارگاه‌های مهارتی، آزمون‌ها و آیین‌های شاخص هنرستان در طول سال تحصیلی با جزئیات کامل و سینگل پیج اختصاصی.
            </p>

            {/* Quick Metrics */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black border-2 border-zinc-900 bg-zinc-100 text-zinc-900 dark:border-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 shadow-[2px_2px_0px_0px_#202A5A] dark:shadow-[2px_2px_0px_0px_#59BBAF]">
                <Layers className="w-3.5 h-3.5" />
                کل رویدادها: {toPersianDigits(totalCount)}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black border-2 border-zinc-900 bg-cyan-100 text-cyan-900 dark:border-zinc-200 dark:bg-cyan-950 dark:text-cyan-300 shadow-[2px_2px_0px_0px_#202A5A] dark:shadow-[2px_2px_0px_0px_#59BBAF]">
                <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                پیش‌رو: {toPersianDigits(upcomingCount)}
              </span>
              {liveCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black border-2 border-zinc-900 bg-emerald-100 text-emerald-900 dark:border-zinc-200 dark:bg-emerald-950 dark:text-emerald-300 shadow-[2px_2px_0px_0px_#202A5A] dark:shadow-[2px_2px_0px_0px_#59BBAF] animate-pulse">
                  <Flame className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  در حال برگزاری: {toPersianDigits(liveCount)}
                </span>
              )}
            </div>
          </div>

          {/* Action Button for Admins */}
          <div className="flex flex-wrap items-center gap-3">
            {canManageEvents && (
              <>
                <Button
                  onClick={openCategoryCreate}
                  variant="outline"
                  className="gap-2 px-4 py-3 font-bold"
                >
                  <Tag className="w-4 h-4" />
                  مدیریت دسته‌بندی‌ها
                </Button>
                <Button
                  onClick={handleOpenCreate}
                  variant="primary"
                  className="gap-2 px-5 py-3 text-base font-black"
                >
                  <Plus className="w-5 h-5" />
                  تعریف رویداد جدید
                </Button>
              </>
            )}
            <Link to="/app/calendar">
              <Button
                variant="outline"
                className="gap-2 px-4 py-3 font-bold"
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
            className="w-full pr-10 pl-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-sm font-medium placeholder:text-zinc-400 focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
          />
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] p-1">
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
        {allCategoryTabs.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.key;
          const rawCustomCat = customCategories.find((c) => c.key === cat.key);
          return (
            <div key={cat.key} className="relative shrink-0 group/tab">
              <button
                onClick={() => setSelectedCategory(cat.key)}
                className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-black border-2 transition-all duration-150 cursor-pointer touch-manipulation active:scale-95 active:shadow-none select-none ${
                  isSelected
                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-[3px_3px_0px_0px_#000] dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:shadow-[3px_3px_0px_0px_#fff]'
                    : 'border-zinc-900/40 bg-white text-zinc-700 hover:border-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-200 shadow-[2px_2px_0px_0px_#202A5A] dark:shadow-[2px_2px_0px_0px_#59BBAF]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 transition-transform duration-150 group-hover/tab:scale-125 group-hover/tab:rotate-6 group-active/tab:scale-90" />
                {cat.label}
              </button>
              {canManageEvents && rawCustomCat && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openCategoryEdit(rawCustomCat);
                  }}
                  title="ویرایش دسته‌بندی"
                  className="absolute -top-1.5 -left-1.5 z-10 rounded-lg border border-zinc-900 bg-white p-1 text-zinc-700 shadow-sm opacity-100 transition-all duration-150 hover:bg-indigo-50 hover:text-indigo-700 md:opacity-0 md:group-hover/tab:opacity-100 md:focus-visible:opacity-100 dark:border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-indigo-950 dark:hover:text-indigo-300"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
        {canManageEvents && (
          <button
            onClick={openCategoryCreate}
            title="افزودن دسته‌بندی جدید"
            className="flex items-center gap-1 whitespace-nowrap px-3 py-2.5 rounded-xl text-xs font-black border-2 border-dashed border-zinc-400 text-zinc-500 hover:border-zinc-900 hover:text-zinc-900 transition-all touch-manipulation active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            دسته جدید
          </button>
        )}
      </div>

      {/* Content Display */}
      {isLoading ? (
        <div className="py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-zinc-900 border-t-transparent dark:border-zinc-100" />
          <p className="mt-3 text-sm font-bold text-zinc-600 dark:text-zinc-400">در حال دریافت رودمپ رویدادها...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-300 p-8 sm:p-12 text-center dark:border-zinc-700">
          <CalendarDays className="mx-auto w-12 h-12 text-zinc-400 mb-3" />
          <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">رویدادی یافت نشد</h3>
          <p className="mt-1 text-sm text-zinc-500 max-w-sm mx-auto">
            هیچ رویدادی مطابق با فیلترها و عبارت جستجوی انتخاب‌شده ثبت نشده است.
          </p>
          {canManageEvents && (
            <Button onClick={handleOpenCreate} variant="primary" className="mt-4 gap-2">
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
                <div className="flex items-center gap-2 rounded-xl border-2 border-zinc-900 bg-primary px-4 py-2 text-white font-black text-base shadow-[3px_3px_0px_0px_#202A5A] dark:border-zinc-200 dark:shadow-[3px_3px_0px_0px_#59BBAF]">
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
              <div className="relative mr-3 sm:mr-4 space-y-6 border-r-3 border-zinc-300 pr-4 sm:pr-6 dark:border-zinc-700">
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
                      <div className="absolute -right-[25px] sm:-right-[33px] top-6 h-5 w-5 rounded-full border-[1.5px] border-[#EAEAEA] bg-white shadow-[2.75px_2.75px_0_#202A5A] transition-transform group-hover:scale-125 dark:border-[#242F42] dark:bg-[#151C28] dark:shadow-[2.75px_2.75px_0_#59BBAF]" />

                      {/* Event Card */}
                      <div className="overflow-hidden rounded-2xl border-[1.5px] border-[#EAEAEA] bg-white shadow-[2.75px_2.75px_0_#202A5A] transition-all hover:-translate-y-1 hover:shadow-[3.5px_3.5px_0_#202A5A] dark:border-[#242F42] dark:bg-[#151C28] dark:shadow-[2.75px_2.75px_0_#59BBAF] dark:hover:shadow-[3.5px_3.5px_0_#59BBAF]">
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
                                    {categoryLabelMap[ev.categoryKey || ev.eventType] || categoryLabelMap[ev.eventType] || ev.eventType}
                                  </span>
                                  <span className="text-xs font-bold text-zinc-500">
                                    {AUDIENCE_MAP[ev.targetAudience] || ev.targetAudience}
                                  </span>
                                </div>

                                {/* Admin Action Buttons */}
                                {canManageEvents && (
                                  <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                                    <button
                                      title="ویرایش رویداد"
                                      onClick={(e) => handleOpenEdit(ev, e)}
                                      className="rounded-lg p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                      title="حذف رویداد"
                                      onClick={(e) => handleDeleteEvent(ev, e)}
                                      className="rounded-lg p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/50"
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
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-900 bg-amber-300 text-zinc-950 text-[11px] font-black shadow-[1px_1px_0px_0px_#202A5A]">
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
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border-[1.5px] border-[#EAEAEA] bg-white shadow-[2.75px_2.75px_0_#202A5A] transition-all hover:-translate-y-1 hover:shadow-[3.5px_3.5px_0_#202A5A] dark:border-[#242F42] dark:bg-[#151C28] dark:shadow-[2.75px_2.75px_0_#59BBAF] cursor-pointer"
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
                        {categoryLabelMap[ev.categoryKey || ev.eventType] || categoryLabelMap[ev.eventType] || ev.eventType}
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
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-zinc-900 bg-amber-300 text-zinc-950 text-[10px] font-black shadow-[1px_1px_0px_0px_#202A5A]">
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
              className="w-full rounded-xl px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
            />
          </div>

          {/* Category & Target Audience */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
                دسته‌بندی رویداد
              </label>
              <div className="flex items-stretch gap-2">
                <select
                  value={form.categoryKey || form.eventType}
                  onChange={(e) => {
                    const v = e.target.value;
                    const isCustom = customCategories.some((c) => c.key === v);
                    if (isCustom) {
                      setForm({ ...form, categoryKey: v, eventType: 'ACADEMIC' as any });
                    } else {
                      setForm({ ...form, categoryKey: '', eventType: v as any });
                    }
                  }}
                  className="flex-1 min-w-0 rounded-xl px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
                >
                  {categoriesLoaded ? (
                    <optgroup label="دسته‌بندی‌های مدرسه">
                      {customCategories.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </optgroup>
                  ) : (
                    <optgroup label="دسته‌های پیش‌فرض">
                      <option value="STARTUP_WEEKEND">استارت‌آپ ویکند</option>
                      <option value="ACADEMIC">آموزشی و مهارت</option>
                      <option value="CULTURAL">فرهنگی و آیین‌ها</option>
                      <option value="SPORTS">مسابقات و ورزش</option>
                      <option value="EXAM">آزمون و ارزشیابی</option>
                      <option value="EXCURSION">اردو و بازدید علمی</option>
                      <option value="MEETING">جلسه و نشست</option>
                      <option value="HOLIDAY">تعطیلی و مناسبت</option>
                    </optgroup>
                  )}
                </select>
                {canManageEvents &&
                  (() => {
                    const selectedCustom = customCategories.find((c) => c.key === form.categoryKey);
                    if (!selectedCustom) return null;
                    return (
                      <button
                        type="button"
                        onClick={() => openCategoryEdit(selectedCustom)}
                        title="ویرایش این دسته‌بندی"
                        className="flex-shrink-0 flex items-center justify-center w-11 rounded-xl border-2 border-zinc-900 bg-zinc-50 text-zinc-700 shadow-[2px_2px_0px_0px_#202A5A] transition-all hover:bg-indigo-50 hover:text-indigo-700 active:scale-95 active:shadow-none touch-manipulation dark:border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-indigo-950 dark:hover:text-indigo-300"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    );
                  })()}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
                مخاطبین هدف
              </label>
              <select
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value as any })}
                className="w-full rounded-xl px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
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
                className="w-full rounded-xl px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
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
                className="w-full rounded-xl px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
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
              className="w-full rounded-xl px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
            />
          </div>

          {/* Cover Image Upload + URL */}
          <div>
            <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
              عکس یا بنر رویداد
            </label>
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-2 leading-relaxed">
              {EVENT_COVER_SPEC_LABEL}
            </p>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={coverFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverFileSelect}
                />
                <Button
                  type="button"
                  variant="sec"
                  size="sm"
                  disabled={isUploadingCover}
                  onClick={() => coverFileInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isUploadingCover ? 'در حال آپلود...' : 'آپلود عکس بنر'}
                </Button>
                {form.coverUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm({ ...form, coverUrl: '' })}
                  >
                    <X className="w-3.5 h-3.5" />
                    حذف عکس
                  </Button>
                )}
              </div>

              {form.coverUrl && (
                <div className="relative w-full max-w-md rounded-xl border-2 border-zinc-900 overflow-hidden shadow-[3px_3px_0px_0px_#202A5A] dark:border-zinc-200">
                  <img
                    src={form.coverUrl}
                    alt="پیش‌نمایش بنر رویداد"
                    className="w-full h-36 object-cover"
                  />
                </div>
              )}

              <input
                type="text"
                value={form.coverUrl}
                onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
                placeholder="یا آدرس تصویر را وارد کنید: https://..."
                className="w-full rounded-xl px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
              />
            </div>
            <EventCoverCropModal
              isOpen={!!cropImageSrc}
              onClose={() => {
                setCropImageSrc(null);
                setCropFileName(undefined);
                if (coverFileInputRef.current) coverFileInputRef.current.value = '';
              }}
              imageSrc={cropImageSrc || ''}
              fileName={cropFileName}
              onConfirm={handleCoverCropConfirm}
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
              className="w-full rounded-xl px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
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
              className="w-full rounded-xl px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
            />
          </div>

          {/* Workflow Modules Selection */}
          <div className="rounded-2xl border-2 border-zinc-900 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
              ماژول‌های گردش کار رویداد (اختیاری)
            </label>
            <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mb-3">
              ماژول‌های مورد نیاز را انتخاب و شماره مرحله هر کدام را مشخص کنید. در صورت عدم انتخاب، رویداد بدون چرخه گام‌به‌گام ساخته می‌شود.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {EVENT_MODULE_LIST.map((mod) => {
                const entry = workflowModules.find((m) => m.key === mod.key);
                const checked = !!entry && entry.enabled !== false;
                const Icon = mod.icon;
                return (
                  <div
                    key={mod.key}
                    className={`flex items-center gap-3 rounded-xl border-2 p-3 transition-all ${
                      checked
                        ? 'border-zinc-900 bg-white shadow-[2px_2px_0px_0px_#202A5A] dark:border-zinc-200 dark:bg-zinc-900 dark:shadow-[2px_2px_0px_0px_#59BBAF]'
                        : 'border-zinc-300 bg-white/60 dark:border-zinc-700 dark:bg-zinc-900/40'
                    }`}
                  >
                    <label className="flex items-center gap-2.5 flex-1 cursor-pointer min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setWorkflowModules((prev) => {
                            if (e.target.checked) {
                              const existing = prev.find((m) => m.key === mod.key);
                              if (existing) {
                                return renumberWorkflowModules(
                                  prev.map((m) =>
                                    m.key === mod.key ? { ...m, enabled: true } : m
                                  )
                                );
                              }
                              const maxStep = prev.length
                                ? Math.max(...prev.map((m) => m.step))
                                : 0;
                              return renumberWorkflowModules([
                                ...prev,
                                { key: mod.key, step: maxStep + 1, enabled: true },
                              ]);
                            }
                            // Remove module and renumber remaining steps (1..n, no gaps)
                            return renumberWorkflowModules(
                              prev.filter((m) => m.key !== mod.key)
                            );
                          });
                        }}
                        className="w-4 h-4 accent-indigo-600 flex-shrink-0"
                      />
                      <Icon className={`w-4 h-4 flex-shrink-0 ${checked ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`} />
                      <div className="min-w-0">
                        <div className="text-xs font-black text-zinc-900 dark:text-zinc-100 truncate">{mod.title}</div>
                        <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 truncate">{mod.subtitle}</div>
                      </div>
                    </label>
                    {checked && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400">مرحله:</span>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={entry?.step || 1}
                          onChange={(e) => {
                            const newStep = Math.max(1, parseInt(e.target.value, 10) || 1);
                            setWorkflowModules((prev) =>
                              renumberWorkflowModules(
                                prev.map((m) =>
                                  m.key === mod.key ? { ...m, step: newStep } : m
                                )
                              )
                            );
                          }}
                          className="w-14 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-xs font-medium text-center focus:border-primary focus:outline-none transition-all"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {workflowModules.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400">ترتیب مراحل:</span>
                {[...workflowModules]
                  .filter((m) => m.enabled !== false)
                  .sort((a, b) => a.step - b.step)
                  .map((m) => {
                    const def = EVENT_MODULE_LIST.find((d) => d.key === m.key);
                    return (
                      <span
                        key={m.key}
                        className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-black border border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-700"
                      >
                        {m.step}. {def?.title || m.key}
                      </span>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="font-bold"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="font-black px-6"
            >
              {isSubmitting ? 'در حال ثبت...' : isEditing ? 'بروزرسانی رویداد' : 'افزودن به رودمپ سالانه'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= CATEGORY MANAGEMENT MODAL ================= */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          resetCategoryForm();
          setIsCategoryModalOpen(false);
        }}
        title="مدیریت دسته‌بندی‌های رویداد"
        maxWidth="lg"
      >
        <div className="space-y-5">
          {categoryError && (
            <div className="flex items-center gap-2 rounded-xl border-2 border-red-500 bg-red-50 p-3 text-xs font-bold text-red-700 dark:bg-red-950/50 dark:text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{categoryError}</span>
            </div>
          )}

          {/* Full scrollable list of ALL categories (built-in + custom) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-zinc-700 dark:text-zinc-300">
                همه دسته‌بندی‌ها ({allCategoriesForManage.length})
              </span>
            </div>
            <div className="rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 divide-y divide-zinc-100 dark:divide-zinc-800 max-h-72 min-h-[8rem] overflow-y-auto overscroll-contain bg-zinc-50/50 dark:bg-zinc-900/30">
              {allCategoriesForManage.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs font-bold text-zinc-500">
                  دسته‌بندی‌ای وجود ندارد
                </div>
              ) : (
                allCategoriesForManage.map((cat) => {
                  const isEditingThis = editingCategoryKey === cat.key;
                  return (
                    <div
                      key={cat.key}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 transition-colors ${
                        isEditingThis
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-r-4 border-indigo-500'
                          : 'hover:bg-white dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-zinc-900 dark:text-zinc-100 truncate">
                            {cat.label}
                          </span>
                          {cat.isBuiltIn && (
                            <span className="shrink-0 rounded-md bg-zinc-200 px-1.5 py-0.5 text-[9px] font-black text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                              پیش‌فرض
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-bold text-zinc-500 font-mono truncate">
                          {cat.key}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => openCategoryEdit(cat)}
                          className={`rounded-lg p-2 min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors ${
                            isEditingThis
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'
                              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
                          }`}
                          title="ویرایش"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCategoryDelete(cat)}
                          className="rounded-lg p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/50"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Create / Edit form — always visible below the list */}
          <form onSubmit={handleCategorySubmit} className="space-y-4 border-t-2 border-dashed border-zinc-200 dark:border-zinc-700 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-zinc-700 dark:text-zinc-300">
                {editingCategoryKey ? `ویرایش «${categoryForm.label}»` : 'افزودن دسته‌بندی جدید'}
              </span>
              {editingCategoryKey && (
                <button
                  type="button"
                  onClick={resetCategoryForm}
                  className="text-[11px] font-black text-indigo-600 hover:underline"
                >
                  انصراف از ویرایش
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
                  کلید انگلیسی (برای فیلتر) *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingCategoryKey}
                  value={categoryForm.key}
                  onChange={(e) => setCategoryForm({ ...categoryForm, key: e.target.value })}
                  placeholder="MY_CUSTOM_EVENT"
                  className="w-full rounded-xl px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-sm font-mono font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
                  عنوان فارسی *
                </label>
                <input
                  type="text"
                  required
                  value={categoryForm.label}
                  onChange={(e) => setCategoryForm({ ...categoryForm, label: e.target.value })}
                  placeholder="عنوان دسته‌بندی"
                  className="w-full rounded-xl px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              {editingCategoryKey && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetCategoryForm}
                  className="font-bold"
                >
                  انصراف
                </Button>
              )}
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmittingCategory}
                className="font-black px-6"
              >
                {isSubmittingCategory
                  ? 'در حال ذخیره...'
                  : editingCategoryKey
                  ? 'ذخیره ویرایش'
                  : 'افزودن دسته‌بندی'}
              </Button>
            </div>
          </form>

          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetCategoryForm();
                setIsCategoryModalOpen(false);
              }}
              className="font-bold"
            >
              بستن
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
