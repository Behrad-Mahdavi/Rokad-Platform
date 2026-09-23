import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ResponsivePageHeader } from '../../../components/ui/ResponsivePageHeader';
import { toast } from '../../../components/ui/toast/toast';
import {
  porscadSurvey,
  PORSCAD_QUESTION_TYPES,
  PorscadQuestionType,
  SurveyQuestion,
  SurveyAnswers,
} from '../../../lib/porscad/porscad-survey-client';
import {
  formatJalaliDisplay,
  toPersianDigits,
  gregorianToJalaliStr,
  jalaliToGregorianDate,
} from '../../../utils/jalali';
import { PersianDatePicker } from '../../../components/ui/PersianDatePicker';
import {
  Vote,
  Plus,
  CheckCircle2,
  AlertCircle,
  Users,
  Check,
  Star,
  BarChart3,
  Calendar,
  Lock,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Send,
  Sparkles,
  ListChecks,
  Layers,
  RefreshCw,
  KeyRound,
  X,
} from 'lucide-react';

type QuestionType = PorscadQuestionType;

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
  targetAudience: 'ALL' | 'STUDENTS' | 'PARENTS' | 'TEACHERS' | 'STAFF';
  startDate: string;
  endDate: string;
  isAnonymous: boolean;
  isClosed: boolean;
  isArchived?: boolean;
  createdAt: string;
  questions?: SurveyQuestion[] | string;
  porscadFormId?: string | null;
  porscadFormPublicId?: string | null;
  options: PollOption[];
  _count?: { votes: number };
}

interface QuestionDraft {
  type: QuestionType;
  title: string;
  description: string;
  options: string[];
  maxSelections: number;
  required: boolean;
}

interface AnalyticsData {
  totalResponses: number;
  porscadLinked: boolean;
  perQuestion: Array<{
    index: number;
    title: string;
    type: string;
    answered: number;
    options: Array<{ text: string; count: number; percentage: number }>;
    avgRating: number | null;
  }>;
  responses: Array<{
    id: string;
    respondentName: string;
    role?: string;
    answers?: Record<string, unknown>;
    createdAt: string;
  }>;
}

const AUDIENCE_OPTIONS = [
  { value: 'ALL', label: 'همه (عمومی)', desc: 'دانش‌آموز، معلم و اولیا' },
  { value: 'STUDENTS', label: 'دانش‌آموزان', desc: 'فقط اکانت‌های دانش‌آموز' },
  { value: 'PARENTS', label: 'والدین', desc: 'فقط اکانت‌های اولیا' },
  { value: 'TEACHERS', label: 'معلمان', desc: 'فقط اکانت‌های معلمان و مربیان' },
  { value: 'STAFF', label: 'کارکنان', desc: 'فقط اکانت‌های کارکنان و ادمین' },
] as const;

const AUDIENCE_LABEL: Record<string, string> = {
  ALL: 'همه',
  STUDENTS: 'دانش‌آموزان',
  PARENTS: 'والدین',
  TEACHERS: 'معلمان',
  STAFF: 'کارکنان',
};

const TYPE_LABEL: Record<QuestionType, string> = {
  choice: 'چندگزینه‌ای',
  picture_choice: 'چندگزینه‌ای تصویری',
  dropdown: 'لیست کشویی',
  yes_no: 'بله/خیر',
  likert: 'طیفی (لیکرت)',
  nps: 'NPS (۰ تا ۱۰)',
  rating: 'ستاره‌ای',
  matrix: 'ماتریسی',
  ranking: 'رتبه‌بندی',
  short_text: 'متن کوتاه',
  long_text: 'متن بلند',
  number: 'عدد',
  email: 'ایمیل',
  phone_ir: 'موبایل',
  link: 'لینک',
  telegram_id: 'تلگرام',
  statement: 'متن توضیحی',
  group: 'گروه/بخش',
  file_upload: 'آپلود فایل',
  payment: 'پرداخت',
  opinion_scale: 'مقیاس نظری',
};

const INFORMATIONAL_TYPES = new Set<string>(['statement', 'group']);

function questionNeedsOptions(type: string): boolean {
  const meta = PORSCAD_QUESTION_TYPES.find((t) => t.value === type);
  if (meta) return meta.needsOptions;
  return type === 'choice' || type === 'dropdown';
}

const DEFAULT_OPTIONS = ['گزینه اول', 'گزینه دوم'];

