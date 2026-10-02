import React, { useEffect, useState, useMemo } from 'react';
import { apiClient } from '../../../lib/api/client';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { toPersianDigits, formatJalaliDisplay } from '../../../utils/jalali';
import {
  ShieldAlert,
  Award,
  AlertTriangle,
  HeartHandshake,
  Scale,
  Plus,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Bell,
  Sparkles,
  X,
  Check,
  FileText,
  SlidersHorizontal,
  Building2,
  BookOpen,
  GraduationCap,
  Clock,
  Layers,
} from 'lucide-react';

interface DisciplinaryMatter {
  id: string;
  source?: 'DIRECT_MATTER' | 'CLASSROOM_SESSION';
  studentId: string;
  type: 'POSITIVE' | 'NEGATIVE' | 'WARNING' | 'SUSPENSION' | 'COUNSELING_REFERRAL';
  title: string;
  description: string;
  points: number;
  actionTaken?: string;
  notifiedParents: boolean;
  reportedAt: string;
  sessionDate?: string;
  oralGrade?: number | null;
  periodNumber?: number | null;
  classroom?: {
    id: string;
    name: string;
    roomNumber?: string;
  } | null;
  lesson?: {
    id: string;
    name: string;
    code?: string;
  } | null;
  student: {
    id: string;
    studentNumber?: string;
    user: {
      firstName: string;
      lastName: string;
      nationalCode?: string;
    };
  };
  reportedBy: {
    firstName: string;
    lastName: string;
    role?: string;
  };
}

const QUICK_PRESETS: Record<string, string[]> = {
  POSITIVE: [
    'مشارکت فعال در کلاس',
    'پیشرفت درسی',
    'نظم و اخلاق نمونه',
    'فعالیت گروهی',
  ],
  WARNING: [
    'تاخیر در ورود به کلاس',
    'عدم انجام تکلیف',
    'بی‌نظمی در کلاس',
  ],
  NEGATIVE: [
    'اخلال در کلاس',
    'بی‌انضباطی مکرر',
    'غیبت غیرموجه',
  ],
  SUSPENSION: [
    'محرومیت موقت از کلاس',
    'تخلف انضباطی',
  ],
  COUNSELING_REFERRAL: [
    'نیاز به مشاوره تحصیلی',
    'مشاوره رفتاری و انگیزشی',
  ],
};

