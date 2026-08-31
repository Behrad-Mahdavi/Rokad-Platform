import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  BookOpen,
  Plus,
  FileText,
  UploadCloud,
  CheckCircle2,
  HardDrive,
  Download,
} from 'lucide-react';

export const LessonPlansPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'MATERIALS' | 'PLANS'>('MATERIALS');
  const [materials, setMaterials] = useState<any[]>([]);
  const [lessonPlans, setLessonPlans] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  // Forms
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [materialForm, setMaterialForm] = useState({
    title: '',
    description: '',
    lessonId: '',
    classroomId: '',
    materialType: 'DOCUMENT',
    fileSizeMb: 5.4,
  });

  const [planForm, setPlanForm] = useState({
    title: '',
    lessonId: '',
    sessionNumber: 1,
    topics: '',
    pedagogicalGoal: '',
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [matRes, plansRes, lessonRes, classRes] = await Promise.all([
        apiClient.get('/learning-materials'),
        apiClient.get('/lesson-plans'),
        apiClient.get('/academic/lessons'),
        apiClient.get('/classes/classrooms'),
      ]);

      setMaterials(matRes.data || []);
      setLessonPlans(plansRes.data || []);
      setLessons(lessonRes.data || []);
      setClassrooms(classRes.data || []);

      if (lessonRes.data?.length > 0) {
        setMaterialForm((prev) => ({ ...prev, lessonId: lessonRes.data[0].id }));
        setPlanForm((prev) => ({ ...prev, lessonId: lessonRes.data[0].id }));
      }
      if (classRes.data?.length > 0) {
        setMaterialForm((prev) => ({ ...prev, classroomId: classRes.data[0].id }));
      }
    } catch (err) {
      console.error('Failed to load materials', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      // Direct client to MinIO presigned URL simulation
      const presignedRes = await apiClient.post('/storage/presigned-upload', {
        fileName: `${materialForm.title}.pdf`,
        contentType: 'application/pdf',
        purpose: 'COURSE_MATERIAL',
      });

      const { fileKey, uploadUrl, downloadUrl } = presignedRes.data;

      // Register material record
      await apiClient.post('/learning-materials', {
        title: materialForm.title,
        description: materialForm.description,
        lessonId: materialForm.lessonId,
        classroomId: materialForm.classroomId,
        fileKey: fileKey || 'materials/calculus-chapter2.pdf',
        fileUrl: downloadUrl || 'https://minio.rokadschool.ir/materials/calculus-chapter2.pdf',
        fileSizeMb: Number(materialForm.fileSizeMb),
        materialType: materialForm.materialType,
      });

      setIsUploadModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'خطا در بارگذاری محتوا.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/lesson-plans', planForm);
      setIsPlanModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت طرح درس.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink-darker flex items-center space-x-2 space-x-reverse">
            <BookOpen className="h-6 w-6 text-primary" />
            <span>طرح درس و محتوای آموزشی (Course Materials & LMS)</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            بارگذاری جزوات و فایل‌های درسی در فضای ابری MinIO و مدیریت سرفصل‌های تدریس
          </p>
        </div>

        <div className="flex gap-2">
          {activeTab === 'MATERIALS' && (
            <Button variant="primary" onClick={() => setIsUploadModalOpen(true)}>
              <UploadCloud className="h-4 w-4 ml-1" />
              <span>بارگذاری جزوه یا ویدیو</span>
            </Button>
          )}
          {activeTab === 'PLANS' && (
            <Button variant="primary" onClick={() => setIsPlanModalOpen(true)}>
              <Plus className="h-4 w-4 ml-1" />
              <span>ثبت طرح درس جدید</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 space-x-reverse border-b border-gray-200">
        <button
          onClick={() => setActiveTab('MATERIALS')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 space-x-reverse ${
            activeTab === 'MATERIALS'
              ? 'border-primary text-primary-dark'
              : 'border-transparent text-gray-500 hover:text-ink-dark'
          }`}
        >
          <HardDrive className="h-4 w-4" />
          <span>جزوات و فایل‌های بارگذاری‌شده ({materials.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PLANS')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 space-x-reverse ${
            activeTab === 'PLANS'
              ? 'border-primary text-primary-dark'
              : 'border-transparent text-gray-500 hover:text-ink-dark'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>طرح درس‌های جلسات ({lessonPlans.length})</span>
        </button>
      </div>

      {/* Tab 1: Materials Grid */}
      {activeTab === 'MATERIALS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <Skeleton className="h-10 w-full" />
              </Card>
            ))
          ) : materials.length === 0 ? (
            <div className="col-span-3 text-center py-12 bg-white rounded-2xl border border-gray-200 text-gray-500 text-sm">
              هنوز فایلی بارگذاری نشده است. از دکمه «بارگذاری جزوه یا ویدیو» استفاده کنید.
            </div>
          ) : (
            materials.map((mat) => (
              <Card key={mat.id} className="flex flex-col justify-between p-6 border hover:border-primary transition-all">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Badge variant="default">{mat.lesson?.name || 'حسابان پیشرفته'}</Badge>
                    <span className="text-[11px] font-mono font-bold text-gray-500">{mat.fileSizeMb} MB</span>
                  </div>

                  <h3 className="font-bold text-base text-ink-darker mb-1 flex items-center space-x-1.5 space-x-reverse">
                    <FileText className="h-4 w-4 text-primary" />
                    <span>{mat.title}</span>
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-4">
                    {mat.description || 'جزوه آموزشی دست‌نویس با مثال‌های تکمیلی'}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-mono">
                    فضای ابری MinIO
                  </span>

                  <a
                    href={mat.fileUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 space-x-reverse text-xs text-primary font-bold hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>دانلود فایل</span>
                  </a>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Lesson Plans Grid */}
      {activeTab === 'PLANS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {lessonPlans.map((lp) => (
            <Card key={lp.id} className="p-6 border">
              <div className="flex justify-between items-center mb-3">
                <Badge variant="default">جلسه شماره {lp.sessionNumber || 1}</Badge>
                <span className="text-xs text-gray-500">{lp.lesson?.name || 'ریاضیات'}</span>
              </div>
              <h3 className="font-bold text-base text-ink-darker mb-2">{lp.title}</h3>
              <p className="text-xs text-gray-600 leading-relaxed mb-3">
                <strong>سرفصل‌ها:</strong> {lp.topics || 'مفهوم حد و پیوستگی در توابع چندجمله‌ای'}
              </p>
              <div className="p-3 bg-gray-50 rounded-xl border text-xs text-gray-500">
                <strong>هدف آموزشی:</strong> {lp.pedagogicalGoal || 'تسلط بر حل مسائل حد توابع کسری و رادیکالی'}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 1. Modal: Upload Material */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="بارگذاری جزوه یا محتوای آموزشی (MinIO Storage)"
        description="بارگذاری مستقیم فایل با Presigned URL و صدور لینک دانلود امن برای دانش‌آموزان"
        maxWidth="lg"
      >
        <form onSubmit={handleUploadMaterial} className="space-y-4">
          <Input
            label="عنوان فایل یا جزوه"
            placeholder="مثال: جزوه دست‌نویس فصل مشتق و تست‌های تکمیلی"
            value={materialForm.title}
            onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">درس مرتبط</label>
              <select
                value={materialForm.lessonId}
                onChange={(e) => setMaterialForm({ ...materialForm, lessonId: e.target.value })}
                className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">کلاس هدف</label>
              <select
                value={materialForm.classroomId}
                onChange={(e) => setMaterialForm({ ...materialForm, classroomId: e.target.value })}
                className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="توضیحات کوتاه محتوا"
            placeholder="مثال: شامل حل ۵۰ تست تالیفی و نکات طلایی امتحان نهایی"
            value={materialForm.description}
            onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
          />

          <div className="p-6 border-2 border-dashed border-primary/40 rounded-2xl bg-primary-light/30 text-center space-y-2">
            <UploadCloud className="h-10 w-10 text-primary mx-auto" />
            <div className="text-xs font-bold text-ink-darker">فایل جزوه را انتخاب کنید (PDF, MP4, ZIP)</div>
            <div className="text-[11px] text-gray-500">آپلود مستقیم با پیشرفت سرعت بالا به سرور ابری MinIO</div>
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsUploadModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              بارگذاری و انتشار برای کلاس
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Modal: Create Lesson Plan */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title="ثبت طرح درس جدید"
        description="برنامه‌ریزی سرفصل‌های تدریس برای هر جلسه کلاسی"
        maxWidth="md"
      >
        <form onSubmit={handleCreatePlan} className="space-y-4">
          <Input
            label="عنوان جلسه آموزشی"
            placeholder="مثال: جلسه سوم — مشتق توابع مثلثاتی"
            value={planForm.title}
            onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="شماره جلسه"
              type="number"
              value={planForm.sessionNumber}
              onChange={(e) => setPlanForm({ ...planForm, sessionNumber: Number(e.target.value) })}
              required
            />
            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">درس</label>
              <select
                value={planForm.lessonId}
                onChange={(e) => setPlanForm({ ...planForm, lessonId: e.target.value })}
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

          <Input
            label="سرفصل‌ها و مباحث"
            placeholder="مثال: فرمول‌های مشتق sin و cos همراه با تمرین"
            value={planForm.topics}
            onChange={(e) => setPlanForm({ ...planForm, topics: e.target.value })}
            required
          />

          <Input
            label="هدف آموزشی و خروجی یادگیری"
            placeholder="مثال: دانش‌آموز توانایی محاسبه مشتق توابع ترکیبی را پیدا کند"
            value={planForm.pedagogicalGoal}
            onChange={(e) => setPlanForm({ ...planForm, pedagogicalGoal: e.target.value })}
          />

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsPlanModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              ذخیره طرح درس
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
