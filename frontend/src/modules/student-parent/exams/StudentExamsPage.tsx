import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ResponsivePageHeader } from '../../../components/ui/ResponsivePageHeader';
import {
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Check,
  Award,
  X,
  Filter,
} from 'lucide-react';

export const StudentExamsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const examIdParam = searchParams.get('examId');
  const actionParam = searchParams.get('action');
  const lessonIdParam = searchParams.get('lessonId');
  const lessonNameParam = searchParams.get('lessonName');

  const [exams, setExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Exam Taking Session
  const [activeExam, setActiveExam] = useState<any | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, { selectedOptionId?: string; textAnswer?: string }>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(3600);
  const [tabSwitches, setTabSwitches] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examResult, setExamResult] = useState<any | null>(null);

  const fetchExams = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/exams');
      const data = res.data || [];
      setExams(data);

      if (examIdParam && actionParam === 'start' && data.length > 0) {
        const target = data.find((e: any) => e.id === examIdParam);
        if (target) {
          handleStartExam(target);
        }
      }
    } catch (err) {
      console.error('Failed to load exams', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [examIdParam]);

  // Timer Effect
  useEffect(() => {
    if (!activeExam || examResult) return;

    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeExam, examResult]);

  // Anti-Cheat Tab Switch Detection
  useEffect(() => {
    if (!activeExam || examResult) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches((prev) => {
          const next = prev + 1;
          apiClient.post(`/exams/${activeExam.id}/tab-switch`, { count: next }).catch(() => {});
          return next;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeExam, examResult]);

  const [isStartingId, setIsStartingId] = useState<string | null>(null);

  const handleStartExam = async (exam: any) => {
    try {
      setIsStartingId(exam.id);
      // Start participation session and fetch tailored exam questions
      const res: any = await apiClient.post(`/exams/${exam.id}/start`);
      const payload = res.data || res;
      const questions = payload.questions || [];
      const participation = payload.participation || {};

      let remainingSec = (exam.durationMinutes || 60) * 60;
      if (participation.serverDeadline) {
        const deadline = new Date(participation.serverDeadline).getTime();
        const now = Date.now();
        const diff = Math.floor((deadline - now) / 1000);
        if (diff > 0) {
          remainingSec = Math.min(remainingSec, diff);
        }
      }

      setActiveExam({
        ...exam,
        ...payload.exam,
        questions,
        participationId: participation.id,
      });
      setTimeLeftSeconds(remainingSec);
      setTabSwitches(0);
      setExamResult(null);
    } catch (err: any) {
      console.error('Failed to start exam', err);
      const msg =
        err.response?.data?.message || err.message || 'امکان ورود به آزمون وجود ندارد.';
      alert(Array.isArray(msg) ? msg.join('، ') : msg);
    } finally {
      setIsStartingId(null);
    }
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setCurrentAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], selectedOptionId: optionId },
    }));
  };

  const handleTextAnswer = (questionId: string, text: string) => {
    setCurrentAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], textAnswer: text },
    }));
  };

  const handleSubmitExam = async () => {
    if (!activeExam) return;
    setIsSubmitting(true);
    try {
      const answersPayload = (activeExam.questions || []).map((q: any) => {
        const qKey = q.questionId || q.id;
        const ans = currentAnswers[qKey];
        const item: any = { questionId: qKey };
        if (ans?.selectedOptionId) {
          item.selectedOptionId = ans.selectedOptionId;
        }
        const text = ans?.textAnswer;
        if (text && typeof text === 'string' && text.trim().length > 0) {
          item.descriptiveAnswer = text.trim();
          item.textAnswer = text.trim();
        }
        return item;
      });

      const res: any = await apiClient.post(`/exams/${activeExam.id}/submit`, {
        tabSwitchCount: tabSwitches,
        answers: answersPayload,
      });

      setExamResult(res.data || res);
      fetchExams();
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || 'خطا در ثبت آزمون.';
      alert(Array.isArray(msg) ? msg.join('، ') : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // If in an active exam taking mode
  if (activeExam) {
    if (examResult) {
      return (
        <Card className="max-w-2xl mx-auto p-8 text-center space-y-6">
          <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <h2 className="text-2xl font-bold text-ink-darker">پاسخ‌برگ شما با موفقیت ثبت شد!</h2>
          <p className="text-xs text-gray-500">
            آزمون «{activeExam.title}» در موعد مقرر تحویل داده شد.
          </p>

          <div className="bg-gray-50 p-6 rounded-2xl border space-y-3">
            <div className="text-base font-bold text-ink-dark">
              پاسخ‌برگ در انتظار بررسی و ثبت نمره توسط دبیر است
            </div>
            <p className="text-xs text-gray-500 leading-relaxed max-w-md mx-auto">
              پس از اتمام مهلت آزمون، بررسی پاسخ‌های تشریحی و انتشار رسمی کارنامه توسط دبیر محترم، نمره نهایی و بازخوردها در این بخش قابل مشاهده خواهد بود.
            </p>

            {tabSwitches > 0 && (
              <div className="text-xs text-rose-600 font-bold flex items-center justify-center space-x-1 space-x-reverse pt-2">
                <AlertTriangle className="h-4 w-4" />
                <span>ثبت {tabSwitches} مرتبه خروج از صفحه آزمون</span>
              </div>
            )}
          </div>

          <Button
            variant="primary"
            onClick={() => {
              setActiveExam(null);
              setExamResult(null);
              fetchExams();
            }}
          >
            بازگشت به لیست آزمون‌ها
          </Button>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {/* Sticky Exam Timer Header */}
        <div className="sticky top-20 z-20 bg-white p-4 rounded-xl border border-gray-200 shadow-md flex justify-between items-center">
          <div>
            <h3 className="font-bold text-base text-ink-darker">{activeExam.title}</h3>
            <span className="text-xs text-gray-500">{activeExam.lesson?.name || 'آزمون آنلاین'}</span>
          </div>

          <div className="flex items-center space-x-4 space-x-reverse">
            {tabSwitches > 0 && (
              <Badge variant="destructive">
                هشدار: {tabSwitches} بار خروج از تب
              </Badge>
            )}

            <div className="flex items-center space-x-2 space-x-reverse bg-primary-light px-4 py-2 rounded-xl text-primary-darker font-bold text-base">
              <Clock className="h-5 w-5 text-primary" />
              <span>{formatTime(timeLeftSeconds)}</span>
            </div>

            <Button
              variant="primary"
              onClick={handleSubmitExam}
              isLoading={isSubmitting}
            >
              اتمام و ثبت آزمون
            </Button>
          </div>
        </div>

        {/* Questions List */}
        {!activeExam.questions || activeExam.questions.length === 0 ? (
          <Card className="p-8 text-center bg-gray-50 border rounded-2xl max-w-xl mx-auto space-y-4">
            <div className="h-12 w-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-base text-ink-darker">سوالی برای این آزمون ثبت نشده است</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              دبیر محترم هنوز سوالات این آزمون را در سامانه بارگذاری نکرده است. لطفاً پس از ثبت سوالات توسط دبیر مجدداً مراجعه فرمایید.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setActiveExam(null);
                setExamResult(null);
              }}
            >
              بازگشت به لیست آزمون‌ها
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {activeExam.questions.map((q: any, qIdx: number) => {
              const qKey = q.questionId || q.id;
              return (
                <Card key={qKey} className="p-6 border">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-bold text-xs bg-gray-100 text-ink-dark px-2.5 py-1 rounded-lg">
                      سوال شماره {qIdx + 1}
                    </span>
                    <span className="text-xs font-bold text-primary">{q.score || 2} نمره</span>
                  </div>

                  <h4 className="text-sm font-bold text-ink-darker mb-4 leading-relaxed whitespace-pre-wrap">{q.text}</h4>

                  {/* Multiple Choice Options */}
                  {q.type === 'MULTIPLE_CHOICE' && q.options && (
                    <div className="space-y-2.5">
                      {q.options.map((opt: any) => {
                        const isSelected = currentAnswers[qKey]?.selectedOptionId === opt.id;

                        return (
                          <div
                            key={opt.id}
                            onClick={() => handleSelectOption(qKey, opt.id)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center space-x-3 space-x-reverse text-xs ${
                              isSelected
                                ? 'border-primary bg-primary-light/40 text-primary-dark font-bold'
                                : 'border-gray-200 bg-white hover:bg-gray-50 text-ink-normal'
                            }`}
                          >
                            <div
                              className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-primary bg-primary text-white' : 'border-gray-300'
                              }`}
                            >
                              {isSelected && <Check className="h-3.5 w-3.5" />}
                            </div>
                            <span>{opt.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Descriptive Question */}
                  {q.type === 'DESCRIPTIVE' && (
                    <div>
                      <textarea
                        rows={4}
                        placeholder="پاسخ تشریحی خود را اینجا تایپ کنید..."
                        value={currentAnswers[qKey]?.textAnswer || ''}
                        onChange={(e) => handleTextAnswer(qKey, e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white p-3 text-xs focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const displayedExams = lessonIdParam
    ? exams.filter((e) => e.lessonId === lessonIdParam || e.lesson?.id === lessonIdParam)
    : exams;

  // Regular List View
  return (
    <div className="space-y-6">
      {/* Header */}
      <ResponsivePageHeader
        icon={HelpCircle}
        title="آزمون‌های آنلاین و سنجش تحصیلی"
        description="شرکت در آزمون‌های تستی و تشریحی آنلاین با پاسخ‌برگ هوشمند و نمایش لحظه‌ای نتایج"
      />

      {/* Lesson Filter Banner */}
      {lessonIdParam && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-primary/10 border border-primary/25 text-xs text-foreground">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-primary">
                فیلتر شده بر اساس درس: {lessonNameParam || 'درس انتخاب‌شده'}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                تعداد {displayedExams.length} آزمون برای این درس برنامه‌ریزی شده است.
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              searchParams.delete('lessonId');
              searchParams.delete('lessonName');
              setSearchParams(searchParams);
            }}
            className="text-xs h-8 gap-1 hover:bg-surface"
          >
            <X className="w-3.5 h-3.5" />
            <span>نمایش همه آزمون‌ها</span>
          </Button>
        </div>
      )}

      {/* Exams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <Skeleton className="h-10 w-full" />
            </Card>
          ))
        ) : displayedExams.length === 0 ? (
          <div className="col-span-3 text-center py-12 bg-white rounded-2xl border border-gray-200 text-gray-500 text-sm">
            {lessonIdParam
              ? `در حال حاضر هیچ آزمون فعالی برای درس ${lessonNameParam || ''} ثبت نشده است.`
              : 'در حال حاضر هیچ آزمون فعالی برای شما برنامه‌ریزی نشده است.'}
          </div>
        ) : (
          displayedExams.map((exam) => {
            const hasQuestions = (exam._count?.questions || 0) > 0;
            const participation = exam.participations?.[0];
            const isSubmitted = participation?.status === 'SUBMITTED';
            const isTimedOut = participation?.status === 'TIMED_OUT';
            const isCompleted = isSubmitted || isTimedOut;
            const isResultsPublished = !!participation?.isResultsPublished;

            return (
              <Card key={exam.id} className="flex flex-col justify-between p-6 border hover:border-primary transition-all">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Badge variant={isCompleted ? (isResultsPublished ? 'success' : 'warning') : 'default'}>
                      {isCompleted
                        ? (isResultsPublished ? 'کارنامه صادر شد' : 'تحویل داده شده')
                        : (exam.lesson?.name || 'آزمون عمومی')}
                    </Badge>
                    <span className="text-xs font-bold text-primary">
                      {exam.durationMinutes} دقیقه
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-ink-darker mb-1">{exam.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">{exam.description || 'آزمون سنجش تحصیلی'}</p>

                  <div className="space-y-1.5 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">تعداد سوالات:</span>
                      <strong>
                        {hasQuestions ? `${exam._count.questions} سوال` : 'فاقد سوال'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">بارم کل آزمون:</span>
                      <strong>{exam.totalScore || 20} نمره</strong>
                    </div>

                    {isCompleted && (
                      <div className="pt-2 border-t space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">وضعیت کارنامه:</span>
                          {isResultsPublished ? (
                            <span className="font-bold text-emerald-600">
                              {participation.totalScore !== null ? `${participation.totalScore} از ${exam.totalScore || 20}` : 'ثبت‌شده'}
                            </span>
                          ) : (
                            <span className="font-medium text-amber-700">در انتظار تصحیح و انتشار دبیر</span>
                          )}
                        </div>

                        {isResultsPublished && participation.graceScore > 0 && (
                          <div className="flex items-center justify-between text-[11px] text-primary">
                            <span>نمره ارفاقی دبیر:</span>
                            <span>+{participation.graceScore} نمره {participation.graceReason ? `(${participation.graceReason})` : ''}</span>
                          </div>
                        )}

                        {isResultsPublished && participation.teacherFeedback && (
                          <div className="text-[11px] bg-white p-2 rounded border border-gray-200 text-gray-700 mt-1">
                            <span className="font-bold text-ink-dark">بازخورد دبیر:</span> {participation.teacherFeedback}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t">
                      <span className="text-gray-500">پایان مهلت:</span>
                      <span>{new Date(exam.endTime).toLocaleDateString('fa-IR')}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  {isCompleted ? (
                    <Button
                      variant="outline"
                      disabled
                      className="w-full text-xs flex items-center justify-center space-x-1.5 space-x-reverse text-emerald-700 bg-emerald-50 border-emerald-200 cursor-default"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{isResultsPublished ? 'کارنامه صادر شد' : 'پاسخ‌برگ تحویل شد — در انتظار انتشار'}</span>
                    </Button>
                  ) : (
                    <Button
                      variant={hasQuestions ? 'primary' : 'outline'}
                      onClick={() => handleStartExam(exam)}
                      isLoading={isStartingId === exam.id}
                      disabled={isStartingId === exam.id || !hasQuestions}
                      className="w-full text-xs flex items-center justify-center space-x-1.5 space-x-reverse"
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>{hasQuestions ? 'ورود به جلسه آزمون' : 'در انتظار ثبت سوالات توسط دبیر'}</span>
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