function parseQuestions(raw: SurveyQuestion[] | string | undefined): SurveyQuestion[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function legacyQuestionsFromPoll(poll: Poll): SurveyQuestion[] {
  const parsed = parseQuestions(poll.questions);
  if (parsed.length > 0) return parsed;
  if (!poll.options?.length) return [];
  return [
    {
      type: poll.pollType === 'RATING_SCALE' ? 'rating' : 'choice',
      title: poll.title,
      description: poll.description,
      options: poll.options.map((o) => o.text),
      maxSelections: poll.pollType === 'MULTIPLE_CHOICE' ? 5 : 1,
      required: true,
      displayMode: 'buttons',
    },
  ];
}

function emptyDraft(): QuestionDraft {
  return {
    type: 'choice',
    title: '',
    description: '',
    options: [...DEFAULT_OPTIONS],
    maxSelections: 1,
    required: true,
  };
}

type PollFilter = 'ACTIVE' | 'ENDED' | 'ARCHIVED';
type PollStatusAction = 'close' | 'open' | 'archive' | 'unarchive';

export const PollsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<PollFilter>('ACTIVE');
  const [statusAction, setStatusAction] = useState<{
    poll: Poll;
    action: PollStatusAction;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Poll | null>(null);
  const [isStatusBusy, setIsStatusBusy] = useState(false);

  const isAdmin = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'STAFF', 'TEACHER', 'COACH'].includes(
    user?.role || '',
  );
  const canCreate =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'SCHOOL_ADMIN' ||
    user?.role === 'STAFF' ||
    user?.role === 'TEACHER' ||
    user?.role === 'COACH';

  const respondentName = useMemo(
    () =>
      `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
      'کاربر',
    [user],
  );

  // Create modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createStep, setCreateStep] = useState<0 | 1 | 2>(0);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    targetAudience: 'ALL' as
      | 'ALL'
      | 'STUDENTS'
      | 'PARENTS'
      | 'TEACHERS'
      | 'STAFF',
    startDate: gregorianToJalaliStr(new Date()),
    endDate: gregorianToJalaliStr(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  });
  const [drafts, setDrafts] = useState<QuestionDraft[]>([emptyDraft()]);
  const [porscadToken, setPorscadToken] = useState(() => porscadSurvey.getToken());
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isTestingToken, setIsTestingToken] = useState(false);
  const [tokenInput, setTokenInput] = useState('');

  // Fill (step-by-step) state
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [fillStep, setFillStep] = useState(0);
  const [fillAnswers, setFillAnswers] = useState<SurveyAnswers>({});
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmittingAnswers, setIsSubmittingAnswers] = useState(false);

  // Analytics
  const [analyticsPollId, setAnalyticsPollId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [liveAnalytics, setLiveAnalytics] = useState<any>(null);
  const [isRefreshingLive, setIsRefreshingLive] = useState(false);

  const fetchPolls = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<Poll[]>('/polls');
      const data = res.data || [];
      setPolls(data);
    } catch (err) {
      console.error('Failed to fetch polls:', err);
      toast.error('خطا در دریافت نظرسنجی‌ها');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, []);

  const now = new Date();
  const filteredPolls = polls.filter((p) => {
    const archived = !!p.isArchived;
    const ended = p.isClosed || new Date(p.endDate) < now;
    if (activeFilter === 'ARCHIVED') return archived;
    if (archived) return false;
    if (activeFilter === 'ENDED') return ended;
    return !ended;
  });

  const filterCounts = useMemo(() => {
    let active = 0;
    let ended = 0;
    let archived = 0;
    for (const p of polls) {
      if (p.isArchived) {
        archived += 1;
        continue;
      }
      if (p.isClosed || new Date(p.endDate) < now) ended += 1;
      else active += 1;
    }
    return { active, ended, archived };
  }, [polls, now]);

  const syncPorscadState = async (
    poll: Poll,
    patch: {
      published?: boolean;
      archived?: boolean;
      deleted_at?: string | null;
    },
  ): Promise<boolean> => {
    if (!poll.porscadFormId || !porscadSurvey.getToken()) return false;
    return porscadSurvey.updateFormState(poll.porscadFormId, patch);
  };

  const applyStatusAction = async () => {
    if (!statusAction) return;
    const { poll, action } = statusAction;
    setIsStatusBusy(true);
    try {
      const res = await apiClient.patch(`/polls/${poll.id}/status`, { action });
      if (res.data) {
        let porscadOk = true;
        if (action === 'close') {
          porscadOk = await syncPorscadState(poll, { published: false });
        } else if (action === 'open') {
          porscadOk = await syncPorscadState(poll, {
            published: true,
            archived: false,
          });
        } else if (action === 'archive') {
          porscadOk = await syncPorscadState(poll, {
            archived: true,
            published: false,
          });
        } else if (action === 'unarchive') {
          const stillOpen =
            !poll.isClosed && new Date(poll.endDate) >= new Date();
          porscadOk = await syncPorscadState(poll, {
            archived: false,
            published: stillOpen,
          });
        }

        const messages: Record<PollStatusAction, string> = {
          close: 'نظرسنجی بسته شد',
          open: 'نظرسنجی باز شد',
          archive: 'نظرسنجی آرشیو شد',
          unarchive: 'نظرسنجی از آرشیو خارج شد',
        };
        if (poll.porscadFormId && !porscadOk && porscadSurvey.getToken()) {
          toast.error(`${messages[action]}؛ همگام‌سازی پرس‌کاد ناموفق بود`);
        } else {
          toast.success(messages[action]);
        }
        setStatusAction(null);
        await fetchPolls();
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || 'خطا در تغییر وضعیت';
      toast.error(typeof msg === 'string' ? msg : 'خطا در تغییر وضعیت');
    } finally {
      setIsStatusBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsStatusBusy(true);
    try {
      const res = await apiClient.delete<{ porscadFormId?: string | null }>(
        `/polls/${deleteTarget.id}`,
      );
      const remoteFormId =
        res.data?.porscadFormId || deleteTarget.porscadFormId;
      if (remoteFormId && porscadSurvey.getToken()) {
        const ok = await porscadSurvey.trashForm(remoteFormId);
        if (!ok) {
          toast.error('نظرسنجی حذف شد؛ انتقال فرم پرس‌کاد به سطل زباله ناموفق بود');
        } else {
          toast.success('نظرسنجی و فرم پرس‌کاد حذف شدند');
        }
      } else {
        toast.success('نظرسنجی حذف شد');
      }
      setDeleteTarget(null);
      await fetchPolls();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || 'خطا در حذف نظرسنجی';
      toast.error(typeof msg === 'string' ? msg : 'خطا در حذف نظرسنجی');
    } finally {
      setIsStatusBusy(false);
    }
  };

  // ——— Create wizard ———
  const openCreate = () => {
    setCreateStep(0);
    setCreateError(null);
    setForm({
      title: '',
      description: '',
      targetAudience: 'ALL',
      startDate: gregorianToJalaliStr(new Date()),
      endDate: gregorianToJalaliStr(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    });
    setDrafts([emptyDraft()]);
    setPorscadToken(porscadSurvey.getToken());
    setIsCreateOpen(true);
  };

  const updateDraft = (index: number, patch: Partial<QuestionDraft>) => {
    setDrafts((prev) =>
      prev.map((d, i) => {
        if (i !== index) return d;
        const next = { ...d, ...patch };
        if (!questionNeedsOptions(next.type)) {
          next.maxSelections = 1;
        }
        if (next.type === 'choice' && next.maxSelections < 1) {
          next.maxSelections = 1;
        }
        return next;
      }),
    );
  };

  const validateStep = (step: 0 | 1 | 2): string | null => {
    if (step === 0) {
      if (!form.title.trim()) return 'عنوان نظرسنجی الزامی است';
      if (!form.startDate || !form.endDate) return 'تاریخ شروع و پایان را مشخص کنید';
      try {
        if (jalaliToGregorianDate(form.endDate) < jalaliToGregorianDate(form.startDate)) {
          return 'تاریخ پایان باید بعد از تاریخ شروع باشد';
        }
      } catch {
        return 'تاریخ شروع یا پایان نامعتبر است';
      }
      return null;
    }
    if (step === 1) {
      if (drafts.length === 0) return 'حداقل یک سوال اضافه کنید';
      for (let i = 0; i < drafts.length; i++) {
        const d = drafts[i];
        if (!d.title.trim()) return `متن سوال ${i + 1} الزامی است`;
        if (questionNeedsOptions(d.type)) {
          const opts = d.options.filter((o) => o.trim());
          if (opts.length < 2) {
            return `سوال ${i + 1} باید حداقل ۲ گزینه داشته باشد`;
          }
        }
      }
      return null;
    }
    return null;
  };

  const goNextCreate = () => {
    const err = validateStep(createStep);
    if (err) {
      setCreateError(err);
      return;
    }
    setCreateError(null);
    setCreateStep((s) => (s === 0 ? 1 : 2));
  };

  const goBackCreate = () => {
    setCreateError(null);
    setCreateStep((s) => (s === 1 ? 0 : 1));
  };

  const handleSaveToken = async () => {
    if (!tokenInput.trim()) {
      toast.error('توکن پرس‌کاد را وارد کنید');
      return;
    }
    setIsTestingToken(true);
    try {
      const res = await porscadSurvey.testConnection(tokenInput.trim());
      if (res.success) {
        porscadSurvey.setToken(tokenInput.trim());
        setPorscadToken(tokenInput.trim());
        toast.success('توکن پرس‌کاد ذخیره شد');
        setIsTokenModalOpen(false);
      } else {
        toast.error(res.message || 'توکن نامعتبر است');
      }
    } finally {
      setIsTestingToken(false);
    }
  };

  const handleCreateSubmit = async () => {
    const err = validateStep(0) || validateStep(1);
    if (err) {
      setCreateError(err);
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);

    try {
      const questions: SurveyQuestion[] = drafts.map((d) => ({
        type: d.type,
        title: d.title.trim(),
        description: d.description.trim() || undefined,
        options: questionNeedsOptions(d.type)
          ? d.options.filter((o) => o.trim())
          : undefined,
        maxSelections:
          d.type === 'choice' ? Math.max(1, d.maxSelections) : 1,
        required: INFORMATIONAL_TYPES.has(d.type) ? false : d.required,
        displayMode: 'buttons',
      }));

      let formId: string | undefined;
      let formPublicId: string | undefined;
      let questionIds: string[] = [];
      let porscadOk = false;

      if (porscadSurvey.getToken()) {
        try {
          const created = await porscadSurvey.createSurveyForm({
            title: form.title.trim(),
            description: form.description.trim() || undefined,
            questions,
          });
          formId = created.formId;
          formPublicId = created.formPublicId;
          questionIds = created.questionIds;
          porscadOk = true;
        } catch (e: any) {
          toast.error(
            e?.message ||
              'ساخت فرم در پرس‌کاد ناموفق بود؛ نظرسنجی فقط محلی ذخیره می‌شود',
          );
        }
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        pollType: questions.some((q) => q.type === 'rating')
          ? 'RATING_SCALE'
          : questions.some((q) => (q.maxSelections || 1) > 1)
            ? 'MULTIPLE_CHOICE'
            : 'SINGLE_CHOICE',
        targetAudience: form.targetAudience,
        startDate: (() => {
          const d = jalaliToGregorianDate(form.startDate);
          d.setHours(0, 0, 0, 0);
          return d.toISOString();
        })(),
        endDate: (() => {
          const d = jalaliToGregorianDate(form.endDate);
          d.setHours(23, 59, 59, 999);
          return d.toISOString();
        })(),
        isAnonymous: false,
        questions,
        porscadFormId: formId,
        porscadFormPublicId: formPublicId,
        porscadQuestionIds: questionIds,
        porscadMeta: { questionIds },
        options: [],
      };

      await apiClient.post('/polls', payload);
      toast.success(
        porscadOk
          ? 'نظرسنجی ساخته شد و فرم در پرس‌کاد ایجاد گردید'
          : 'نظرسنجی ساخته شد',
      );
      setIsCreateOpen(false);
      await fetchPolls();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'خطا در ایجاد نظرسنجی';
      setCreateError(typeof msg === 'string' ? msg : 'خطا در ایجاد نظرسنجی');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ——— Fill step-by-step ———
  const openPoll = async (poll: Poll) => {
    setActivePoll(poll);
    setFillStep(0);
    setFillAnswers({});
    setHasVoted(false);
    try {
      const detail = await apiClient.get<{
        poll: Poll;
        hasVoted: boolean;
        userVote?: { answers?: Record<string, unknown> };
      }>(`/polls/${poll.id}`);
      if (detail.data) {
        setHasVoted(!!detail.data.hasVoted);
        if (detail.data.userVote?.answers) {
          setFillAnswers(
            detail.data.userVote.answers as SurveyAnswers,
          );
        }
      }
    } catch {
      // ignore detail fail
    }
  };

  const closePoll = () => {
    setActivePoll(null);
    setFillStep(0);
    setFillAnswers({});
    setHasVoted(false);
  };

  const activeQuestions = useMemo(
    () => (activePoll ? legacyQuestionsFromPoll(activePoll) : []),
    [activePoll],
  );

  const isQuestionAnswered = (q: SurveyQuestion, index: number): boolean => {
    if (INFORMATIONAL_TYPES.has(q.type)) return true;
    const raw = fillAnswers[String(index)];
    if (raw === undefined || raw === null || raw === '') return false;
    if (Array.isArray(raw)) return raw.length > 0;
    return true;
  };

  const canGoNext = (() => {
    const q = activeQuestions[fillStep];
    if (!q) return true;
    if (q.required === false) return true;
    return isQuestionAnswered(q, fillStep);
  })();

  const setAnswer = (index: number, value: SurveyAnswers[string]) => {
    setFillAnswers((prev) => ({ ...prev, [String(index)]: value }));
  };

  const toggleChoice = (
    index: number,
    option: string,
    multi: boolean,
    maxSel: number,
  ) => {
    const key = String(index);
    const current = fillAnswers[key];
    if (!multi) {
      setAnswer(index, option);
      return;
    }
    const arr = Array.isArray(current) ? [...(current as string[])] : [];
    if (arr.includes(option)) {
      setAnswer(
        index,
        arr.filter((o) => o !== option),
      );
    } else {
      if (arr.length >= maxSel) {
        toast.error(`حداکثر ${toPersianDigits(maxSel)} گزینه می‌توانید انتخاب کنید`);
        return;
      }
      setAnswer(index, [...arr, option]);
    }
  };

  const submitAllAnswers = async () => {
    if (!activePoll) return;
    const questions = activeQuestions;

    for (let i = 0; i < questions.length; i++) {
      if (questions[i].required === false) continue;
      if (INFORMATIONAL_TYPES.has(questions[i].type)) continue;
      if (!isQuestionAnswered(questions[i], i)) {
        setFillStep(i);
        toast.error(`به سوال «${questions[i].title}» پاسخ دهید`);
        return;
      }
    }

    setIsSubmittingAnswers(true);
    try {
      let porscadResponseId: string | undefined;
      let porscadError: string | null = null;

      const questionIds =
        questions.map((q) => q.porscadQuestionId).filter(Boolean) as string[];

      if (
        activePoll.porscadFormPublicId &&
        questionIds.length > 0 &&
        porscadSurvey.getToken()
      ) {
        const result = await porscadSurvey.submitSurveyAnswers({
          formPublicId: activePoll.porscadFormPublicId,
          formId: activePoll.porscadFormId || '',
          questionIds,
          questions,
          answersByIndex: fillAnswers,
          respondentName,
        });
        if (result.success) {
          porscadResponseId = result.responseId;
        } else {
          porscadError = result.message || 'ثبت در پرس‌کاد ناموفق بود';
        }
      }

      await apiClient.post(`/polls/${activePoll.id}/answers`, {
        answers: fillAnswers,
        porscadResponseId,
        respondentName,
      });

      if (porscadError) {
        toast.error(`پاسخ محلی ثبت شد؛ ${porscadError}`);
      } else if (porscadResponseId || !activePoll.porscadFormId) {
        toast.success('پاسخ‌های شما ثبت شد');
      } else {
        toast.success('پاسخ‌های شما ثبت شد');
      }

      setHasVoted(true);
      await fetchPolls();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || 'خطا در ثبت پاسخ';
      toast.error(typeof msg === 'string' ? msg : 'خطا در ثبت پاسخ');
    } finally {
      setIsSubmittingAnswers(false);
    }
  };

  // ——— Analytics ———
  const openAnalytics = async (poll: Poll) => {
    setAnalyticsPollId(poll.id);
    setAnalytics(null);
    setLiveAnalytics(null);
    setIsAnalyticsLoading(true);
    try {
      const res = await apiClient.get<AnalyticsData>(`/polls/${poll.id}/analytics`);
      if (res.data) setAnalytics(res.data);
    } catch {
      toast.error('خطا در دریافت آنالیتیکس');
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  const refreshLiveAnalytics = async () => {
    if (!analyticsPollId) return;
    const poll = polls.find((p) => p.id === analyticsPollId);
    if (!poll) return;
    const questions = legacyQuestionsFromPoll(poll);
    const questionIds = questions
      .map((q) => q.porscadQuestionId)
      .filter(Boolean) as string[];
    if (questionIds.length === 0) {
      toast.error('این نظرسنجی به پرس‌کاد متصل نیست');
      return;
    }
    setIsRefreshingLive(true);
    try {
      const live = await porscadSurvey.fetchLiveAnalytics({
        questionIds,
        questions,
      });
      setLiveAnalytics(live);
      toast.success('داده زنده پرس‌کاد دریافت شد');
    } catch (e: any) {
      toast.error(e?.message || 'خطا در دریافت آنالیتیکس پرس‌کاد');
    } finally {
      setIsRefreshingLive(false);
    }
  };

  const renderAnswerControl = (q: SurveyQuestion, index: number) => {
    const value = fillAnswers[String(index)];

    if (INFORMATIONAL_TYPES.has(q.type)) {
      return (
        <div className="p-4 rounded-xl border border-dashed border-border text-xs font-bold text-muted-foreground text-center">
          {q.type === 'group' ? 'این بخش فقط جداکننده است' : 'بدون نیاز به پاسخ'}
        </div>
      );
    }

    if (q.type === 'yes_no') {
      return (
        <div className="grid grid-cols-2 gap-3">
          {['بله', 'خیر'].map((opt) => {
            const selected = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setAnswer(index, opt)}
                className={`h-14 rounded-xl border text-sm font-black transition-all ${
                  selected
                    ? 'border-primary bg-primary/10 text-primary shadow-[2px_2px_0_#202A5A] dark:shadow-[2px_2px_0_#59BBAF]'
                    : 'border-gray-200 dark:border-[#242F42] bg-[#FAFAFA] dark:bg-[#1C2536] hover:border-primary/40'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      );
    }

    if (q.type === 'rating') {
      const current = typeof value === 'number' ? value : 0;
      return (
        <div className="flex items-center justify-center gap-2 py-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setAnswer(index, star)}
              className={`p-2 rounded-xl transition-all ${
                current >= star
                  ? 'text-amber-400 bg-amber-400/10 scale-110'
                  : 'text-gray-300 dark:text-gray-600 hover:text-amber-400/70'
              }`}
            >
              <Star className="w-8 h-8 fill-current" />
            </button>
          ))}
        </div>
      );
    }

    if (q.type === 'opinion_scale' || q.type === 'nps') {
      const current = typeof value === 'number' ? value : 0;
      const nums =
        q.type === 'nps'
          ? Array.from({ length: 11 }, (_, i) => i)
          : Array.from({ length: 10 }, (_, i) => i + 1);
      return (
        <div className="grid grid-cols-5 sm:grid-cols-11 gap-2 py-2">
          {nums.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setAnswer(index, n)}
              className={`h-11 rounded-xl border text-xs sm:text-sm font-black transition-all ${
                current === n
                  ? 'border-primary bg-primary text-white'
                  : 'border-gray-200 dark:border-[#242F42] bg-[#FAFAFA] dark:bg-[#1C2536] hover:border-primary/50'
              }`}
            >
              {toPersianDigits(n)}
            </button>
          ))}
        </div>
      );
    }

    if (q.type === 'dropdown') {
      const options = q.options || [];
      return (
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => setAnswer(index, e.target.value)}
          className="w-full h-12 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-sm font-medium focus:border-primary focus:outline-none"
        >
          <option value="">انتخاب کنید…</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    if (q.type === 'ranking') {
      const options = q.options || [];
      const ordered = Array.isArray(value) ? (value as string[]) : [];
      const remaining = options.filter((o) => !ordered.includes(o));
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            {ordered.map((opt, ri) => (
              <div
                key={opt}
                className="flex items-center justify-between gap-2 p-3 rounded-xl border border-primary/40 bg-primary/5 text-sm font-bold"
              >
                <span>
                  {toPersianDigits(ri + 1)}. {opt}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setAnswer(
                      index,
                      ordered.filter((o) => o !== opt),
                    )
                  }
                  className="text-xs text-muted-foreground hover:text-destructive min-h-[36px] px-2"
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
          {remaining.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-muted-foreground">
                اضافه کردن (به ترتیب اولویت):
              </p>
              {remaining.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAnswer(index, [...ordered, opt])}
                  className="w-full text-right p-3 rounded-xl border border-gray-200 dark:border-[#242F42] bg-white dark:bg-[#1C2536] text-sm font-bold hover:border-primary/40"
                >
                  + {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (q.type === 'matrix') {
      const options = q.options || [];
      const selected = typeof value === 'string' ? value : '';
      return (
        <div className="space-y-2">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setAnswer(index, opt)}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-right transition-all text-sm font-bold ${
                selected === opt
                  ? 'border-primary bg-primary/10 text-primary shadow-[2px_2px_0_#202A5A] dark:shadow-[2px_2px_0_#59BBAF]'
                  : 'border-gray-200 dark:border-[#242F42] bg-white dark:bg-[#1C2536] hover:border-primary/40'
              }`}
            >
              <span>{opt}</span>
              <span
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selected === opt
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {selected === opt && <Check className="w-3.5 h-3.5" />}
              </span>
            </button>
          ))}
        </div>
      );
    }

    if (q.type === 'long_text') {
      return (
        <textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => setAnswer(index, e.target.value)}
          rows={5}
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-sm font-medium focus:border-primary focus:outline-none"
          placeholder="پاسخ خود را بنویسید…"
        />
      );
    }

    if (q.type === 'number') {
      return (
        <input
          type="number"
          value={typeof value === 'number' ? String(value) : ''}
          onChange={(e) =>
            setAnswer(
              index,
              e.target.value === '' ? '' : Number(e.target.value),
            )
          }
          className="w-full h-12 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-sm font-medium focus:border-primary focus:outline-none"
          placeholder="مثلاً: ۱۲۳"
        />
      );
    }

    if (q.type === 'payment') {
      return (
        <div className="p-4 rounded-xl border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 text-xs font-bold text-amber-800 dark:text-amber-300">
          پرداخت آنلاین در نسخه فعلی فقط نمایشی است؛ مبلغ توسط سازنده فرم تعیین
          می‌شود.
        </div>
      );
    }

    if (q.type === 'file_upload') {
      return (
        <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border border-dashed border-border text-xs font-bold text-muted-foreground cursor-pointer hover:border-primary/50 min-h-[88px]">
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setAnswer(index, f.name);
            }}
          />
          {typeof value === 'string' && value
            ? `فایل انتخاب شد: ${value}`
            : 'انتخاب فایل (تصویر یا سند)'}
        </label>
      );
    }

    const textTypes = new Set([
      'short_text',
      'email',
      'phone_ir',
      'link',
      'telegram_id',
    ]);
    if (textTypes.has(q.type)) {
      const inputType = q.type === 'email' ? 'email' : 'text';
      const placeholder =
        q.type === 'email'
          ? 'example@email.com'
          : q.type === 'phone_ir'
            ? '09123456789'
            : q.type === 'link'
              ? 'https://example.com'
              : q.type === 'telegram_id'
                ? 'username@'
                : 'پاسخ خود را بنویسید…';
      return (
        <input
          type={inputType}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => setAnswer(index, e.target.value)}
          className="w-full h-12 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-sm font-medium focus:border-primary focus:outline-none"
          placeholder={placeholder}
        />
      );
    }

    // choice / picture_choice / likert / legacy fallback
    const options = q.options || [];
    const multi = (q.maxSelections || 1) > 1;
    const maxSel = q.maxSelections || 1;
    const selectedList = Array.isArray(value)
      ? (value as string[])
      : typeof value === 'string' && value
        ? [value]
        : [];

    return (
      <div className="space-y-2">
        {options.map((opt) => {
          const selected = selectedList.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggleChoice(index, opt, multi, maxSel)}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-right transition-all text-sm font-bold ${
                selected
                  ? 'border-primary bg-primary/10 text-primary shadow-[2px_2px_0_#202A5A] dark:shadow-[2px_2px_0_#59BBAF]'
                  : 'border-gray-200 dark:border-[#242F42] bg-white dark:bg-[#1C2536] hover:border-primary/40'
              }`}
            >
              <span>{opt}</span>
              <span
                className={`w-5 h-5 ${multi ? 'rounded-md' : 'rounded-full'} border-2 flex items-center justify-center ${
                  selected
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {selected && <Check className="w-3.5 h-3.5" />}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderAnalyticsView = () => {
    const poll = polls.find((p) => p.id === analyticsPollId);
    const shown = liveAnalytics || analytics;
    return (
      <Modal
        isOpen={!!analyticsPollId}
        onClose={() => setAnalyticsPollId(null)}
        title={`آنالیتیکس: ${poll?.title || ''}`}
        maxWidth="3xl"
      >
        <div className="space-y-4 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span>
                {liveAnalytics
                  ? 'منبع: پرس‌کاد (زنده)'
                  : analytics?.porscadLinked
                    ? 'منبع: پاسخ‌های ثبت‌شده'
                    : 'منبع: پاسخ‌های محلی'}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={refreshLiveAnalytics}
              disabled={isRefreshingLive}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLive ? 'animate-spin' : ''}`} />
              {isRefreshingLive ? 'در حال دریافت…' : 'دریافت زنده پرس‌کاد'}
            </Button>
          </div>

          {isAnalyticsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          ) : !shown ? (
            <div className="p-6 text-center text-sm text-gray-500">
              داده‌ای موجود نیست
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-gray-200 dark:border-[#242F42] bg-[#FAFAFA] dark:bg-[#1C2536]">
                  <p className="text-[11px] font-bold text-gray-500">تعداد پاسخ‌دهنده</p>
                  <p className="text-xl font-black text-ink-normal dark:text-white">
                    {toPersianDigits(shown.totalRespondents ?? analytics?.totalResponses ?? 0)}
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-gray-200 dark:border-[#242F42] bg-[#FAFAFA] dark:bg-[#1C2536]">
                  <p className="text-[11px] font-bold text-gray-500">تعداد سوالات</p>
                  <p className="text-xl font-black text-ink-normal dark:text-white">
                    {toPersianDigits(shown.perQuestion?.length || 0)}
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-gray-200 dark:border-[#242F42] bg-[#FAFAFA] dark:bg-[#1C2536]">
                  <p className="text-[11px] font-bold text-gray-500">اتصال پرس‌کاد</p>
                  <p className="text-sm font-black text-emerald-600">
                    {poll?.porscadFormId ? 'متصل' : 'محلی'}
                  </p>
                </div>
              </div>

              {(shown.perQuestion || []).map((q: any) => (
                <div
                  key={q.index}
                  className="rounded-xl border border-gray-200 dark:border-[#242F42] p-4 space-y-2 bg-white dark:bg-[#151C28]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-black text-ink-normal dark:text-white">
                      {toPersianDigits(q.index + 1)}. {q.title}
                    </h4>
                    <Badge variant="neutral">
                      {TYPE_LABEL[q.type as QuestionType] || q.type}
                    </Badge>
                  </div>
                  <p className="text-[11px] font-bold text-gray-500">
                    پاسخ‌ها: {toPersianDigits(q.answered)}
                    {q.avgRating != null && (
                      <span className="mr-2">
                        میانگین: {toPersianDigits(q.avgRating)}
                      </span>
                    )}
                  </p>
                  {q.options?.length > 0 && (
                    <div className="space-y-2">
                      {q.options.map((opt: any) => (
                        <div key={opt.text} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-ink-normal dark:text-white">{opt.text}</span>
                            <span className="text-gray-500">
                              {toPersianDigits(opt.count)} (
                              {toPersianDigits(opt.percentage || 0)}٪)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${opt.percentage || 0}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {analytics?.responses && analytics.responses.length > 0 && !liveAnalytics && (
                <div className="rounded-xl border border-gray-200 dark:border-[#242F42] p-4">
                  <h4 className="text-xs font-black text-ink-normal dark:text-white mb-3">
                    پاسخ‌دهندگان ({toPersianDigits(analytics.responses.length)})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {analytics.responses.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#FAFAFA] dark:bg-[#1C2536]"
                      >
                        <span className="font-bold text-ink-normal dark:text-white">
                          {r.respondentName}
                        </span>
                        <span className="text-gray-500">
                          {formatJalaliDisplay(r.createdAt, true)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    );
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      <ResponsivePageHeader
        title="نظرسنجی‌ها"
        subtitle="فرم‌های پرس‌کاد، مهلت و وضعیت پاسخ‌ها در یک جا"
        icon={<Vote className="h-5 w-5 text-primary" />}
        actions={
          canCreate ? (
            <Button
              onClick={openCreate}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 shadow-xs font-medium text-xs h-9 sm:h-10"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن نظرسنجی</span>
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
        <button
          onClick={() => setActiveFilter('ACTIVE')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all min-h-[40px] ${
            activeFilter === 'ACTIVE'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-surface hover:text-foreground'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>فعال</span>
          <span className="text-[11px] font-black opacity-80">
            ({toPersianDigits(filterCounts.active)})
          </span>
        </button>
        <button
          onClick={() => setActiveFilter('ENDED')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all min-h-[40px] ${
            activeFilter === 'ENDED'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-surface hover:text-foreground'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>پایان‌یافته</span>
          <span className="text-[11px] font-black opacity-80">
            ({toPersianDigits(filterCounts.ended)})
          </span>
        </button>
        <button
          onClick={() => setActiveFilter('ARCHIVED')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all min-h-[40px] ${
            activeFilter === 'ARCHIVED'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-surface hover:text-foreground'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>آرشیو</span>
          <span className="text-[11px] font-black opacity-80">
            ({toPersianDigits(filterCounts.archived)})
          </span>
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : filteredPolls.length === 0 ? (
        <div className="text-center py-16 bg-surface/20 rounded-2xl border border-dashed border-border/60">
          <Vote className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-semibold text-foreground">
            نظرسنجی‌ای در این بخش نیست
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {activeFilter === 'ACTIVE'
              ? 'اولین نظرسنجی را بسازید تا در پرس‌کاد منتشر شود.'
              : activeFilter === 'ENDED'
                ? 'نظرسنجی پایان‌یافته‌ای ثبت نشده است.'
                : 'نظرسنجی در آرشیو نیست.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPolls.map((poll) => {
            const questions = legacyQuestionsFromPoll(poll);
            const archived = !!poll.isArchived;
            const manuallyClosed = !!poll.isClosed;
            const dateEnded = new Date(poll.endDate) < now;
            const isClosed = manuallyClosed || dateEnded;
            const isFuture = new Date(poll.startDate) > now;
            const linked = !!poll.porscadFormId;
            const totalVotes = poll._count?.votes ?? 0;
            const canReopen =
              manuallyClosed && !archived && !dateEnded;

            return (
              <Card
                key={poll.id}
                className="overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <CardHeader className="pb-3 border-b border-border/40 bg-surface/30">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={
                              archived
                                ? 'neutral'
                                : isClosed
                                  ? 'warning'
                                  : isFuture
                                    ? 'warning'
                                    : 'success'
                            }
                          >
                            {archived
                              ? 'آرشیو'
                              : manuallyClosed
                                ? 'بسته‌شده'
                                : dateEnded
                                  ? 'پایان‌یافته'
                                  : isFuture
                                    ? 'آینده'
                                    : 'در حال اجرا'}
                          </Badge>
                          <Badge variant="college">
                            {AUDIENCE_LABEL[poll.targetAudience] || poll.targetAudience}
                          </Badge>
                          {linked && (
                            <Badge variant="male">پرس‌کاد</Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg font-bold text-foreground mt-2 leading-relaxed">
                          {poll.title}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-3">
                    {poll.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {poll.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground bg-surface/40 p-2.5 rounded-xl border border-border/40">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary/70" />
                        مهلت: {formatJalaliDisplay(poll.endDate, true) || toPersianDigits(gregorianToJalaliStr(poll.endDate))}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <ListChecks className="w-3.5 h-3.5 text-primary/70" />
                        {toPersianDigits(questions.length || poll.options.length)} سوال
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-primary/70" />
                        {toPersianDigits(totalVotes)} پاسخ
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {archived || isClosed || isFuture ? null : (
                        <Button
                          size="sm"
                          onClick={() => openPoll(poll)}
                          className="gap-1.5 text-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          شرکت در نظرسنجی
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAnalytics(poll)}
                          className="gap-1.5 text-xs"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          آنالیتیکس
                        </Button>
                      )}
                      {isAdmin && !archived && !isClosed && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setStatusAction({ poll, action: 'close' })
                          }
                          className="gap-1.5 text-xs"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          بستن
                        </Button>
                      )}
                      {isAdmin && canReopen && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setStatusAction({ poll, action: 'open' })
                          }
                          className="gap-1.5 text-xs"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          بازگشایی
                        </Button>
                      )}
                      {isAdmin && !archived && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setStatusAction({ poll, action: 'archive' })
                          }
                          className="gap-1.5 text-xs"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          آرشیو
                        </Button>
                      )}
                      {isAdmin && archived && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setStatusAction({ poll, action: 'unarchive' })
                          }
                          className="gap-1.5 text-xs"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          فعال‌سازی
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteTarget(poll)}
                          className="gap-1.5 text-xs text-destructive border-destructive/30 hover:border-destructive/60"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          حذف
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ——— Create wizard modal ——— */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="افزودن نظرسنجی"
        description={`مرحله ${toPersianDigits(createStep + 1)} از ۳`}
        maxWidth="2xl"
      >
        <div className="space-y-4 pt-1">
          {/* Stepper */}
          <div className="flex items-center gap-2">
            {['مخاطب و زمان', 'سوالات', 'بررسی و ذخیره'].map((label, i) => (
              <React.Fragment key={label}>
                <div
                  className={`flex items-center gap-1.5 text-[11px] font-black px-2.5 py-1.5 rounded-lg border ${
                    createStep >= i
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  <span>{toPersianDigits(i + 1)}</span>
                  <span className="hidden sm:inline">{label}</span>
                </div>
                {i < 2 && <div className="flex-1 h-px bg-border" />}
              </React.Fragment>
            ))}
          </div>

          {createError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          {createStep === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  عنوان نظرسنجی *
                </label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="مثال: ارزیابی کیفیت کلاس‌های ترم پاییز"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  توضیحات
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-sm font-medium focus:border-primary focus:outline-none"
                  placeholder="توضیح کوتاه درباره هدف نظرسنجی…"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-2">
                  این فرم برای چه کسانی باشد؟ *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AUDIENCE_OPTIONS.map((opt) => {
                    const selected = form.targetAudience === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            targetAudience: opt.value as typeof form.targetAudience,
                          })
                        }
                        className={`text-right p-3 rounded-xl border transition-all ${
                          selected
                            ? 'border-primary bg-primary/10 shadow-[2px_2px_0_#202A5A] dark:shadow-[2px_2px_0_#59BBAF]'
                            : 'border-border bg-surface/30 hover:border-primary/40'
                        }`}
                      >
                        <p className="text-sm font-black text-foreground">{opt.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {opt.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <PersianDatePicker
                  label="تاریخ شروع"
                  value={form.startDate}
                  onChange={(d) => setForm({ ...form, startDate: d })}
                />
                <PersianDatePicker
                  label="مهلت پایان"
                  value={form.endDate}
                  onChange={(d) => setForm({ ...form, endDate: d })}
                />
              </div>
            </div>
          )}

          {createStep === 1 && (
            <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-xs font-bold text-muted-foreground">
                  انواع سوال پرس‌کاد: گزینه‌ای، متنی، عددی، NPS، لیکرت، ماتریس و بیشتر
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDrafts((p) => [...p, emptyDraft()])}
                  className="gap-1 text-xs w-full sm:w-auto shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  افزودن سوال
                </Button>
              </div>

              {drafts.map((d, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border p-4 space-y-3 bg-surface/20"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-primary">
                      سوال {toPersianDigits(idx + 1)}
                    </span>
                    {drafts.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setDrafts((p) => p.filter((_, i) => i !== idx))
                        }
                        className="p-2.5 -m-1 text-muted-foreground hover:text-destructive rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label={`حذف سوال ${toPersianDigits(idx + 1)}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-foreground mb-1">
                        متن سوال *
                      </label>
                      <Input
                        value={d.title}
                        onChange={(e) =>
                          updateDraft(idx, { title: e.target.value })
                        }
                        placeholder="کیفیت خدمات چگونه بود؟"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-foreground mb-1">
                        نوع سوال (پرس‌کاد)
                      </label>
                      <select
                        value={d.type}
                        onChange={(e) =>
                          updateDraft(idx, {
                            type: e.target.value as QuestionType,
                          })
                        }
                        className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-sm font-medium focus:border-primary focus:outline-none"
                      >
                        {PORSCAD_QUESTION_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-foreground mb-1">
                      توضیح (اختیاری)
                    </label>
                    <Input
                      value={d.description}
                      onChange={(e) =>
                        updateDraft(idx, { description: e.target.value })
                      }
                      placeholder="راهنمای کوتاه برای پاسخ‌دهنده"
                    />
                  </div>

                  {questionNeedsOptions(d.type) && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-[11px] font-bold text-foreground">
                          گزینه‌ها *
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          {d.type === 'choice' && (
                            <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                              حداکثر انتخاب:
                              <select
                                value={d.maxSelections}
                                onChange={(e) =>
                                  updateDraft(idx, {
                                    maxSelections: Number(e.target.value),
                                  })
                                }
                                className="h-9 sm:h-8 min-h-[36px] px-2 rounded-lg border border-border bg-background text-xs"
                              >
                                {[1, 2, 3, 5].map((n) => (
                                  <option key={n} value={n}>
                                    {toPersianDigits(n)}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateDraft(idx, {
                                options: [
                                  ...d.options,
                                  `گزینه ${d.options.length + 1}`,
                                ],
                              })
                            }
                            className="h-9 min-h-[36px] text-[11px] px-2.5"
                          >
                            <Plus className="w-3 h-3" />
                            گزینه
                          </Button>
                        </div>
                      </div>
                      {d.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-4 shrink-0">
                            {toPersianDigits(oi + 1)}.
                          </span>
                          <div className="flex-1 min-w-0">
                            <Input
                              value={opt}
                              onChange={(e) => {
                                const next = [...d.options];
                                next[oi] = e.target.value;
                                updateDraft(idx, { options: next });
                              }}
                              className="h-9 min-h-0 text-xs"
                            />
                          </div>
                          {d.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() =>
                                updateDraft(idx, {
                                  options: d.options.filter((_, i) => i !== oi),
                                })
                              }
                              className="p-2.5 -m-1 text-muted-foreground hover:text-destructive shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                              aria-label={`حذف گزینه ${toPersianDigits(oi + 1)}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <label
                    className={`flex items-center gap-2 text-xs font-bold text-foreground ${
                      INFORMATIONAL_TYPES.has(d.type)
                        ? 'opacity-40 pointer-events-none'
                        : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={
                        INFORMATIONAL_TYPES.has(d.type) ? false : d.required
                      }
                      onChange={(e) =>
                        updateDraft(idx, { required: e.target.checked })
                      }
                      className="w-4 h-4"
                      disabled={INFORMATIONAL_TYPES.has(d.type)}
                    />
                    پاسخ اجباری
                  </label>
                </div>
              ))}

              <div className="rounded-xl border border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 p-3 text-[11px] font-bold text-indigo-900 dark:text-indigo-300">
                با ذخیره، فرم مرحله‌به‌مرحله در پرس‌کاد ساخته می‌شود (اگر توکن تنظیم
                شده باشد).
                <button
                  type="button"
                  onClick={() => {
                    setTokenInput(porscadSurvey.getToken());
                    setIsTokenModalOpen(true);
                  }}
                  className="mr-2 underline font-black"
                >
                  {porscadToken ? 'ویرایش توکن' : 'تنظیم توکن پرس‌کاد'}
                </button>
              </div>
            </div>
          )}

          {createStep === 2 && (
            <div className="space-y-3">
              <div className="rounded-xl border border-border p-4 bg-surface/20 space-y-2 text-sm">
                <p>
                  <strong>عنوان:</strong> {form.title}
                </p>
                <p>
                  <strong>مخاطب:</strong>{' '}
                  {AUDIENCE_LABEL[form.targetAudience]}
                </p>
                <p>
                  <strong>مهلت:</strong>{' '}
                  {toPersianDigits(form.startDate)} تا {toPersianDigits(form.endDate)}
                </p>
                <p>
                  <strong>تعداد سوال:</strong> {toPersianDigits(drafts.length)}
                </p>
              </div>
              <ol className="space-y-2 max-h-64 overflow-y-auto">
                {drafts.map((d, i) => (
                  <li
                    key={i}
                    className="p-3 rounded-lg border border-border text-xs space-y-1"
                  >
                    <p className="font-black text-foreground">
                      {toPersianDigits(i + 1)}. {d.title}
                    </p>
                    <p className="text-muted-foreground">
                      {TYPE_LABEL[d.type]}
                      {d.options?.length > 0 &&
                        ` — ${d.options.filter((o) => o.trim()).length} گزینه`}
                    </p>
                  </li>
                ))}
              </ol>
              {!porscadToken && (
                <p className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5" />
                  توکن پرس‌کاد تنظیم نشده؛ فقط محلی ذخیره می‌شود.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-between gap-2 pt-3 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => (createStep === 0 ? setIsCreateOpen(false) : goBackCreate())}
              disabled={isSubmitting}
              className="gap-1"
            >
              <ArrowRight className="w-4 h-4" />
              {createStep === 0 ? 'انصراف' : 'بازگشت'}
            </Button>
            {createStep < 2 ? (
              <Button type="button" onClick={goNextCreate} className="gap-1">
                ادامه
                <ArrowLeft className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleCreateSubmit}
                disabled={isSubmitting}
                className="gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                {isSubmitting ? 'در حال ذخیره…' : 'ذخیره و ساخت فرم'}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* ——— Token modal ——— */}
      <Modal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        title="توکن دسترسی پرس‌کاد"
        maxWidth="md"
      >
        <div className="space-y-3 pt-1">
          <p className="text-xs text-muted-foreground leading-relaxed">
            توکن JWT از پنل پرس‌کاد (Supabase) را وارد کنید تا فرم‌ها ساخته و پاسخ‌ها
            ارسال شوند.
          </p>
          <Input
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="eyJhbGciOi…"
            type="password"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTokenModalOpen(false)}
            >
              انصراف
            </Button>
            <Button
              type="button"
              onClick={handleSaveToken}
              disabled={isTestingToken}
            >
              {isTestingToken ? 'در حال بررسی…' : 'ذخیره توکن'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ——— Step-by-step fill modal ——— */}
      <Modal
        isOpen={!!activePoll}
        onClose={closePoll}
        title={activePoll?.title || ''}
        description={
          activePoll
            ? `مهلت: ${formatJalaliDisplay(activePoll.endDate, true) || activePoll.endDate}`
            : undefined
        }
        maxWidth="xl"
      >
        <div className="space-y-4 pt-1">
          {activePoll?.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {activePoll.description}
            </p>
          )}

          {hasVoted ? (
            <div className="p-4 rounded-xl border-2 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 flex items-start gap-2 text-sm font-bold">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span>
                شما قبلاً در این نظرسنجی پاسخ داده‌اید. پاسخ‌ها برای ادمین و در
                پرس‌کاد ثبت شده است.
              </span>
            </div>
          ) : activeQuestions.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              این نظرسنجی سوال ندارد.
            </div>
          ) : (
            <>
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-black text-muted-foreground">
                  <span>
                    سوال {toPersianDigits(fillStep + 1)} از{' '}
                    {toPersianDigits(activeQuestions.length)}
                  </span>
                  <span>
                    {toPersianDigits(
                      Math.round(
                        ((fillStep + 1) / activeQuestions.length) * 100,
                      ),
                    )}
                    ٪
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{
                      width: `${((fillStep + 1) / activeQuestions.length) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex gap-1 flex-wrap">
                  {activeQuestions.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFillStep(i)}
                      className={`w-7 h-7 rounded-lg text-[11px] font-black border transition-all ${
                        i === fillStep
                          ? 'border-primary bg-primary text-white'
                          : isQuestionAnswered(activeQuestions[i], i)
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {toPersianDigits(i + 1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Current question */}
              {(() => {
                const q = activeQuestions[fillStep];
                if (!q) return null;
                return (
                  <div className="rounded-xl border border-border p-4 sm:p-5 space-y-4 bg-surface/20">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-base font-black text-foreground leading-relaxed">
                          {q.title}
                        </h4>
                        <Badge variant="neutral">
                          {TYPE_LABEL[q.type] || q.type}
                        </Badge>
                      </div>
                      {q.description && (
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {q.description}
                        </p>
                      )}
                      {q.required !== false && (
                        <p className="text-[11px] font-bold text-amber-600 mt-1">
                          پاسخ اجباری
                        </p>
                      )}
                    </div>
                    {renderAnswerControl(q, fillStep)}
                  </div>
                );
              })()}

              {/* Nav */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFillStep((s) => Math.max(0, s - 1))}
                  disabled={fillStep === 0}
                  className="gap-1"
                >
                  <ArrowRight className="w-4 h-4" />
                  قبلی
                </Button>

                {fillStep < activeQuestions.length - 1 ? (
                  <Button
                    type="button"
                    onClick={() => {
                      if (!canGoNext && activeQuestions[fillStep]?.required !== false) {
                        toast.error('لطفاً به این سوال پاسخ دهید');
                        return;
                      }
                      setFillStep((s) => s + 1);
                    }}
                    className="gap-1"
                  >
                    بعدی
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={submitAllAnswers}
                    disabled={isSubmittingAnswers}
                    className="gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    {isSubmittingAnswers ? 'در حال ارسال…' : 'ارسال نهایی'}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </Modal>

      {renderAnalyticsView()}

      {/* ——— Status change confirm ——— */}
      <Modal
        isOpen={!!statusAction}
        onClose={() => !isStatusBusy && setStatusAction(null)}
        title={
          statusAction?.action === 'close'
            ? 'بستن نظرسنجی'
            : statusAction?.action === 'open'
              ? 'بازگشایی نظرسنجی'
              : statusAction?.action === 'archive'
                ? 'آرشیو نظرسنجی'
                : 'خروج از آرشیو'
        }
        maxWidth="md"
      >
        <div className="space-y-4 pt-1">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {statusAction?.action === 'close' &&
              'با بستن این نظرسنجی، پذیرش پاسخ جدید متوقف و فرم پرس‌کاد نیز غیرفعال می‌شود.'}
            {statusAction?.action === 'open' &&
              'با بازگشایی، نظرسنجی تا پایان مهلت دوباره پذیرای پاسخ خواهد بود.'}
            {statusAction?.action === 'archive' &&
              'با آرشیو، نظرسنجی از لیست فعال خارج و فرم پرس‌کاد بایگانی می‌شود. بعداً می‌توانید فعال‌سازی کنید.'}
            {statusAction?.action === 'unarchive' &&
              'با فعال‌سازی، نظرسنجی از آرشیو خارج می‌شود (بر اساس مهلت و وضعیت بستن، فعال یا پایان‌یافته نمایش داده می‌شود).'}
          </p>
          <p className="text-xs font-black text-foreground">
            «{statusAction?.poll.title}»
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStatusAction(null)}
              disabled={isStatusBusy}
            >
              انصراف
            </Button>
            <Button
              type="button"
              onClick={applyStatusAction}
              isLoading={isStatusBusy}
              variant={
                statusAction?.action === 'archive' ||
                statusAction?.action === 'close'
                  ? 'secondary'
                  : 'primary'
              }
            >
              تأیید
            </Button>
          </div>
        </div>
      </Modal>

      {/* ——— Delete confirm ——— */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => !isStatusBusy && setDeleteTarget(null)}
        title="حذف نظرسنجی"
        maxWidth="md"
      >
        <div className="space-y-4 pt-1">
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              حذف نظرسنجی «{deleteTarget?.title}» قابل بازگشت نیست. پاسخ‌های محلی
              حذف می‌شوند و فرم پرس‌کاد به سطل زباله منتقل خواهد شد.
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isStatusBusy}
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              isLoading={isStatusBusy}
            >
              حذف قطعی
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
