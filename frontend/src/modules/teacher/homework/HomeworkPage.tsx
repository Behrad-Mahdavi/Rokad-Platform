import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../../components/ui/Table';
import {
  FileCheck,
  Plus,
  Clock,
  CheckCircle2,
  FileText,
  MessageSquare,
  Award,
} from 'lucide-react';

export const HomeworkPage: React.FC = () => {
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmissionsOpen, setIsSubmissionsOpen] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoadingSubs, setIsLoadingSubs] = useState(false);

  // Grading State
  const [gradingSubId, setGradingSubId] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState<number>(20);
  const [feedbackInput, setFeedbackInput] = useState<string>('');

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    classroomId: '',
    lessonId: '',
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    maxScore: 20,
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [hwRes, classRes, lessonRes] = await Promise.all([
        apiClient.get('/homework'),
        apiClient.get('/classes/classrooms'),
        apiClient.get('/academic/lessons'),
      ]);
      setHomeworkList(hwRes.data || []);
      setClassrooms(classRes.data || []);
      setLessons(lessonRes.data || []);

      if (classRes.data?.length > 0) {
        setCreateForm((prev) => ({ ...prev, classroomId: classRes.data[0].id }));
      }
      if (lessonRes.data?.length > 0) {
        setCreateForm((prev) => ({ ...prev, lessonId: lessonRes.data[0].id }));
      }
    } catch (err) {
      console.error('Failed to load homework', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/homework', {
        ...createForm,
        dueDate: new Date(createForm.dueDate).toISOString(),
      });
      setIsCreateOpen(false);
      setCreateForm({
        title: '',
        description: '',
        classroomId: classrooms[0]?.id || '',
        lessonId: lessons[0]?.id || '',
        dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        maxScore: 20,
      });
      fetchData();
    } catch (err: any) {
      setError(err.message || 'خطا در تعریف تکلیف.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewSubmissions = async (hw: any) => {
    setSelectedHomework(hw);
    setIsSubmissionsOpen(true);
    setIsLoadingSubs(true);
    try {
      const res = await apiClient.get(`/homework/${hw.id}/submissions`);
      setSubmissions(res.data || []);
    } catch (err) {
      console.error('Failed to load submissions', err);
    } finally {
      setIsLoadingSubs(false);
    }
  };

  const handleSaveGrade = async (subId: string) => {
    try {
      await apiClient.patch(`/homework/submissions/${subId}/grade`, {
        score: Number(gradeInput),
        feedback: feedbackInput,
      });
      setGradingSubId(null);
      handleViewSubmissions(selectedHomework);
    } catch (err) {
      console.error('Failed to save grade', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & CTA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink-darker flex items-center space-x-2 space-x-reverse">
            <FileCheck className="h-6 w-6 text-primary" />
            <span>مدیریت و تصحیح تکالیف کلاسی (Homework Hub)</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            تعریف تکالیف درسی، پیگیری مهلت تحویل، بررسی پاسخ‌ها و ثبت نمره و بازخورد
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center space-x-1.5 space-x-reverse"
        >
          <Plus className="h-4 w-4" />
          <span>تعریف تکلیف جدید</span>
        </Button>
      </div>

      {/* Homework List */}
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
            هنوز تکلیفی برای کلاس‌های شما تعریف نشده است.
          </div>
        ) : (
          homeworkList.map((hw) => (
            <Card key={hw.id} className="flex flex-col justify-between p-6 border hover:border-primary transition-all">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Badge variant="default">{hw.classroom?.name || 'کلاس ۱۰۱'}</Badge>
                  <span className="text-xs font-bold text-primary font-mono">{hw.maxScore || 20} نمره</span>
                </div>

                <h3 className="font-bold text-base text-ink-darker mb-1">{hw.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-4">
                  {hw.description || 'حل تمرینات و ارسال فایل پاسخ'}
                </p>

                <div className="flex items-center space-x-2 space-x-reverse text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border">
                  <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>مهلت: {new Date(hw.dueDate).toLocaleDateString('fa-IR')}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">
                  {hw._count?.submissions || 0} پاسخ ارسال‌شده
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewSubmissions(hw)}
                  className="text-xs"
                >
                  بررسی ارسال‌ها
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 1. Modal: Create Homework */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="تعریف تکلیف جدید برای کلاس"
        description="ارسال صورت تمرین، تعیین مهلت ارسال و بارم نمره"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateHomework} className="space-y-4">
          <Input
            label="عنوان تکلیف"
            placeholder="مثال: تمرینات فصل دوم هندسه تحلیلی"
            value={createForm.title}
            onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">کلاس هدف</label>
              <select
                value={createForm.classroomId}
                onChange={(e) => setCreateForm({ ...createForm, classroomId: e.target.value })}
                className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">درس مرتبط</label>
              <select
                value={createForm.lessonId}
                onChange={(e) => setCreateForm({ ...createForm, lessonId: e.target.value })}
                className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="مهلت ارسال (تاریخ)"
              type="date"
              value={createForm.dueDate}
              onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
              required
            />
            <Input
              label="حداکثر نمره (بارم)"
              type="number"
              value={createForm.maxScore}
              onChange={(e) => setCreateForm({ ...createForm, maxScore: Number(e.target.value) })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">شرح کامل سوالات و دستورالعمل</label>
            <textarea
              rows={4}
              placeholder="صورت مسائل را اینجا وارد کنید یا لینک جزوه را قید نمایید..."
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              className="w-full rounded-md border border-gray-300 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              انتشار تکلیف برای کلاس
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Modal: Submissions & Grading */}
      <Modal
        isOpen={isSubmissionsOpen}
        onClose={() => setIsSubmissionsOpen(false)}
        title={`ارسال‌های دانش‌آموزان: ${selectedHomework?.title}`}
        description="بررسی فایل‌های ارسالی، ثبت نمره و ارسال بازخورد به دانش‌آموز"
        maxWidth="xl"
      >
        <div className="space-y-4">
          {isLoadingSubs ? (
            <div className="text-center py-6 text-xs text-gray-500">در حال بارگذاری ارسال‌ها...</div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-xs bg-gray-50 rounded-xl border">
              هنوز هیچ دانش‌آموزی پاسخی ارسال نکرده است.
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => (
                <div key={sub.id} className="p-4 rounded-xl border bg-gray-50 text-xs space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="font-bold text-sm text-ink-darker">
                      {sub.student?.user?.firstName} {sub.student?.user?.lastName}
                    </div>
                    <div>
                      {sub.score !== null && sub.score !== undefined ? (
                        <Badge variant="success">نمره ثبت‌شده: {sub.score} / {selectedHomework?.maxScore || 20}</Badge>
                      ) : (
                        <Badge variant="warning">در انتظار تصحیح</Badge>
                      )}
                    </div>
                  </div>

                  <p className="bg-white p-3 rounded-lg border text-gray-700 leading-relaxed">
                    {sub.content || 'پاسخ متنی ارسال نشده است.'}
                  </p>

                  {/* Grading Inline Form */}
                  {gradingSubId === sub.id ? (
                    <div className="bg-white p-3 rounded-xl border border-primary/40 space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          label="نمره (از ۲۰)"
                          type="number"
                          value={gradeInput}
                          onChange={(e) => setGradeInput(Number(e.target.value))}
                        />
                        <div className="col-span-2">
                          <Input
                            label="بازخورد معلم"
                            placeholder="مثال: راه‌حل مسئله شماره ۳ عالی بود."
                            value={feedbackInput}
                            onChange={(e) => setFeedbackInput(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button variant="ghost" size="sm" onClick={() => setGradingSubId(null)}>
                          انصراف
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => handleSaveGrade(sub.id)}>
                          ثبت نمره
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setGradingSubId(sub.id);
                          setGradeInput(sub.score || 20);
                          setFeedbackInput(sub.feedback || '');
                        }}
                      >
                        <Award className="h-3.5 w-3.5 ml-1" />
                        <span>ثبت / ویرایش نمره</span>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={() => setIsSubmissionsOpen(false)}>
              بستن
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
