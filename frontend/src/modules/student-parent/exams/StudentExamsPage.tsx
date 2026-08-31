import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Check,
  Award,
} from 'lucide-react';

export const StudentExamsPage: React.FC = () => {
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
      setExams(res.data || []);
    } catch (err) {
      console.error('Failed to load exams', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

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

  const handleStartExam = async (exam: any) => {
    try {
      // Start participation session
      await apiClient.post(`/exams/${exam.id}/start`);
      setActiveExam(exam);
      setTimeLeftSeconds((exam.durationMinutes || 60) * 60);
      setTabSwitches(0);
      setExamResult(null);
    } catch (err) {
      // If already started, still load
      setActiveExam(exam);
      setTimeLeftSeconds((exam.durationMinutes || 60) * 60);
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
      const answersPayload = Object.entries(currentAnswers).map(([questionId, ans]) => ({
        questionId,
        selectedOptionId: ans.selectedOptionId,
        textAnswer: ans.textAnswer,
      }));

      const res = await apiClient.post(`/exams/${activeExam.id}/submit`, {
        answers: answersPayload,
      });

      setExamResult(res.data);
    } catch (err: any) {
      alert(err.message || 'خطا در ثبت آزمون.');
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
            آزمون «{activeExam.title}» در موعد مقرر تحویل داده شد و کارنامه اولیه صادر گردید.
          </p>

          <div className="bg-gray-50 p-6 rounded-2xl border space-y-3">
            <div className="text-3xl font-extrabold text-primary font-mono">
              {examResult.totalScore !== null && examResult.totalScore !== undefined
                ? examResult.totalScore
                : 'در انتظار تصحیح'}
              <span className="text-sm font-normal text-gray-500 mr-1">/ {activeExam.totalScore || 20} نمره</span>
            </div>

            {tabSwitches > 0 && (
              <div className="text-xs text-rose-600 font-bold flex items-center justify-center space-x-1 space-x-reverse">
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

            <div className="flex items-center space-x-2 space-x-reverse bg-primary-light px-4 py-2 rounded-xl text-primary-darker font-mono font-bold text-base">
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
        <div className="space-y-6">
          {activeExam.questions?.map((q: any, qIdx: number) => (
            <Card key={q.id} className="p-6 border">
              <div className="flex justify-between items-start mb-3">
                <span className="font-bold text-xs bg-gray-100 text-ink-dark px-2.5 py-1 rounded-lg">
                  سوال شماره {qIdx + 1}
                </span>
                <span className="text-xs font-mono font-bold text-primary">{q.score || 2} نمره</span>
              </div>

              <h4 className="text-sm font-bold text-ink-darker mb-4 leading-relaxed">{q.text}</h4>

              {/* Multiple Choice Options */}
              {q.type === 'MULTIPLE_CHOICE' && q.options && (
                <div className="space-y-2.5">
                  {q.options.map((opt: any, optIdx: number) => {
                    const isSelected = currentAnswers[q.id]?.selectedOptionId === opt.id;

                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSelectOption(q.id, opt.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center space-x-3 space-x-reverse text-xs ${
                          isSelected
                            ? 'border-primary bg-primary-light/40 text-primary-dark font-bold'
                            : 'border-gray-200 bg-white hover:bg-gray-50 text-ink-normal'
                        }`}
                      >
                        <div
                          className={`h-5 w-5 rounded-full border flex items-center justify-center ${
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
                    value={currentAnswers[q.id]?.textAnswer || ''}
                    onChange={(e) => handleTextAnswer(q.id, e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white p-3 text-xs focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Regular List View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-ink-darker flex items-center space-x-2 space-x-reverse">
          <HelpCircle className="h-6 w-6 text-primary" />
          <span>آزمون‌های آنلاین و سنجش تحصیلی (Online Exams)</span>
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          شرکت در آزمون‌های تستی و تشریحی آنلاین با پاسخ‌برگ هوشمند و نمایش لحظه‌ای نتایج
        </p>
      </div>

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
        ) : exams.length === 0 ? (
          <div className="col-span-3 text-center py-12 bg-white rounded-2xl border border-gray-200 text-gray-500 text-sm">
            در حال حاضر هیچ آزمون فعالی برای شما برنامه‌ریزی نشده است.
          </div>
        ) : (
          exams.map((exam) => (
            <Card key={exam.id} className="flex flex-col justify-between p-6 border hover:border-primary transition-all">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Badge variant="default">{exam.lesson?.name || 'حسابان'}</Badge>
                  <span className="text-xs font-bold text-primary font-mono">
                    {exam.durationMinutes} دقیقه
                  </span>
                </div>

                <h3 className="font-bold text-base text-ink-darker mb-1">{exam.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">{exam.description}</p>

                <div className="flex items-center space-x-2 space-x-reverse text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border">
                  <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>پایان مهلت: {new Date(exam.endTime).toLocaleDateString('fa-IR')}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <Button
                  variant="primary"
                  onClick={() => handleStartExam(exam)}
                  className="w-full text-xs flex items-center justify-center space-x-1.5 space-x-reverse"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>ورود به جلسه آزمون</span>
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
