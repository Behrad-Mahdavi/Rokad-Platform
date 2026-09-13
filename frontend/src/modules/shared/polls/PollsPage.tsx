import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  Vote,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Check,
  Star,
  BarChart3,
  Calendar,
  Lock,
  ChevronLeft,
  Trash2,
} from 'lucide-react';

interface PollOption {
  id: string;
  text: string;
  voteCount: number;
  orderIndex: number;
}

interface Poll {
  id: string;
  title: string;
  description?: string;
  pollType: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'RATING_SCALE';
  targetAudience: 'ALL' | 'STUDENTS' | 'PARENTS' | 'TEACHERS';
  startDate: string;
  endDate: string;
  isAnonymous: boolean;
  isClosed: boolean;
  createdAt: string;
  options: PollOption[];
  _count?: {
    votes: number;
  };
}

export const PollsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  // Voting state: pollId -> selected option ids or rating
  const [votingState, setVotingState] = useState<Record<string, {
    selectedOptionIds: string[];
    ratingValue?: number;
    textResponse?: string;
    submitting?: boolean;
    error?: string;
    success?: string;
  }>>({});

  // Poll details state (for knowing if user voted and fresh counts)
  const [pollDetails, setPollDetails] = useState<Record<string, {
    hasVoted: boolean;
    poll: Poll;
  }>>({});

  // Create Poll Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    pollType: 'SINGLE_CHOICE' as 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'RATING_SCALE',
    targetAudience: 'ALL' as 'ALL' | 'STUDENTS' | 'PARENTS' | 'TEACHERS',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    isAnonymous: false,
    options: ['بله، کاملاً موافقم', 'خیر، مخالفم'],
  });

  const canCreatePoll =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'SCHOOL_ADMIN' ||
    user?.role === 'STAFF' ||
    user?.role === 'TEACHER';

  const fetchPolls = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<Poll[]>('/polls');
      const data = res.data || [];
      setPolls(data);

      // Fetch details for each poll to check user voting status
      const detailsMap: Record<string, { hasVoted: boolean; poll: Poll }> = {};
      for (const p of data) {
        try {
          const detailRes = await apiClient.get<{ poll: Poll; hasVoted: boolean }>(`/polls/${p.id}`);
          if (detailRes.data) {
            detailsMap[p.id] = detailRes.data;
          }
        } catch {
          // ignore individual detail fail
        }
      }
      setPollDetails(detailsMap);
    } catch (err: any) {
      console.error('Failed to fetch polls:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, []);

  const handleSelectOption = (pollId: string, optionId: string, isMultiple: boolean) => {
    const current = votingState[pollId]?.selectedOptionIds || [];
    let updated: string[];

    if (isMultiple) {
      if (current.includes(optionId)) {
        updated = current.filter((id) => id !== optionId);
      } else {
        updated = [...current, optionId];
      }
    } else {
      updated = [optionId];
    }

    setVotingState((prev) => ({
      ...prev,
      [pollId]: {
        ...prev[pollId],
        selectedOptionIds: updated,
        error: undefined,
      },
    }));
  };

  const handleSelectRating = (pollId: string, rating: number) => {
    setVotingState((prev) => ({
      ...prev,
      [pollId]: {
        ...prev[pollId],
        ratingValue: rating,
        error: undefined,
      },
    }));
  };

  const handleCastVote = async (pollId: string, pollType: string) => {
    const state = votingState[pollId] || { selectedOptionIds: [] };

    if (pollType === 'RATING_SCALE') {
      if (!state.ratingValue) {
        setVotingState((prev) => ({
          ...prev,
          [pollId]: { ...prev[pollId], error: 'لطفاً امتیاز خود را انتخاب نمایید' },
        }));
        return;
      }
    } else {
      if (!state.selectedOptionIds || state.selectedOptionIds.length === 0) {
        setVotingState((prev) => ({
          ...prev,
          [pollId]: { ...prev[pollId], error: 'لطفاً حداقل یک گزینه را انتخاب کنید' },
        }));
        return;
      }
    }

    setVotingState((prev) => ({
      ...prev,
      [pollId]: { ...prev[pollId], submitting: true, error: undefined },
    }));

    try {
      await apiClient.post(`/polls/${pollId}/vote`, {
        selectedOptionIds: state.selectedOptionIds,
        ratingValue: state.ratingValue,
        textResponse: state.textResponse,
      });

      // Refresh poll detail
      const refreshed = await apiClient.get<{ poll: Poll; hasVoted: boolean }>(`/polls/${pollId}`);
      if (refreshed.data) {
        setPollDetails((prev) => ({
          ...prev,
          [pollId]: refreshed.data,
        }));
      }

      setVotingState((prev) => ({
        ...prev,
        [pollId]: {
          ...prev[pollId],
          submitting: false,
          success: 'رأی شما با موفقیت ثبت شد',
        },
      }));
    } catch (err: any) {
      setVotingState((prev) => ({
        ...prev,
        [pollId]: {
          ...prev[pollId],
          submitting: false,
          error: err.response?.data?.message || 'خطا در ثبت رأی',
        },
      }));
    }
  };

  const handleAddOptionField = () => {
    setForm((prev) => ({
      ...prev,
      options: [...prev.options, `گزینه ${prev.options.length + 1}`],
    }));
  };

  const handleRemoveOptionField = (idx: number) => {
    if (form.options.length <= 2) return;
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== idx),
    }));
  };

  const handleOptionTextChange = (idx: number, text: string) => {
    setForm((prev) => {
      const next = [...prev.options];
      next[idx] = text;
      return { ...prev, options: next };
    });
  };

  const handleCreatePollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setCreateError('عنوان نظرسنجی الزامی است');
      return;
    }

    if (form.pollType !== 'RATING_SCALE') {
      const validOptions = form.options.filter((o) => o.trim().length > 0);
      if (validOptions.length < 2) {
        setCreateError('حداقل دو گزینه باید وارد شود');
        return;
      }
    }

    setIsSubmitting(true);
    setCreateError(null);

    try {
      const payload: any = {
        title: form.title,
        description: form.description || undefined,
        pollType: form.pollType,
        targetAudience: form.targetAudience,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate + 'T23:59:59').toISOString(),
        isAnonymous: form.isAnonymous,
        options:
          form.pollType === 'RATING_SCALE'
            ? [
                { text: 'خیلی ضعیف' },
                { text: 'ضعیف' },
                { text: 'متوسط' },
                { text: 'خوب' },
                { text: 'عالی' },
              ]
            : form.options.filter((o) => o.trim().length > 0).map((t) => ({ text: t })),
      };

      await apiClient.post('/polls', payload);
      setIsCreateModalOpen(false);
      setForm({
        title: '',
        description: '',
        pollType: 'SINGLE_CHOICE',
        targetAudience: 'ALL',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        isAnonymous: false,
        options: ['بله، کاملاً موافقم', 'خیر، مخالفم'],
      });
      await fetchPolls();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'خطا در ایجاد نظرسنجی');
    } finally {
      setIsSubmitting(false);
    }
  };

  const now = new Date();
  const filteredPolls = polls.filter((p) => {
    const isClosed = p.isClosed || new Date(p.endDate) < now;
    if (activeFilter === 'ACTIVE') return !isClosed;
    return isClosed;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface/40 p-6 rounded-2xl border border-border/50 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
            <Vote className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              سامانه نظرسنجی و آراء هوشمند
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              مشارکت در تصمیم‌گیری‌ها، نظرسنجی‌های سازمانی و ارزیابی کیفیت دوره‌ها
            </p>
          </div>
        </div>

        {canCreatePoll && (
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 shadow-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>ایجاد نظرسنجی جدید</span>
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <button
          onClick={() => setActiveFilter('ACTIVE')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeFilter === 'ACTIVE'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-surface hover:text-foreground'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>نظرسنجی‌های در حال اجرا</span>
        </button>
        <button
          onClick={() => setActiveFilter('ARCHIVED')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeFilter === 'ARCHIVED'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-surface hover:text-foreground'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>آرشیو و نظرسنجی‌های گذشته</span>
        </button>
      </div>

      {/* Polls Listing */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : filteredPolls.length === 0 ? (
        <div className="text-center py-16 bg-surface/20 rounded-2xl border border-dashed border-border/60">
          <Vote className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-semibold text-foreground">نظرسنجی فعالی در این بخش یافت نشد</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {activeFilter === 'ACTIVE'
              ? 'در حال حاضر هیچ نظرسنجی فعالی برای شما تعریف نشده است.'
              : 'هیچ نظرسنجی پایان‌یافته‌ای در آرشیو ثبت نشده است.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPolls.map((poll) => {
            const detail = pollDetails[poll.id];
            const currentPoll = detail?.poll || poll;
            const hasVoted = detail?.hasVoted || false;
            const isClosed = currentPoll.isClosed || new Date(currentPoll.endDate) < now;
            const totalVotes =
              currentPoll._count?.votes ??
              currentPoll.options.reduce((sum, opt) => sum + (opt.voteCount || 0), 0);

            const state = votingState[poll.id] || { selectedOptionIds: [] };

            const audienceLabelMap = {
              ALL: 'عمومی (همه)',
              STUDENTS: 'دانش‌آموزان',
              PARENTS: 'اولیا',
              TEACHERS: 'معلمان',
            };

            const typeLabelMap = {
              SINGLE_CHOICE: 'تک انتخابی',
              MULTIPLE_CHOICE: 'چند انتخابی',
              RATING_SCALE: 'امتیازی ۵ ستاره',
            };

            return (
              <Card
                key={poll.id}
                className="overflow-hidden border border-border/70 hover:border-primary/40 transition-all duration-200 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <CardHeader className="pb-3 border-b border-border/40 bg-surface/30">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={isClosed ? 'neutral' : 'success'}>
                            {isClosed ? 'پایان‌یافته' : 'فعال'}
                          </Badge>
                          <Badge variant="college">{typeLabelMap[currentPoll.pollType]}</Badge>
                          <Badge variant="neutral">
                            {audienceLabelMap[currentPoll.targetAudience]}
                          </Badge>
                          {currentPoll.isAnonymous && (
                            <Badge variant="warning">رأی‌گیری ناشناس</Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg font-bold text-foreground mt-2 leading-relaxed">
                          {currentPoll.title}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-4">
                    {currentPoll.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {currentPoll.description}
                      </p>
                    )}

                    {/* Metadata dates */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground bg-surface/40 p-2.5 rounded-xl border border-border/40">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary/70" />
                        <span>مهلت: {new Date(currentPoll.endDate).toLocaleDateString('fa-IR')}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-primary/70" />
                        <span>{totalVotes} نفر شرکت کرده‌اند</span>
                      </div>
                    </div>

                    {/* Voting Area OR Results */}
                    {hasVoted || isClosed ? (
                      /* Show Results */
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium mb-1">
                          <span>نتایج آراء</span>
                          {hasVoted && (
                            <span className="text-emerald-500 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              شما رأی داده‌اید
                            </span>
                          )}
                        </div>

                        {currentPoll.options.map((option) => {
                          const percentage =
                            totalVotes > 0
                              ? Math.round(((option.voteCount || 0) / totalVotes) * 100)
                              : 0;

                          return (
                            <div key={option.id} className="space-y-1.5">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-medium text-foreground">{option.text}</span>
                                <span className="text-muted-foreground font-semibold">
                                  {percentage}٪ ({option.voteCount || 0} رأی)
                                </span>
                              </div>
                              <div className="h-2.5 w-full bg-surface-hover rounded-full overflow-hidden border border-border/30">
                                <div
                                  className="h-full bg-gradient-to-l from-primary to-primary/70 rounded-full transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Active Voting Form */
                      <div className="space-y-3 pt-2">
                        <p className="text-xs font-semibold text-muted-foreground">
                          {currentPoll.pollType === 'RATING_SCALE'
                            ? 'امتیاز خود را انتخاب کنید:'
                            : currentPoll.pollType === 'MULTIPLE_CHOICE'
                            ? 'یک یا چند گزینه را انتخاب کنید:'
                            : 'گزینه مورد نظر خود را انتخاب کنید:'}
                        </p>

                        {currentPoll.pollType === 'RATING_SCALE' ? (
                          <div className="flex items-center justify-center gap-3 py-3 bg-surface/30 rounded-xl border border-border/40">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => handleSelectRating(currentPoll.id, star)}
                                className={`p-2 rounded-xl transition-all ${
                                  (state.ratingValue || 0) >= star
                                    ? 'text-amber-400 bg-amber-400/10 scale-110'
                                    : 'text-muted-foreground/40 hover:text-amber-400/70'
                                }`}
                              >
                                <Star className="w-7 h-7 fill-current" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {currentPoll.options.map((option) => {
                              const isSelected = state.selectedOptionIds?.includes(option.id);
                              const isMulti = currentPoll.pollType === 'MULTIPLE_CHOICE';

                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() =>
                                    handleSelectOption(currentPoll.id, option.id, isMulti)
                                  }
                                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-right transition-all ${
                                    isSelected
                                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                                      : 'border-border/60 bg-surface/20 text-foreground hover:bg-surface/50'
                                  }`}
                                >
                                  <span className="text-sm">{option.text}</span>
                                  <div
                                    className={`w-5 h-5 rounded-${
                                      isMulti ? 'md' : 'full'
                                    } border flex items-center justify-center transition-all ${
                                      isSelected
                                    ? 'border-primary bg-primary text-white'
                                    : 'border-border/80 bg-surface'
                                    }`}
                                  >
                                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {state.error && (
                          <p className="text-xs text-destructive flex items-center gap-1 font-medium">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {state.error}
                          </p>
                        )}
                        {state.success && (
                          <p className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {state.success}
                          </p>
                        )}

                        <Button
                          onClick={() => handleCastVote(currentPoll.id, currentPoll.pollType)}
                          disabled={state.submitting}
                          className="w-full mt-2"
                        >
                          {state.submitting ? 'در حال ثبت رأی...' : 'ثبت نهایی رأی'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Poll Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="تعریف نظرسنجی جدید"
        maxWidth="xl"
      >
        <form onSubmit={handleCreatePollSubmit} className="space-y-4 pt-2">
          {createError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              عنوان نظرسنجی *
            </label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="مثال: نظرسنجی کیفیت دوره‌های فوق‌برنامه زمستان"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              توضیحات و اهداف نظرسنجی
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="توضیحات مربوط به نحوه شرکت یا اهداف آموزشی این نظرسنجی..."
              rows={2}
              className="w-full px-3 py-2 text-sm bg-surface/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                نوع نظرسنجی
              </label>
              <select
                value={form.pollType}
                onChange={(e) => setForm({ ...form, pollType: e.target.value as any })}
                className="w-full px-3 py-2 text-sm bg-surface/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
              >
                <option value="SINGLE_CHOICE">تک انتخابی (رادیویی)</option>
                <option value="MULTIPLE_CHOICE">چند انتخابی (چک‌باکس)</option>
                <option value="RATING_SCALE">امتیازدهی ۵ ستاره</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                مخاطبان هدف
              </label>
              <select
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value as any })}
                className="w-full px-3 py-2 text-sm bg-surface/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
              >
                <option value="ALL">عمومی (همه اعضا)</option>
                <option value="STUDENTS">تنها دانش‌آموزان</option>
                <option value="PARENTS">تنها اولیای گرامی</option>
                <option value="TEACHERS">تنها کادر آموزشی و معلمان</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                تاریخ شروع
              </label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                تاریخ پایان
              </label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Options (if not rating) */}
          {form.pollType !== 'RATING_SCALE' && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  گزینه‌های نظرسنجی (حداقل ۲ گزینه)
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddOptionField}
                  className="h-7 text-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن گزینه</span>
                </Button>
              </div>

              {form.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4 text-center">
                    {idx + 1}.
                  </span>
                  <Input
                    value={opt}
                    onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                    placeholder={`متن گزینه ${idx + 1}`}
                    required
                  />
                  {form.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOptionField(idx)}
                      className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isAnonymous"
              checked={form.isAnonymous}
              onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })}
              className="w-4 h-4 rounded-sm border-border text-primary focus:ring-primary/20"
            />
            <label htmlFor="isAnonymous" className="text-xs font-medium text-foreground cursor-pointer">
              آراء کاربران به صورت کاملاً محرمانه و ناشناس ثبت شوند
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
              {isSubmitting ? 'در حال ثبت...' : 'انتشار نظرسنجی'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
