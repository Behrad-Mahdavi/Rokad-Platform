import React, { useState, useEffect } from 'react';
import { Button } from '../../../../components/ui/Button';
import { toast } from '../../../../components/ui/toast/toast';
import { EventIdea } from './EventIdeaSubmissionStep';
import { toPersianDigits, formatJalaliDisplay } from '../../../../utils/jalali';
import { porscadClient, PorscadPollData, PorscadQuestionSettings } from '../../../../lib/porscad/porscad-client';
import { useAuthStore } from '../../../../lib/auth/auth-store';
import {
  Star,
  Award,
  Vote,
  Sparkles,
  Trophy,
  CheckCircle2,
  MessageSquare,
  BarChart3,
  Lightbulb,
  ArrowRight,
  ArrowLeft,
  Flame,
  Check,
  Crown,
  Lock,
  RotateCcw,
  Users,
  Settings2,
  PlusCircle,
  Layers,
  Send,
  RefreshCw,
  Sliders,
  CheckSquare,
  Square,
  HelpCircle,
  Clock,
  Eye,
  EyeOff,
  Medal,
  ShieldCheck,
} from 'lucide-react';

interface EventVotingPorscadStepProps {
  eventId: string;
  eventTitle: string;
  ideas: EventIdea[];
  selectedIdeaId?: string | null;
  onGoToIdeasList: () => void;
  onGoToCanvasStep: () => void;
}

