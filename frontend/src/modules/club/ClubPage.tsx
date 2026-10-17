import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  clubApi,
  ClubDepartment,
  EntranceChallenge,
  ClubWorkReport,
} from '../../lib/api/club';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../lib/auth/auth-store';
import {
  Rocket,
  Code2,
  Palette,
  Wrench,
  Clock,
  CheckCircle2,
  Calendar,
  Download,
  Plus,
  FileText,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Crown,
  Sparkles,
  Send,
  Info,
  Check,
  Zap,
  Target,
  Laptop,
  Users,
  Award,
} from 'lucide-react';
import { toast } from 'sonner';
import { toPersianDigits, formatToJalali } from '../../lib/utils';

export const ClubPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAdmin =
    user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN' || user?.role === 'STAFF';

  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<EntranceChallenge[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [maxAllowed, setMaxAllowed] = useState(2);
  const [canStartNew, setCanStartNew] = useState(true);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<ClubDepartment | 'ALL'>('ALL');

  // Modals state
  const [selectedChallengeForBrief, setSelectedChallengeForBrief] = useState<EntranceChallenge | null>(null);
  const [activeChallengeForReport, setActiveChallengeForReport] = useState<EntranceChallenge | null>(null);
  const [activeReportTab, setActiveReportTab] = useState<'NEW_REPORT' | 'REPORT_HISTORY' | 'FINAL_SUBMIT'>('NEW_REPORT');

  // New report form state
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reportTitle, setReportTitle] = useState('');
  const [reportContent, setReportContent] = useState('');
  const [reportHours, setReportHours] = useState<number | ''>('');
  const [reportLinks, setReportLinks] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Final submission form state
  const [repoUrl, setRepoUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [figmaUrl, setFigmaUrl] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submittingFinal, setSubmittingFinal] = useState(false);

  const fetchEntranceData = async () => {
    try {
      setLoading(true);
      const res = await clubApi.getEntranceChallenges();
      setChallenges(res.challenges || []);
      setActiveCount(res.activeCount || 0);
      setMaxAllowed(res.maxAllowed || 2);
      setCanStartNew(res.canStartNew ?? (res.activeCount < 2));
    } catch (err: any) {
      toast.error('خطا در واکشی چالش‌های ورودی باشگاه');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntranceData();
  }, []);

  const handleStartChallenge = async (challenge: EntranceChallenge) => {
    if (activeCount >= maxAllowed) {
      toast.error(`شما هم‌زمان حداکثر می‌توانید در ${toPersianDigits(maxAllowed)} چالش فعال شرکت کنید.`);
      return;
    }
    try {
      await clubApi.startEntranceChallenge(challenge.id || challenge.slug);
      toast.success(`شما با موفقیت در چالش «${challenge.title}» ثبت‌نام کردید!`);
      await fetchEntranceData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'خطا در ثبت‌نام در چالش';
      toast.error(msg);
    }
  };

  const handleDownloadPackage = (challenge: EntranceChallenge) => {
    if (challenge.driveUrl) {
      window.open(challenge.driveUrl, '_blank', 'noopener,noreferrer');
      toast.success(`پوشه گوگل درایو «${challenge.title}» در تب جدید باز شد.`);
      return;
    }

    const downloadUrl = challenge.packageDownloadUrl || `/api/club/packages/${challenge.packageFile}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', challenge.packageFile);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`دانلود بسته چالش «${challenge.title}» آغاز شد.`);
  };

  const handleOpenReportModal = (challenge: EntranceChallenge) => {
    setActiveChallengeForReport(challenge);
    setActiveReportTab('NEW_REPORT');
    setReportTitle('');
    setReportContent('');
    setReportHours('');
    setReportLinks('');
    setReportDate(new Date().toISOString().split('T')[0]);
  };

  const handleSubmitNewReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChallengeForReport?.submission?.id) {
      toast.error('پروژه فعال یافت نشد.');
      return;
    }
    if (!reportContent.trim()) {
      toast.error('لطفاً شرح اقدامات و کارهای انجام‌شده را وارد کنید.');
      return;
    }

    try {
      setSubmittingReport(true);
      const linksArray = reportLinks
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      await clubApi.submitWorkReport(activeChallengeForReport.submission.id, {
        reportDate: reportDate ? new Date(reportDate).toISOString() : new Date().toISOString(),
        title: reportTitle.trim() || 'گزارش پیشرفت روزانه',
        content: reportContent.trim(),
        workDuration: reportHours ? Number(reportHours) : undefined,
        links: linksArray.length > 0 ? linksArray : undefined,
      });

      toast.success('گزارش پیشرفت کار شما با موفقیت ثبت گردید.');
      setReportTitle('');
      setReportContent('');
      setReportHours('');
      setReportLinks('');
      await fetchEntranceData();
      setActiveReportTab('REPORT_HISTORY');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'خطا در ثبت گزارش کار';
      toast.error(msg);
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChallengeForReport?.submission?.id) return;
    try {
      setSubmittingFinal(true);
      await clubApi.submitChallenge(activeChallengeForReport.id, {
        repositoryUrl: repoUrl.trim() || undefined,
        demoUrl: demoUrl.trim() || undefined,
        figmaUrl: figmaUrl.trim() || undefined,
        submissionNotes: submissionNotes.trim() || undefined,
      });
      toast.success('پروژه شما با موفقیت ارسال شد و به کارتابل داوران منتقل گردید.');
      setActiveChallengeForReport(null);
      await fetchEntranceData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'خطا در ارسال نهایی پروژه';
      toast.error(msg);
    } finally {
      setSubmittingFinal(false);
    }
  };

  const getDeptBadge = (dept: ClubDepartment) => {
    switch (dept) {
      case 'ENGINEER':
        return {
          label: 'دپارتمان مهندسا (Tech)',
          icon: Code2,
          className:
            'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30',
        };
      case 'ARTIST':
        return {
          label: 'دپارتمان آرتیستا (Design & Media)',
          icon: Palette,
          className:
            'bg-pink-50 dark:bg-pink-500/15 text-pink-700 dark:text-pink-400 border border-pink-200 dark:border-pink-500/30',
        };
      case 'JACK_OF_ALL_TRADES':
        return {
          label: 'دپارتمان آچارفرانسه‌ها (Product & Ops)',
          icon: Wrench,
          className:
            'bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30',
        };
    }
  };

  const filteredChallenges = challenges.filter((c) => {
    if (selectedDeptFilter === 'ALL') return true;
    return c.department === selectedDeptFilter;
  });

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 space-y-6 pb-24 animate-in fade-in duration-300">
      {/* 1. Admin Quick Jump Banner */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-4 text-stone-950 font-bold flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md border-2 border-stone-950">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-11 h-11 rounded-xl bg-stone-950 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="font-black text-sm sm:text-base">پنل مدیریت باشگاه کسب‌وکار رُکاد</div>
              <div className="text-xs sm:text-sm text-stone-900/80 font-medium">
                مشاهده کارتابل دانش‌آموزان و گزارش‌های ثبت‌شده
              </div>
            </div>
          </div>
          <Button
            onClick={() => navigate('/app/admin/club')}
            className="w-full sm:w-auto min-h-[44px] bg-stone-950 hover:bg-stone-900 text-amber-400 font-black text-xs sm:text-sm px-5 rounded-xl shrink-0 gap-2 shadow-sm"
          >
            <span>ورود به کارتابل مدیران باشگاه</span>
            <ArrowRight className="w-4 h-4 rotate-180" />
          </Button>
        </div>
      )}

      {/* 2. Notice / Call for Challengers Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-amber-500/30 dark:border-amber-500/40 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 dark:from-amber-950/40 dark:via-stone-900 dark:to-purple-950/40 p-5 sm:p-7 shadow-md dark:shadow-xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-stone-900 dark:text-white tracking-tight leading-snug">
              چالش ورودی به باشگاه کسب‌وکار رُکاد
            </h1>
          </div>

          {/* Capacity Counter Meter */}
          <div className="w-full lg:w-auto shrink-0 bg-white/90 dark:bg-stone-950/90 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 text-center min-w-[220px] shadow-sm dark:shadow-lg">
            <div className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 font-bold mb-1">ظرفیت پروژه‌های هم‌زمان شما</div>
            <div className="flex items-center justify-center gap-2 text-3xl font-black text-stone-900 dark:text-white my-1">
              <span className={activeCount >= maxAllowed ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                {toPersianDigits(activeCount)}
              </span>
              <span className="text-stone-400 dark:text-stone-500 text-xl">/</span>
              <span>{toPersianDigits(maxAllowed)}</span>
            </div>
            <div className="text-xs sm:text-sm font-bold mt-1">
              {activeCount >= maxAllowed ? (
                <span className="text-amber-600 dark:text-amber-400">ظرفیت تکمیل است (۲ از ۲)</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400">
                  {toPersianDigits(maxAllowed - activeCount)} ظرفیت خالی دارید
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2.5. Challenge Flow Steps (روند چالش) */}
      <div className="bg-white dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-stone-900 dark:text-white">روند گام‌به‌گام چالش ورودی</h2>
            </div>
          </div>
          <span className="self-start sm:self-auto text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 dark:border-amber-500/20 px-3 py-1 rounded-full">
            ۴ مرحله اصلی
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Step 1 */}
          <div className="relative bg-stone-50/90 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800/80 rounded-xl p-4 space-y-2 hover:border-purple-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-700 dark:text-purple-400 flex items-center justify-center font-black text-xs">
                ۱
              </span>
              <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white">انتخاب چالش</h3>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              انتخاب حداکثر ۲ چالش متناسب با تخصص و علایق، و دریافت پکیج فایل‌ها و بریف رسمی.
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative bg-stone-50/90 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800/80 rounded-xl p-4 space-y-2 hover:border-blue-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-700 dark:text-blue-400 flex items-center justify-center font-black text-xs">
                ۲
              </span>
              <Laptop className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white">کار کردن روی پروژه</h3>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              پیاده‌سازی تسک‌ها در مهلت ۱۰ روزه و ثبت مستمر گزارش‌های کار با تاریخ در پنل کاربری.
            </p>
          </div>

          {/* Step 3 */}
          <div className="relative bg-stone-50/90 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800/80 rounded-xl p-4 space-y-2 hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black text-xs">
                ۳
              </span>
              <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white">منتورینگ و هدایت</h3>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              همراهی منتورهای ارشد حوزه، بررسی پیشرفت کار، رفع چالش‌های فنی و ارتقای کیفیت خروجی.
            </p>
          </div>

          {/* Step 4 */}
          <div className="relative bg-stone-50/90 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800/80 rounded-xl p-4 space-y-2 hover:border-amber-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center font-black text-xs">
                ۴
              </span>
              <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white">روز ارائه (Demo Day)</h3>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              ارائه نهایی دمو در برابر داوران و اساتید، تعیین گرید (A/B/C) و ورود به استودیوی کسب‌وکار.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Department Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-stone-100/80 dark:bg-stone-900/70 border border-stone-200 dark:border-stone-800 p-2 sm:p-3 rounded-2xl">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <Button
            size="sm"
            variant={selectedDeptFilter === 'ALL' ? 'primary' : 'ghost'}
            onClick={() => setSelectedDeptFilter('ALL')}
            className={`min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap ${
              selectedDeptFilter === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:bg-stone-200/70 dark:hover:bg-stone-800'
            }`}
          >
            همه چالش‌ها ({toPersianDigits(challenges.length)})
          </Button>

          <Button
            size="sm"
            variant={selectedDeptFilter === 'ENGINEER' ? 'primary' : 'ghost'}
            onClick={() => setSelectedDeptFilter('ENGINEER')}
            className={`min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-bold gap-2 whitespace-nowrap ${
              selectedDeptFilter === 'ENGINEER'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:bg-stone-200/70 dark:hover:bg-stone-800'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>مهندسا</span>
          </Button>

          <Button
            size="sm"
            variant={selectedDeptFilter === 'ARTIST' ? 'primary' : 'ghost'}
            onClick={() => setSelectedDeptFilter('ARTIST')}
            className={`min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-bold gap-2 whitespace-nowrap ${
              selectedDeptFilter === 'ARTIST'
                ? 'bg-pink-600 text-white shadow-md'
                : 'text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:bg-stone-200/70 dark:hover:bg-stone-800'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>آرتیستا</span>
          </Button>

          <Button
            size="sm"
            variant={selectedDeptFilter === 'JACK_OF_ALL_TRADES' ? 'primary' : 'ghost'}
            onClick={() => setSelectedDeptFilter('JACK_OF_ALL_TRADES')}
            className={`min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-bold gap-2 whitespace-nowrap ${
              selectedDeptFilter === 'JACK_OF_ALL_TRADES'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:bg-stone-200/70 dark:hover:bg-stone-800'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>آچارفرانسه‌ها</span>
          </Button>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 px-2 shrink-0">
          <Info className="w-4 h-4 text-stone-400 dark:text-stone-500" />
          <span>پکیج هر چالش حاوی راهنما و مستندات کامل است.</span>
        </div>
      </div>

      {/* 4. Challenges Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-72 rounded-2xl bg-stone-200/60 dark:bg-stone-900/60 animate-pulse border border-stone-200 dark:border-stone-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredChallenges.map((challenge) => {
            const dept = getDeptBadge(challenge.department);
            const DeptIcon = dept.icon;
            const sub = challenge.submission;
            const isInProgress = sub?.status === 'IN_PROGRESS';
            const isSubmitted = sub?.status === 'SUBMITTED';
            const isGraded = sub?.status === 'GRADED';

            return (
              <Card
                key={challenge.slug}
                className={`flex flex-col justify-between transition-all duration-200 border-2 rounded-2xl overflow-hidden ${
                  isInProgress
                    ? 'border-emerald-500/60 bg-gradient-to-b from-emerald-50/70 via-white to-white dark:from-emerald-950/25 dark:via-stone-900 dark:to-stone-900 shadow-md dark:shadow-xl dark:shadow-emerald-950/20'
                    : isSubmitted
                    ? 'border-blue-500/50 bg-gradient-to-b from-blue-50/70 via-white to-white dark:from-blue-950/25 dark:to-stone-900 shadow-md'
                    : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/90 hover:border-stone-300 dark:hover:border-stone-700'
                }`}
              >
                <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  {/* Top Header: Dept Badge & Status */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${dept.className}`}>
                        <DeptIcon className="w-3.5 h-3.5" />
                        <span>{dept.label}</span>
                      </span>

                      {isInProgress && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 animate-pulse">
                          <Clock className="w-3.5 h-3.5" />
                          <span>در حال انجام</span>
                        </span>
                      )}
                      {isSubmitted && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/40">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تحویل داده‌شده</span>
                        </span>
                      )}
                      {isGraded && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40">
                          <span>نمره: {toPersianDigits(sub.score || 0)}</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white leading-snug line-clamp-2">
                      {challenge.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed line-clamp-3">
                      {challenge.description}
                    </p>
                  </div>

                  {/* Middle Meta: Tags & Duration */}
                  <div className="space-y-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                    <div className="flex flex-wrap gap-1.5">
                      {challenge.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200/60 dark:border-stone-700/50 text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs sm:text-sm text-stone-600 dark:text-stone-300">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>مهلت انجام: <strong className="text-stone-900 dark:text-white font-bold">{toPersianDigits(challenge.maxDays || 10)} روز</strong></span>
                      </div>
                      {isInProgress && sub && (
                        <div className="text-emerald-600 dark:text-emerald-400 font-black">
                          {toPersianDigits(sub.reportsCount || 0)} گزارش ثبت‌شده
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Actions: Download ZIP + Start / Report */}
                  <div className="space-y-2.5 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadPackage(challenge)}
                      className="w-full min-h-[44px] text-xs sm:text-sm font-bold gap-2 border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-100 rounded-xl"
                    >
                      <Download className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      <span>دانلود بسته چالش (ZIP)</span>
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedChallengeForBrief(challenge)}
                        className="flex-1 min-h-[44px] text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl"
                      >
                        <span>مشاهده بریف</span>
                      </Button>

                      {isInProgress ? (
                        <Button
                          size="sm"
                          onClick={() => handleOpenReportModal(challenge)}
                          className="flex-1 min-h-[44px] text-xs sm:text-sm font-black bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 rounded-xl shadow-md"
                        >
                          <FileText className="w-4 h-4" />
                          <span>ثبت گزارش کار</span>
                        </Button>
                      ) : isSubmitted ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled
                          className="flex-1 min-h-[44px] text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 rounded-xl"
                        >
                          در انتظار داوری
                        </Button>
                      ) : isGraded ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled
                          className="flex-1 min-h-[44px] text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 rounded-xl"
                        >
                          پایان یافته
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={!canStartNew}
                          onClick={() => handleStartChallenge(challenge)}
                          className="flex-1 min-h-[44px] text-xs sm:text-sm font-black bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 rounded-xl disabled:opacity-50 shadow-md"
                        >
                          <Rocket className="w-4 h-4" />
                          <span>شروع چالش</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 5. Modal: Full Challenge Mission Brief */}
      {selectedChallengeForBrief && (
        <Modal
          isOpen={!!selectedChallengeForBrief}
          onClose={() => setSelectedChallengeForBrief(null)}
          title={selectedChallengeForBrief.title}
          maxWidth="2xl"
        >
          <div className="space-y-5 text-right p-1" dir="rtl">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-bold ${getDeptBadge(selectedChallengeForBrief.department).className}`}>
                {getDeptBadge(selectedChallengeForBrief.department).label}
              </span>
              <span className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-bold">
                مهلت انجام: {toPersianDigits(selectedChallengeForBrief.maxDays || 10)} روز
              </span>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm sm:text-base font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>شرح صورت‌مسئله و مأموریت:</span>
              </h4>
              <div className="bg-stone-50 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 rounded-xl p-4 text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-line">
                {selectedChallengeForBrief.missionBrief}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm sm:text-base font-bold text-stone-800 dark:text-stone-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>قوانین و الزامات تحویل پروژه:</span>
              </h4>
              <div className="bg-stone-50 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 rounded-xl p-4 text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                {selectedChallengeForBrief.rules}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadPackage(selectedChallengeForBrief)}
                className="min-h-[44px] gap-2 text-xs sm:text-sm font-bold rounded-xl border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200"
              >
                <Download className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>دانلود بسته (.zip)</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedChallengeForBrief(null)}
                  className="min-h-[44px] flex-1 sm:flex-initial text-xs sm:text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 rounded-xl"
                >
                  بستن
                </Button>
                {!selectedChallengeForBrief.isEnrolled && (
                  <Button
                    size="sm"
                    disabled={!canStartNew}
                    onClick={() => {
                      const ch = selectedChallengeForBrief;
                      setSelectedChallengeForBrief(null);
                      handleStartChallenge(ch);
                    }}
                    className="min-h-[44px] flex-1 sm:flex-initial text-xs sm:text-sm font-black bg-primary text-primary-foreground gap-1.5 rounded-xl"
                  >
                    <Rocket className="w-4 h-4" />
                    <span>شروع این چالش</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. Modal: Work Reports & Final Submission */}
      {activeChallengeForReport && (
        <Modal
          isOpen={!!activeChallengeForReport}
          onClose={() => setActiveChallengeForReport(null)}
          title={`مدیریت پروژه: ${activeChallengeForReport.title}`}
          maxWidth="3xl"
        >
          <div className="space-y-5 text-right p-1" dir="rtl">
            {/* Modal Tabs with 44px min-height */}
            <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-3 overflow-x-auto scrollbar-none">
              <Button
                size="sm"
                variant={activeReportTab === 'NEW_REPORT' ? 'primary' : 'ghost'}
                onClick={() => setActiveReportTab('NEW_REPORT')}
                className={`min-h-[44px] text-xs sm:text-sm font-bold rounded-xl gap-2 whitespace-nowrap ${
                  activeReportTab === 'NEW_REPORT'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>ثبت گزارش کار جدید با تاریخ</span>
              </Button>

              <Button
                size="sm"
                variant={activeReportTab === 'REPORT_HISTORY' ? 'primary' : 'ghost'}
                onClick={() => setActiveReportTab('REPORT_HISTORY')}
                className={`min-h-[44px] text-xs sm:text-sm font-bold rounded-xl gap-2 whitespace-nowrap ${
                  activeReportTab === 'REPORT_HISTORY'
                    ? 'bg-stone-200 text-stone-900 dark:bg-stone-800 dark:text-white'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>
                  تاریخچه گزارش‌ها ({toPersianDigits(activeChallengeForReport.submission?.reports?.length || 0)})
                </span>
              </Button>

              <Button
                size="sm"
                variant={activeReportTab === 'FINAL_SUBMIT' ? 'primary' : 'ghost'}
                onClick={() => setActiveReportTab('FINAL_SUBMIT')}
                className={`min-h-[44px] text-xs sm:text-sm font-bold rounded-xl gap-2 whitespace-nowrap ${
                  activeReportTab === 'FINAL_SUBMIT'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>ارسال نهایی برای داوری</span>
              </Button>
            </div>

            {/* Tab 1: New Report Form */}
            {activeReportTab === 'NEW_REPORT' && (
              <form onSubmit={handleSubmitNewReport} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200 mb-1.5">
                      تاریخ انجام کار <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                      required
                      className="min-h-[44px] text-sm bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-800 text-stone-900 dark:text-stone-100 rounded-xl"
                    />
                    <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                      معادل شمسی: {formatToJalali(reportDate, { showMonthName: true })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200 mb-1.5">
                      عنوان اقدام / موضوع
                    </label>
                    <Input
                      type="text"
                      placeholder="مثال: پیاده‌سازی سوکت و مدل‌ها"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      className="min-h-[44px] text-sm bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-800 text-stone-900 dark:text-stone-100 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200 mb-1.5">
                      مدت زمان کار (ساعت)
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      inputMode="decimal"
                      placeholder="مثال: ۳"
                      value={reportHours}
                      onChange={(e) => setReportHours(e.target.value ? Number(e.target.value) : '')}
                      className="min-h-[44px] text-sm bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-800 text-stone-900 dark:text-stone-100 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200 mb-1.5">
                    شرح اقدامات انجام‌شده و توضیحات فنی <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="در این تاریخ چه بخش‌هایی را پیاده‌سازی کردید؟ با چه چالش‌هایی روبرو شدید؟"
                    value={reportContent}
                    onChange={(e) => setReportContent(e.target.value)}
                    className="w-full text-sm bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded-xl p-3.5 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200 mb-1.5">
                    لینک‌های مرتبط (هر لینک در یک خط - اختیاری)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="https://github.com/.../commit/...&#10;https://www.figma.com/..."
                    value={reportLinks}
                    onChange={(e) => setReportLinks(e.target.value)}
                    dir="ltr"
                    className="w-full text-sm bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded-xl p-3 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:border-emerald-500 resize-none font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveChallengeForReport(null)}
                    className="min-h-[44px] px-4 text-xs sm:text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 rounded-xl"
                  >
                    انصراف
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submittingReport}
                    className="min-h-[44px] px-6 text-xs sm:text-sm font-black bg-emerald-600 hover:bg-emerald-500 text-white gap-2 rounded-xl shadow-md"
                  >
                    <Check className="w-4 h-4" />
                    <span>{submittingReport ? 'در حال ثبت...' : 'ثبت گزارش پیشرفت'}</span>
                  </Button>
                </div>
              </form>
            )}

            {/* Tab 2: Report History Timeline */}
            {activeReportTab === 'REPORT_HISTORY' && (
              <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
                {(!activeChallengeForReport.submission?.reports ||
                  activeChallengeForReport.submission.reports.length === 0) ? (
                  <div className="text-center py-12 bg-stone-50 dark:bg-stone-900/50 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 text-sm space-y-2">
                    <FileText className="w-8 h-8 text-stone-400 dark:text-stone-500 mx-auto" />
                    <div>هنوز هیچ گزارش کاری برای این پروژه ثبت نشده است.</div>
                    <div className="text-xs text-stone-400 dark:text-stone-500">
                      از تب «ثبت گزارش کار جدید» می‌توانید گزارش‌های روزانه خود را وارد کنید.
                    </div>
                  </div>
                ) : (
                  activeChallengeForReport.submission.reports.map((rep, idx) => (
                    <div
                      key={rep.id || idx}
                      className="bg-stone-50 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-800 rounded-xl p-4 space-y-2.5 relative"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-stone-200 dark:border-stone-800 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-sm font-bold text-stone-900 dark:text-white">
                            {rep.title || 'گزارش پیشرفت پروژه'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
                          {rep.workDuration && (
                            <span className="bg-emerald-50 dark:bg-stone-800 border border-emerald-200 dark:border-transparent px-2 py-0.5 rounded text-emerald-700 dark:text-emerald-400 font-bold">
                              {toPersianDigits(rep.workDuration)} ساعت کار
                            </span>
                          )}
                          <span>تاریخ: {formatToJalali(rep.reportDate, { showMonthName: true })}</span>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-line">
                        {rep.content}
                      </p>

                      {rep.links && Array.isArray(rep.links) && rep.links.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {rep.links.map((link: string, lIdx: number) => (
                            <a
                              key={lIdx}
                              href={link}
                              target="_blank"
                              rel="noreferrer"
                              className="min-h-[32px] inline-flex items-center gap-1.5 text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-lg border border-indigo-200 dark:border-indigo-900/50"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>{link.replace(/^https?:\/\//, '').slice(0, 32)}...</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Final Project Submission */}
            {activeReportTab === 'FINAL_SUBMIT' && (
              <form onSubmit={handleFinalSubmit} className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl p-3.5 text-xs sm:text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
                  هنگامی که پیاده‌سازی پروژه به پایان رسید، لینک‌های خروجی و توضیحات نهایی را وارد نموده و ارسال کنید.
                  پس از ارسال، وضعیت پروژه به «تحویل داده‌شده» تغییر یافته و منتورها پروژه شما را داوری خواهند کرد.
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200 mb-1.5">
                      لینک مخزن گیت‌هاب (GitHub Repository)
                    </label>
                    <Input
                      type="url"
                      placeholder="https://github.com/username/project-name"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      dir="ltr"
                      className="min-h-[44px] text-sm bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-800 text-stone-900 dark:text-stone-100 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200 mb-1.5">
                      لینک پیش‌نمایش آنلاین / دمو (Live Demo URL)
                    </label>
                    <Input
                      type="url"
                      placeholder="https://my-project.vercel.app"
                      value={demoUrl}
                      onChange={(e) => setDemoUrl(e.target.value)}
                      dir="ltr"
                      className="min-h-[44px] text-sm bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-800 text-stone-900 dark:text-stone-100 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200 mb-1.5">
                      لینک فایل فیگما یا مستندات طراحی (اختیاری)
                    </label>
                    <Input
                      type="url"
                      placeholder="https://www.figma.com/file/..."
                      value={figmaUrl}
                      onChange={(e) => setFigmaUrl(e.target.value)}
                      dir="ltr"
                      className="min-h-[44px] text-sm bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-800 text-stone-900 dark:text-stone-100 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200 mb-1.5">
                      توضیحات و نکات تکمیلی برای داوران
                    </label>
                    <textarea
                      rows={3}
                      placeholder="نکته خاص، نحوه اجرا، دستورالعمل‌های تست و..."
                      value={submissionNotes}
                      onChange={(e) => setSubmissionNotes(e.target.value)}
                      className="w-full text-sm bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded-xl p-3.5 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveChallengeForReport(null)}
                    className="min-h-[44px] px-4 text-xs sm:text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 rounded-xl"
                  >
                    انصراف
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submittingFinal}
                    className="min-h-[44px] px-6 text-xs sm:text-sm font-black bg-blue-600 hover:bg-blue-500 text-white gap-2 rounded-xl shadow-md"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submittingFinal ? 'در حال ارسال...' : 'ارسال نهایی برای داوری'}</span>
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
