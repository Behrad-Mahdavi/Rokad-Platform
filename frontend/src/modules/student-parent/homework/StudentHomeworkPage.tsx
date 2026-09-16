import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../../lib/api/client';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ResponsivePageHeader } from '../../../components/ui/ResponsivePageHeader';
import { formatJalaliDisplay } from '../../../utils/jalali';
import {
  FileCheck,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Award,
  Eye,
  MessageSquare,
  Edit3,
  X,
  Sparkles,
} from 'lucide-react';

export const StudentHomeworkPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const homeworkIdParam = searchParams.get('homeworkId');
  const actionParam = searchParams.get('action');
  const lessonIdParam = searchParams.get('lessonId');
  const lessonNameParam = searchParams.get('lessonName');

  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState<any>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHomework = async () => {
    try {
      setIsLoading(true);
      const res: any = await apiClient.get('/homework');
      const data = Array.isArray(res) ? res : (res?.data || []);
      setHomeworkList(data);

      // Direct action/modal open if requested via URL
      if (homeworkIdParam && data.length > 0) {
        const target = data.find((h: any) => h.id === homeworkIdParam);
        if (target) {
          const mySub = target.submissions && target.submissions.length > 0 ? target.submissions[0] : null;
          setSelectedHomework(target);
          setSubmissionText(mySub?.content || '');
          setIsSubmitModalOpen(true);
        }
      }
    } catch (err) {
      console.error('Failed to load homework', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHomework();
  }, [homeworkIdParam]);

  const handleSubmitHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHomework) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/homework/${selectedHomework.id}/submit`, {
        content: submissionText,
      });
      setIsSubmitModalOpen(false);
      setSubmissionText('');
      fetchHomework();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(' - ') : msg || err.message || 'خطا در ارسال پاسخ تکلیف.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedHomework = lessonIdParam
    ? homeworkList.filter((h) => h.lessonId === lessonIdParam || h.lesson?.id === lessonIdParam)
    : homeworkList;

  return (
    <div className="space-y-6">
      {/* Header */}
      <ResponsivePageHeader
        icon={FileCheck}
        title="تکالیف درسی و تمرینات"
        description="مشاهده تکالیف محول‌شده، مهلت تحویل، ارسال پاسخ، و بررسی نمرات و بازخورد دبیران"
      />

      {/* Lesson Filter Banner if navigated from schedule */}
      {lessonIdParam && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-primary/10 border border-primary/25 text-xs text-foreground">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-primary">
                فیلتر شده بر اساس درس: {lessonNameParam || 'درس انتخاب‌شده'}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                تعداد {displayedHomework.length} تکلیف مربوط به این درس یافت شد.
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
            <span>نمایش همه تکالیف</span>
          </Button>
        </div>
      )}

      {/* Homework Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <Skeleton className="h-10 w-full" />
            </Card>
          ))
        ) : displayedHomework.length === 0 ? (
          <div className="col-span-3 text-center py-12 bg-white dark:bg-[#151C28] rounded-2xl border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-sm flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-1" />
            <span>
              {lessonIdParam
                ? `هیچ تکلیفی برای درس ${lessonNameParam || ''} ثبت نشده است.`
                : 'در حال حاضر هیچ تکلیف فعالی برای شما ثبت نشده است.'}
            </span>
          </div>
        ) : (
          displayedHomework.map((hw) => {
            const mySub = hw.submissions && hw.submissions.length > 0 ? hw.submissions[0] : null;
            const isGraded = mySub && (mySub.status === 'GRADED' || (mySub.score !== null && mySub.score !== undefined));
            const isResubmitRequired = mySub?.status === 'RESUBMIT_REQUIRED';
            const isSubmitted = mySub && !isGraded && !isResubmitRequired;

            return (
              <Card
                key={hw.id}
                className={`flex flex-col justify-between p-6 border transition-all ${
                  isGraded
                    ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-sm'
                    : isResubmitRequired
                    ? 'border-rose-200 dark:border-rose-800/60 bg-rose-50/20 dark:bg-rose-950/20'
                    : isSubmitted
                    ? 'border-blue-200 dark:border-blue-800/60 bg-blue-50/10 dark:bg-blue-950/20'
                    : 'hover:border-primary'
                }`}
              >
                <div>
                  {/* Card Header Badges */}
                  <div className="flex justify-between items-center mb-2">
                    <Badge variant="default">{hw.lesson?.name || 'درس'}</Badge>
                    {isGraded ? (
                      <Badge variant="success" className="font-bold flex items-center gap-1 font-mono">
                        <Award className="h-3 w-3 ml-0.5" />
                        <span>نمره: {mySub.score} / {hw.maxScore || 20}</span>
                      </Badge>
                    ) : isResubmitRequired ? (
                      <Badge variant="destructive" className="font-bold flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 ml-0.5" />
                        <span>نیازمند ارسال مجدد</span>
                      </Badge>
                    ) : isSubmitted ? (
                      <Badge variant="warning" className="font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 ml-0.5" />
                        <span>در انتظار بررسی دبیر</span>
                      </Badge>
                    ) : (
                      <span className="text-xs font-bold text-primary font-mono">{hw.maxScore || 20} نمره</span>
                    )}
                  </div>

                  <h3 className="font-bold text-base text-ink-darker dark:text-white mb-1">{hw.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3 line-clamp-2">
                    {hw.description || 'توضیحات و دستورالعمل تکلیف'}
                  </p>

                  <div className="flex items-center space-x-2 space-x-reverse text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-[#1C2536] p-2.5 rounded-lg border border-gray-200 dark:border-gray-700/60">
                    <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>مهلت تحویل: {formatJalaliDisplay(hw.dueDate)}</span>
                  </div>

                  {/* Submission Status Details Inside Card */}
                  {isGraded && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3 my-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                          <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          نمره ثبت‌شده:
                        </span>
                        <span className="text-sm font-black font-mono text-emerald-800 dark:text-emerald-300 bg-white dark:bg-[#1C2536] px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                          {mySub.score} از {hw.maxScore || 20}
                        </span>
                      </div>
                      {mySub.feedback && (
                        <div className="bg-white/90 dark:bg-[#1C2536]/90 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-800/40 text-xs text-emerald-950 dark:text-emerald-100 leading-relaxed">
                          <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1 mb-0.5">
                            <MessageSquare className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            <span>بازخورد دبیر:</span>
                          </div>
                          <p>{mySub.feedback}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {isResubmitRequired && (
                    <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl p-3 my-3 space-y-1.5 text-xs">
                      <div className="font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                        <span>دبیر درخواست بازبینی و ارسال مجدد داده است:</span>
                      </div>
                      {mySub.feedback && (
                        <p className="bg-white/90 dark:bg-[#1C2536]/90 p-2 rounded-lg border border-rose-100 dark:border-rose-900/40 text-rose-950 dark:text-rose-100 leading-relaxed">
                          {mySub.feedback}
                        </p>
                      )}
                    </div>
                  )}

                  {isSubmitted && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-xl p-3 my-3 text-xs text-blue-950 dark:text-blue-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-blue-800 dark:text-blue-300">
                        <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span>پاسخ شما با موفقیت ارسال شده است</span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 line-clamp-1 bg-white/80 dark:bg-[#1C2536]/80 p-2 rounded border border-blue-100 dark:border-blue-900/40 mt-1">
                        «{mySub.content}»
                      </p>
                      {mySub.submittedAt && (
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 text-left pt-0.5">
                          ارسال در: {formatJalaliDisplay(mySub.submittedAt)}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Action Button */}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  {isGraded ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedHomework(hw);
                        setSubmissionText(mySub.content || '');
                        setIsSubmitModalOpen(true);
                      }}
                      className="w-full text-xs flex items-center justify-center gap-1 border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    >
                      <Eye className="h-3.5 w-3.5 ml-1" />
                      <span>مشاهده کامل بازخورد و نمره</span>
                    </Button>
                  ) : isResubmitRequired ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSelectedHomework(hw);
                        setSubmissionText(mySub.content || '');
                        setIsSubmitModalOpen(true);
                      }}
                      className="w-full text-xs flex items-center justify-center gap-1 bg-rose-600 hover:bg-rose-700"
                    >
                      <Edit3 className="h-3.5 w-3.5 ml-1" />
                      <span>اصلاح و ارسال مجدد پاسخ</span>
                    </Button>
                  ) : isSubmitted ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedHomework(hw);
                        setSubmissionText(mySub.content || '');
                        setIsSubmitModalOpen(true);
                      }}
                      className="w-full text-xs flex items-center justify-center gap-1"
                    >
                      <Edit3 className="h-3.5 w-3.5 ml-1" />
                      <span>مشاهده / ویرایش پاسخ</span>
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSelectedHomework(hw);
                        setSubmissionText('');
                        setIsSubmitModalOpen(true);
                      }}
                      className="w-full text-xs flex items-center justify-center gap-1"
                    >
                      <Send className="h-3.5 w-3.5 ml-1" />
                      <span>ارسال پاسخ تکلیف</span>
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Submit Homework / View Grade Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => {
          setIsSubmitModalOpen(false);
          if (homeworkIdParam) {
            searchParams.delete('homeworkId');
            searchParams.delete('action');
            setSearchParams(searchParams);
          }
        }}
        title={
          selectedHomework?.submissions?.[0]?.score !== null &&
          selectedHomework?.submissions?.[0]?.score !== undefined
            ? `نتیجه نمره و بازخورد: ${selectedHomework?.title}`
            : `ارسال پاسخ: ${selectedHomework?.title}`
        }
        description={
          selectedHomework?.submissions?.[0]?.score !== null &&
          selectedHomework?.submissions?.[0]?.score !== undefined
            ? 'مشاهده نمره کسب‌شده، بازخورد دبیر و سابقه پاسخ ارسالی شما'
            : 'متن پاسخ یا توضیحات خود را جهت بررسی و نمره‌دهی دبیر ثبت کنید.'
        }
        maxWidth="lg"
      >
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-rose-950/40 p-3 text-xs text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {(() => {
          const mySub = selectedHomework?.submissions?.[0];
          const isGraded = mySub && (mySub.score !== null && mySub.score !== undefined);
          const isResubmitRequired = mySub?.status === 'RESUBMIT_REQUIRED';

          return (
            <div className="space-y-4">
              {/* If Graded: Show Beautiful Banner */}
              {isGraded && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-sm">
                        <Award className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-emerald-950 dark:text-emerald-200">تکلیف توسط دبیر تصحیح شد</div>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-300/90">
                          {mySub.gradedBy
                            ? `دبیر: ${mySub.gradedBy.firstName} ${mySub.gradedBy.lastName}`
                            : 'دبیر درس'}
                          {mySub.gradedAt && ` • تاریخ ثبت: ${formatJalaliDisplay(mySub.gradedAt)}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-left bg-white dark:bg-[#1C2536] px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
                      <div className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400">
                        {mySub.score} <span className="text-xs font-normal text-emerald-600 dark:text-emerald-300">/ {selectedHomework.maxScore || 20}</span>
                      </div>
                    </div>
                  </div>

                  {mySub.feedback && (
                    <div className="bg-white/90 dark:bg-[#1C2536]/90 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800/40 text-xs text-emerald-950 dark:text-emerald-100 leading-relaxed">
                      <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1 mb-1">
                        <MessageSquare className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>بازخورد دبیر:</span>
                      </div>
                      <p>{mySub.feedback}</p>
                    </div>
                  )}
                </div>
              )}

              {/* If Resubmit Required */}
              {isResubmitRequired && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-rose-800 dark:text-rose-300">
                    <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    <span>پیام دبیر برای ارسال مجدد:</span>
                  </div>
                  <p className="bg-white/90 dark:bg-[#1C2536]/90 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900/40 text-rose-950 dark:text-rose-100 leading-relaxed">
                    {mySub.feedback}
                  </p>
                </div>
              )}

              {/* Teacher instructions */}
              <div className="p-3 bg-gray-50 dark:bg-[#1C2536] rounded-xl border border-gray-200 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                <strong className="text-ink-dark dark:text-white">دستورالعمل دبیر:</strong> {selectedHomework?.description || 'دستورالعمل خاصی ثبت نشده است.'}
              </div>

              {/* Form / Content */}
              <form onSubmit={handleSubmitHomework} className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-[13px] font-bold text-ink-normal/80 dark:text-gray-200 mb-1.5 text-right">
                    {isGraded ? 'پاسخ ارسالی شما (ثبت‌شده)' : 'متن و توضیحات پاسخ شما'}
                  </label>
                  <textarea
                    rows={5}
                    placeholder="پاسخ تمرینات یا توضیحات مربوط به نحوه حل مسائل را اینجا بنویسید..."
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-xs sm:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2 space-x-reverse pt-2">
                  <Button type="button" variant="ghost" onClick={() => setIsSubmitModalOpen(false)}>
                    بستن
                  </Button>
                  <Button type="submit" variant="primary" isLoading={isSubmitting}>
                    {isGraded ? 'ارسال مجدد پاسخ' : 'ارسال نهایی پاسخ'}
                  </Button>
                </div>
              </form>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};
