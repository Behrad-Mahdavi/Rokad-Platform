import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  FileCheck,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  FileText,
  Award,
} from 'lucide-react';

export const StudentHomeworkPage: React.FC = () => {
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState<any>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHomework = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/homework');
      setHomeworkList(res.data || []);
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
      await apiClient.post('/homework/submissions', {
        homeworkId: selectedHomework.id,
        content: submissionText,
      });
      setIsSubmitModalOpen(false);
      setSubmissionText('');
      fetchHomework();
    } catch (err: any) {
      setError(err.message || 'خطا در ارسال پاسخ تکلیف.');
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
          مشاهده تکالیف محول‌شده توسط دبیران، مهلت تحویل، ارسال پاسخ و مشاهده نمرات و بازخورد
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
          <div className="col-span-3 text-center py-12 bg-white rounded-2xl border border-gray-200 text-gray-500 text-sm">
            در حال حاضر هیچ تکلیف فعالی برای شما ثبت نشده است. 🎉
          </div>
        ) : (
          homeworkList.map((hw) => (
            <Card key={hw.id} className="flex flex-col justify-between p-6 border hover:border-primary transition-all">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Badge variant="default">{hw.lesson?.name || 'ریاضی ۱'}</Badge>
                  <span className="text-xs font-bold text-primary font-mono">{hw.maxScore || 20} نمره</span>
                </div>

                <h3 className="font-bold text-base text-ink-darker mb-1">{hw.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  {hw.description}
                </p>

                <div className="flex items-center space-x-2 space-x-reverse text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border">
                  <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>مهلت تحویل: {new Date(hw.dueDate).toLocaleDateString('fa-IR')}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setSelectedHomework(hw);
                    setIsSubmitModalOpen(true);
                  }}
                  className="w-full text-xs"
                >
                  <Send className="h-3.5 w-3.5 ml-1" />
                  <span>ارسال پاسخ تکلیف</span>
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Submit Homework Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title={`ارسال پاسخ: ${selectedHomework?.title}`}
        description="متن پاسخ یا لینک و فایل خود را جهت بررسی و نمره‌دهی دبیر ثبت کنید."
        maxWidth="lg"
      >
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmitHomework} className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-xl border text-xs text-gray-600 leading-relaxed">
            <strong>دستورالعمل دبیر:</strong> {selectedHomework?.description}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">متن و توضیحات پاسخ شما</label>
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
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              ارسال نهایی پاسخ
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