export const MattersPage: React.FC = () => {
  const [matters, setMatters] = useState<DisciplinaryMatter[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [form, setForm] = useState({
    studentId: '',
    type: 'POSITIVE' as 'POSITIVE' | 'NEGATIVE' | 'WARNING' | 'SUSPENSION' | 'COUNSELING_REFERRAL',
    title: '',
    description: '',
    points: 2,
    actionTaken: '',
    notifiedParents: true,
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [mattersRes, studentsRes] = await Promise.all([
        apiClient.get<DisciplinaryMatter[]>('/matters'),
        apiClient.get<any[]>('/members/students').catch(() => ({ data: [] })),
      ]);
      const mattersData = mattersRes.data || [];
      const studentsData = studentsRes.data || [];
      setMatters(mattersData);
      setStudents(studentsData);
      if (studentsData.length > 0 && !form.studentId) {
        setForm((prev) => ({ ...prev, studentId: studentsData[0].id }));
      }
    } catch (err: any) {
      console.error('Failed to load matters:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentId) {
      setCreateError('لطفاً دانش‌آموز مورد نظر را انتخاب نمایید');
      return;
    }
    if (!form.title.trim()) {
      setCreateError('عنوان مورد انضباطی یا تشویقی الزامی است');
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);

    try {
      await apiClient.post('/matters', {
        studentId: form.studentId,
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim(),
        points: Number(form.points),
        actionTaken: form.actionTaken.trim() || undefined,
        notifiedParents: form.notifiedParents,
      });

      setIsCreateModalOpen(false);
      setForm({
        studentId: students[0]?.id || '',
        type: 'POSITIVE',
        title: '',
        description: '',
        points: 2,
        actionTaken: '',
        notifiedParents: true,
      });
      await fetchData();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'خطا در ثبت مورد انضباطی');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMatter = async (id: string) => {
    if (!window.confirm('آیا از حذف این رکورد انضباطی اطمینان دارید؟')) return;
    try {
      await apiClient.delete(`/matters/${id}`);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطا در حذف رکورد');
    }
  };

  const typeMetaMap: Record<
    string,
    {
      label: string;
      badgeStyle: string;
      iconBg: string;
      iconColor: string;
      icon: any;
    }
  > = {
    POSITIVE: {
      label: 'تشویق و تقدیر',
      badgeStyle: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      icon: Award,
    },
    NEGATIVE: {
      label: 'مورد انضباطی منفی',
      badgeStyle: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-500/30',
      iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      iconColor: 'text-rose-600 dark:text-rose-400',
      icon: ShieldAlert,
    },
    WARNING: {
      label: 'اخطار کتبی / تذکر',
      badgeStyle: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-500/30',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      iconColor: 'text-amber-600 dark:text-amber-400',
      icon: AlertTriangle,
    },
    SUSPENSION: {
      label: 'محرومیت موقت',
      badgeStyle: 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-500/30',
      iconBg: 'bg-red-500/10 text-red-600 dark:text-red-400',
      iconColor: 'text-red-600 dark:text-red-400',
      icon: AlertCircle,
    },
    COUNSELING_REFERRAL: {
      label: 'ارجاع به مشاوره',
      badgeStyle: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-500/30',
      iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      iconColor: 'text-purple-600 dark:text-purple-400',
      icon: HeartHandshake,
    },
  };

  const positiveTotal = useMemo(() => matters.filter((m) => m.type === 'POSITIVE').length, [matters]);
  const negativeTotal = useMemo(
    () => matters.filter((m) => m.type === 'NEGATIVE' || m.type === 'WARNING' || m.type === 'SUSPENSION').length,
    [matters],
  );
  const counselingTotal = useMemo(
    () => matters.filter((m) => m.type === 'COUNSELING_REFERRAL').length,
    [matters],
  );

  const filteredMatters = useMemo(() => {
    return matters.filter((m) => {
      const matchesType = activeFilter === 'ALL' || m.type === activeFilter;
      const studentName = `${m.student?.user?.firstName || ''} ${m.student?.user?.lastName || ''}`;
      const matchesSearch =
        !searchQuery ||
        studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesType && matchesSearch;
    });
  }, [matters, activeFilter, searchQuery]);

  return (
    <div className="space-y-4 pb-12 max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      {/* 1. Header Master Panel */}
      <div className="bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-[#242F42] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary dark:text-primary border border-primary/25 flex items-center justify-center font-black shadow-2xs shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <h1 className="text-lg sm:text-2xl font-black text-ink-darker dark:text-white truncate">
                امور انضباطی و تشویقی
              </h1>
              <Badge variant="college" className="text-[11px] sm:text-xs font-bold shrink-0">
                {toPersianDigits(matters.length)} مورد ثبت‌شده
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full sm:w-auto h-10 px-4 text-xs font-black gap-1.5 rounded-xl shadow-[2px_2px_0_#1F413D] dark:shadow-[2px_2px_0_#0F172A]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>ثبت مورد جدید</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Hero KPI Cards (4 Stats in a row) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Matters */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs flex items-center gap-3.5 hover:-translate-y-0.5 hover:border-primary/40 transition-all">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-xs font-bold text-muted-foreground block truncate">کل موارد ثبت‌شده</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black text-ink-darker dark:text-white">
                {toPersianDigits(matters.length)}
              </span>
              <span className="text-[11px] text-muted-foreground">پرونده</span>
            </div>
          </div>
        </div>

        {/* Commendations */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs flex items-center gap-3.5 hover:-translate-y-0.5 hover:border-emerald-500/40 transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-xs font-bold text-muted-foreground block truncate">تشویق و تقدیر</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
                {toPersianDigits(positiveTotal)}
              </span>
              <span className="text-[11px] text-emerald-600/80 font-bold">امتیاز مثبت</span>
            </div>
          </div>
        </div>

        {/* Disciplinary / Warnings */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs flex items-center gap-3.5 hover:-translate-y-0.5 hover:border-rose-500/40 transition-all">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-xs font-bold text-muted-foreground block truncate">تذکرات و انضباطی</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400">
                {toPersianDigits(negativeTotal)}
              </span>
              <span className="text-[11px] text-rose-600/80 font-bold">کسر نمره</span>
            </div>
          </div>
        </div>

        {/* Counseling Referral */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs flex items-center gap-3.5 hover:-translate-y-0.5 hover:border-purple-500/40 transition-all">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-xs font-bold text-muted-foreground block truncate">ارجاع به مشاوره</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black text-purple-600 dark:text-purple-400">
                {toPersianDigits(counselingTotal)}
              </span>
              <span className="text-[11px] text-purple-600/80 font-bold">هدایت فردی</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search and Category Filter Toolbar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
              activeFilter === 'ALL'
                ? 'bg-primary text-white shadow-[2px_2px_0_#1F413D] dark:shadow-[2px_2px_0_#0F172A]'
                : 'bg-gray-100/80 dark:bg-[#1C2536] text-muted-foreground hover:text-ink-darker dark:hover:text-white border border-transparent hover:border-gray-200 dark:hover:border-gray-700'
            }`}
          >
            همه موارد ({toPersianDigits(matters.length)})
          </button>
          <button
            onClick={() => setActiveFilter('POSITIVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
              activeFilter === 'POSITIVE'
                ? 'bg-emerald-600 text-white shadow-[2px_2px_0_#065F46]'
                : 'bg-gray-100/80 dark:bg-[#1C2536] text-muted-foreground hover:text-ink-darker dark:hover:text-white border border-transparent hover:border-gray-200 dark:hover:border-gray-700'
            }`}
          >
            تشویقی‌ها ({toPersianDigits(positiveTotal)})
          </button>
          <button
            onClick={() => setActiveFilter('NEGATIVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
              activeFilter === 'NEGATIVE'
                ? 'bg-rose-600 text-white shadow-[2px_2px_0_#881337]'
                : 'bg-gray-100/80 dark:bg-[#1C2536] text-muted-foreground hover:text-ink-darker dark:hover:text-white border border-transparent hover:border-gray-200 dark:hover:border-gray-700'
            }`}
          >
            مورد منفی
          </button>
          <button
            onClick={() => setActiveFilter('WARNING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
              activeFilter === 'WARNING'
                ? 'bg-amber-500 text-white shadow-[2px_2px_0_#78350F]'
                : 'bg-gray-100/80 dark:bg-[#1C2536] text-muted-foreground hover:text-ink-darker dark:hover:text-white border border-transparent hover:border-gray-200 dark:hover:border-gray-700'
            }`}
          >
            اخطار کتبی
          </button>
          <button
            onClick={() => setActiveFilter('COUNSELING_REFERRAL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
              activeFilter === 'COUNSELING_REFERRAL'
                ? 'bg-purple-600 text-white shadow-[2px_2px_0_#4C1D95]'
                : 'bg-gray-100/80 dark:bg-[#1C2536] text-muted-foreground hover:text-ink-darker dark:hover:text-white border border-transparent hover:border-gray-200 dark:hover:border-gray-700'
            }`}
          >
            ارجاع مشاوره ({toPersianDigits(counselingTotal)})
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-3 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی دانش‌آموز یا موضوع..."
            className="pr-9 pl-8 h-10 text-xs rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-2.5 text-muted-foreground hover:text-ink-darker dark:hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Matters List Cards */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : filteredMatters.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#151C28] rounded-2xl border-2 border-dashed border-gray-200/80 dark:border-[#242F42] shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-2xs">
            <ShieldAlert className="w-7 h-7 opacity-80" />
          </div>
          <h3 className="text-base font-black text-ink-darker dark:text-white">موردی برای نمایش یافت نشد</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            با فیلتر یا عبارت جستجوی فعلی هیچ رکورد انضباطی یا تشویقی در سامانه ثبت نگردیده است.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMatters.map((matter) => {
            const meta = typeMetaMap[matter.type] || typeMetaMap.POSITIVE;
            const Icon = meta.icon;
            const isPos = matter.points > 0;

            return (
              <div
                key={matter.id}
                className="p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-[#28354A] bg-white dark:bg-[#1C2536] space-y-3.5 transition-all hover:border-primary/40 hover:-translate-y-0.5 shadow-2xs"
              >
                {/* Top Row: Student info, Type Badge, Points Chip, Notify Parents Pill */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-primary-hover text-white flex items-center justify-center font-black text-sm shrink-0 shadow-2xs border border-white/20">
                      {matter.student?.user?.firstName?.[0] || 'د'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm sm:text-base text-ink-darker dark:text-white">
                          {matter.student?.user?.firstName} {matter.student?.user?.lastName}
                        </span>
                        {matter.student?.studentNumber && (
                          <span className="text-[11px] font-mono font-bold text-muted-foreground bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md border border-gray-200/60 dark:border-gray-700/60">
                            کد: {toPersianDigits(matter.student.studentNumber)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Type Badge */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${meta.badgeStyle}`}>
                      <Icon className="w-3.5 h-3.5" />
                      <span>{meta.label}</span>
                    </span>

                    {/* Oral Grade Badge */}
                    {matter.oralGrade !== null && matter.oralGrade !== undefined && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>نمره پرسش: {toPersianDigits(matter.oralGrade)} از ۲۰</span>
                      </span>
                    )}

                    {/* Points Chip */}
                    {matter.points !== 0 && (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${
                          isPos
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {isPos ? `+${toPersianDigits(matter.points)} امتیاز` : `${toPersianDigits(matter.points)} امتیاز`}
                      </span>
                    )}

                    {/* Classroom Session Tag */}
                    {matter.source === 'CLASSROOM_SESSION' && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-md">
                        دفتر کلاسی
                      </span>
                    )}

                    {/* Notified Parents */}
                    {matter.notifiedParents && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-primary dark:text-primary-light font-bold bg-primary/10 dark:bg-primary/20 border border-primary/25 px-2.5 py-1 rounded-full">
                        <Bell className="w-3 h-3 text-primary" />
                        <span>ارسال به اولیا</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Title and Description */}
                <div className="space-y-1.5">
                  <h4 className="font-black text-sm sm:text-base text-ink-darker dark:text-white leading-snug">
                    {matter.title}
                  </h4>
                  <p className="text-xs sm:text-[13px] text-ink-normal/80 dark:text-gray-300 leading-relaxed">
                    {matter.description}
                  </p>
                </div>

                {/* Classroom Session Details Strip (Classroom, Lesson, Period, Session Date) */}
                {(matter.classroom || matter.lesson || matter.periodNumber || matter.sessionDate) && (
                  <div className="p-3 rounded-xl bg-gray-50/90 dark:bg-[#151C28]/90 border border-gray-200/70 dark:border-[#242F42] flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                    {matter.classroom && (
                      <div className="flex items-center gap-1.5 text-ink-darker dark:text-white font-bold">
                        <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>کلاس: {matter.classroom.name}</span>
                      </div>
                    )}
                    {matter.lesson && (
                      <div className="flex items-center gap-1.5 text-ink-darker dark:text-white font-bold">
                        <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>درس: {matter.lesson.name}</span>
                      </div>
                    )}
                    {matter.periodNumber && (
                      <div className="flex items-center gap-1.5 text-muted-foreground font-bold">
                        <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>زنگ {toPersianDigits(matter.periodNumber)}</span>
                      </div>
                    )}
                    {matter.sessionDate && (
                      <div className="flex items-center gap-1.5 text-muted-foreground font-bold">
                        <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>تاریخ جلسه: {formatJalaliDisplay(matter.sessionDate, false)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Taken Callout */}
                {matter.actionTaken && (
                  <div className="p-3 rounded-xl bg-primary-light/40 dark:bg-[#151C28] border-r-4 border-r-primary text-xs flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <strong className="font-black text-ink-darker dark:text-white">اقدام صورت‌گرفته: </strong>
                      <span className="text-ink-normal dark:text-gray-300">{matter.actionTaken}</span>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 dark:border-gray-800 text-xs text-muted-foreground flex-wrap gap-2">
                  <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <User className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>ثبت توسط: <strong className="font-bold text-ink-darker dark:text-white">{matter.reportedBy?.firstName} {matter.reportedBy?.lastName}</strong></span>
                    </span>
                    <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">•</span>
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{formatJalaliDisplay(matter.reportedAt, true)}</span>
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteMatter(matter.id)}
                    className="h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Create Matter Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="ثبت مورد جدید"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-3.5 pt-1">
          {createError && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          {/* Student Selector */}
          <div>
            <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1">
              دانش‌آموز <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              required
              className="h-10 rounded-xl text-xs sm:text-sm font-bold"
            >
              <option value="">انتخاب دانش‌آموز...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.user?.firstName} {s.user?.lastName} (کد: {s.studentNumber || s.user?.nationalCode || '-'})
                </option>
              ))}
            </Select>
          </div>

          {/* Matter Type Selector */}
          <div>
            <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1.5">
              نوع <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {(
                [
                  { type: 'POSITIVE', label: 'تشویق', icon: Award, defaultPoints: 2 },
                  { type: 'WARNING', label: 'تذکر', icon: AlertTriangle, defaultPoints: -1 },
                  { type: 'NEGATIVE', label: 'مورد منفی', icon: ShieldAlert, defaultPoints: -2 },
                  { type: 'SUSPENSION', label: 'محرومیت', icon: AlertCircle, defaultPoints: -3 },
                  { type: 'COUNSELING_REFERRAL', label: 'مشاوره', icon: HeartHandshake, defaultPoints: 0 },
                ] as const
              ).map((item) => {
                const isSelected = form.type === item.type;
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        type: item.type,
                        points: item.defaultPoints,
                      })
                    }
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary text-white shadow-2xs font-bold'
                        : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#1C2536]/50 hover:bg-gray-100 dark:hover:bg-[#1C2536] text-muted-foreground'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Title Input */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1">
                عنوان <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="عنوان تشویق یا تذکر..."
                required
                className="h-10 rounded-xl text-xs font-bold"
              />
            </div>

            {/* Points Stepper */}
            <div>
              <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1">
                امتیاز
              </label>
              <Input
                type="number"
                step="0.5"
                value={form.points}
                onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
                placeholder="+2 یا -1"
                className="h-10 rounded-xl font-mono text-center font-bold text-xs"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-1">
            {(QUICK_PRESETS[form.type] || []).map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setForm({ ...form, title: preset })}
                className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-primary/10 hover:text-primary text-[11px] font-medium text-muted-foreground transition-colors cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Full Description */}
          <div>
            <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1">
              توضیحات <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="شرح رویداد..."
              rows={2}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden text-ink-darker dark:text-white placeholder:text-muted-foreground leading-relaxed"
              required
            />
          </div>

          {/* Action Taken */}
          <div>
            <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1">
              اقدام صورت‌گرفته
            </label>
            <Input
              value={form.actionTaken}
              onChange={(e) => setForm({ ...form, actionTaken: e.target.value })}
              placeholder="مثال: تذکر شفاهی / لوح تقدیر"
              className="h-10 rounded-xl text-xs"
            />
          </div>

          {/* Notify Parents Switch */}
          <label className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50/80 dark:bg-[#1C2536]/80 border border-gray-200/70 dark:border-gray-800 cursor-pointer">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-ink-darker dark:text-white">
                اطلاع‌رسانی به اولیا
              </span>
            </div>
            <input
              type="checkbox"
              id="notifiedParents"
              checked={form.notifiedParents}
              onChange={(e) => setForm((prev) => ({ ...prev, notifiedParents: e.target.checked }))}
              className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer accent-primary"
            />
          </label>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              className="h-9 px-3 text-xs font-bold rounded-xl"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="h-9 px-4 text-xs font-black rounded-xl"
            >
              {isSubmitting ? 'در حال ثبت...' : 'ثبت مورد'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
