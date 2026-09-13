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
import { MobileDataTable } from '../../../components/ui/MobileDataTable';
import {
  HelpCircle,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Users,
  ShieldAlert,
  Award,
  Star,
  CheckCheck,
  Sparkles,
  MessageSquare,
  BarChart3,
  Edit3,
  Check,
  X,
  FileText,
} from 'lucide-react';
import { PersianDatePicker } from '../../../components/ui/PersianDatePicker';
import {
  gregorianToJalaliStr,
  jalaliToGregorianDate,
} from '../../../utils/jalali';

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

  // Exam Results & Grading Dashboard States
  const [examResultsData, setExamResultsData] = useState<any>(null);
  const [isResultsLoading, setIsResultsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'NEEDS_GRADING' | 'GRADED' | 'FLAGGED'>('ALL');

  // Dedicated Paper Grading Modal States
  const [isGradePaperModalOpen, setIsGradePaperModalOpen] = useState(false);
  const [activePaperSheet, setActivePaperSheet] = useState<any>(null);
  const [isSheetLoading, setIsSheetLoading] = useState(false);
  const [isSavingGrading, setIsSavingGrading] = useState(false);
  const [gradingForm, setGradingForm] = useState<{
    grades: Record<string, { scoreAwarded: number; teacherComment: string }>;
    graceScore: number;
    graceReason: string;
    teacherFeedback: string;
  }>({
    grades: {},
    graceScore: 0,
    graceReason: '',
    teacherFeedback: '',
  });

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
    examDate: gregorianToJalaliStr(new Date()),
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
      const [examsRes, classesRes, lessonsRes] = await Promise.allSettled([
        apiClient.get('/exams'),
        apiClient.get('/classes/classrooms'),
        apiClient.get('/classes/lessons'),
      ]);

      const examsData = examsRes.status === 'fulfilled'
        ? (Array.isArray(examsRes.value.data) ? examsRes.value.data : (examsRes.value.data?.data || []))
        : [];
      const classData = classesRes.status === 'fulfilled'
        ? (Array.isArray(classesRes.value.data) ? classesRes.value.data : (classesRes.value.data?.data || []))
        : [];
      const lessonData = lessonsRes.status === 'fulfilled'
        ? (Array.isArray(lessonsRes.value.data) ? lessonsRes.value.data : (lessonsRes.value.data?.data || []))
        : [];

      setExams(examsData);
      setClassrooms(classData);
      setLessons(lessonData);

      if (classData.length > 0) {
        setExamForm((prev) => ({ ...prev, classroomId: prev.classroomId || classData[0].id }));
      }
      if (lessonData.length > 0) {
        setExamForm((prev) => ({ ...prev, lessonId: prev.lessonId || lessonData[0].id }));
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
    if (!examForm.classroomId) {
      setError('لطفاً کلاس هدف را انتخاب کنید.');
      return;
    }
    if (!examForm.lessonId) {
      setError('لطفاً درس مرتبط را انتخاب کنید.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const gDate = examForm.examDate ? jalaliToGregorianDate(examForm.examDate) : new Date();
      const startDateTime = new Date(gDate);
      startDateTime.setHours(8, 0, 0, 0);
      const endDateTime = new Date(gDate);
      endDateTime.setHours(23, 59, 59, 0);

      await apiClient.post('/exams', {
        title: examForm.title,
        description: examForm.description || '',
        lessonId: examForm.lessonId,
        classroomId: examForm.classroomId,
        classroomIds: [examForm.classroomId],
        durationMinutes: Number(examForm.durationMinutes) || 60,
        totalScore: Number(examForm.totalScore) || 20,
        passingScore: Number(examForm.passingScore) || 10,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        examType: 'ONLINE',
      });
      setIsCreateExamOpen(false);
      setExamForm((prev) => ({
        ...prev,
        title: '',
        description: '',
        durationMinutes: 60,
        totalScore: 20,
        passingScore: 10,
      }));
      fetchData();
    } catch (err: any) {
      console.error('Failed to create exam', err);
      const msg =
        err.response?.data?.message || err.message || 'خطا در طراحی آزمون.';
      setError(Array.isArray(msg) ? msg.join('، ') : msg);
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

  const fetchExamResults = async (examId: string) => {
    try {
      setIsResultsLoading(true);
      const res = await apiClient.get(`/exams/${examId}/results`);
      const data = res.data?.data || res.data || res;
      setExamResultsData(data);
    } catch (err) {
      console.error('Failed to load exam results', err);
    } finally {
      setIsResultsLoading(false);
    }
  };

  const handleMonitorExam = (exam: any) => {
    setSelectedExam(exam);
    setIsMonitorOpen(true);
    setActiveFilter('ALL');
    fetchExamResults(exam.id);
  };

  const handleTogglePublish = async () => {
    if (!selectedExam) return;
    const isCurrentlyPublished = !!examResultsData?.exam?.isResultsPublished;
    const confirmMsg = isCurrentlyPublished
      ? 'آیا از لغو انتشار کارنامه آزمون اطمینان دارید؟ با این کار نمرات برای دانش‌آموزان پنهان خواهد شد.'
      : 'آیا از انتشار کارنامه برای کلیه دانش‌آموزان کلاس اطمینان دارید؟ با این کار نمرات نهایی و بازخوردها برای دانش‌آموزان قابل مشاهده می‌شود.';

    if (!window.confirm(confirmMsg)) return;

    try {
      setIsPublishing(true);
      await apiClient.patch(`/exams/${selectedExam.id}/publish-results`, {
        publish: !isCurrentlyPublished,
      });
      await Promise.all([fetchExamResults(selectedExam.id), fetchData()]);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'خطا در تغییر وضعیت انتشار کارنامه';
      alert(Array.isArray(msg) ? msg.join('، ') : msg);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleOpenPaperGrading = async (participationId: string) => {
    setIsGradePaperModalOpen(true);
    setIsSheetLoading(true);
    try {
      const res = await apiClient.get(`/exams/participations/${participationId}/sheet`);
      const sheet = res.data?.data || res.data || res;
      setActivePaperSheet(sheet);

      const initialGrades: Record<string, { scoreAwarded: number; teacherComment: string }> = {};
      (sheet.questions || []).forEach((q: any) => {
        initialGrades[q.questionId] = {
          scoreAwarded:
            q.studentAnswer?.scoreAwarded !== null && q.studentAnswer?.scoreAwarded !== undefined
              ? q.studentAnswer.scoreAwarded
              : 0,
          teacherComment: q.studentAnswer?.teacherComment || '',
        };
      });

      setGradingForm({
        grades: initialGrades,
        graceScore: sheet.participation?.graceScore || 0,
        graceReason: sheet.participation?.graceReason || '',
        teacherFeedback: sheet.participation?.teacherFeedback || '',
      });
    } catch (err: any) {
      console.error('Failed to load participation sheet', err);
      alert('خطا در بارگذاری برگه پاسخ‌نامه دانش‌آموز');
      setIsGradePaperModalOpen(false);
    } finally {
      setIsSheetLoading(false);
    }
  };

  const calculateLiveScore = () => {
    if (!activePaperSheet) return 0;
    const questionsTotal = Object.values(gradingForm.grades).reduce(
      (sum, g) => sum + (Number(g.scoreAwarded) || 0),
      0,
    );
    const grace = Number(gradingForm.graceScore) || 0;
    const maxScore = activePaperSheet.exam?.totalScore || 20;
    return Math.min(maxScore, Math.round((questionsTotal + grace) * 100) / 100);
  };

  const handleSaveGrading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePaperSheet) return;
    setIsSavingGrading(true);
    try {
      const gradesPayload = Object.entries(gradingForm.grades).map(([questionId, g]) => ({
        questionId,
        scoreAwarded: Number(g.scoreAwarded) || 0,
        teacherComment: g.teacherComment || '',
      }));

      await apiClient.patch(`/exams/participations/${activePaperSheet.participation.id}/grade`, {
        grades: gradesPayload,
        graceScore: Number(gradingForm.graceScore) || 0,
        graceReason: gradingForm.graceReason || '',
        teacherFeedback: gradingForm.teacherFeedback || '',
      });

      setIsGradePaperModalOpen(false);
      if (selectedExam) {
        fetchExamResults(selectedExam.id);
        fetchData();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'خطا در ثبت نمرات برگه';
      alert(Array.isArray(msg) ? msg.join('، ') : msg);
    } finally {
      setIsSavingGrading(false);
    }
  };

  // Filtered Participations
  const participationsList = examResultsData?.participations || [];
  const filteredParticipations = participationsList.filter((p: any) => {
    if (activeFilter === 'NEEDS_GRADING') return !p.isGraded;
    if (activeFilter === 'GRADED') return p.isGraded;
    if (activeFilter === 'FLAGGED') return p.tabSwitchCount > 0;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & CTA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink-darker flex items-center space-x-2 space-x-reverse">
            <HelpCircle className="h-6 w-6 text-primary" />
            <span>موتور آزمون آنلاین و تصحیح هوشمند (LMS Exam & Grading)</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            طراحی آزمون، تصحیح دستی سوالات تشریحی، اعطای نمره ارفاقی و مدیریت انتشار کارنامه‌ها
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setError(null);
            setIsCreateExamOpen(true);
          }}
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
            هنوز آزمونی تعریف نکرده‌اید. با کلیک بر روی «طراحی آزمون جدید» اولین آزمون خود را بسازید.
          </div>
        ) : (
          exams.map((exam) => {
            const isResultsPublished = !!exam.isResultsPublished;
            return (
              <Card key={exam.id} className="relative flex flex-col justify-between hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {exam.lesson?.name || 'درس عمومی'}
                      </span>
                      <CardTitle className="text-base mt-2">{exam.title}</CardTitle>
                    </div>
                    <Badge variant={isResultsPublished ? 'success' : 'warning'}>
                      {isResultsPublished ? 'کارنامه منتشرشده' : 'کارنامه منتشرنشده'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="space-y-1.5 text-xs text-gray-500 border-t pt-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center space-x-1.5 space-x-reverse">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span>مدت زمان:</span>
                      </span>
                      <strong>{exam.durationMinutes} دقیقه</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center space-x-1.5 space-x-reverse">
                        <CheckCircle2 className="h-3.5 w-3.5 text-gray-400" />
                        <span>بارم کل:</span>
                      </span>
                      <strong>{exam.totalScore} نمره</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center space-x-1.5 space-x-reverse">
                        <Users className="h-3.5 w-3.5 text-gray-400" />
                        <span>شرکت‌کنندگان:</span>
                      </span>
                      <strong>{exam._count?.participations || 0} نفر</strong>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse pt-1 border-t text-[11px]">
                      <span className="text-gray-400">کلاس‌ها:</span>
                      <span className="text-gray-700 truncate">
                        {exam.classrooms?.map((ec: any) => ec.classroom?.name).join('، ') || 'عمومی'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t pt-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => {
                        setSelectedExam(exam);
                        setIsAddQuestionOpen(true);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 ml-1" />
                      افزودن سوال
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1 text-xs flex items-center justify-center space-x-1 space-x-reverse"
                      onClick={() => handleMonitorExam(exam)}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>تصحیح و کارنامه</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
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
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {lessons.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>هیچ درسی به حساب کاربری شما تخصیص نیافته است. لطفاً جهت تخصیص درس با مدیریت مدرسه تماس بگیرید.</span>
            </div>
          )}

          <Input
            label="عنوان آزمون"
            placeholder="مثال: آزمون میان‌ترم حسابان ۱"
            value={examForm.title}
            onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-dark mb-1">کلاس هدف</label>
              <select
                value={examForm.classroomId}
                onChange={(e) => setExamForm({ ...examForm, classroomId: e.target.value })}
                className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs text-ink-normal focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">انتخاب کلاس...</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-dark mb-1">درس مرتبط</label>
              <select
                value={examForm.lessonId}
                onChange={(e) => setExamForm({ ...examForm, lessonId: e.target.value })}
                className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs text-ink-normal focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">انتخاب درس...</option>
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              type="number"
              label="مدت آزمون (دقیقه)"
              value={examForm.durationMinutes}
              onChange={(e) => setExamForm({ ...examForm, durationMinutes: Number(e.target.value) })}
              min={5}
              max={300}
              required
            />
            <Input
              type="number"
              label="بارم کل (نمره)"
              value={examForm.totalScore}
              onChange={(e) => setExamForm({ ...examForm, totalScore: Number(e.target.value) })}
              min={1}
              required
            />
            <Input
              type="number"
              label="نمره قبولی"
              value={examForm.passingScore}
              onChange={(e) => setExamForm({ ...examForm, passingScore: Number(e.target.value) })}
              min={1}
            />
          </div>

          <PersianDatePicker
            label="تاریخ برگزاری آزمون"
            value={examForm.examDate}
            onChange={(jalaliStr) => setExamForm({ ...examForm, examDate: jalaliStr })}
          />

          <div>
            <label className="block text-xs font-medium text-ink-dark mb-1">توضیحات و دستورالعمل آزمون</label>
            <textarea
              rows={3}
              value={examForm.description}
              onChange={(e) => setExamForm({ ...examForm, description: e.target.value })}
              placeholder="نکات مهم و راهنمای شرکت در آزمون..."
              className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs text-ink-normal focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCreateExamOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={lessons.length === 0}>
              ایجاد آزمون
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Modal: Add Question Directly to Exam */}
      <Modal
        isOpen={isAddQuestionOpen}
        onClose={() => setIsAddQuestionOpen(false)}
        title={`افزودن سوال به آزمون: ${selectedExam?.title || ''}`}
        description="ثبت مستقیم سوال تستی یا تشریحی با بارم‌بندی سرور"
        maxWidth="lg"
      >
        <form onSubmit={handleAddQuestion} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-dark mb-1">نوع سوال</label>
              <select
                value={questionForm.type}
                onChange={(e) => setQuestionForm({ ...questionForm, type: e.target.value })}
                className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs text-ink-normal focus:ring-2 focus:ring-primary"
              >
                <option value="MULTIPLE_CHOICE">چهارگزینه‌ای (تستی)</option>
                <option value="DESCRIPTIVE">تشریحی</option>
              </select>
            </div>

            <Input
              type="number"
              label="بارم سوال (نمره)"
              value={questionForm.score}
              onChange={(e) => setQuestionForm({ ...questionForm, score: Number(e.target.value) })}
              min={0.25}
              step={0.25}
              required
            />
          </div>

          <Input
            label="متن سوال"
            placeholder="صورت سوال را تایپ کنید..."
            value={questionForm.text}
            onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
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

      {/* 3. Modal: Exam Results & Grading Dashboard (ماژول جامع مدیریت و تصحیح آزمون) */}
      <Modal
        isOpen={isMonitorOpen}
        onClose={() => setIsMonitorOpen(false)}
        title={`داشبورد تصحیح و مدیریت آزمون: ${selectedExam?.title || ''}`}
        description="مشاهده عملکرد کلاس، پرچم‌های تقلب، تصحیح سوالات تشریحی، نمره ارفاقی و انتشار کارنامه‌ها"
        maxWidth="4xl"
      >
        <div className="space-y-5">
          {/* Top Control Bar: Publish Status & Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-200 gap-3">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                examResultsData?.exam?.isResultsPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {examResultsData?.exam?.isResultsPublished ? <CheckCheck className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
              </div>
              <div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className="font-bold text-sm text-ink-darker">وضعیت انتشار کارنامه‌ها:</span>
                  <Badge variant={examResultsData?.exam?.isResultsPublished ? 'success' : 'warning'}>
                    {examResultsData?.exam?.isResultsPublished ? 'کارنامه‌ها منتشر شده‌اند' : 'کارنامه‌ها منتشر نشده‌اند (پنهان از دانش‌آموزان)'}
                  </Badge>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {examResultsData?.exam?.isResultsPublished
                    ? 'دانش‌آموزان هم‌اکنون می‌توانند کارنامه، نمره نهایی و بازخوردهای شما را مشاهده کنند.'
                    : 'نمرات و کارنامه تا زمان فشردن دکمه انتشار، از دانش‌آموزان مخفی می‌ماند.'}
                </p>
              </div>
            </div>

            <Button
              variant={examResultsData?.exam?.isResultsPublished ? 'outline' : 'primary'}
              onClick={handleTogglePublish}
              isLoading={isPublishing}
              className="shrink-0 text-xs flex items-center space-x-1.5 space-x-reverse"
            >
              <CheckCheck className="h-4 w-4" />
              <span>{examResultsData?.exam?.isResultsPublished ? 'لغو انتشار کارنامه' : 'انتشار کارنامه‌ها برای کلاس'}</span>
            </Button>
          </div>

          {/* Quick Statistics KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border bg-white space-y-1">
              <span className="text-[11px] text-gray-500">شرکت‌کنندگان</span>
              <div className="text-xl font-bold text-ink-darker">
                {examResultsData?.stats?.totalStudents || 0} نفر
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">
                {examResultsData?.stats?.gradedCount || 0} تصحیح‌شده
              </span>
            </div>

            <div className="p-3.5 rounded-xl border bg-white space-y-1">
              <span className="text-[11px] text-gray-500">نیازمند تصحیح</span>
              <div className="text-xl font-bold text-amber-600">
                {examResultsData?.stats?.needsGradingCount || 0} برگه
              </div>
              <span className="text-[10px] text-gray-400">برگه‌های در انتظار</span>
            </div>

            <div className="p-3.5 rounded-xl border bg-white space-y-1">
              <span className="text-[11px] text-gray-500">میانگین نمرات کلاس</span>
              <div className="text-xl font-bold text-primary">
                {examResultsData?.stats?.averageScore || 0}
                <span className="text-xs font-normal text-gray-400 mr-1">/ {selectedExam?.totalScore || 20}</span>
              </div>
              <span className="text-[10px] text-gray-500">
                بالاترین: {examResultsData?.stats?.maxScore || 0}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border bg-white space-y-1">
              <span className="text-[11px] text-gray-500">هشدار تعویض تب</span>
              <div className="text-xl font-bold text-rose-600">
                {examResultsData?.stats?.tabSwitchFlaggedCount || 0} مورد
              </div>
              <span className="text-[10px] text-gray-400">سیگنال تقلب نرم</span>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-2 space-x-reverse border-b pb-2 text-xs">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeFilter === 'ALL' ? 'bg-primary text-white font-bold' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              همه ({participationsList.length})
            </button>
            <button
              onClick={() => setActiveFilter('NEEDS_GRADING')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeFilter === 'NEEDS_GRADING' ? 'bg-amber-600 text-white font-bold' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              نیازمند تصحیح ({examResultsData?.stats?.needsGradingCount || 0})
            </button>
            <button
              onClick={() => setActiveFilter('GRADED')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeFilter === 'GRADED' ? 'bg-emerald-600 text-white font-bold' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              تصحیح‌شده ({examResultsData?.stats?.gradedCount || 0})
            </button>
            <button
              onClick={() => setActiveFilter('FLAGGED')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeFilter === 'FLAGGED' ? 'bg-rose-600 text-white font-bold' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              مشکوک به تخلف ({examResultsData?.stats?.tabSwitchFlaggedCount || 0})
            </button>
          </div>

          {/* Participations Table */}
          {isResultsLoading ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <MobileDataTable
              items={filteredParticipations}
              emptyMessage="موردی برای نمایش در این دسته وجود ندارد."
              primaryField={(part: any) => (
                <div>
                  <div className="font-bold text-xs text-ink-dark">{part.studentName}</div>
                  <div className="text-[11px] font-mono text-gray-400">
                    {part.phone || part.nationalId || 'بدون شناسه'}
                  </div>
                </div>
              )}
              secondaryField={(part: any) => (
                <div className="text-left">
                  {part.totalScore !== null ? (
                    <span className="text-primary font-bold text-xs font-mono">
                      {part.totalScore} / {selectedExam?.totalScore || 20}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                  <div>
                    <Badge variant={part.isGraded ? 'success' : 'warning'} className="text-[10px]">
                      {part.isGraded ? 'تصحیح‌شده' : 'نیازمند تصحیح'}
                    </Badge>
                  </div>
                </div>
              )}
              columns={[
                {
                  header: 'دانش‌آموز',
                  cell: (part: any) => (
                    <div>
                      <div className="font-bold text-xs text-ink-dark">{part.studentName}</div>
                      <div className="text-[11px] font-mono text-gray-400">
                        {part.phone || part.nationalId || 'بدون شناسه'}
                      </div>
                    </div>
                  ),
                },
                {
                  header: 'نمره نهایی',
                  cell: (part: any) => (
                    part.totalScore !== null ? (
                      <span className="text-primary font-bold text-xs font-mono">
                        {part.totalScore} / {selectedExam?.totalScore || 20}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )
                  ),
                },
                {
                  header: 'وضعیت برگه',
                  cell: (part: any) => (
                    <Badge variant={part.isGraded ? 'success' : 'warning'}>
                      {part.isGraded ? 'تصحیح‌شده' : 'نیازمند تصحیح'}
                    </Badge>
                  ),
                },
                {
                  header: 'زمان تحویل',
                  cell: (part: any) => (
                    <span className="text-xs text-gray-600 font-mono">
                      {part.submittedAt
                        ? new Date(part.submittedAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
                        : 'در حال آزمون'}
                    </span>
                  ),
                  mobileDetail: true,
                },
                {
                  header: 'سیگنال تقلب',
                  cell: (part: any) => (
                    part.tabSwitchCount > 0 ? (
                      <Badge variant="destructive" className="inline-flex items-center space-x-1 space-x-reverse">
                        <ShieldAlert className="h-3 w-3" />
                        <span>{part.tabSwitchCount} خروج</span>
                      </Badge>
                    ) : (
                      <span className="text-[11px] text-gray-400">بدون خروج</span>
                    )
                  ),
                  mobileDetail: true,
                },
                {
                  header: 'نمره ارفاقی',
                  cell: (part: any) => (
                    part.graceScore > 0 ? (
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-mono">
                        +{part.graceScore}
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-400">—</span>
                    )
                  ),
                  mobileDetail: true,
                },
                {
                  header: 'عملیات',
                  cell: (part: any) => (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenPaperGrading(part.id)}
                      className="text-xs flex items-center gap-1 h-8 px-2.5"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-primary" />
                      <span>تصحیح برگه</span>
                    </Button>
                  ),
                },
              ]}
            />
          )}

          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={() => setIsMonitorOpen(false)}>
              بستن
            </Button>
          </div>
        </div>
      </Modal>

      {/* 4. Dedicated Paper Grading Modal (مودال اختصاصی تصحیح برگه، نمره ارفاقی و ثبت بازخورد) */}
      <Modal
        isOpen={isGradePaperModalOpen}
        onClose={() => setIsGradePaperModalOpen(false)}
        title={`تصحیح برگه: ${activePaperSheet?.student?.user?.firstName || ''} ${activePaperSheet?.student?.user?.lastName || ''}`}
        description={`بررسی پاسخ‌ها، نمره‌دهی به سوالات تشریحی و اعمال نمره ارفاقی برای آزمون ${activePaperSheet?.exam?.title || ''}`}
        maxWidth="3xl"
      >
        {isSheetLoading ? (
          <div className="space-y-4 py-8">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <form onSubmit={handleSaveGrading} className="space-y-5">
            {/* Student Session Metadata Bar */}
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex flex-wrap items-center justify-between text-xs gap-3">
              <div className="flex items-center space-x-2 space-x-reverse">
                <span className="text-gray-500">کد ملی / تماس:</span>
                <strong>{activePaperSheet?.student?.user?.nationalId || activePaperSheet?.student?.user?.phone || '—'}</strong>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <span className="text-gray-500">زمان تحویل:</span>
                <span>{activePaperSheet?.participation?.submittedAt ? new Date(activePaperSheet.participation.submittedAt).toLocaleTimeString('fa-IR') : '—'}</span>
              </div>
              {activePaperSheet?.participation?.tabSwitchCount > 0 && (
                <Badge variant="destructive" className="flex items-center space-x-1 space-x-reverse">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>هشدار: {activePaperSheet.participation.tabSwitchCount} بار تعویض تب</span>
                </Badge>
              )}
            </div>

            {/* Questions Grading List */}
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {(activePaperSheet?.questions || []).map((q: any, idx: number) => {
                const isDescriptive = q.type === 'DESCRIPTIVE';
                const ans = q.studentAnswer;

                return (
                  <Card key={q.questionId} className="p-4 border border-gray-200 bg-white space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <span className="font-bold text-xs bg-gray-100 text-ink-dark px-2 py-0.5 rounded">
                          سوال {idx + 1}
                        </span>
                        <Badge variant={isDescriptive ? 'warning' : 'default'}>
                          {isDescriptive ? 'تشریحی' : 'تستی'}
                        </Badge>
                      </div>
                      <span className="text-xs font-bold text-primary">بارم: {q.score} نمره</span>
                    </div>

                    <h4 className="text-xs font-bold text-ink-darker whitespace-pre-wrap">{q.text}</h4>

                    {/* Multiple Choice Preview */}
                    {!isDescriptive && q.options && (
                      <div className="space-y-1.5 pt-1">
                        {q.options.map((opt: any) => {
                          const isStudentSelected = ans?.selectedOptionId === opt.id;
                          const isCorrect = opt.isCorrect;

                          return (
                            <div
                              key={opt.id}
                              className={`p-2.5 rounded-lg text-xs flex items-center justify-between border ${
                                isCorrect
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                                  : isStudentSelected
                                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                                  : 'bg-gray-50 border-gray-200 text-gray-600'
                              }`}
                            >
                              <div className="flex items-center space-x-2 space-x-reverse">
                                <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                  isStudentSelected ? (isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white') : 'border-gray-300'
                                }`}>
                                  {isStudentSelected && (isCorrect ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />)}
                                </div>
                                <span>{opt.text}</span>
                              </div>
                              {isCorrect && (
                                <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">پاسخ صحیح</span>
                              )}
                              {isStudentSelected && !isCorrect && (
                                <span className="text-[10px] text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">انتخاب نادرست</span>
                              )}
                            </div>
                          );
                        })}
                        <div className="text-[11px] text-gray-500 pt-1">
                          نمره تصحیح خودکار: <strong>{ans?.scoreAwarded ?? 0} از {q.score}</strong>
                        </div>
                      </div>
                    )}

                    {/* Descriptive Student Answer & Teacher Scoring Box */}
                    {isDescriptive && (
                      <div className="space-y-3 pt-2">
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                          <span className="text-[11px] font-bold text-gray-600 block mb-1">پاسخ تشریحی دانش‌آموز:</span>
                          <p className="text-xs text-ink-darker leading-relaxed whitespace-pre-wrap font-medium">
                            {ans?.descriptiveAnswer ? ans.descriptiveAnswer : 'دانش‌آموز پاسخی برای این سوال تایپ نکرده است.'}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                          <div>
                            <label className="block text-[11px] font-bold text-ink-dark mb-1">نمره این سوال (از {q.score}):</label>
                            <Input
                              type="number"
                              min={0}
                              max={q.score}
                              step={0.25}
                              value={gradingForm.grades[q.questionId]?.scoreAwarded ?? 0}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setGradingForm((prev) => ({
                                  ...prev,
                                  grades: {
                                    ...prev.grades,
                                    [q.questionId]: {
                                      ...prev.grades[q.questionId],
                                      scoreAwarded: val,
                                    },
                                  },
                                }));
                              }}
                              required
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-ink-dark mb-1">کامنت و بازخورد سوال (اختیاری):</label>
                            <Input
                              placeholder="توضیح نقطه ضعف یا قوت پاسخ..."
                              value={gradingForm.grades[q.questionId]?.teacherComment || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGradingForm((prev) => ({
                                  ...prev,
                                  grades: {
                                    ...prev.grades,
                                    [q.questionId]: {
                                      ...prev.grades[q.questionId],
                                      teacherComment: val,
                                    },
                                  },
                                }));
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Grace Score Section (نمره ارفاقی دبیر) */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 space-y-3">
              <div className="flex items-center space-x-2 space-x-reverse text-amber-800">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <span className="font-bold text-xs">نمره ارفاقی دبیر (Grace / Bonus Score):</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-amber-900 mb-1">میزان نمره ارفاقی:</label>
                  <Input
                    type="number"
                    min={0}
                    max={activePaperSheet?.exam?.totalScore || 20}
                    step={0.25}
                    value={gradingForm.graceScore}
                    onChange={(e) => setGradingForm({ ...gradingForm, graceScore: Number(e.target.value) })}
                    placeholder="مثال: 1.5"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-amber-900 mb-1">علت نمره ارفاقی:</label>
                  <Input
                    value={gradingForm.graceReason}
                    onChange={(e) => setGradingForm({ ...gradingForm, graceReason: e.target.value })}
                    placeholder="مثال: فعالیت مستمر کلاسی و حل مسائل امتیازی..."
                  />
                </div>
              </div>
            </div>

            {/* Teacher Overall Feedback */}
            <div>
              <label className="block text-xs font-bold text-ink-dark mb-1">بازخورد و توصیه کلی برای کارنامه دانش‌آموز:</label>
              <textarea
                rows={2}
                value={gradingForm.teacherFeedback}
                onChange={(e) => setGradingForm({ ...gradingForm, teacherFeedback: e.target.value })}
                placeholder="پیام تشویقی یا نقاط قابل بهبود دانش‌آموز..."
                className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs text-ink-normal focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Live Score Summary Footer */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 block">نمره نهایی محاسبه‌شده برگه:</span>
                <div className="text-2xl font-extrabold text-primary mt-0.5">
                  {calculateLiveScore()} <span className="text-xs font-normal text-gray-500">/ {activePaperSheet?.exam?.totalScore || 20} نمره</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Button type="button" variant="ghost" onClick={() => setIsGradePaperModalOpen(false)}>
                  انصراف
                </Button>
                <Button type="submit" variant="primary" isLoading={isSavingGrading}>
                  ثبت نهایی تصحیح برگه
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
