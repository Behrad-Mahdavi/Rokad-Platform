import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
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
} from 'lucide-react';

export const StudentHomeworkPage: React.FC = () => {
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
    } catch (err) {
      console.error('Failed to load homework', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHomework();
  }, []);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-ink-darker flex items-center space-x-2 space-x-reverse">
          <FileCheck className="h-6 w-6 text-primary" />
          <span>تکالیف درسی و تمرینات (My Homework)</span>
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          مشاهده تکالیف محول‌شده، مهلت تحویل، ارسال پاسخ، و بررسی نمرات و بازخورد دبیران
        </p>
      </div>

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
        ) : homeworkList.length === 0 ? (
          <div className="col-span-3 text-center py-12 bg-white rounded-2xl border border-gray-200 text-gray-500 text-sm flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-1" />
            <span>در حال حاضر هیچ تکلیف فعالی برای شما ثبت نشده است.</span>
          </div>
        ) : (
          homeworkList.map((hw) => {
            const mySub = hw.submissions && hw.submissions.length > 0 ? hw.submissions[0] : null;
            const isGraded = mySub && (mySub.status === 'GRADED' || (mySub.score !== null && mySub.score !== undefined));
            const isResubmitRequired = mySub?.status === 'RESUBMIT_REQUIRED';
            const isSubmitted = mySub && !isGraded && !isResubmitRequired;

            return (
              <Card
                key={hw.id}
                className={`flex flex-col justify-between p-6 border transition-all ${
                  isGraded
                    ? 'border-emerald-200 bg-emerald-50/20 shadow-sm'
                    : isResubmitRequired
                    ? 'border-rose-200 bg-rose-50/20'
                    : isSubmitted
                    ? 'border-blue-200 bg-blue-50/10'
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

                  <h3 className="font-bold text-base text-ink-darker mb-1">{hw.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">
                    {hw.description || 'توضیحات و دستورالعمل تکلیف'}
                  </p>

                  <div className="flex items-center space-x-2 space-x-reverse text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border">
                    <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>مهلت تحویل: {formatJalaliDisplay(hw.dueDate)}</span>
                  </div>

                  {/* Submission Status Details Inside Card */}
                  {isGraded && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 my-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                          <Award className="h-4 w-4 text-emerald-600" />
                          نمره ثبت‌شده:
                        </span>
                        <span className="text-sm font-black font-mono text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                          {mySub.score} از {hw.maxScore || 20}
                        </span>
                      </div>
                      {mySub.feedback && (
                        <div className="bg-white/90 p-2.5 rounded-lg border border-emerald-100 text-xs text-emerald-950 leading-relaxed">
                          <div className="font-bold text-emerald-800 flex items-center gap-1 mb-0.5">
                            <MessageSquare className="h-3 w-3 text-emerald-600" />
                            <span>بازخورد دبیر:</span>
                          </div>
                          <p>{mySub.feedback}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {isResubmitRequired && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 my-3 space-y-1.5 text-xs">
                      <div className="font-bold text-rose-900 flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4 text-rose-600" />
                        <span>دبیر درخواست بازبینی و ارسال مجدد داده است:</span>
                      </div>
                      {mySub.feedback && (
                        <p className="bg-white/90 p-2 rounded-lg border border-rose-100 text-rose-950 leading-relaxed">
                          {mySub.feedback}
                        </p>
                      )}
                    </div>
                  )}

                  {isSubmitted && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 my-3 text-xs text-blue-950 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-blue-800">
                        <CheckCircle2 className="h-4 w-4 text-blue-600" />
                        <span>پاسخ شما با موفقیت ارسال شده است</span>
                      </div>
                      <p className="text-gray-600 line-clamp-1 bg-white/80 p-2 rounded border border-blue-100 mt-1">
                        «{mySub.content}»
                      </p>
                      {mySub.submittedAt && (
                        <div className="text-[10px] text-gray-400 text-left pt-0.5">
                          ارسال در: {formatJalaliDisplay(mySub.submittedAt)}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Action Button */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  {isGraded ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedHomework(hw);
                        setSubmissionText(mySub.content || '');
                        setIsSubmitModalOpen(true);
                      }}
                      className="w-full text-xs flex items-center justify-center gap-1 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
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
        onClose={() => setIsSubmitModalOpen(false)}
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
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
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
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-emerald-600 text-white">
                        <Award className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-emerald-950">تکلیف توسط دبیر تصحیح شد</div>
                        <div className="text-[11px] text-emerald-700">
                          {mySub.gradedBy
                            ? `دبیر: ${mySub.gradedBy.firstName} ${mySub.gradedBy.lastName}`
                            : 'دبیر درس'}
                          {mySub.gradedAt && ` • تاریخ ثبت: ${formatJalaliDisplay(mySub.gradedAt)}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-left bg-white px-3 py-1.5 rounded-lg border border-emerald-200 shadow-sm">
                      <div className="text-lg font-black font-mono text-emerald-700">
                        {mySub.score} <span className="text-xs font-normal text-emerald-600">/ {selectedHomework.maxScore || 20}</span>
                      </div>
                    </div>
                  </div>

                  {mySub.feedback && (
                    <div className="bg-white/90 p-3 rounded-lg border border-emerald-100 text-xs text-emerald-950 leading-relaxed">
                      <div className="font-bold text-emerald-800 flex items-center gap-1 mb-1">
                        <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                        <span>بازخورد دبیر:</span>
                      </div>
                      <p>{mySub.feedback}</p>
                    </div>
                  )}
                </div>
              )}

              {/* If Resubmit Required */}
              {isResubmitRequired && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-rose-800">
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                    <span>پیام دبیر برای ارسال مجدد:</span>
                  </div>
                  <p className="bg-white/90 p-2.5 rounded-lg border border-rose-100 leading-relaxed">
                    {mySub.feedback}
                  </p>
                </div>
              )}

              {/* Teacher instructions */}
              <div className="p-3 bg-gray-50 rounded-xl border text-xs text-gray-600 leading-relaxed">
                <strong>دستورالعمل دبیر:</strong> {selectedHomework?.description || 'دستورالعمل خاصی ثبت نشده است.'}
              </div>

              {/* Form / Content */}
              <form onSubmit={handleSubmitHomework} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">
                    {isGraded ? 'پاسخ ارسالی شما (ثبت‌شده)' : 'متن و توضیحات پاسخ شما'}
                  </label>
                  <textarea
                    rows={5}
                    placeholder="پاسخ تمرینات یا توضیحات مربوط به نحوه حل مسائل را اینجا بنویسید..."
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
