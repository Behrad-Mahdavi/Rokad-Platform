import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ResponsivePageHeader } from '../../../components/ui/ResponsivePageHeader';
import {
  ShieldAlert,
  Award,
  AlertTriangle,
  HeartHandshake,
  Plus,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Bell,
  ChevronLeft,
} from 'lucide-react';

interface DisciplinaryMatter {
  id: string;
  studentId: string;
  type: 'POSITIVE' | 'NEGATIVE' | 'WARNING' | 'SUSPENSION' | 'COUNSELING_REFERRAL';
  title: string;
  description: string;
  points: number;
  actionTaken?: string;
  notifiedParents: boolean;
  reportedAt: string;
  student: {
    id: string;
    studentNumber?: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  reportedBy: {
    firstName: string;
    lastName: string;
  };
}

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
    notifiedParents: false,
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
        notifiedParents: false,
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
    { label: string; badgeVariant: 'success' | 'destructive' | 'warning' | 'college' | 'neutral'; icon: any }
  > = {
    POSITIVE: { label: 'تشویق و تقدیر', badgeVariant: 'success', icon: Award },
    NEGATIVE: { label: 'مورد انضباطی منفی', badgeVariant: 'destructive', icon: ShieldAlert },
    WARNING: { label: 'اخطار کتبی / تذکر', badgeVariant: 'warning', icon: AlertTriangle },
    SUSPENSION: { label: 'محرومیت موقت', badgeVariant: 'destructive', icon: AlertCircle },
    COUNSELING_REFERRAL: { label: 'ارجاع به مشاوره', badgeVariant: 'college', icon: HeartHandshake },
  };

