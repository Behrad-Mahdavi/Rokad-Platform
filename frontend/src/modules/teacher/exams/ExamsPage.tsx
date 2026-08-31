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
  HelpCircle,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileQuestion,
  Users,
  ShieldAlert,
} from 'lucide-react';

export const ExamsPage: React.FC = () => {
  const [exams, setExams] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isCreateExamOpen, setIsCreateExamOpen] = useState(false);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [isMonitorOpen, setIsMonitorOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [participations, setParticipations] = useState<any[]>([]);

  // Forms
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [examForm, setExamForm] = useState({
    title: '',
    description: '',
    lessonId: '',
    classroomId: '',
    type: 'ONLINE',
    durationMinutes: 60,
    startTime: new Date().toISOString().split('T')[0] + 'T09:00',
    endTime: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0] + 'T23:59',
    passingScore: 10,
    totalScore: 20,
  });

  const [questionForm, setQuestionForm] = useState({
    text: '',
    type: 'MULTIPLE_CHOICE',
    score: 2,
    options: [
      { text: 'گزینه الف', isCorrect: true },
      { text: 'گزینه ب', isCorrect: false },
      { text: 'گزینه ج', isCorrect: false },
      { text: 'گزینه د', isCorrect: false },
    ],
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [examsRes, classesRes, lessonsRes] = await Promise.all([
        apiClient.get('/exams'),
        apiClient.get('/classes/classrooms'),
        apiClient.get('/academic/lessons'),
      ]);
      setExams(examsRes.data || []);
      setClassrooms(classesRes.data || []);
      setLessons(lessonsRes.data || []);

      if (classesRes.data?.length > 0) {
        setExamForm((prev) => ({ ...prev, classroomId: classesRes.data[0].id }));
      }
      if (lessonsRes.data?.length > 0) {
        setExamForm((prev) => ({ ...prev, lessonId: lessonsRes.data[0].id }));
      }
    } catch (err) {
      console.error('Failed to load exams', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/exams', {
        ...examForm,
        startTime: new Date(examForm.startTime).toISOString(),
        endTime: new Date(examForm.endTime).toISOString(),
        durationMinutes: Number(examForm.durationMinutes),
        totalScore: Number(examForm.totalScore),
        passingScore: Number(examForm.passingScore),
        classroomIds: [examForm.classroomId],
      });
      setIsCreateExamOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'خطا در طراحی آزمون.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/exams/${selectedExam.id}/questions`, {
        text: questionForm.text,
        type: questionForm.type,
        score: Number(questionForm.score),
        options: questionForm.type === 'MULTIPLE_CHOICE' ? questionForm.options : undefined,
      });
      setIsAddQuestionOpen(false);
      setQuestionForm({
        text: '',
        type: 'MULTIPLE_CHOICE',
        score: 2,
        options: [
          { text: 'گزینه الف', isCorrect: true },
          { text: 'گزینه ب', isCorrect: false },
          { text: 'گزینه ج', isCorrect: false },
          { text: 'گزینه د', isCorrect: false },
        ],
      });
      fetchData();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت سوال.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMonitorExam = async (exam: any) => {
    setSelectedExam(exam);
    setIsMonitorOpen(true);
    try {
      const res = await apiClient.get(`/exams/${exam.id}/participations`);
      setParticipations(res.data || []);
    } catch (err) {
      console.error('Failed to load exam participations', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & CTA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink-darker flex items-center space-x-2 space-x-reverse">
            <HelpCircle className="h-6 w-6 text-primary" />
            <span>موتور آزمون آنلاین و بانک سوالات (LMS Exam Engine)</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            طراحی آزمون‌های تستی و تشریحی، زمان‌بندی سرور، پاسخ‌برگ تعاملی و پرچم‌های تقلب
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsCreateExamOpen(true)}
          className="flex items-center space-x-1.5 space-x-reverse"
        >
          <Plus className="h-4 w-4" />
          <span>طراحی آزمون جدید</span>
        </Button>
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
            هنوز آزمونی تعریف نشده است. از دکمه «طراحی آزمون جدید» استفاده کنید.
          </div>
        ) : (
          exams.map((exam) => (
            <Card key={exam.id} className="flex flex-col justify-between p-6 border hover:border-primary transition-all">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Badge variant="default">
                    {exam.type === 'ONLINE' ? 'آزمون آنلاین' : 'حضوری'}
                  </Badge>
                  <span className="text-xs font-bold text-primary font-mono">
                    {exam.durationMinutes} دقیقه
                  </span>
                </div>

                <h3 className="font-bold text-base text-ink-darker mb-1">{exam.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-4">
                  {exam.description || 'آزمون سنجش پیشرفت تحصیلی دانش‌آموزان'}
                </p>

                <div className="space-y-1.5 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border">
                  <div className="flex justify-between">
                    <span>تعداد سوالات:</span>
                    <strong className="font-mono">{exam._count?.questions || 0} سوال</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>بارم کل:</span>
                    <strong className="font-mono">{exam.totalScore || 20} نمره</strong>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedExam(exam);
                    setIsAddQuestionOpen(true);
                  }}
                  className="text-xs flex-1"
                >
                  <Plus className="h-3.5 w-3.5 ml-1" />
                  <span>افزودن سوال</span>
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleMonitorExam(exam)}
                  className="text-xs flex-1"
                >
                  <Users className="h-3.5 w-3.5 ml-1" />
                  <span>مانیتورینگ</span>
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 1. Modal: Create Exam */}
      <Modal
        isOpen={isCreateExamOpen}
        onClose={() => setIsCreateExamOpen(false)}
        title="طراحی آزمون جدید"
        description="تعیین زمان‌بندی سرور، مدت آزمون و کلاس‌های هدف"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateExam} className="space-y-4">
          <Input
            label="عنوان آزمون"
            placeholder="مثال: آزمون میان‌ترم حسابان ۱"
            value={examForm.title}
            onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">کلاس هدف</label>
              <select
                value={examForm.classroomId}
                onChange={(e) => setExamForm({ ...examForm, classroomId: e.target.value })}
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
                value={examForm.lessonId}
                onChange={(e) => setExamForm({ ...examForm, lessonId: e.target.value })}
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

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="مدت آزمون (دقیقه)"
              type="number"
              value={examForm.durationMinutes}
              onChange={(e) => setExamForm({ ...examForm, durationMinutes: Number(e.target.value) })}
              required
            />
            <Input
              label="بارم کل (نمره)"
              type="number"
              value={examForm.totalScore}
              onChange={(e) => setExamForm({ ...examForm, totalScore: Number(e.target.value) })}
              required
            />
            <Input
              label="نمره قبولی"
              type="number"
              value={examForm.passingScore}
              onChange={(e) => setExamForm({ ...examForm, passingScore: Number(e.target.value) })}
              required
            />
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCreateExamOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              ایجاد آزمون
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Modal: Add Question */}
      <Modal
        isOpen={isAddQuestionOpen}
        onClose={() => setIsAddQuestionOpen(false)}
        title={`افزودن سوال به: ${selectedExam?.title}`}
        description="ثبت سوال تستی یا تشریحی با تعیین بارم نمره"
        maxWidth="lg"
      >
        <form onSubmit={handleAddQuestion} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">نوع سوال</label>
            <select
              value={questionForm.type}
              onChange={(e) => setQuestionForm({ ...questionForm, type: e.target.value })}
              className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="MULTIPLE_CHOICE">چهارگزینه‌ای (تستی)</option>
              <option value="DESCRIPTIVE">تشریحی</option>
            </select>
          </div>

          <Input
            label="صورت سوال"
            placeholder="متن سوال را اینجا تایپ کنید..."
            value={questionForm.text}
            onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
            required
          />

          <Input
            label="بارم نمره این سوال"
            type="number"
            value={questionForm.score}
            onChange={(e) => setQuestionForm({ ...questionForm, score: Number(e.target.value) })}
            required
          />

          {questionForm.type === 'MULTIPLE_CHOICE' && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label className="block text-xs font-bold text-ink-dark mb-1">گزینه‌ها و انتخاب پاسخ صحیح:</label>
              {questionForm.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correctOption"
                    checked={opt.isCorrect}
                    onChange={() => {
                      setQuestionForm({
                        ...questionForm,
                        options: questionForm.options.map((o, i) => ({ ...o, isCorrect: i === idx })),
                      });
                    }}
                    className="text-primary focus:ring-primary"
                  />
                  <Input
                    placeholder={`گزینه ${idx + 1}`}
                    value={opt.text}
                    onChange={(e) => {
                      const newOpts = [...questionForm.options];
                      newOpts[idx].text = e.target.value;
                      setQuestionForm({ ...questionForm, options: newOpts });
                    }}
                    required
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddQuestionOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              ثبت سوال در آزمون
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Modal: Monitor Participations & Anti-Cheat */}
      <Modal
        isOpen={isMonitorOpen}
        onClose={() => setIsMonitorOpen(false)}
        title={`مانیتورینگ شرکت‌کنندگان: ${selectedExam?.title}`}
        description="مشاهده وضعیت تحویل آزمون، نمره کسب‌شده و پرچم‌های تعویض تب (Anti-Cheat Flags)"
        maxWidth="xl"
      >
        <div className="space-y-3">
          {participations.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-500 bg-gray-50 rounded-xl border">
              هنوز هیچ دانش‌آموزی در این آزمون شرکت نکرده است.
            </div>
          ) : (
            participations.map((part) => (
              <div key={part.id} className="p-4 rounded-xl border bg-gray-50 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-sm text-ink-darker">
                    {part.student?.user?.firstName} {part.student?.user?.lastName}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    شروع: {new Date(part.startedAt).toLocaleTimeString('fa-IR')}
                  </div>
                </div>

                <div className="flex items-center space-x-4 space-x-reverse">
                  {part.tabSwitchCount > 0 ? (
                    <Badge variant="destructive" className="flex items-center space-x-1 space-x-reverse">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>{part.tabSwitchCount} بار تعویض تب</span>
                    </Badge>
                  ) : (
                    <Badge variant="success">عدم تخلف</Badge>
                  )}

                  <div className="text-left font-bold text-sm text-primary font-mono">
                    نمره: {part.totalScore !== null ? part.totalScore : '—'} / {selectedExam?.totalScore || 20}
                  </div>
                </div>
              </div>
            ))
          )}

          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={() => setIsMonitorOpen(false)}>
              بستن
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