export const EventVotingPorscadStep: React.FC<EventVotingPorscadStepProps> = ({
  eventId,
  eventTitle,
  ideas,
  selectedIdeaId,
  onGoToIdeasList,
  onGoToCanvasStep,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const isManager = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STAFF'].includes(currentUser?.role || '');

  const [porscadPoll, setPorscadPoll] = useState<PorscadPollData | null>(null);
  const [isRefreshingAnalytics, setIsRefreshingAnalytics] = useState(false);

  // Voting state with single submission per student
  const userVoteStorageKey = `rokad_porscad_voted_${eventId}_${currentUser?.id || currentUser?.phone || 'student'}`;
  const selectedOptionsKey = `rokad_porscad_selected_${eventId}_${currentUser?.id || currentUser?.phone || 'student'}`;

  const [hasVoted, setHasVoted] = useState<boolean>(() => {
    return localStorage.getItem(userVoteStorageKey) === 'true';
  });

  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(selectedOptionsKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);

  // Admin Custom Form Builder State
  const [isBuildingMode, setIsBuildingMode] = useState(false);
  const [builderFormTitle, setBuilderFormTitle] = useState(
    `نظرسنجی ایده‌های رویداد: ${eventTitle}`
  );
  const [builderFormDescription, setBuilderFormDescription] = useState(
    `فرم رسمی داوری و رای‌گیری ایده‌های منتخب رویداد «${eventTitle}»`
  );
  const [builderQuestionTitle, setBuilderQuestionTitle] = useState(
    `کدام یک از ایده‌های زیر بیشترین ارزش نوآوری و کاربرد را در رویداد «${eventTitle}» دارد؟`
  );
  const [builderQuestionType, setBuilderQuestionType] = useState<PorscadQuestionSettings['questionType']>('choice');
  const [builderMaxSelections, setBuilderMaxSelections] = useState<number>(1);
  const [builderSelectedIdeaIds, setBuilderSelectedIdeaIds] = useState<string[]>(() => ideas.map((i) => i.id));
  const [isCreatingForm, setIsCreatingForm] = useState(false);

  // Token Modal State
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState(() => porscadClient.getToken());
  const [tokenTestResult, setTokenTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isTestingToken, setIsTestingToken] = useState(false);

  // Star Rating state
  const [activeIdeaId, setActiveIdeaId] = useState<string>(
    selectedIdeaId || (ideas.length > 0 ? ideas[0].id : '')
  );
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [selectedScore, setSelectedScore] = useState<number>(5);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // Load poll on mount
  useEffect(() => {
    const loadPoll = async () => {
      let poll = porscadClient.getLocalPollData(eventId);
      if (poll && poll.isPublished) {
        poll = await porscadClient.fetchLiveAnalytics(eventId);
      }
      setPorscadPoll(poll);
      if (!poll || !poll.isPublished) {
        setIsBuildingMode(true);
      }
    };
    loadPoll();
  }, [eventId]);

  // Keep builder ideas up to date if ideas list changes
  useEffect(() => {
    if (ideas.length > 0 && builderSelectedIdeaIds.length === 0) {
      setBuilderSelectedIdeaIds(ideas.map((i) => i.id));
    }
  }, [ideas]);

  // Refresh Analytics from Porscad
  const handleRefreshAnalytics = async () => {
    setIsRefreshingAnalytics(true);
    try {
      const updated = await porscadClient.fetchLiveAnalytics(eventId);
      if (updated) {
        setPorscadPoll(updated);
        toast.success('آمار و پاسخ‌ها به صورت آنلاین از پرس‌کاد دریافت و به‌روزرسانی شد!');
      }
    } finally {
      setIsRefreshingAnalytics(false);
    }
  };

  // Test and Save Token
  const handleSaveToken = async () => {
    if (!tokenInput.trim()) {
      toast.error('لطفاً توکن معتبر پرس‌کاد را وارد کنید.');
      return;
    }

    setIsTestingToken(true);
    setTokenTestResult(null);
    try {
      const res = await porscadClient.testConnection(tokenInput.trim());
      setTokenTestResult(res);
      if (res.success) {
        porscadClient.setToken(tokenInput.trim());
        toast.success('توکن پرس‌کاد با موفقیت ذخیره و اعتبارسنجی شد! ✅');
        setIsTokenModalOpen(false);
      } else {
        toast.error(res.message || 'خطا در اعتبارسنجی توکن');
      }
    } finally {
      setIsTestingToken(false);
    }
  };

  // Admin handles publishing custom form to Porscad
  const handleCreateAndPublishForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (builderSelectedIdeaIds.length === 0) {
      toast.error('لطفاً حداقل یک ایده را برای قرار گرفتن در فرم پرس‌کاد انتخاب کنید.');
      return;
    }

    const selectedIdeasObjects = ideas.filter((i) => builderSelectedIdeaIds.includes(i.id));

    setIsCreatingForm(true);
    try {
      const createdPoll = await porscadClient.createCustomPorscadForm({
        eventId,
        eventTitle,
        formTitle: builderFormTitle.trim(),
        formDescription: builderFormDescription.trim(),
        questionTitle: builderQuestionTitle.trim(),
        questionType: builderQuestionType,
        selectedIdeas: selectedIdeasObjects,
        maxSelections: builderMaxSelections,
      });

      setPorscadPoll(createdPoll);
      setIsBuildingMode(false);
      toast.success('فرم نظرسنجی رویداد با موفقیت در پرس‌کاد ایجاد و برای دانش‌آموزان فعال شد! 🎉');
    } catch (err: any) {
      const errMsg = err?.message || 'خطا در ایجاد فرم در پرس‌کاد';
      toast.error(errMsg);
      if (errMsg.includes('توکن') || errMsg.includes('JWT') || errMsg.includes('منقضی')) {
        setIsTokenModalOpen(true);
      }
    } finally {
      setIsCreatingForm(false);
    }
  };

  // Toggle selection of idea in builder
  const handleToggleBuilderIdea = (ideaId: string) => {
    setBuilderSelectedIdeaIds((prev) =>
      prev.includes(ideaId) ? prev.filter((id) => id !== ideaId) : [...prev, ideaId]
    );
  };

  // Select all or none in builder
  const handleSelectAllBuilderIdeas = () => {
    if (builderSelectedIdeaIds.length === ideas.length) {
      setBuilderSelectedIdeaIds([]);
    } else {
      setBuilderSelectedIdeaIds(ideas.map((i) => i.id));
    }
  };

  // Student Option Toggle for Voting (Selection only, does NOT auto-submit)
  const handleToggleOption = (optionId: string) => {
    if (!porscadPoll || porscadPoll.isClosed || hasVoted) return;

    const maxAllowed = porscadPoll.settings?.maxSelections || 1;

    if (maxAllowed === 1) {
      setSelectedOptionIds([optionId]);
    } else {
      if (selectedOptionIds.includes(optionId)) {
        setSelectedOptionIds((prev) => prev.filter((id) => id !== optionId));
      } else {
        if (selectedOptionIds.length >= maxAllowed) {
          toast.error(`حداکثر می‌توانید ${toPersianDigits(maxAllowed)} گزینه را انتخاب کنید.`);
          return;
        }
        setSelectedOptionIds((prev) => [...prev, optionId]);
      }
    }
  };

  // Submit Votes to Porscad on Button Click (Single submission per student)
  const handleVoteSubmit = async () => {
    if (!porscadPoll) return;
    if (porscadPoll.isClosed) {
      toast.error('نظرسنجی به پایان رسیده است.');
      return;
    }

    if (hasVoted) {
      toast.error('شما قبلاً رای خود را در این نظرسنجی ثبت کرده‌اید.');
      return;
    }

    if (selectedOptionIds.length === 0) {
      toast.error('لطفاً ابتدا حداقل یک ایده را برای رای‌دهی انتخاب کنید.');
      return;
    }

    setIsSubmittingVote(true);
    try {
      const voterName = currentUser
        ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'دانش‌آموز'
        : 'دانش‌آموز';
      const res = await porscadClient.submitVote(eventId, selectedOptionIds, voterName);
      if (res.success && res.updatedPoll) {
        setPorscadPoll(res.updatedPoll);
        setHasVoted(true);
        localStorage.setItem(userVoteStorageKey, 'true');
        localStorage.setItem(selectedOptionsKey, JSON.stringify(selectedOptionIds));
        toast.success(res.message || 'رای شما با موفقیت در پرس‌کاد ثبت شد! 🎉');
      } else {
        toast.error(res.message || 'خطا در ثبت رای');
      }
    } finally {
      setIsSubmittingVote(false);
    }
  };

  // Finish Poll Modal State & Top Winners Count
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [finishTopWinnersCount, setFinishTopWinnersCount] = useState<number>(3);

  // End Assessment & Choose Top N Winners
  const handleOpenFinishModal = () => {
    setIsFinishModalOpen(true);
  };

  const handleConfirmFinishAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = porscadClient.finishAssessmentAndDetermineWinner(eventId, finishTopWinnersCount);
    if (updated) {
      setPorscadPoll(updated);
      setIsFinishModalOpen(false);
      toast.success(
        `فرم نظرسنجی بسته شد و ${toPersianDigits(finishTopWinnersCount)} ایده برتر مشخص شدند. نتایج در حال حاضر به صورت خصوصی برای مدیر قابل مشاهده است.`
      );
    }
  };

  // Toggle Results Visibility for Students
  const handleTogglePublishResults = () => {
    if (!porscadPoll) return;
    const nextPublic = !porscadPoll.isResultsPublic;
    const updated = porscadClient.setResultsPublic(eventId, nextPublic);
    if (updated) {
      setPorscadPoll(updated);
      if (nextPublic) {
        toast.success('نتایج و رتبه‌بندی ایده‌ها برای همه دانش‌آموزان منتشر شد! 📢');
      } else {
        toast.info('نتایج از دید عمومی دانش‌آموزان مخفی شد.');
      }
    }
  };

  // Reopen Assessment
  const handleReopenAssessment = () => {
    const updated = porscadClient.reopenAssessment(eventId);
    if (updated) {
      setPorscadPoll(updated);
      toast.info('نظرسنجی مجدداً جهت رای‌گیری بازگشایی شد.');
    }
  };

  // Top Ranked Options
  const rankedOptions = porscadPoll?.options
    ? [...porscadPoll.options].sort((a, b) => b.voteCount - a.voteCount)
    : [];
  const topWinnersLimit = porscadPoll?.topWinnersCount || 3;
  const winningOptions = rankedOptions.slice(0, Math.min(topWinnersLimit, rankedOptions.length));

  const currentIdea = ideas.find((i) => i.id === activeIdeaId) || ideas[0];



  const maxSelections = porscadPoll?.settings?.maxSelections || 1;
  const isMultiSelect = maxSelections > 1;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-2xl border-3 border-zinc-900 bg-white p-6 shadow-[6px_6px_0px_0px_#18181b] dark:border-zinc-100 dark:bg-zinc-900 dark:shadow-[6px_6px_0px_0px_#f4f4f5]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-zinc-900/10 dark:border-zinc-100/10 pb-5 mb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border-2 border-zinc-900 bg-amber-400 text-zinc-950 text-xs font-black mb-2 shadow-[2px_2px_0px_0px_#18181b]">
              <Vote className="w-4 h-4" />
              <span>گام سوم: وب‌سرویس پرس‌کاد و رای‌گیری ایده‌ها</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-100">
              نظرسنجی، داوری و تعیین ایده برگزیده رویداد
            </h2>
            <p className="text-xs md:text-sm font-bold text-zinc-500 dark:text-zinc-400 mt-1">
              مدیر ایده‌های منتخب را در فرم پرس‌کاد قرار داده و دانش‌آموزان به‌صورت زنده رای می‌دهند.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isManager && (
              <Button
                variant="outline"
                onClick={() => setIsTokenModalOpen(true)}
                className="gap-2 text-xs font-bold border-2 border-zinc-900 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-800 dark:text-indigo-300"
              >
                <Settings2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>تنظیمات اتصال پرس‌کاد</span>
              </Button>
            )}
            {isManager && porscadPoll?.isPublished && (
              <Button
                variant="outline"
                onClick={() => setIsBuildingMode(!isBuildingMode)}
                className="gap-2 text-xs font-bold border-2 border-zinc-900 shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200"
              >
                <Sliders className="w-4 h-4 text-primary" />
                <span>{isBuildingMode ? 'مشاهده نظرسنجی فعال' : 'طراحی و ساخت فرم جدید'}</span>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onGoToIdeasList}
              className="gap-2 text-xs font-bold border-2 border-zinc-900 shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200"
            >
              <ArrowRight className="w-4 h-4" />
              <span>مشاهده تمام ایده‌ها</span>
            </Button>
            <Button
              variant="primary"
              onClick={onGoToCanvasStep}
              className="gap-2 text-xs font-black border-2 border-zinc-900 shadow-[3px_3px_0px_0px_#18181b]"
            >
              <span>رفتن به تشکیل تیم</span>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Action controls (Refresh Analytics / Finish Poll) */}
        {porscadPoll?.isPublished && (
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="outline"
              onClick={handleRefreshAnalytics}
              disabled={isRefreshingAnalytics}
              className="gap-2 text-xs font-bold border-2 border-zinc-900 shadow-[2px_2px_0px_0px_#18181b]"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-primary ${isRefreshingAnalytics ? 'animate-spin' : ''}`} />
              <span>بروزرسانی آنلاین آمار</span>
            </Button>

            {porscadPoll.isClosed ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-emerald-700 bg-emerald-100 text-emerald-900 text-xs font-black">
                  <Lock className="w-3.5 h-3.5" />
                  <span>فرم بسته شد</span>
                </span>
                {isManager && (
                  <button
                    onClick={handleReopenAssessment}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border-2 border-zinc-900 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-black shadow-[2px_2px_0px_0px_#18181b]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>بازگشایی فرم</span>
                  </button>
                )}
              </div>
            ) : (
              isManager && (
                <Button
                  variant="outline"
                  onClick={handleOpenFinishModal}
                  className="gap-2 text-xs font-black border-2 border-zinc-900 bg-amber-300 hover:bg-amber-400 text-zinc-950 shadow-[3px_3px_0px_0px_#18181b]"
                >
                  <Trophy className="w-4 h-4 text-zinc-950" />
                  <span>اتمام نظرسنجی و انتخاب ایده‌های برتر</span>
                </Button>
              )
            )}
          </div>
        )}
      </div>

      {/* ================= WINNING IDEAS PODIUM (SHOWS FOR ALL WHEN POLL IS CLOSED) ================= */}
      {porscadPoll?.isClosed && winningOptions.length > 0 && (
        <div className="space-y-6">
          {/* Status Announcement Banner */}
          <div className="p-4 md:p-5 rounded-2xl border-3 border-zinc-900 bg-amber-300 text-zinc-950 shadow-[4px_4px_0px_0px_#18181b] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl border-2 border-zinc-900 bg-white flex items-center justify-center font-black shadow-[2px_2px_0px_0px_#18181b]">
                <Trophy className="w-5 h-5 text-amber-600 fill-amber-400" />
              </div>
              <div>
                <h4 className="text-sm md:text-base font-black">
                  نظرسنجی به پایان رسید و ایده‌های برگزیده به شرح زیر است:
                </h4>
                <p className="text-xs font-bold text-zinc-800 mt-0.5">
                  {isManager
                    ? `رتبه‌بندی ${toPersianDigits(winningOptions.length)} ایده برتر بر اساس مجموع آرای ثبت‌شده در پرس‌کاد (${toPersianDigits(porscadPoll.totalVotes)} رای)`
                    : `تعداد ${toPersianDigits(winningOptions.length)} ایده برگزیده رویداد مشخص شده‌اند.`}
                </p>
              </div>
            </div>

            {isManager && (
              <Button
                variant={porscadPoll.isResultsPublic ? 'outline' : 'primary'}
                onClick={handleTogglePublishResults}
                className="gap-2 text-xs font-black border-2 border-zinc-900 shadow-[2px_2px_0px_0px_#18181b] bg-white text-zinc-950"
              >
                {porscadPoll.isResultsPublic ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    <span>مخفی‌سازی از دانش‌آموزان</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    <span>📢 انتشار عمومی نتایج</span>
                  </>
                )}
              </Button>
            )}
          </div>



          {/* Top Winners Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {winningOptions.map((opt, rankIdx) => {
              const matchingIdea = ideas.find((i) => i.id === opt.ideaId || i.id === opt.id);
              const isFirstPlace = rankIdx === 0;
              const isSecondPlace = rankIdx === 1;
              const isThirdPlace = rankIdx === 2;

              const cardContainerStyle = isManager
                ? isFirstPlace
                  ? 'border-amber-500 bg-gradient-to-b from-amber-50/90 via-amber-100/30 to-white dark:from-amber-950/40 dark:via-zinc-900 dark:to-zinc-900 shadow-[6px_6px_0px_0px_#f59e0b] ring-2 ring-amber-400'
                  : isSecondPlace
                  ? 'border-slate-400 bg-gradient-to-b from-slate-100/80 via-slate-50 to-white dark:from-zinc-800/60 dark:via-zinc-900 dark:to-zinc-900 shadow-[6px_6px_0px_0px_#64748b]'
                  : isThirdPlace
                  ? 'border-amber-800 bg-gradient-to-b from-amber-100/60 via-orange-50 to-white dark:from-amber-950/30 dark:via-zinc-900 dark:to-zinc-900 shadow-[6px_6px_0px_0px_#92400e]'
                  : 'border-zinc-900 bg-white dark:bg-zinc-900 shadow-[5px_5px_0px_0px_#18181b]'
                : 'border-zinc-900 bg-white dark:bg-zinc-900 shadow-[5px_5px_0px_0px_#18181b]';

              const rankBadgeBg = isFirstPlace
                ? 'bg-amber-400 text-zinc-950 border-zinc-900 shadow-[2px_2px_0px_0px_#18181b]'
                : isSecondPlace
                ? 'bg-slate-200 text-zinc-950 border-zinc-900 shadow-[2px_2px_0px_0px_#18181b]'
                : isThirdPlace
                ? 'bg-amber-800 text-white border-zinc-900 shadow-[2px_2px_0px_0px_#18181b]'
                : 'bg-indigo-100 text-indigo-950 border-zinc-900';

              const rankTitle = isFirstPlace
                ? '🥇 رتبه اول (ایده برتر طلایی)'
                : isSecondPlace
                ? '🥈 رتبه دوم (نقره‌ای)'
                : isThirdPlace
                ? '🥉 رتبه سوم (برنزی)'
                : `🎖️ رتبه ${toPersianDigits(rankIdx + 1)} برگزیده`;

              return (
                <div
                  key={opt.id}
                  className={`relative flex flex-col justify-between rounded-2xl border-3 p-6 transition-all ${cardContainerStyle}`}
                >
                  <div className="space-y-4">
                    {/* Rank Badge & Manager Stats */}
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-xl border-2 font-black text-xs ${
                        isManager ? rankBadgeBg : 'bg-amber-400 text-zinc-950 border-zinc-900 shadow-[2px_2px_0px_0px_#18181b]'
                      }`}>
                        {isManager ? rankTitle : '✨ ایده برگزیده رویداد'}
                      </span>
                      {isManager && (
                        <div className="text-left">
                          <span className="text-lg font-black text-zinc-900 dark:text-zinc-100">
                            ٪{toPersianDigits(opt.percentage || 0)}
                          </span>
                          <span className="block text-[10px] font-bold text-zinc-500">
                            {toPersianDigits(opt.voteCount)} رای
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Idea Details */}
                    <div>
                      <h4 className="text-base font-black text-zinc-900 dark:text-zinc-100 leading-snug">
                        {matchingIdea ? matchingIdea.title : opt.text}
                      </h4>
                      <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-1">
                        طراح / سرگروه: <strong className="text-zinc-800 dark:text-zinc-200">{matchingIdea?.authorName || opt.authorName || 'دانش‌آموز'}</strong>
                      </p>
                    </div>

                    {matchingIdea?.description && (
                      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                        {matchingIdea.description}
                      </p>
                    )}

                    {/* Manager Progress Bar */}
                    {isManager && (
                      <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden border border-zinc-300 dark:border-zinc-700">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            isFirstPlace ? 'bg-amber-400' : isSecondPlace ? 'bg-slate-400' : 'bg-amber-700'
                          }`}
                          style={{ width: `${opt.percentage || 0}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <Button
                      variant="primary"
                      onClick={onGoToCanvasStep}
                      className="w-full text-xs font-black border-2 border-zinc-900 shadow-[3px_3px_0px_0px_#18181b]"
                    >
                      <span>ورود به تشکیل تیم (طرح برگزیده)</span>
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= PORSCAD VOTING & FORM BUILDER ================= */}
      {isBuildingMode && isManager ? (
            <div className="rounded-2xl border-3 border-zinc-900 bg-white p-6 md:p-8 shadow-[6px_6px_0px_0px_#18181b] dark:border-zinc-100 dark:bg-zinc-900 space-y-6">
              <div className="border-b-2 border-zinc-900/10 pb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border-2 border-zinc-900 bg-indigo-400 text-zinc-950 text-xs font-black mb-2 shadow-[2px_2px_0px_0px_#18181b]">
                  <Sliders className="w-4 h-4" />
                  <span>پنل مدیریت: طراحی دستی و انتشار فرم در پرس‌کاد</span>
                </div>
                <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                  سازنده فرم و نظرسنجی پرس‌کاد برای ایده‌های رویداد
                </h3>
                <p className="text-xs md:text-sm font-medium text-zinc-600 dark:text-zinc-400 mt-1">
                  پس از ثبت تمامی ایده‌ها توسط دانش‌آموزان، نوع سوال، تعداد انتخاب مجاز و ایده‌های منتخب را تعیین کرده و فرم را در پرس‌کاد منتشر نمایید.
                </p>
              </div>

              <form onSubmit={handleCreateAndPublishForm} className="space-y-6">
                {/* Form Title & Description */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-2">
                      نام و عنوان کلی فرم در پرس‌کاد (Form Title):
                    </label>
                    <input
                      type="text"
                      value={builderFormTitle}
                      onChange={(e) => setBuilderFormTitle(e.target.value)}
                      required
                      className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-xs md:text-sm font-bold shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900 focus:outline-none"
                      placeholder="مثال: نظرسنجی ایده‌های هکاتون"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-2">
                      توضیحات فرم در پرس‌کاد (Form Description):
                    </label>
                    <input
                      type="text"
                      value={builderFormDescription}
                      onChange={(e) => setBuilderFormDescription(e.target.value)}
                      className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-xs md:text-sm font-bold shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900 focus:outline-none"
                      placeholder="مثال: فرم داوری و انتخاب بهترین طرح‌های نوآورانه"
                    />
                  </div>
                </div>

                {/* Question Title */}
                <div>
                  <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-2">
                    متن و عنوان سوال در پرس‌کاد (Question Title):
                  </label>
                  <input
                    type="text"
                    value={builderQuestionTitle}
                    onChange={(e) => setBuilderQuestionTitle(e.target.value)}
                    required
                    className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-xs md:text-sm font-bold shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900 focus:outline-none"
                    placeholder="مثال: کدام ایده بیشترین نوآوری را دارد؟"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Question Type */}
                  <div>
                    <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-2">
                      نوع سوال پرس‌کاد (Question Type):
                    </label>
                    <select
                      value={builderQuestionType}
                      onChange={(e) => setBuilderQuestionType(e.target.value as any)}
                      className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-xs font-bold shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900"
                    >
                      <option value="choice">چندگزینه‌ای / دکمه‌ای (Choice)</option>
                      <option value="dropdown">منوی کشویی (Dropdown)</option>
                      <option value="rating">امتیازدهی ۵ ستاره‌ای (Rating)</option>
                      <option value="opinion_scale">طیف لیکرت و مقیاس نظری (Opinion Scale)</option>
                      <option value="yes_no">تایید / عدم تایید (Yes / No)</option>
                    </select>
                  </div>

                  {/* Max Selections */}
                  <div>
                    <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-2">
                      حداکثر تعداد انتخاب مجاز هر کاربر (max_selections):
                    </label>
                    <select
                      value={builderMaxSelections}
                      onChange={(e) => setBuilderMaxSelections(Number(e.target.value))}
                      className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-xs font-bold shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900"
                    >
                      <option value={1}>۱ انتخاب (تک گزینه‌ای - هر کاربر فقط به یک ایده رای می‌دهد)</option>
                      <option value={2}>۲ انتخاب (امکان رای به ۲ ایده)</option>
                      <option value={3}>۳ انتخاب (امکان رای به ۳ ایده برتر)</option>
                      <option value={5}>۵ انتخاب (انتخاب تا ۵ ایده)</option>
                      <option value={ideas.length || 10}>نامحدود (تمام ایده‌های تیک خورده)</option>
                    </select>
                  </div>
                </div>

                {/* Ideas Selection Checkboxes */}
                <div className="rounded-2xl border-2 border-zinc-900 bg-zinc-50 dark:bg-zinc-800/40 p-5 shadow-[3px_3px_0px_0px_#18181b]">
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-300 dark:border-zinc-700 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-5 h-5 text-primary" />
                      <h4 className="text-xs md:text-sm font-black text-zinc-900 dark:text-zinc-100">
                        انتخاب دستی ایده‌ها برای قرار گرفتن در فرم نظرسنجی ({toPersianDigits(builderSelectedIdeaIds.length)} از {toPersianDigits(ideas.length)} ایده انتخاب شده):
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={handleSelectAllBuilderIdeas}
                      className="text-xs font-black text-primary hover:underline"
                    >
                      {builderSelectedIdeaIds.length === ideas.length ? 'عدم انتخاب همه' : 'انتخاب همه ایده‌ها'}
                    </button>
                  </div>

                  {ideas.length === 0 ? (
                    <div className="p-6 text-center text-xs font-bold text-zinc-500">
                      هنوز هیچ ایده‌ای در گام اول ثبت نشده است. ابتدا به دانش‌آموزان اجازه دهید ایده‌ها را ثبت کنند.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                      {ideas.map((idea) => {
                        const isChecked = builderSelectedIdeaIds.includes(idea.id);
                        return (
                          <div
                            key={idea.id}
                            onClick={() => handleToggleBuilderIdea(idea.id)}
                            className={`cursor-pointer flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all ${
                              isChecked
                                ? 'border-zinc-900 bg-amber-100 dark:bg-amber-950/50 shadow-[2px_2px_0px_0px_#18181b]'
                                : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-zinc-500'
                            }`}
                          >
                            <div className="mt-0.5">
                              {isChecked ? (
                                <CheckSquare className="w-5 h-5 text-zinc-950 fill-amber-400" />
                              ) : (
                                <Square className="w-5 h-5 text-zinc-400" />
                              )}
                            </div>
                            <div className="overflow-hidden">
                              <h5 className="text-xs font-black text-zinc-900 dark:text-zinc-100 line-clamp-1">
                                {idea.title}
                              </h5>
                              <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mt-0.5">
                                طراح / رئیس ایده: {idea.authorName} ({idea.authorRole})
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Submit & Publish Button */}
                <div className="flex items-center justify-end gap-3 pt-3">
                  {porscadPoll?.isPublished && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsBuildingMode(false)}
                      className="border-2 border-zinc-900 font-bold text-xs"
                    >
                      انصراف
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isCreatingForm || builderSelectedIdeaIds.length === 0}
                    className="border-2 border-zinc-900 font-black text-xs gap-2 px-8 py-3 shadow-[4px_4px_0px_0px_#18181b]"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isCreatingForm ? 'در حال انتشار در پرس‌کاد...' : 'ساخت و انتشار رسمی فرم در پرس‌کاد'}</span>
                  </Button>
                </div>
              </form>
            </div>
          ) : porscadPoll && porscadPoll.isPublished ? (
            /* 2. ACTIVE PUBLISHED POLL VIEW FOR STUDENTS & ADMIN */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-2xl border-3 border-zinc-900 bg-white p-6 md:p-8 shadow-[6px_6px_0px_0px_#18181b] dark:border-zinc-100 dark:bg-zinc-900 dark:shadow-[6px_6px_0px_0px_#f4f4f5]">
                  {/* Meta */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-zinc-900/10 dark:border-zinc-100/10 pb-4 mb-5">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-lg border-2 border-zinc-900 bg-primary/20 text-primary font-black text-xs">
                        فرم رسمی پرس‌کاد ({isMultiSelect ? `تا ${toPersianDigits(maxSelections)} انتخاب` : 'تک انتخابی'})
                      </span>
                      <span className="text-xs font-bold text-zinc-500">
                        شناسه: <code className="font-mono text-[11px]">{porscadPoll.formPublicId || porscadPoll.formId}</code>
                      </span>
                    </div>
                    {isManager && (
                      <div className="flex items-center gap-1.5 text-xs font-black text-zinc-700 dark:text-zinc-300">
                        <Users className="w-4 h-4 text-primary" />
                        <span>مجموع کل آرا: {toPersianDigits(porscadPoll.totalVotes)}</span>
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <div className="mb-6">
                    <h3 className="text-lg md:text-xl font-black text-zinc-900 dark:text-zinc-100 mb-2">
                      {porscadPoll.questionTitle || porscadPoll.title}
                    </h3>
                    <p className="text-xs md:text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {porscadPoll.description}
                    </p>
                    {isMultiSelect && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300 text-xs font-bold">
                        <span>انتخاب‌های فعلی شما: <strong>{toPersianDigits(selectedOptionIds.length)}</strong> از <strong>{toPersianDigits(maxSelections)}</strong> مجاز</span>
                      </div>
                    )}
                  </div>

                  {/* Has Voted Status Banner */}
                  {hasVoted && (
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border-2 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200">
                      <div className="flex items-center gap-2 text-xs font-black">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        <span>رای شما در پرس‌کاد با موفقیت ثبت شد (هر دانش‌آموز فقط یک‌بار مجاز به ثبت رای است).</span>
                      </div>
                      {isManager && (
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.removeItem(userVoteStorageKey);
                            localStorage.removeItem(selectedOptionsKey);
                            setHasVoted(false);
                            setSelectedOptionIds([]);
                            toast.info('رای آزمایشی برای مدیر ریست شد.');
                          }}
                          className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 underline"
                        >
                          ریست رای آزمایشی (مخصوص تست مدیر)
                        </button>
                      )}
                    </div>
                  )}

                  {/* Options Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {porscadPoll.options.map((option, idx) => {
                      const isSelected = selectedOptionIds.includes(option.id) || selectedOptionIds.includes(option.ideaId || '');
                      const winningIds = porscadPoll.winningOptionIds || (porscadPoll.winningOptionId ? [porscadPoll.winningOptionId] : []);
                      const isWinner = porscadPoll.isClosed && (winningIds.includes(option.id) || winningIds.includes(option.ideaId || ''));
                      const matchingIdea = ideas.find((i) => i.id === option.ideaId || i.id === option.id);
                      const isInteractive = !porscadPoll.isClosed && !hasVoted;

                      return (
                        <div
                          key={option.id}
                          onClick={() => isInteractive && handleToggleOption(option.id)}
                          className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border-3 transition-all ${
                            isWinner
                              ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 shadow-[4px_4px_0px_0px_#f59e0b]'
                              : isSelected
                              ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-[4px_4px_0px_0px_#059669]'
                              : porscadPoll.isClosed || hasVoted
                              ? 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 opacity-90'
                              : 'cursor-pointer border-zinc-900 bg-white hover:bg-zinc-50 dark:border-zinc-200 dark:bg-zinc-900 shadow-[3px_3px_0px_0px_#18181b]'
                          } p-4 md:p-5`}
                        >
                          {/* Fill Progress Bar (Admin Only) */}
                          {isManager && (hasVoted || porscadPoll.isClosed) && (
                            <div
                              className={`absolute inset-y-0 right-0 transition-all duration-700 ${
                                isWinner
                                  ? 'bg-amber-400/25 dark:bg-amber-400/20'
                                  : isSelected
                                  ? 'bg-emerald-500/20 dark:bg-emerald-500/25'
                                  : 'bg-primary/10 dark:bg-primary/20'
                              }`}
                              style={{ width: `${option.percentage || 0}%` }}
                            />
                          )}

                          <div className="relative z-10 space-y-3">
                            {/* Card Top: Selection Indicator & Winner Badge */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {(!porscadPoll.isClosed || isManager) && (
                                  <span className="w-7 h-7 rounded-lg border-2 border-zinc-900 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 flex items-center justify-center font-black text-xs shadow-[1px_1px_0px_0px_#18181b]">
                                    {toPersianDigits(idx + 1)}
                                  </span>
                                )}
                                {isWinner && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-600 bg-amber-400 text-zinc-950 text-xs font-black shadow-[1px_1px_0px_0px_#18181b]">
                                    <Trophy className="w-3.5 h-3.5" />
                                    <span>ایده برگزیده</span>
                                  </span>
                                )}
                              </div>

                              <div
                                className={`w-6 h-6 ${isMultiSelect ? 'rounded-lg' : 'rounded-full'} border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                  isWinner
                                    ? 'border-amber-600 bg-amber-400 text-zinc-950 shadow-[1px_1px_0px_0px_#18181b]'
                                    : isSelected
                                    ? 'border-emerald-600 bg-emerald-500 text-white'
                                    : 'border-zinc-900 bg-white dark:border-zinc-300 dark:bg-zinc-800'
                                }`}
                              >
                                {isWinner ? (
                                  <Crown className="w-3.5 h-3.5 fill-zinc-950" />
                                ) : isSelected ? (
                                  <Check className="w-3.5 h-3.5" />
                                ) : (
                                  <span className="text-[10px] font-black text-zinc-400">•</span>
                                )}
                              </div>
                            </div>

                            {/* Title & Description */}
                            <div>
                              <h4 className="text-sm md:text-base font-black text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">
                                {matchingIdea ? matchingIdea.title : option.text}
                              </h4>
                              {matchingIdea?.description && (
                                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 line-clamp-3 leading-relaxed">
                                  {matchingIdea.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Card Footer: Author & Vote count (Vote Count Admin Only) */}
                          <div className="relative z-10 mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs font-bold">
                            <span className="text-zinc-500 dark:text-zinc-400 truncate max-w-[140px]">
                              طراح: <strong className="text-zinc-800 dark:text-zinc-200">{matchingIdea?.authorName || option.authorName || 'دانش‌آموز'}</strong>
                            </span>

                            {isManager && (hasVoted || porscadPoll.isClosed) && (
                              <div className="flex items-center gap-2 font-black text-zinc-900 dark:text-zinc-100">
                                <span>{toPersianDigits(option.voteCount)} رای</span>
                                <span className="text-primary font-black">٪{toPersianDigits(option.percentage || 0)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Manual Submit Button for All Question Types */}
                  {!hasVoted && !porscadPoll.isClosed && (
                    <div className="mt-6 pt-4 border-t-2 border-zinc-900/10 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs font-bold text-zinc-500">
                        {isMultiSelect
                          ? `حداکثر ${toPersianDigits(maxSelections)} گزینه را انتخاب کرده و دکمه «ثبت نهایی رای» را بزنید.`
                          : 'ایده مورد نظر خود را با کلیک روی کارت انتخاب کرده و دکمه «ثبت نهایی رای» را بزنید.'}
                      </span>
                      <Button
                        variant="primary"
                        disabled={isSubmittingVote || selectedOptionIds.length === 0}
                        onClick={handleVoteSubmit}
                        className="gap-2 text-xs font-black border-2 border-zinc-900 shadow-[3px_3px_0px_0px_#18181b] px-6 py-2.5"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isSubmittingVote ? 'در حال ارسال به پرس‌کاد...' : `ثبت نهایی رای در پرس‌کاد (${toPersianDigits(selectedOptionIds.length)} ایده)`}</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Sidebar: Real-Time Analytics from Porscad (Admin Only) */}
              {isManager && (
                <div className="space-y-6">
                  <div className="rounded-2xl border-3 border-zinc-900 bg-white p-5 md:p-6 shadow-[5px_5px_0px_0px_#18181b] dark:border-zinc-100 dark:bg-zinc-900 dark:shadow-[5px_5px_0px_0px_#f4f4f5]">
                    <div className="flex items-center justify-between border-b-2 border-zinc-900/10 dark:border-zinc-100/10 pb-4 mb-4">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                          آمار و تحلیل زنده پرس‌کاد (ویژه ادمین)
                        </h3>
                      </div>
                      <span className="text-[11px] font-bold text-zinc-500">آنالیتیکس آنلاین</span>
                    </div>

                    <div className="space-y-3">
                      {[...porscadPoll.options]
                        .sort((a, b) => b.voteCount - a.voteCount)
                        .map((opt, rank) => {
                          const matching = ideas.find((i) => i.id === opt.ideaId || i.id === opt.id);
                          return (
                            <div
                              key={opt.id}
                              className="p-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-xs font-black">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black border ${
                                      rank === 0
                                        ? 'bg-amber-400 text-zinc-950 border-zinc-900'
                                        : 'bg-zinc-200 text-zinc-700 border-zinc-400 dark:bg-zinc-700 dark:text-zinc-200'
                                    }`}
                                  >
                                    {toPersianDigits(rank + 1)}
                                  </span>
                                  <span className="text-zinc-900 dark:text-zinc-100 line-clamp-1 max-w-[140px]">
                                    {matching ? matching.title : opt.text}
                                  </span>
                                </div>
                                <span className="text-primary font-black">
                                  ٪{toPersianDigits(opt.percentage || 0)}
                                </span>
                              </div>

                              <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    rank === 0 ? 'bg-amber-400' : 'bg-primary'
                                  }`}
                                  style={{ width: `${opt.percentage || 0}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs font-bold text-zinc-600 dark:text-zinc-400">
                      <span>تعداد کل ایده‌های فرم:</span>
                      <span className="font-black text-zinc-900 dark:text-zinc-100">{toPersianDigits(porscadPoll.options.length)} ایده</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* 3. AWAITING POLL CREATION BY ADMIN (FOR STUDENTS) - SHOW REGISTERED IDEAS IN CARDS */
            <div className="space-y-6">
              <div className="rounded-2xl border-3 border-zinc-900 bg-white p-6 md:p-8 text-center shadow-[6px_6px_0px_0px_#18181b] dark:border-zinc-100 dark:bg-zinc-900 space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl border-2 border-zinc-900 bg-amber-300 flex items-center justify-center shadow-[2px_2px_0px_0px_#18181b]">
                  <Clock className="w-7 h-7 text-zinc-950 animate-spin" />
                </div>
                <h3 className="text-lg md:text-xl font-black text-zinc-900 dark:text-zinc-100">
                  در انتظار ایجاد و انتشار فرم نظرسنجی توسط مدیر رویداد
                </h3>
                <p className="text-xs md:text-sm font-medium text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                  ایده‌های زیر تاکنون برای این رویداد ثبت شده‌اند. پس از انتشار فرم رسمی در پرس‌کاد، می‌توانید در همین بخش به طرح‌های منتخب رای دهید.
                </p>
              </div>

              {/* Registered Ideas Card Showcase in Porscad Tab */}
              <div className="rounded-2xl border-3 border-zinc-900 bg-white p-6 md:p-8 shadow-[6px_6px_0px_0px_#18181b] dark:border-zinc-100 dark:bg-zinc-900 space-y-5">
                <div className="flex items-center justify-between border-b-2 border-zinc-900/10 pb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <h4 className="text-sm md:text-base font-black text-zinc-900 dark:text-zinc-100">
                      کارت‌های ایده‌های ثبت‌شده رویداد ({toPersianDigits(ideas.length)} ایده به ترتیب ثبت):
                    </h4>
                  </div>
                  <span className="text-xs font-black text-primary">ویترین ایده‌ها</span>
                </div>

                {ideas.length === 0 ? (
                  <div className="p-8 text-center text-xs font-bold text-zinc-500 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl">
                    هنوز ایده‌ای در گام اول ثبت نشده است.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ideas.map((idea, idx) => (
                      <div
                        key={idea.id}
                        className="flex flex-col justify-between rounded-2xl border-2 border-zinc-900 bg-zinc-50 dark:bg-zinc-800/60 p-4 shadow-[3px_3px_0px_0px_#18181b] space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="w-6 h-6 rounded-lg border-2 border-zinc-900 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 flex items-center justify-center font-black text-xs">
                              {toPersianDigits(idx + 1)}
                            </span>
                            <span className="text-[10px] font-black text-zinc-500">
                              {formatJalaliDisplay(idea.createdAt, false)}
                            </span>
                          </div>

                          <h5 className="text-sm font-black text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug">
                            {idea.title}
                          </h5>

                          <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                            {idea.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                          طراح: <strong className="text-zinc-800 dark:text-zinc-200">{idea.authorName}</strong> ({idea.authorRole})
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
      {/* ================= TOKEN MANAGEMENT MODAL ================= */}
      {isTokenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border-3 border-zinc-900 bg-white p-6 shadow-[8px_8px_0px_0px_#18181b] dark:border-zinc-100 dark:bg-zinc-900 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b-2 border-zinc-900/10 pb-4">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                  تنظیمات اتصال و توکن احراز هویت پرس‌کاد
                </h3>
              </div>
              <button
                onClick={() => setIsTokenModalOpen(false)}
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed">
                برای ثبت مستقیم فرم‌ها و سوالات در اکانت پرس‌کاد شما، توکن نشست (Access Token) خود را از پرس‌کاد (یا با لاگین در پرس‌کاد از بخش Inspect ➔ Application ➔ LocalStorage کلید <code className="font-mono text-primary font-bold">sb-pivwmyacpxdywevccpmw-auth-token</code>) کپی کرده و در کادر زیر قرار دهید:
              </p>

              <div>
                <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1.5">
                  توکن پرس‌کاد (JWT Access Token):
                </label>
                <textarea
                  rows={4}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="eyJhbGciOiJFUzI1NiIsImtpZCI6..."
                  className="w-full rounded-xl border-2 border-zinc-900 bg-zinc-50 dark:bg-zinc-800 p-3 font-mono text-[11px] font-bold shadow-[2px_2px_0px_0px_#18181b] focus:outline-none"
                />
              </div>

              {tokenTestResult && (
                <div
                  className={`p-3 rounded-xl border-2 text-xs font-bold ${
                    tokenTestResult.success
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'border-rose-600 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
                  }`}
                >
                  {tokenTestResult.message}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTokenModalOpen(false)}
                className="border-2 border-zinc-900 text-xs font-bold"
              >
                بستن
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={isTestingToken}
                onClick={handleSaveToken}
                className="border-2 border-zinc-900 text-xs font-black gap-2 shadow-[3px_3px_0px_0px_#18181b]"
              >
                <span>{isTestingToken ? 'در حال تست اتصال...' : 'تست اتصال و ذخیره توکن'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= FINISH POLL & SELECT TOP N WINNERS MODAL ================= */}
      {isFinishModalOpen && porscadPoll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border-3 border-zinc-900 bg-white p-6 shadow-[8px_8px_0px_0px_#18181b] dark:border-zinc-100 dark:bg-zinc-900 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b-2 border-zinc-900/10 dark:border-zinc-100/10 pb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-500 fill-amber-400" />
                <div>
                  <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                    اتمام نظرسنجی و مشخص‌سازی ایده‌های برتر
                  </h3>
                  <p className="text-[11px] font-bold text-zinc-500 mt-0.5">
                    بستن فرم و تعیین تعداد طرح‌های برگزیده جهت نمایش در سکوی افتخار
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFinishModalOpen(false)}
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmFinishAssessment} className="space-y-5">
              {/* Explanation Note */}
              <div className="p-4 rounded-xl border-2 border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 text-xs font-bold leading-relaxed space-y-1">
                <div className="flex items-center gap-1.5 font-black text-amber-900 dark:text-amber-300">
                  <Lock className="w-4 h-4" />
                  <span>توقف رای‌گیری و بررسی اختصاصی مدیر</span>
                </div>
                <p>
                  با تایید این فرم، رای‌گیری در پرس‌کاد متوقف شده و فرم قفل می‌شود. نتایج ابتدا فقط برای شما نمایش داده خواهد شد و در صورت تایید نهایی می‌توانید دکمه <strong>«انتشار نتایج برای همه دانش‌آموزان»</strong> را بزنید.
                </p>
              </div>

              {/* Number of Top Ideas Selection */}
              <div>
                <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-2">
                  تعداد ایده‌های برتر جهت رتبه‌بندی و نمایش در سکوی افتخار (Top N Winners):
                </label>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                  {[1, 2, 3, 5, 10, porscadPoll.options.length].map((num) => {
                    const label = num === porscadPoll.options.length ? 'همه' : `${toPersianDigits(num)} برتر`;
                    const isSelected = finishTopWinnersCount === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setFinishTopWinnersCount(num)}
                        className={`py-2 px-1 rounded-xl text-xs font-black border-2 transition-all ${
                          isSelected
                            ? 'border-zinc-900 bg-amber-400 text-zinc-950 shadow-[2px_2px_0px_0px_#18181b]'
                            : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-500'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">یا انتخاب تعداد دلخواه:</span>
                  <input
                    type="number"
                    min={1}
                    max={porscadPoll.options.length}
                    value={finishTopWinnersCount}
                    onChange={(e) => setFinishTopWinnersCount(Math.max(1, Math.min(porscadPoll.options.length, Number(e.target.value))))}
                    className="w-24 rounded-xl border-2 border-zinc-900 bg-white dark:bg-zinc-800 p-2 text-center text-xs font-black shadow-[2px_2px_0px_0px_#18181b]"
                  />
                  <span className="text-xs font-bold text-zinc-500">
                    از مجموع {toPersianDigits(porscadPoll.options.length)} ایده فرم
                  </span>
                </div>
              </div>

              {/* Current Ranking Preview */}
              <div className="rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-zinc-700 dark:text-zinc-300">
                  <span>پیش‌نمایش رتبه‌بندی فعلی ({toPersianDigits(finishTopWinnersCount)} ایده برتر):</span>
                  <span className="text-[11px] text-zinc-500">مجموع آرا: {toPersianDigits(porscadPoll.totalVotes)}</span>
                </div>

                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {[...porscadPoll.options]
                    .sort((a, b) => b.voteCount - a.voteCount)
                    .slice(0, finishTopWinnersCount)
                    .map((opt, rIdx) => {
                      const matching = ideas.find((i) => i.id === opt.ideaId || i.id === opt.id);
                      return (
                        <div
                          key={opt.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px] border ${
                                rIdx === 0
                                  ? 'bg-amber-400 text-zinc-950 border-zinc-900'
                                  : rIdx === 1
                                  ? 'bg-zinc-200 text-zinc-900 border-zinc-900'
                                  : rIdx === 2
                                  ? 'bg-amber-700 text-white border-zinc-900'
                                  : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
                              }`}
                            >
                              {toPersianDigits(rIdx + 1)}
                            </span>
                            <span className="font-black text-zinc-900 dark:text-zinc-100 line-clamp-1 max-w-[220px]">
                              {matching ? matching.title : opt.text}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-bold hidden sm:inline">
                              ({matching?.authorName || opt.authorName})
                            </span>
                          </div>

                          <div className="flex items-center gap-2 font-black">
                            <span className="text-zinc-700 dark:text-zinc-300">{toPersianDigits(opt.voteCount)} رای</span>
                            <span className="text-amber-600 dark:text-amber-400">٪{toPersianDigits(opt.percentage || 0)}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFinishModalOpen(false)}
                  className="border-2 border-zinc-900 text-xs font-bold"
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="border-2 border-zinc-900 text-xs font-black gap-2 bg-amber-400 hover:bg-amber-500 text-zinc-950 shadow-[3px_3px_0px_0px_#18181b]"
                >
                  <Lock className="w-4 h-4" />
                  <span>تایید، بستن فرم و نمایش {toPersianDigits(finishTopWinnersCount)} ایده برتر</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
