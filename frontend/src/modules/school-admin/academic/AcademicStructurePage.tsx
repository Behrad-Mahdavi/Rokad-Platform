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
  GraduationCap,
  Calendar,
  Layers,
  BookOpen,
  Plus,
  CheckCircle,
  Building,
} from 'lucide-react';

export const AcademicStructurePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'YEARS' | 'CLASSROOMS' | 'LESSONS'>('CLASSROOMS');
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);

  // Forms
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [yearForm, setYearForm] = useState({
    name: 'سال تحصیلی ۱۴۰۵-۱۴۰۶',
    startDate: '2026-09-23',
    endDate: '2027-06-21',
    isCurrent: false,
  });

  const [classForm, setClassForm] = useState({
    name: '',
    code: '',
    capacity: 30,
    academicYearId: '',
  });

  const [lessonForm, setLessonForm] = useState({
    name: '',
    code: '',
    units: 3,
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [yearsRes, classesRes, lessonsRes, teachersRes] = await Promise.all([
        apiClient.get('/academic/years'),
        apiClient.get('/classes/classrooms'),
        apiClient.get('/academic/lessons'),
        apiClient.get('/members/teachers'),
      ]);

      setAcademicYears(yearsRes.data || []);
      setClassrooms(classesRes.data || []);
      setLessons(lessonsRes.data || []);
      setTeachers(teachersRes.data || []);

      if (yearsRes.data?.length > 0) {
        const current = yearsRes.data.find((y: any) => y.isCurrent) || yearsRes.data[0];
        setClassForm((prev) => ({ ...prev, academicYearId: current.id }));
      }
    } catch (err) {
      console.error('Failed to load academic data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/academic/years', yearForm);
      setIsYearModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت سال تحصیلی.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/classes/classrooms', classForm);
      setIsClassModalOpen(false);
      setClassForm({ name: '', code: '', capacity: 30, academicYearId: classForm.academicYearId });
      fetchData();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت کلاس درس.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/academic/lessons', lessonForm);
      setIsLessonModalOpen(false);
      setLessonForm({ name: '', code: '', units: 3 });
      fetchData();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت درس.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink-darker flex items-center space-x-2 space-x-reverse">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span>ساختار آموزشی و کلاس‌های درس (Academic Structure)</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            مدیریت سال‌های تحصیلی، نیم‌سال‌ها، کلاس‌های درس، دروس و تخصیص سرفصل‌ها
          </p>
        </div>

        {/* Dynamic Action Button based on Tab */}
        <div className="flex gap-2">
          {activeTab === 'YEARS' && (
            <Button variant="primary" onClick={() => setIsYearModalOpen(true)}>
              <Plus className="h-4 w-4 ml-1" />
              <span>ثبت سال تحصیلی جدید</span>
            </Button>
          )}
          {activeTab === 'CLASSROOMS' && (
            <Button variant="primary" onClick={() => setIsClassModalOpen(true)}>
              <Plus className="h-4 w-4 ml-1" />
              <span>ایجاد کلاس درس جدید</span>
            </Button>
          )}
          {activeTab === 'LESSONS' && (
            <Button variant="primary" onClick={() => setIsLessonModalOpen(true)}>
              <Plus className="h-4 w-4 ml-1" />
              <span>تعریف درس جدید</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 space-x-reverse border-b border-gray-200">
        <button
          onClick={() => setActiveTab('CLASSROOMS')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 space-x-reverse ${
            activeTab === 'CLASSROOMS'
              ? 'border-primary text-primary-dark'
              : 'border-transparent text-gray-500 hover:text-ink-dark'
          }`}
        >
          <Building className="h-4 w-4" />
          <span>کلاس‌های درس ({classrooms.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('YEARS')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 space-x-reverse ${
            activeTab === 'YEARS'
              ? 'border-primary text-primary-dark'
              : 'border-transparent text-gray-500 hover:text-ink-dark'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>سال‌ها و نیم‌سال‌های تحصیلی ({academicYears.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('LESSONS')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 space-x-reverse ${
            activeTab === 'LESSONS'
              ? 'border-primary text-primary-dark'
              : 'border-transparent text-gray-500 hover:text-ink-dark'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>عناوین دروس ({lessons.length})</span>
        </button>
      </div>

      {/* Tab 1: Classrooms */}
      {activeTab === 'CLASSROOMS' && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>نام کلاس</TableHead>
              <TableHead>کد کلاسی</TableHead>
              <TableHead>سال تحصیلی</TableHead>
              <TableHead>تعداد دانش‌آموزان</TableHead>
              <TableHead>ظرفیت کلاس</TableHead>
              <TableHead>وضعیت</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                </TableRow>
              ))
            ) : classrooms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  هنوز کلاسی ثبت نشده است. از دکمه «ایجاد کلاس درس جدید» استفاده کنید.
                </TableCell>
              </TableRow>
            ) : (
              classrooms.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-bold text-ink-darker">{c.name}</div>
                    <div className="text-[11px] text-gray-500">{c.grade?.name || 'پایه دهم'}</div>
                  </TableCell>
                  <TableCell><span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{c.code}</span></TableCell>
                  <TableCell><span className="text-xs text-gray-600">{c.academicYear?.name || '۱۴۰۴-۱۴۰۵'}</span></TableCell>
                  <TableCell>
                    <span className="font-bold text-ink-darker">{c._count?.students || 0}</span> دانش‌آموز
                  </TableCell>
                  <TableCell><span className="text-xs text-gray-500">{c.capacity || 30} نفر</span></TableCell>
                  <TableCell><Badge variant="success">فعال</Badge></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {/* Tab 2: Academic Years */}
      {activeTab === 'YEARS' && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>عنوان سال تحصیلی</TableHead>
              <TableHead>تاریخ شروع</TableHead>
              <TableHead>تاریخ پایان</TableHead>
              <TableHead>نیم‌سال‌ها (Terms)</TableHead>
              <TableHead>وضعیت جاری</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {academicYears.map((y) => (
              <TableRow key={y.id}>
                <TableCell><div className="font-bold text-ink-darker">{y.name}</div></TableCell>
                <TableCell><span className="text-xs font-mono text-gray-600">{new Date(y.startDate).toLocaleDateString('fa-IR')}</span></TableCell>
                <TableCell><span className="text-xs font-mono text-gray-600">{new Date(y.endDate).toLocaleDateString('fa-IR')}</span></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {y.terms?.map((t: any) => (
                      <span key={t.id} className="text-[10px] bg-primary-light text-primary-darker px-2 py-0.5 rounded font-bold">
                        {t.name}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {y.isCurrent ? (
                    <Badge variant="success">سال جاری</Badge>
                  ) : (
                    <Badge variant="neutral">گذشته</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Tab 3: Lessons */}
      {activeTab === 'LESSONS' && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>نام درس</TableHead>
              <TableHead>کد درس</TableHead>
              <TableHead>تعداد واحد</TableHead>
              <TableHead>تعداد سرفصل‌ها</TableHead>
              <TableHead>وضعیت</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lessons.map((l) => (
              <TableRow key={l.id}>
                <TableCell><div className="font-bold text-ink-darker">{l.name}</div></TableCell>
                <TableCell><span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{l.code}</span></TableCell>
                <TableCell><span className="text-xs font-bold text-ink-dark">{l.units || 3} واحد</span></TableCell>
                <TableCell><span className="text-xs text-gray-500">{l._count?.topics || 0} مبحث</span></TableCell>
                <TableCell><Badge variant="default">فعال</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* 1. Modal: Create Academic Year */}
      <Modal
        isOpen={isYearModalOpen}
        onClose={() => setIsYearModalOpen(false)}
        title="تعریف سال تحصیلی جدید"
        description="ایجاد سال تحصیلی و ساخت خودکار نیم‌سال اول و دوم"
        maxWidth="md"
      >
        <form onSubmit={handleCreateYear} className="space-y-4">
          <Input
            label="عنوان سال تحصیلی"
            placeholder="مثال: سال تحصیلی ۱۴۰۵-۱۴۰۶"
            value={yearForm.name}
            onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="تاریخ شروع (میلادی)"
              type="date"
              value={yearForm.startDate}
              onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })}
              required
            />
            <Input
              label="تاریخ پایان (میلادی)"
              type="date"
              value={yearForm.endDate}
              onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsYearModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              ثبت سال تحصیلی
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Modal: Create Classroom */}
      <Modal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        title="ایجاد کلاس درس جدید"
        description="تعریف کلاس آموزشی برای سال تحصیلی جاری"
        maxWidth="md"
      >
        <form onSubmit={handleCreateClass} className="space-y-4">
          <Input
            label="نام کلاس"
            placeholder="مثال: کلاس ۱۰۱ — تجربی"
            value={classForm.name}
            onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="کد یکتای کلاس"
              placeholder="مثال: CLS-101"
              value={classForm.code}
              onChange={(e) => setClassForm({ ...classForm, code: e.target.value })}
              required
            />
            <Input
              label="ظرفیت دانش‌آموزان"
              type="number"
              value={classForm.capacity}
              onChange={(e) => setClassForm({ ...classForm, capacity: Number(e.target.value) })}
              required
            />
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsClassModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              ایجاد کلاس
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Modal: Create Lesson */}
      <Modal
        isOpen={isLessonModalOpen}
        onClose={() => setIsLessonModalOpen(false)}
        title="تعریف عنوان درس جدید"
        description="افزودن درس به چارت آموزشی مدرسه"
        maxWidth="md"
      >
        <form onSubmit={handleCreateLesson} className="space-y-4">
          <Input
            label="نام درس"
            placeholder="مثال: ریاضی و آمار ۲"
            value={lessonForm.name}
            onChange={(e) => setLessonForm({ ...lessonForm, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="کد درس"
              placeholder="مثال: MATH-102"
              value={lessonForm.code}
              onChange={(e) => setLessonForm({ ...lessonForm, code: e.target.value })}
              required
            />
            <Input
              label="تعداد واحد"
              type="number"
              value={lessonForm.units}
              onChange={(e) => setLessonForm({ ...lessonForm, units: Number(e.target.value) })}
              required
            />
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsLessonModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              ثبت درس
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