  // Filtered matters
  const filteredMatters = matters.filter((m) => {
    const matchesType = activeFilter === 'ALL' || m.type === activeFilter;
    const studentName = `${m.student?.user?.firstName || ''} ${m.student?.user?.lastName || ''}`;
    const matchesSearch =
      studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const positiveTotal = matters.filter((m) => m.type === 'POSITIVE').length;
  const negativeTotal = matters.filter(
    (m) => m.type === 'NEGATIVE' || m.type === 'WARNING' || m.type === 'SUSPENSION'
  ).length;
  const counselingTotal = matters.filter((m) => m.type === 'COUNSELING_REFERRAL').length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      <ResponsivePageHeader
        title="سامانه امور انضباطی و تشویقی دانش‌آموزان"
        subtitle="ثبت تشویق‌ها، تذکرات کلاسی، موارد انضباطی و ارجاعات مشاوره‌ای"
        icon={<ShieldAlert className="h-5 w-5 text-amber-600" />}
        actions={
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 shadow-xs font-medium text-xs h-9 sm:h-10"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت مورد جدید</span>
          </Button>
        }
      />

      {/* KPI Stats (2-column on mobile, 4-column on desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <Card className="p-3 sm:p-4 border border-border/60 bg-surface/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-muted-foreground">کل موارد</span>
            <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
          </div>
          <div className="text-base sm:text-lg md:text-xl font-bold text-foreground mt-1 sm:mt-2">{matters.length}</div>
        </Card>

        <Card className="p-3 sm:p-4 border border-border/60 bg-surface/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-muted-foreground">تشویق‌ها</span>
            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
          </div>
          <div className="text-base sm:text-lg md:text-xl font-bold text-emerald-600 mt-1 sm:mt-2">{positiveTotal}</div>
        </Card>

        <Card className="p-3 sm:p-4 border border-border/60 bg-surface/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-muted-foreground">تذکرات</span>
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-destructive" />
          </div>
          <div className="text-base sm:text-lg md:text-xl font-bold text-destructive mt-1 sm:mt-2">{negativeTotal}</div>
        </Card>

        <Card className="p-3 sm:p-4 border border-border/60 bg-surface/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-muted-foreground">مشاوره‌ای</span>
            <HeartHandshake className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />
          </div>
          <div className="text-base sm:text-lg md:text-xl font-bold text-purple-600 mt-1 sm:mt-2">{counselingTotal}</div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-surface/30 p-4 rounded-xl border border-border/40">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeFilter === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-surface'
            }`}
          >
            همه موارد ({matters.length})
          </button>
          <button
            onClick={() => setActiveFilter('POSITIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeFilter === 'POSITIVE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-muted-foreground hover:bg-surface'
            }`}
          >
            تشویقی‌ها ({positiveTotal})
          </button>
          <button
            onClick={() => setActiveFilter('NEGATIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeFilter === 'NEGATIVE'
                ? 'bg-destructive text-destructive-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-surface'
            }`}
          >
            انضباطی منفی
          </button>
          <button
            onClick={() => setActiveFilter('WARNING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeFilter === 'WARNING'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-muted-foreground hover:bg-surface'
            }`}
          >
            اخطارها
          </button>
          <button
            onClick={() => setActiveFilter('COUNSELING_REFERRAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeFilter === 'COUNSELING_REFERRAL'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-muted-foreground hover:bg-surface'
            }`}
          >
            ارجاع مشاوره ({counselingTotal})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-2.5" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی نام دانش‌آموز یا عنوان..."
            className="pr-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Matters Table */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : filteredMatters.length === 0 ? (
        <div className="text-center py-16 bg-surface/20 rounded-2xl border border-dashed border-border/60">
          <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-semibold text-foreground">موردی برای نمایش یافت نشد</h3>
          <p className="text-sm text-muted-foreground mt-1">
            با فیلتر یا جستجوی فعلی هیچ رکوردی ثبت نشده است.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMatters.map((matter) => {
            const meta = typeMetaMap[matter.type] || typeMetaMap.POSITIVE;
            const Icon = meta.icon;
            const isPos = matter.points > 0;
            const isNeg = matter.points < 0;

            return (
              <div
                key={matter.id}
                className="p-4 rounded-xl border border-border/60 bg-surface/40 hover:border-primary/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      matter.type === 'POSITIVE'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : matter.type === 'COUNSELING_REFERRAL'
                        ? 'bg-purple-500/10 text-purple-600'
                        : 'bg-destructive/10 text-destructive'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-foreground text-sm">
                        {matter.student?.user?.firstName} {matter.student?.user?.lastName}
                      </span>
                      {matter.student?.studentNumber && (
                        <span className="text-xs text-muted-foreground">
                          ({matter.student.studentNumber})
                        </span>
                      )}
                      <Badge variant={meta.badgeVariant}>{meta.label}</Badge>

                      {matter.points !== 0 && (
                        <Badge variant={isPos ? 'success' : 'destructive'}>
                          {isPos ? `+${matter.points} نمره` : `${matter.points} نمره`}
                        </Badge>
                      )}

                      {matter.notifiedParents && (
                        <span className="flex items-center gap-1 text-[11px] text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-md">
                          <Bell className="w-3 h-3" />
                          ارسال به اولیا
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-semibold text-foreground/90 mt-0.5">
                      {matter.title}
                    </h4>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {matter.description}
                    </p>

                    {matter.actionTaken && (
                      <p className="text-xs text-foreground/80 bg-surface/80 px-2.5 py-1 rounded-md border border-border/30 inline-block">
                        اقدام انجام‌شده: {matter.actionTaken}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between md:flex-col md:items-end gap-2 border-t md:border-t-0 pt-2 md:pt-0 border-border/40 shrink-0">
                  <div className="text-xs text-muted-foreground text-left md:text-right">
                    <div>ثبت توسط: {matter.reportedBy?.firstName} {matter.reportedBy?.lastName}</div>
                    <div>{new Date(matter.reportedAt).toLocaleDateString('fa-IR')}</div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteMatter(matter.id)}
                    className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="mr-1">حذف</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Matter Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="ثبت مورد انضباطی یا تشویقی جدید"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
          {createError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              انتخاب دانش‌آموز / دانش‌آموز *
            </label>
            <select
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-surface/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
              required
            >
              <option value="">انتخاب از لیست دانش‌آموزان...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.user?.firstName} {s.user?.lastName} (کد ملی: {s.user?.nationalCode || s.studentNumber || '-'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                نوع مورد *
              </label>
              <select
                value={form.type}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setForm({
                    ...form,
                    type: val,
                    points: val === 'POSITIVE' ? 2 : val === 'WARNING' ? -1 : -2,
                  });
                }}
                className="w-full px-3 py-2 text-sm bg-surface/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
              >
                <option value="POSITIVE">تشویق و تقدیر (+)</option>
                <option value="WARNING">تذکر / اخطار کتبی (-)</option>
                <option value="NEGATIVE">مورد انضباطی منفی (-)</option>
                <option value="SUSPENSION">محرومیت موقت (-)</option>
                <option value="COUNSELING_REFERRAL">ارجاع به مشاور (خنثی)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                امتیاز رویداد (اختیاری)
              </label>
              <Input
                type="number"
                step="0.5"
                value={form.points}
                onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
                placeholder="مثال: +2 یا -1"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              عنوان مورد تشویقی یا انضباطی *
            </label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="مثال: پاسخگویی دقیق و مشارکت فعال در حل تمرین‌های کلاسی"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              شرح کامل مورد انضباطی یا تشویقی *
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="توضیحات دقیق در مورد رویداد، زمان وقوع و شواهد..."
              rows={3}
              className="w-full px-3 py-2 text-sm bg-surface/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              اقدام صورت‌گرفته (اختیاری)
            </label>
            <Input
              value={form.actionTaken}
              onChange={(e) => setForm({ ...form, actionTaken: e.target.value })}
              placeholder="مثال: اهدای لوح تقدیر در صف صبحگاه / ثبت در پرونده"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="notifiedParents"
              checked={form.notifiedParents}
              onChange={(e) => setForm({ ...form, notifiedParents: e.target.checked })}
              className="w-4 h-4 rounded-sm border-border text-primary focus:ring-primary/20"
            />
            <label htmlFor="notifiedParents" className="text-xs font-medium text-foreground cursor-pointer">
              ارسال پیامک و نوتیفیکیشن به اولیای دانش‌آموز
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              انصراف
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'در حال ثبت...' : 'ثبت و اعمال در پرونده'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
