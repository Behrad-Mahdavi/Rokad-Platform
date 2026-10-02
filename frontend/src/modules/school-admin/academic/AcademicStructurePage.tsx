import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { PersianDatePicker } from '../../../components/ui/PersianDatePicker';
import {
  formatJalaliDisplay,
  jalaliToGregorianDate,
} from '../../../utils/jalali';
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
  GraduationCap,
  Calendar,
  Layers,
  BookOpen,
  Plus,
  CheckCircle,
  Building,
  AlertCircle,
  Edit3,
  Trash2,
} from 'lucide-react';
import { toast } from '../../../components/ui/toast/toast';
import { ResponsivePageHeader } from '@/components/ui/ResponsivePageHeader';

export const AcademicStructurePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'YEARS' | 'CLASSROOMS' | 'LESSONS'>('CLASSROOMS');
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isEditLessonModalOpen, setIsEditLessonModalOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [deleteConfirmClass, setDeleteConfirmClass] = useState<any | null>(null);
  const [isDeletingClass, setIsDeletingClass] = useState(false);
  const [deleteConfirmLesson, setDeleteConfirmLesson] = useState<any | null>(null);
  const [isDeletingLesson, setIsDeletingLesson] = useState(false);

  // Forms
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editClassForm, setEditClassForm] = useState({
    name: '',
    code: '',
    capacity: 30,
    academicYearId: '',
    levelId: '',
    fieldId: '',
    roomNumber: '',
  });

  const [yearForm, setYearForm] = useState({
    name: 'سال تحصیلی ۱۴۰۵-۱۴۰۶',
    startDate: '1405-07-01',
    endDate: '1406-03-31',
    isCurrent: false,
  });

  const [classForm, setClassForm] = useState({
    name: '',
    code: '',
    capacity: 30,
    academicYearId: '',
    levelId: '',
    fieldId: '',
    roomNumber: '',
  });

  const [lessonForm, setLessonForm] = useState({
    name: '',
    code: '',
    units: 3,
    levelId: '',
    fieldId: '',
    type: 'TECHNICAL_MODULAR_COMPETENCY',
    isModular: true,
    podmanCount: 5,
    podmanTitles: ['پودمان ۱', 'پودمان ۲', 'پودمان ۳', 'پودمان ۴', 'پودمان ۵'],
    teacherIds: [] as string[],
  });

  const [editLessonForm, setEditLessonForm] = useState({
    name: '',
    code: '',
    units: 3,
    levelId: '',
    fieldId: '',
    type: 'TECHNICAL_MODULAR_COMPETENCY',
    isModular: true,
    podmanCount: 5,
    podmanTitles: ['پودمان ۱', 'پودمان ۲', 'پودمان ۳', 'پودمان ۴', 'پودمان ۵'],
    teacherIds: [] as string[],
  });

  const [lessonFilterLevel, setLessonFilterLevel] = useState<string>('ALL');
  const [lessonFilterField, setLessonFilterField] = useState<string>('ALL');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [yearsRes, classesRes, lessonsRes, teachersRes, levelsRes, fieldsRes] = await Promise.all([
        apiClient.get('/academic/years'),
        apiClient.get('/classes/classrooms'),
        apiClient.get('/classes/lessons'),
        apiClient.get('/members/teachers'),
        apiClient.get('/academic/levels'),
        apiClient.get('/academic/fields'),
      ]);

      setAcademicYears(yearsRes.data || []);
      setClassrooms(classesRes.data || []);
      setLessons(lessonsRes.data || []);
      setTeachers(teachersRes.data || []);
      setLevels(levelsRes.data || []);
      setFields(fieldsRes.data || []);

      const currentYear = yearsRes.data?.find((y: any) => y.isCurrent) || yearsRes.data?.[0];
      const defaultLevel = levelsRes.data?.[0];
      const matchingFields = fieldsRes.data?.filter((f: any) => f.levelId === defaultLevel?.id) || [];
      const defaultField = matchingFields[0] || fieldsRes.data?.[0];

      setClassForm((prev) => ({
        ...prev,
        academicYearId: currentYear?.id || '',
        levelId: prev.levelId || defaultLevel?.id || '',
        fieldId: prev.fieldId || defaultField?.id || '',
      }));

      setLessonForm((prev) => ({
        ...prev,
        levelId: prev.levelId || defaultLevel?.id || '',
        fieldId: prev.fieldId || defaultField?.id || '',
      }));
    } catch (err) {
      console.error('Failed to load academic data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLevelChange = (lvlId: string) => {
    const matchingFields = fields.filter((f) => f.levelId === lvlId);
    setClassForm((prev) => ({
      ...prev,
      levelId: lvlId,
      fieldId: matchingFields[0]?.id || '',
    }));
  };

  const handleLessonLevelChange = (lvlId: string) => {
    const matchingFields = fields.filter((f) => f.levelId === lvlId);
    setLessonForm((prev) => ({
      ...prev,
      levelId: lvlId,
      fieldId: matchingFields[0]?.id || '',
    }));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/academic/years', {
        ...yearForm,
        startDate: jalaliToGregorianDate(yearForm.startDate).toISOString(),
        endDate: jalaliToGregorianDate(yearForm.endDate).toISOString(),
      });
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
      setClassForm((prev) => ({
        name: '',
        code: '',
        capacity: 30,
        roomNumber: '',
        academicYearId: prev.academicYearId,
        levelId: prev.levelId,
        fieldId: prev.fieldId,
      }));
      fetchData();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت کلاس درس.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditClass = (classroom: any) => {
    setEditingClassId(classroom.id);
    setEditClassForm({
      name: classroom.name || '',
      code: classroom.code || '',
      capacity: classroom.capacity || 30,
      academicYearId: classroom.academicYearId || '',
      levelId: classroom.levelId || '',
      fieldId: classroom.fieldId || '',
      roomNumber: classroom.roomNumber || '',
    });
    setError(null);
    setIsEditClassModalOpen(true);
  };

  const handleEditClassLevelChange = (lvlId: string) => {
    const matchingFields = fields.filter((f) => f.levelId === lvlId);
    setEditClassForm((prev) => ({
      ...prev,
      levelId: lvlId,
      fieldId: matchingFields[0]?.id || '',
    }));
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClassId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.patch(`/classes/classrooms/${editingClassId}`, editClassForm);
      setIsEditClassModalOpen(false);
      setEditingClassId(null);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'خطا در ویرایش کلاس درس.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteClass = async () => {
    if (!deleteConfirmClass) return;
    setIsDeletingClass(true);
    try {
      await apiClient.delete(`/classes/classrooms/${deleteConfirmClass.id}`);
      setClassrooms((prev) => prev.filter((c) => c.id !== deleteConfirmClass.id));
      toast.success('کلاس با موفقیت حذف شد.');
      setDeleteConfirmClass(null);
      if (isEditClassModalOpen && editingClassId === deleteConfirmClass.id) {
        setIsEditClassModalOpen(false);
        setEditingClassId(null);
      }
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'خطا در حذف کلاس درس.');
    } finally {
      setIsDeletingClass(false);
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/classes/lessons', {
        name: lessonForm.name,
        code: lessonForm.code,
        unitCount: Number(lessonForm.units) || 1,
        levelId: lessonForm.levelId || undefined,
        fieldId: lessonForm.fieldId && lessonForm.fieldId.trim() !== '' ? lessonForm.fieldId : undefined,
        type: lessonForm.type,
        isModular: lessonForm.isModular,
        podmanCount: lessonForm.isModular ? Number(lessonForm.podmanCount) || 5 : undefined,
        podmanTitles: lessonForm.isModular ? lessonForm.podmanTitles : undefined,
        teacherIds: lessonForm.teacherIds,
      });
      setIsLessonModalOpen(false);
      setLessonForm((prev) => ({
        ...prev,
        name: '',
        code: '',
        units: 3,
        type: 'TECHNICAL_MODULAR_COMPETENCY',
        isModular: true,
        podmanCount: 5,
        podmanTitles: ['پودمان ۱', 'پودمان ۲', 'پودمان ۳', 'پودمان ۴', 'پودمان ۵'],
        teacherIds: [],
      }));
      toast.success('درس با موفقیت ثبت شد.');
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'خطا در ثبت درس.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditLesson = (lesson: any) => {
    setEditingLessonId(lesson.id);
    const isMod =
      lesson.isModular ??
      ['NON_TECHNICAL_COMPETENCY', 'BASIC_COMPETENCY', 'TECHNICAL_MODULAR_COMPETENCY'].includes(lesson.type);
    const titles = [0, 1, 2, 3, 4].map((idx) => {
      const existingP = lesson.podmans?.find((p: any) => p.number === idx + 1);
      return existingP?.title || `پودمان ${idx + 1}`;
    });

    const currentTeacherIds =
      lesson.teacherLessons?.map((tl: any) => tl.teacherId || tl.teacher?.id).filter(Boolean) || [];

    setEditLessonForm({
      name: lesson.name || '',
      code: lesson.code || '',
      units: lesson.unitCount || lesson.units || 1,
      levelId: lesson.levelId || '',
      fieldId: lesson.fieldId || '',
      type: lesson.type || 'GENERAL',
      isModular: isMod,
      podmanCount: 5,
      podmanTitles: titles,
      teacherIds: currentTeacherIds,
    });
    setError(null);
    setIsEditLessonModalOpen(true);
  };

  const handleEditLessonLevelChange = (lvlId: string) => {
    const matchingFields = fields.filter((f) => f.levelId === lvlId);
    setEditLessonForm((prev) => ({
      ...prev,
      levelId: lvlId,
      fieldId: matchingFields[0]?.id || '',
    }));
  };

  const handleUpdateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLessonId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.patch(`/classes/lessons/${editingLessonId}`, {
        name: editLessonForm.name,
        code: editLessonForm.code,
        unitCount: Number(editLessonForm.units) || 1,
        levelId: editLessonForm.levelId || undefined,
        fieldId:
          editLessonForm.fieldId && editLessonForm.fieldId.trim() !== ''
            ? editLessonForm.fieldId
            : undefined,
        type: editLessonForm.type,
        isModular: editLessonForm.isModular,
        podmanCount: editLessonForm.isModular ? Number(editLessonForm.podmanCount) || 5 : undefined,
        podmanTitles: editLessonForm.isModular ? editLessonForm.podmanTitles : undefined,
        teacherIds: editLessonForm.teacherIds,
      });
      setIsEditLessonModalOpen(false);
      setEditingLessonId(null);
      toast.success('اطلاعات درس با موفقیت به‌روزرسانی شد.');
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'خطا در ویرایش درس.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteLesson = async () => {
    if (!deleteConfirmLesson) return;
    setIsDeletingLesson(true);
    try {
      await apiClient.delete(`/classes/lessons/${deleteConfirmLesson.id}`);
      setLessons((prev) => prev.filter((l) => l.id !== deleteConfirmLesson.id));
      toast.success('درس با موفقیت حذف شد.');
      setDeleteConfirmLesson(null);
      if (isEditLessonModalOpen && editingLessonId === deleteConfirmLesson.id) {
        setIsEditLessonModalOpen(false);
        setEditingLessonId(null);
      }
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'خطا در حذف درس.');
    } finally {
      setIsDeletingLesson(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Responsive Header */}
      <ResponsivePageHeader
        icon={GraduationCap}
        title="ساختار آموزشی و کلاس‌های درس"
        description="مدیریت سال‌های تحصیلی، نیم‌سال‌ها، کلاس‌های درس، دروس و تخصیص سرفصل‌ها"
        actions={
          <>
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
          </>
        }
      />

      {/* Tabs (Responsive Swipeable) */}
      <div className="flex space-x-2 space-x-reverse border-b border-gray-200 overflow-x-auto scrollbar-none pb-1 min-w-0">
        <button
          onClick={() => setActiveTab('CLASSROOMS')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 space-x-reverse whitespace-nowrap shrink-0 ${
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
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 space-x-reverse whitespace-nowrap shrink-0 ${
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
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 space-x-reverse whitespace-nowrap shrink-0 ${
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
        <MobileDataTable
          items={classrooms}
          isLoading={isLoading}
          emptyMessage="هنوز کلاسی ثبت نشده است. از دکمه «ایجاد کلاس درس جدید» استفاده کنید."
          primaryField={(c) => (
            <div className="space-y-1">
              <div className="font-bold text-ink-darker text-sm">{c.name}</div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-[11px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{c.code}</span>
                {c.roomNumber && <span className="text-[11px] text-gray-400">{c.roomNumber}</span>}
              </div>
            </div>
          )}
          secondaryField={(c) => (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEditClass(c);
              }}
              className="p-2 rounded-xl text-primary bg-primary/10 hover:bg-primary hover:text-white transition-all border border-primary/20 shrink-0 cursor-pointer"
              title="ویرایش کلاس"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          columns={[
            {
              header: 'نام کلاس',
              cell: (c) => (
                <div>
                  <div className="font-bold text-ink-darker">{c.name}</div>
                  {c.roomNumber && <div className="text-[11px] text-gray-400">{c.roomNumber}</div>}
                </div>
              ),
            },
            {
              header: 'کد کلاسی',
              cell: (c) => <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{c.code}</span>,
            },
            {
              header: 'پایه تحصیلی',
              mobilePriority: 'secondary',
              cell: (c) => (
                <Badge variant="default" className="font-bold">
                  پایه {c.level?.name || 'دهم'}
                </Badge>
              ),
            },
            {
              header: 'رشته تحصیلی',
              mobilePriority: 'secondary',
              cell: (c) => (
                <Badge variant="college" className="font-bold">
                  {c.field?.name || 'شبکه و نرم‌افزار رایانه'}
                </Badge>
              ),
            },
            {
              header: 'سال تحصیلی',
              mobilePriority: 'secondary',
              cell: (c) => <span className="text-xs text-gray-600">{c.academicYear?.name || '۱۴۰۴-۱۴۰۵'}</span>,
            },
            {
              header: 'تعداد دانش‌آموزان',
              mobileDetail: true,
              cell: (c) => (
                <span className="font-bold text-ink-darker">
                  {c._count?.enrollments || c._count?.students || 0} دانش‌آموز
                </span>
              ),
            },
            {
              header: 'ظرفیت کلاس',
              mobileDetail: true,
              cell: (c) => <span className="text-xs text-gray-500">{c.capacity || 30} نفر</span>,
            },
            {
              header: 'وضعیت',
              mobileDetail: true,
              cell: () => <Badge variant="success">فعال</Badge>,
            },
            {
              header: 'عملیات',
              mobilePriority: 'hidden',
              cell: (c) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEditClass(c);
                  }}
                  className="p-2 rounded-xl text-primary bg-primary/10 hover:bg-primary hover:text-white transition-all border border-primary/20 cursor-pointer"
                  title="ویرایش کلاس"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              ),
            },
          ]}
        />
      )}

      {/* Tab 2: Academic Years */}
      {activeTab === 'YEARS' && (
        <MobileDataTable
          items={academicYears}
          isLoading={isLoading}
          emptyMessage="سال تحصیلی یافت نشد."
          primaryField={(y) => (
            <div>
              <div className="font-bold text-ink-darker text-sm">{y.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                از {formatJalaliDisplay(y.startDate)} تا {formatJalaliDisplay(y.endDate)}
              </div>
            </div>
          )}
          secondaryField={(y) => (
            y.isCurrent ? <Badge variant="success">سال جاری</Badge> : <Badge variant="neutral">گذشته</Badge>
          )}
          columns={[
            {
              header: 'عنوان سال تحصیلی',
              cell: (y) => <div className="font-bold text-ink-darker">{y.name}</div>,
            },
            {
              header: 'تاریخ شروع',
              cell: (y) => <span className="text-xs font-medium text-gray-700">{formatJalaliDisplay(y.startDate)}</span>,
            },
            {
              header: 'تاریخ پایان',
              cell: (y) => <span className="text-xs font-medium text-gray-700">{formatJalaliDisplay(y.endDate)}</span>,
            },
            {
              header: 'نیم‌سال‌ها',
              cell: (y) => (
                <div className="flex gap-1 flex-wrap">
                  {y.terms?.map((t: any) => (
                    <span key={t.id} className="text-[10px] bg-primary-light text-primary-darker px-2 py-0.5 rounded font-bold">
                      {t.name}
                    </span>
                  ))}
                </div>
              ),
              mobileDetail: true,
            },
            {
              header: 'وضعیت جاری',
              cell: (y) => (
                y.isCurrent ? <Badge variant="success">سال جاری</Badge> : <Badge variant="neutral">گذشته</Badge>
              ),
            },
          ]}
        />
      )}

      {/* Tab 3: Lessons */}
      {activeTab === 'LESSONS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs">
            <div className="grid grid-cols-1 sm:flex sm:items-center gap-2.5 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-ink-dark shrink-0">پایه:</span>
                <select
                  value={lessonFilterLevel}
                  onChange={(e) => {
                    setLessonFilterLevel(e.target.value);
                    setLessonFilterField('ALL');
                  }}
                  className="h-9 w-full sm:w-auto rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs font-medium text-ink-dark focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">همه پایه‌ها</option>
                  {levels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      پایه {lvl.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-ink-dark shrink-0">رشته:</span>
                <select
                  value={lessonFilterField}
                  onChange={(e) => setLessonFilterField(e.target.value)}
                  className="h-9 w-full sm:w-auto rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs font-medium text-ink-dark focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">همه رشته‌ها</option>
                  {(lessonFilterLevel === 'ALL'
                    ? fields
                    : fields.filter((f) => f.levelId === lessonFilterLevel)
                  ).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="text-xs text-gray-500 font-medium">
              تعداد دروس نمایش‌داده‌شده:{' '}
              <span className="font-bold text-primary">
                {
                  lessons.filter((l) => {
                    if (lessonFilterLevel !== 'ALL' && l.levelId !== lessonFilterLevel) return false;
                    if (lessonFilterField !== 'ALL' && l.fieldId !== lessonFilterField) return false;
                    return true;
                  }).length
                }
              </span>
            </div>
          </div>

          <MobileDataTable
            items={lessons.filter((l) => {
              if (lessonFilterLevel !== 'ALL' && l.levelId !== lessonFilterLevel) return false;
              if (lessonFilterField !== 'ALL' && l.fieldId !== lessonFilterField) return false;
              return true;
            })}
            isLoading={isLoading}
            emptyMessage="درسی برای این فیلتر یافت نشد."
            primaryField={(l) => (
              <div>
                <div className="font-bold text-ink-darker text-sm">{l.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-[11px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{l.code}</span>
                  <span className="text-xs text-gray-500">{l.unitCount || l.units || 1} واحد</span>
                </div>
              </div>
            )}
            secondaryField={(l) => (
              <div className="flex items-center justify-between gap-1 flex-wrap w-full">
                <div className="flex items-center gap-1 flex-wrap">
                  {l.level?.name && <Badge variant="default" className="text-[11px]">پایه {l.level.name}</Badge>}
                  {l.field?.name ? (
                    <Badge variant="college" className="text-[11px]">{l.field.name}</Badge>
                  ) : (
                    <Badge variant="neutral" className="text-[11px]">عمومی</Badge>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEditLesson(l);
                  }}
                  className="p-2 rounded-xl text-primary bg-primary/10 hover:bg-primary hover:text-white transition-all border border-primary/20 shrink-0 cursor-pointer"
                  title="ویرایش درس"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            )}
            columns={[
              {
                header: 'نام درس',
                cell: (l) => (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-ink-darker">{l.name}</span>
                    {l.isModular && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                        پودمانی (۵ پودمان)
                      </span>
                    )}
                  </div>
                ),
              },
              {
                header: 'کد درس',
                cell: (l) => <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{l.code}</span>,
              },
              {
                header: 'پایه تحصیلی',
                cell: (l) => (
                  l.level?.name ? (
                    <Badge variant="default">پایه {l.level.name}</Badge>
                  ) : (
                    <Badge variant="neutral">پایه نامشخص</Badge>
                  )
                ),
              },
              {
                header: 'رشته تحصیلی',
                cell: (l) => (
                  l.field?.name ? (
                    <Badge variant="college">{l.field.name}</Badge>
                  ) : (
                    <Badge variant="neutral">عمومی (مشترک)</Badge>
                  )
                ),
              },
              {
                header: 'دبیران مدرس',
                cell: (l) => (
                  l.teacherLessons && l.teacherLessons.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {l.teacherLessons.map((tl: any) => (
                        <span
                          key={tl.id}
                          className="text-[11px] bg-blue-50 text-blue-800 font-medium px-2 py-0.5 rounded border border-blue-200"
                        >
                          {tl.teacher?.user?.firstName} {tl.teacher?.user?.lastName}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">بدون دبیر</span>
                  )
                ),
                mobileDetail: true,
              },
              {
                header: 'نوع درس',
                cell: (l) => {
                  switch (l.type) {
                    case 'NON_TECHNICAL_COMPETENCY':
                      return <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">شایستگی‌های غیرفنی (پودمانی)</span>;
                    case 'BASIC_COMPETENCY':
                      return <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">شایستگی‌های پایه (پودمانی)</span>;
                    case 'TECHNICAL_MODULAR_COMPETENCY':
                      return <span className="text-xs font-semibold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-lg border border-purple-300">شایستگی‌های فنی / پودمانی</span>;
                    case 'TECHNICAL_PRACTICAL_COMPETENCY':
                      return <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">شایستگی‌های فنی / عملی</span>;
                    case 'SPECIALIZED':
                      return <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">تخصصی</span>;
                    case 'PRACTICAL':
                      return <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">کارگاهی</span>;
                    case 'OPTIONAL':
                      return <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-lg">انتخابی</span>;
                    default:
                      return <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">عمومی</span>;
                  }
                },
                mobileDetail: true,
              },
              {
                header: 'تعداد واحد',
                cell: (l) => <span className="text-xs font-bold text-ink-dark">{l.unitCount || l.units || 1} واحد</span>,
                mobileDetail: true,
              },
              {
                header: 'تعداد سرفصل‌ها',
                cell: (l) => (
                  <span className="text-xs text-gray-500">
                    {l.isModular
                      ? `${l.podmanCount || l.podmans?.length || 5} پودمان`
                      : `${l._count?.lessonPlans || l._count?.topics || 0} مبحث`}
                  </span>
                ),
                mobileDetail: true,
              },
              {
                header: 'وضعیت',
                cell: () => <Badge variant="default">فعال</Badge>,
              },
              {
                header: 'عملیات',
                mobilePriority: 'hidden',
                cell: (l) => (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditLesson(l);
                    }}
                    className="p-2 rounded-xl text-primary bg-primary/10 hover:bg-primary hover:text-white transition-all border border-primary/20 cursor-pointer"
                    title="ویرایش درس"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* 1. Modal: Create Academic Year */}
      <Modal
        isOpen={isYearModalOpen}
        onClose={() => {
          setIsYearModalOpen(false);
          setError(null);
        }}
        title="تعریف سال تحصیلی جدید"
        description="ایجاد سال تحصیلی و ساخت خودکار نیم‌سال اول و دوم"
        maxWidth="md"
      >
        {error && (
          <div className="mb-4 flex items-center space-x-2 space-x-reverse rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateYear} className="space-y-4">
          <Input
            label="عنوان سال تحصیلی"
            placeholder="مثال: سال تحصیلی ۱۴۰۵-۱۴۰۶"
            value={yearForm.name}
            onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PersianDatePicker
              label="تاریخ شروع (شمسی)"
              value={yearForm.startDate}
              onChange={(date) => setYearForm({ ...yearForm, startDate: date })}
            />
            <PersianDatePicker
              label="تاریخ پایان (شمسی)"
              value={yearForm.endDate}
              onChange={(date) => setYearForm({ ...yearForm, endDate: date })}
            />
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsYearModalOpen(false);
                setError(null);
              }}
            >
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
        onClose={() => {
          setIsClassModalOpen(false);
          setError(null);
        }}
        title="ایجاد کلاس درس جدید"
        description="تعریف کلاس آموزشی برای سال تحصیلی جاری"
        maxWidth="md"
      >
        {error && (
          <div className="mb-4 flex items-center space-x-2 space-x-reverse rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateClass} className="space-y-3.5">
          <Input
            label="نام کلاس"
            placeholder="مثال: کلاس دهم ریاضی ۱"
            value={classForm.name}
            onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="کد یکتای کلاس"
              placeholder="مثال: CLS-10-M1"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="w-full text-right space-y-1.5">
              <label className="block text-xs sm:text-[13px] font-bold text-ink-normal/80 dark:text-gray-300 text-right">
                پایه تحصیلی <span className="text-red-500">*</span>
              </label>
              <select
                value={classForm.levelId}
                onChange={(e) => handleLevelChange(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-xs sm:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all cursor-pointer"
                required
              >
                {levels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    پایه {lvl.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full text-right space-y-1.5">
              <label className="block text-xs sm:text-[13px] font-bold text-ink-normal/80 dark:text-gray-300 text-right">
                رشته تحصیلی <span className="text-red-500">*</span>
              </label>
              <select
                value={classForm.fieldId}
                onChange={(e) => setClassForm({ ...classForm, fieldId: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-xs sm:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all cursor-pointer"
                required
              >
                {(fields.filter((f) => f.levelId === classForm.levelId).length > 0
                  ? fields.filter((f) => f.levelId === classForm.levelId)
                  : fields
                ).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="w-full text-right space-y-1.5">
              <label className="block text-xs sm:text-[13px] font-bold text-ink-normal/80 dark:text-gray-300 text-right">
                سال تحصیلی
              </label>
              <select
                value={classForm.academicYearId}
                onChange={(e) => setClassForm({ ...classForm, academicYearId: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-xs sm:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all cursor-pointer"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.isCurrent ? '(جاری)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="نام کلاس (اختیاری)"
              placeholder="مثال: ۱۰۱ یا کارگاه ۱"
              value={classForm.roomNumber}
              onChange={(e) => setClassForm({ ...classForm, roomNumber: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsClassModalOpen(false);
                setError(null);
              }}
              className="h-10 px-4 text-xs sm:text-sm"
            >
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} className="h-10 px-5 text-xs sm:text-sm font-bold">
              ایجاد کلاس
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2.5 Modal: Edit Classroom */}
      <Modal
        isOpen={isEditClassModalOpen}
        onClose={() => {
          setIsEditClassModalOpen(false);
          setEditingClassId(null);
          setError(null);
        }}
        title="ویرایش کلاس درس"
        description="تغییر مشخصات، کد کلاسی، ظرفیت یا مکان کلاس"
        maxWidth="md"
      >
        {error && (
          <div className="mb-4 flex items-center space-x-2 space-x-reverse rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpdateClass} className="space-y-3.5">
          <Input
            label="نام کلاس"
            placeholder="مثال: کلاس دهم ریاضی ۱"
            value={editClassForm.name}
            onChange={(e) => setEditClassForm({ ...editClassForm, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="کد یکتای کلاس"
              placeholder="مثال: CLS-10-M1"
              value={editClassForm.code}
              onChange={(e) => setEditClassForm({ ...editClassForm, code: e.target.value })}
              required
            />
            <Input
              label="ظرفیت دانش‌آموزان"
              type="number"
              value={editClassForm.capacity}
              onChange={(e) => setEditClassForm({ ...editClassForm, capacity: Number(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="w-full text-right space-y-1.5">
              <label className="block text-xs sm:text-[13px] font-bold text-ink-normal/80 dark:text-gray-300 text-right">
                پایه تحصیلی <span className="text-red-500">*</span>
              </label>
              <select
                value={editClassForm.levelId}
                onChange={(e) => handleEditClassLevelChange(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-xs sm:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all cursor-pointer"
                required
              >
                {levels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    پایه {lvl.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full text-right space-y-1.5">
              <label className="block text-xs sm:text-[13px] font-bold text-ink-normal/80 dark:text-gray-300 text-right">
                رشته تحصیلی <span className="text-red-500">*</span>
              </label>
              <select
                value={editClassForm.fieldId}
                onChange={(e) => setEditClassForm({ ...editClassForm, fieldId: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-xs sm:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all cursor-pointer"
                required
              >
                {(fields.filter((f) => f.levelId === editClassForm.levelId).length > 0
                  ? fields.filter((f) => f.levelId === editClassForm.levelId)
                  : fields
                ).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="w-full text-right space-y-1.5">
              <label className="block text-xs sm:text-[13px] font-bold text-ink-normal/80 dark:text-gray-300 text-right">
                سال تحصیلی
              </label>
              <select
                value={editClassForm.academicYearId}
                onChange={(e) => setEditClassForm({ ...editClassForm, academicYearId: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-xs sm:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all cursor-pointer"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.isCurrent ? '(جاری)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="نام کلاس (اختیاری)"
              placeholder="مثال: ۱۰۱ یا کارگاه ۱"
              value={editClassForm.roomNumber}
              onChange={(e) => setEditClassForm({ ...editClassForm, roomNumber: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              className="h-10 w-10 flex items-center justify-center rounded-xl text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-all shrink-0 cursor-pointer shadow-2xs"
              title="حذف کلاس"
              onClick={() => {
                const currentClass = classrooms.find((c) => c.id === editingClassId);
                if (currentClass) {
                  setDeleteConfirmClass(currentClass);
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsEditClassModalOpen(false);
                  setEditingClassId(null);
                  setError(null);
                }}
                className="h-10 px-3.5 text-xs sm:text-sm"
              >
                انصراف
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting} className="h-10 px-4 text-xs sm:text-sm font-bold">
                ذخیره تغییرات
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* 3. Modal: Create Lesson */}
      <Modal
        isOpen={isLessonModalOpen}
        onClose={() => {
          setIsLessonModalOpen(false);
          setError(null);
        }}
        title="تعریف درس جدید"
        description="مشخصات درس، پایه و رشته"
        maxWidth="md"
      >
        {error && (
          <div className="mb-4 flex items-center space-x-2 space-x-reverse rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateLesson} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink-normal dark:text-gray-300 mb-1.5 text-right">
                پایه تحصیلی <span className="text-red-500">*</span>
              </label>
              <select
                value={lessonForm.levelId}
                onChange={(e) => handleLessonLevelChange(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1C2536] px-3 py-2 text-xs text-ink-normal dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-bold"
                required
              >
                {levels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    پایه {lvl.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-normal dark:text-gray-300 mb-1.5 text-right">
                رشته تحصیلی <span className="text-red-500">*</span>
              </label>
              <select
                value={lessonForm.fieldId}
                onChange={(e) => setLessonForm({ ...lessonForm, fieldId: e.target.value })}
                className="flex h-10 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1C2536] px-3 py-2 text-xs text-ink-normal dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-bold"
              >
                {(fields.filter((f) => f.levelId === lessonForm.levelId).length > 0
                  ? fields.filter((f) => f.levelId === lessonForm.levelId)
                  : fields
                ).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
                <option value="">عمومی (مشترک)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="نام درس"
              placeholder="مثال: ریاضی ۱"
              value={lessonForm.name}
              onChange={(e) => setLessonForm({ ...lessonForm, name: e.target.value })}
              required
            />
            <Input
              label="کد درس"
              placeholder="مثال: MATH-10"
              value={lessonForm.code}
              onChange={(e) => setLessonForm({ ...lessonForm, code: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink-normal dark:text-gray-300 mb-1.5 text-right">
                نوع درس
              </label>
              <select
                value={lessonForm.type}
                onChange={(e) => {
                  const newType = e.target.value;
                  const isMod = ['NON_TECHNICAL_COMPETENCY', 'BASIC_COMPETENCY', 'TECHNICAL_MODULAR_COMPETENCY'].includes(newType);
                  setLessonForm({
                    ...lessonForm,
                    type: newType,
                    isModular: isMod,
                  });
                }}
                className="flex h-10 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1C2536] px-3 py-2 text-xs text-ink-normal dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-medium"
              >
                <option value="GENERAL">عمومی</option>
                <option value="NON_TECHNICAL_COMPETENCY">شایستگی‌های غیرفنی (پودمانی)</option>
                <option value="BASIC_COMPETENCY">شایستگی‌های پایه (پودمانی)</option>
                <option value="TECHNICAL_MODULAR_COMPETENCY">شایستگی‌های فنی / پودمانی</option>
                <option value="TECHNICAL_PRACTICAL_COMPETENCY">شایستگی‌های فنی / عملی</option>
                <option value="SPECIALIZED">تخصصی</option>
                <option value="PRACTICAL">کارگاهی</option>
                <option value="OPTIONAL">انتخابی</option>
              </select>
            </div>

            <Input
              label="تعداد واحد / ساعت هفتگی"
              type="number"
              value={lessonForm.units}
              onChange={(e) => setLessonForm({ ...lessonForm, units: Number(e.target.value) })}
              required
            />
          </div>

          {/* انتخاب دبیران مدرس درس */}
          <div className="w-full text-right space-y-1">
            <label className="block text-xs font-bold text-ink-normal dark:text-gray-300 text-right">
              دبیران مدرس ({lessonForm.teacherIds.length})
            </label>
            <div className="max-h-32 overflow-y-auto p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#151C28] space-y-1">
              {teachers.length === 0 ? (
                <div className="text-xs text-gray-400 py-2 text-center">دبیری ثبت نشده است.</div>
              ) : (
                teachers.map((t) => {
                  const isSelected = lessonForm.teacherIds.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-bold border border-primary/30'
                          : 'hover:bg-white dark:hover:bg-[#1C2536] text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setLessonForm((prev) => ({
                              ...prev,
                              teacherIds: isSelected
                                ? prev.teacherIds.filter((id) => id !== t.id)
                                : [...prev.teacherIds, t.id],
                            }));
                          }}
                          className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span>
                          {t.user?.firstName} {t.user?.lastName}
                        </span>
                      </div>
                      {t.specialization && (
                        <span className="text-[10px] text-gray-400">{t.specialization}</span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* پودمان‌ها */}
          {lessonForm.isModular && (
            <div className="bg-gray-50/60 dark:bg-[#151C28] rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
              <span className="font-bold text-xs text-ink-darker dark:text-white">
                عناوین ۵ پودمان
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[0, 1, 2, 3, 4].map((idx) => (
                  <div key={idx} className={`flex items-center gap-1.5 ${idx === 4 ? 'sm:col-span-2' : ''}`}>
                    <span className="text-[11px] font-bold text-gray-500 w-14 shrink-0 text-center font-mono">
                      پودمان {idx + 1}:
                    </span>
                    <input
                      type="text"
                      value={lessonForm.podmanTitles[idx] || `پودمان ${idx + 1}`}
                      onChange={(e) => {
                        const newTitles = [...lessonForm.podmanTitles];
                        newTitles[idx] = e.target.value;
                        setLessonForm({ ...lessonForm, podmanTitles: newTitles });
                      }}
                      placeholder={`پودمان ${idx + 1}`}
                      className="flex-1 h-8 text-xs px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1C2536] text-gray-800 dark:text-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsLessonModalOpen(false);
                setError(null);
              }}
            >
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              ثبت درس
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Modal: Edit Lesson */}
      <Modal
        isOpen={isEditLessonModalOpen}
        onClose={() => {
          setIsEditLessonModalOpen(false);
          setEditingLessonId(null);
          setError(null);
        }}
        title="ویرایش درس"
        description="مشخصات درس، دبیران و پودمان‌ها"
        maxWidth="md"
      >
        {error && (
          <div className="mb-4 flex items-center space-x-2 space-x-reverse rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpdateLesson} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink-normal dark:text-gray-300 mb-1.5 text-right">
                پایه تحصیلی <span className="text-red-500">*</span>
              </label>
              <select
                value={editLessonForm.levelId}
                onChange={(e) => handleEditLessonLevelChange(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1C2536] px-3 py-2 text-xs text-ink-normal dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-bold"
                required
              >
                {levels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    پایه {lvl.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-normal dark:text-gray-300 mb-1.5 text-right">
                رشته تحصیلی <span className="text-red-500">*</span>
              </label>
              <select
                value={editLessonForm.fieldId}
                onChange={(e) => setEditLessonForm({ ...editLessonForm, fieldId: e.target.value })}
                className="flex h-10 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1C2536] px-3 py-2 text-xs text-ink-normal dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-bold"
              >
                {(fields.filter((f) => f.levelId === editLessonForm.levelId).length > 0
                  ? fields.filter((f) => f.levelId === editLessonForm.levelId)
                  : fields
                ).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
                <option value="">عمومی (مشترک)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="نام درس"
              placeholder="مثال: ریاضی ۱"
              value={editLessonForm.name}
              onChange={(e) => setEditLessonForm({ ...editLessonForm, name: e.target.value })}
              required
            />
            <Input
              label="کد درس"
              placeholder="مثال: MATH-10"
              value={editLessonForm.code}
              onChange={(e) => setEditLessonForm({ ...editLessonForm, code: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink-normal dark:text-gray-300 mb-1.5 text-right">
                نوع درس
              </label>
              <select
                value={editLessonForm.type}
                onChange={(e) => {
                  const newType = e.target.value;
                  const isMod = ['NON_TECHNICAL_COMPETENCY', 'BASIC_COMPETENCY', 'TECHNICAL_MODULAR_COMPETENCY'].includes(newType);
                  setEditLessonForm({
                    ...editLessonForm,
                    type: newType,
                    isModular: isMod,
                  });
                }}
                className="flex h-10 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1C2536] px-3 py-2 text-xs text-ink-normal dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-medium"
              >
                <option value="GENERAL">عمومی</option>
                <option value="NON_TECHNICAL_COMPETENCY">شایستگی‌های غیرفنی (پودمانی)</option>
                <option value="BASIC_COMPETENCY">شایستگی‌های پایه (پودمانی)</option>
                <option value="TECHNICAL_MODULAR_COMPETENCY">شایستگی‌های فنی / پودمانی</option>
                <option value="TECHNICAL_PRACTICAL_COMPETENCY">شایستگی‌های فنی / عملی</option>
                <option value="SPECIALIZED">تخصصی</option>
                <option value="PRACTICAL">کارگاهی</option>
                <option value="OPTIONAL">انتخابی</option>
              </select>
            </div>

            <Input
              label="تعداد واحد / ساعت هفتگی"
              type="number"
              value={editLessonForm.units}
              onChange={(e) => setEditLessonForm({ ...editLessonForm, units: Number(e.target.value) })}
              required
            />
          </div>

          {/* انتخاب دبیران مدرس درس */}
          <div className="w-full text-right space-y-1">
            <label className="block text-xs font-bold text-ink-normal dark:text-gray-300 text-right">
              دبیران مدرس ({editLessonForm.teacherIds.length})
            </label>
            <div className="max-h-32 overflow-y-auto p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#151C28] space-y-1">
              {teachers.length === 0 ? (
                <div className="text-xs text-gray-400 py-2 text-center">دبیری ثبت نشده است.</div>
              ) : (
                teachers.map((t) => {
                  const isSelected = editLessonForm.teacherIds.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-bold border border-primary/30'
                          : 'hover:bg-white dark:hover:bg-[#1C2536] text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setEditLessonForm((prev) => ({
                              ...prev,
                              teacherIds: isSelected
                                ? prev.teacherIds.filter((id) => id !== t.id)
                                : [...prev.teacherIds, t.id],
                            }));
                          }}
                          className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span>
                          {t.user?.firstName} {t.user?.lastName}
                        </span>
                      </div>
                      {t.specialization && (
                        <span className="text-[10px] text-gray-400">{t.specialization}</span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* پودمان‌ها */}
          {editLessonForm.isModular && (
            <div className="bg-gray-50/60 dark:bg-[#151C28] rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
              <span className="font-bold text-xs text-ink-darker dark:text-white">
                عناوین ۵ پودمان
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[0, 1, 2, 3, 4].map((idx) => (
                  <div key={idx} className={`flex items-center gap-1.5 ${idx === 4 ? 'sm:col-span-2' : ''}`}>
                    <span className="text-[11px] font-bold text-gray-500 w-14 shrink-0 text-center font-mono">
                      پودمان {idx + 1}:
                    </span>
                    <input
                      type="text"
                      value={editLessonForm.podmanTitles[idx] || `پودمان ${idx + 1}`}
                      onChange={(e) => {
                        const newTitles = [...editLessonForm.podmanTitles];
                        newTitles[idx] = e.target.value;
                        setEditLessonForm({ ...editLessonForm, podmanTitles: newTitles });
                      }}
                      placeholder={`پودمان ${idx + 1}`}
                      className="flex-1 h-8 text-xs px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1C2536] text-gray-800 dark:text-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              className="h-10 w-10 flex items-center justify-center rounded-xl text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-all shrink-0 cursor-pointer"
              title="حذف درس"
              onClick={() => {
                const currentLesson = lessons.find((l) => l.id === editingLessonId);
                if (currentLesson) {
                  setDeleteConfirmLesson(currentLesson);
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsEditLessonModalOpen(false);
                  setEditingLessonId(null);
                  setError(null);
                }}
                className="h-10 px-3.5 text-xs sm:text-sm"
              >
                انصراف
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting} className="h-10 px-4 text-xs sm:text-sm font-bold">
                ذخیره تغییرات
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Lesson Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmLesson}
        onClose={() => !isDeletingLesson && setDeleteConfirmLesson(null)}
        title="حذف درس از چارت آموزشی"
        description="آیا از حذف این درس اطمینان دارید؟ این عملیات غیرقابل بازگشت است."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
            <p className="font-bold mb-1">نام درس: {deleteConfirmLesson?.name}</p>
            <p className="text-xs text-rose-600 leading-relaxed">
              با حذف این درس، ارتباطات مربوط به برنامه‌های درسی و دبیران این درس حذف خواهند شد.
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isDeletingLesson}
              onClick={() => setDeleteConfirmLesson(null)}
              className="w-full sm:w-auto"
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="primary"
              className="bg-rose-600 hover:bg-rose-700 text-white w-full sm:w-auto"
              isLoading={isDeletingLesson}
              onClick={handleConfirmDeleteLesson}
            >
              <Trash2 className="w-4 h-4 ml-1.5" />
              <span>بله، حذف شود</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Classroom Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmClass}
        onClose={() => !isDeletingClass && setDeleteConfirmClass(null)}
        title="حذف کلاس درس"
        description="آیا از حذف این کلاس اطمینان دارید؟ این عملیات غیرقابل بازگشت است."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
            <p className="font-bold mb-1">نام کلاس: {deleteConfirmClass?.name}</p>
            <p className="text-xs text-rose-600 leading-relaxed">
              با حذف کلاس، تمام داده‌های مرتبط با این کلاس (ثبت‌نام‌ها، برنامه‌های هفتگی و ...) حذف خواهند شد.
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isDeletingClass}
              onClick={() => setDeleteConfirmClass(null)}
              className="w-full sm:w-auto"
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="primary"
              className="bg-rose-600 hover:bg-rose-700 text-white w-full sm:w-auto"
              isLoading={isDeletingClass}
              onClick={handleConfirmDeleteClass}
            >
              <Trash2 className="w-4 h-4 ml-1.5" />
              <span>بله، حذف شود</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
