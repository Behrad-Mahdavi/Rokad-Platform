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
} from 'lucide-react';
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
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);

  // Forms
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      }));
      fetchData();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت درس.');
    } finally {
      setIsSubmitting(false);
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
            <div>
              <div className="font-bold text-ink-darker text-sm">{c.name}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-mono text-[11px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{c.code}</span>
                {c.roomNumber && <span className="text-[11px] text-gray-400">اتاق {c.roomNumber}</span>}
              </div>
            </div>
          )}
          secondaryField={(c) => (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="default" className="text-[11px]">پایه {c.level?.name || 'دهم'}</Badge>
              <Badge variant="college" className="text-[11px]">{c.field?.name || 'عمومی'}</Badge>
            </div>
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
              cell: (c) => (
                <Badge variant="default" className="font-bold">
                  پایه {c.level?.name || 'دهم'}
                </Badge>
              ),
            },
            {
              header: 'رشته تحصیلی',
              cell: (c) => (
                <Badge variant="college" className="font-bold">
                  {c.field?.name || 'شبکه و نرم‌افزار رایانه'}
                </Badge>
              ),
            },
            {
              header: 'سال تحصیلی',
              cell: (c) => <span className="text-xs text-gray-600">{c.academicYear?.name || '۱۴۰۴-۱۴۰۵'}</span>,
            },
            {
              header: 'تعداد دانش‌آموزان',
              cell: (c) => (
                <span className="font-bold text-ink-darker">
                  {c._count?.enrollments || c._count?.students || 0} دانش‌آموز
                </span>
              ),
              mobileDetail: true,
            },
            {
              header: 'ظرفیت کلاس',
              cell: (c) => <span className="text-xs text-gray-500">{c.capacity || 30} نفر</span>,
              mobileDetail: true,
            },
            {
              header: 'وضعیت',
              cell: () => <Badge variant="success">فعال</Badge>,
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
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-ink-dark">فیلتر بر اساس پایه:</span>
              <select
                value={lessonFilterLevel}
                onChange={(e) => {
                  setLessonFilterLevel(e.target.value);
                  setLessonFilterField('ALL');
                }}
                className="h-9 rounded-md border border-gray-200 bg-gray-50 px-2.5 text-xs font-medium text-ink-dark focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">همه پایه‌ها</option>
                {levels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    پایه {lvl.name}
                  </option>
                ))}
              </select>

              <span className="text-xs font-bold text-ink-dark">رشته تحصیلی:</span>
              <select
                value={lessonFilterField}
                onChange={(e) => setLessonFilterField(e.target.value)}
                className="h-9 rounded-md border border-gray-200 bg-gray-50 px-2.5 text-xs font-medium text-ink-dark focus:outline-none focus:ring-1 focus:ring-primary"
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
              <div className="flex items-center gap-1 flex-wrap">
                {l.level?.name && <Badge variant="default" className="text-[11px]">پایه {l.level.name}</Badge>}
                {l.field?.name ? (
                  <Badge variant="college" className="text-[11px]">{l.field.name}</Badge>
                ) : (
                  <Badge variant="neutral" className="text-[11px]">عمومی</Badge>
                )}
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
                cell: (l) => <span className="text-xs text-gray-500">{l._count?.lessonPlans || l._count?.topics || 0} مبحث</span>,
                mobileDetail: true,
              },
              {
                header: 'وضعیت',
                cell: () => <Badge variant="default">فعال</Badge>,
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

        <form onSubmit={handleCreateClass} className="space-y-4">
          <Input
            label="نام کلاس"
            placeholder="مثال: کلاس دهم ریاضی ۱"
            value={classForm.name}
            onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">
                پایه تحصیلی <span className="text-red-500">*</span>
              </label>
              <select
                value={classForm.levelId}
                onChange={(e) => handleLevelChange(e.target.value)}
                className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary font-bold"
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
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">
                رشته تحصیلی <span className="text-red-500">*</span>
              </label>
              <select
                value={classForm.fieldId}
                onChange={(e) => setClassForm({ ...classForm, fieldId: e.target.value })}
                className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary font-bold"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">
                سال تحصیلی
              </label>
              <select
                value={classForm.academicYearId}
                onChange={(e) => setClassForm({ ...classForm, academicYearId: e.target.value })}
                className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.isCurrent ? '(جاری)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="شماره یا نام اتاق فیزیکی (اختیاری)"
              placeholder="مثال: اتاق ۱۰۱ یا کارگاه کامپیوتر"
              value={classForm.roomNumber}
              onChange={(e) => setClassForm({ ...classForm, roomNumber: e.target.value })}
            />
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsClassModalOpen(false);
                setError(null);
              }}
            >
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
        onClose={() => {
          setIsLessonModalOpen(false);
          setError(null);
        }}
        title="تعریف عنوان درس جدید"
        description="افزودن درس به چارت آموزشی مدرسه و تخصیص به پایه و رشته"
        maxWidth="md"
      >
        {error && (
          <div className="mb-4 flex items-center space-x-2 space-x-reverse rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateLesson} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">
                پایه تحصیلی <span className="text-red-500">*</span>
              </label>
              <select
                value={lessonForm.levelId}
                onChange={(e) => handleLessonLevelChange(e.target.value)}
                className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary font-bold"
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
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">
                رشته تحصیلی <span className="text-red-500">*</span>
              </label>
              <select
                value={lessonForm.fieldId}
                onChange={(e) => setLessonForm({ ...lessonForm, fieldId: e.target.value })}
                className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary font-bold"
              >
                {(fields.filter((f) => f.levelId === lessonForm.levelId).length > 0
                  ? fields.filter((f) => f.levelId === lessonForm.levelId)
                  : fields
                ).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
                <option value="">عمومی (مشترک بین تمام رشته‌ها)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="نام درس"
              placeholder="مثال: کارگاه شبکه و نرم‌افزار یا ریاضی ۱"
              value={lessonForm.name}
              onChange={(e) => setLessonForm({ ...lessonForm, name: e.target.value })}
              required
            />
            <Input
              label="کد درس"
              placeholder="مثال: NET-101"
              value={lessonForm.code}
              onChange={(e) => setLessonForm({ ...lessonForm, code: e.target.value })}
              required
            />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">
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
                  className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                >
                  <option value="GENERAL">۱- عمومی</option>
                  <option value="NON_TECHNICAL_COMPETENCY">۲- شایستگی‌های غیرفنی (پودمانی)</option>
                  <option value="BASIC_COMPETENCY">۳- شایستگی‌های پایه (پودمانی)</option>
                  <option value="TECHNICAL_MODULAR_COMPETENCY">۴- شایستگی‌های فنی / پودمانی</option>
                  <option value="TECHNICAL_PRACTICAL_COMPETENCY">۵- شایستگی‌های فنی / عملی</option>
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

            {/* کارت راهنما و توضیحات زنده منطق نمره‌دهی و ارزشیابی نوع درس */}
            {lessonForm.type === 'GENERAL' && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950 space-y-1.5 transition-all">
                <div className="flex items-center justify-between font-bold text-emerald-900">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    منطق ارزشیابی: دروس عمومی (غیرپودمانی)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] border border-emerald-300">
                    نظام نوبت اول و نوبت دوم
                  </span>
                </div>
                <p className="leading-relaxed text-emerald-800 text-[11.5px]">
                  این درس به صورت ترمی/سالیانه ارزشیابی می‌شود: دارای <strong>نمره مستمر و پایانی نوبت اول (دی‌ماه)</strong> و <strong>نمره مستمر و پایانی نوبت دوم (خرداد/شهریور)</strong>. محاسبه نمره سالانه طبق فرمول آموزش متوسطه انجام می‌گیرد و نیازی به تفکیک ۵ پودمان ندارد.
                </p>
              </div>
            )}

            {lessonForm.type === 'NON_TECHNICAL_COMPETENCY' && (
              <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-3.5 text-xs text-purple-950 space-y-1.5 transition-all">
                <div className="flex items-center justify-between font-bold text-purple-900">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                    منطق ارزشیابی: شایستگی‌های غیرفنی (پودمانی)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[11px] border border-purple-300">
                    ۵ پودمان مهارتی مستقل
                  </span>
                </div>
                <p className="leading-relaxed text-purple-800 text-[11.5px]">
                  دروسی نظیر الزامات محیط کار، اخلاق حرفه‌ای، کاربرد فناوری اطلاعات و ارتباطات، و کارگاه نوآوری و کارآفرینی. ارزشیابی در <strong>۵ پودمان مجزا</strong> انجام می‌شود (نمره مستمر ۰ تا ۵ + شایستگی ۱ تا ۳ ضربدر ۵ = نمره پودمان از ۲۰). <strong>حد نصاب قبولی کسب حداقل نمره ۱۲ در تمام ۵ پودمان است.</strong>
                </p>
              </div>
            )}

            {lessonForm.type === 'BASIC_COMPETENCY' && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5 text-xs text-indigo-950 space-y-1.5 transition-all">
                <div className="flex items-center justify-between font-bold text-indigo-900">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                    منطق ارزشیابی: شایستگی‌های پایه (پودمانی)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[11px] border border-indigo-300">
                    ۵ پودمان علوم پایه هنرستان
                  </span>
                </div>
                <p className="leading-relaxed text-indigo-800 text-[11.5px]">
                  دروس علوم پایه فنی‌وحرفه‌ای نظیر ریاضی ۱، ۲، ۳، فیزیک، و شیمی هنرستان. ساختار کتاب شامل <strong>۵ پودمان متوالی مستقل</strong> است و ارزشیابی هر پودمان به صورت مجزا با نمره مستمر و پایانی پودمان ثبت می‌گردد. شرط قبولی درس، قبولی در هر ۵ پودمان (حداقل نمره ۱۲) می‌باشد.
                </p>
              </div>
            )}

            {lessonForm.type === 'TECHNICAL_MODULAR_COMPETENCY' && (
              <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 via-purple-50/50 to-indigo-50/40 p-3.5 text-xs text-purple-950 space-y-1.5 transition-all">
                <div className="flex items-center justify-between font-bold text-purple-900">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-purple-600 animate-pulse" />
                    منطق ارزشیابی: شایستگی‌های فنی / پودمانی (کارگاهی اصلی)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 text-[11px] border border-purple-300">
                    ۵ پودمان کارگاهی شایستگی‌محور
                  </span>
                </div>
                <p className="leading-relaxed text-purple-800 text-[11.5px]">
                  دروس اصلی کارگاهی رشته (مانند دانش فنی، نصب و راه‌اندازی، تولید محتوا، توسعه نرم‌افزار و...). ارزشیابی استاندارد در <strong>۵ پودمان تخصصی</strong> با سطوح شایستگی کارگاهی (شایستگی ۱ تا ۳ ضربدر ۵ + مستمر ۰ تا ۵ = نمره ۲۰). ملاک قبولی در هر پودمان نمره ۱۲ بوده و پودمان‌های تجدید شده دارای آزمون جبرانی مجزا هستند.
                </p>
              </div>
            )}

            {lessonForm.type === 'TECHNICAL_PRACTICAL_COMPETENCY' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950 space-y-1.5 transition-all">
                <div className="flex items-center justify-between font-bold text-amber-900">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    منطق ارزشیابی: شایستگی‌های فنی / عملی (غیرپودمانی)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] border border-amber-300">
                    سنجش کتبی و عملی آخر سال
                  </span>
                </div>
                <p className="leading-relaxed text-amber-800 text-[11.5px]">
                  این درس به ۵ پودمان تقسیم نمی‌شود؛ ارزشیابی آن بر اساس <strong>نمره آزمون کتبی</strong> و <strong>سنجش عملی کارگاهی آخر سال</strong> انجام می‌گیرد و عملکرد مهارتی و آزمون عملی ملاک اصلی تعیین نمره پایانی درس در کارنامه است.
                </p>
              </div>
            )}
          </div>

          {/* بخش تنظیمات پودمان (در صورت پودمانی بودن درس) */}
          {lessonForm.isModular ? (
            <div className="bg-gradient-to-l from-purple-50/60 via-purple-50/20 to-white rounded-2xl border border-purple-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-ink-darker">
                    پودمان‌های این درس (نظام ۵ پودمانی)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    ۵ پودمان فعال
                  </span>
                </div>
                <span className="text-xs text-purple-700 font-medium">
                  ثبت خودکار در پایگاه داده
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                برای این درس به طور خودکار ۵ پودمان در دیتابیس ساخته می‌شود. می‌توانید در صورت تمایل عناوین اختصاصی پودمان‌ها را وارد نمایید:
              </p>

              <div className="pt-2 border-t border-purple-100 space-y-2">
                <label className="block text-xs font-bold text-purple-900 mb-1">
                  عناوین ۵ پودمان این درس (اختیاری):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 bg-white px-2 py-1.5 rounded-xl border border-purple-200/80 min-w-0 w-full overflow-hidden ${
                        idx === 4 ? 'sm:col-span-2' : ''
                      }`}
                    >
                      <span className="text-[11px] font-bold text-purple-700 w-16 shrink-0 text-center font-mono">
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
                        placeholder={`عنوان پودمان ${idx + 1}`}
                        className="flex-1 min-w-0 w-full h-8 text-xs px-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium bg-gray-50/50 focus:bg-white transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-3.5 text-center text-xs text-gray-500">
              <span className="font-semibold text-gray-700">این درس غیرپودمانی است: </span>
              ارزشیابی نمرات به صورت کلاسی/ترمی یا کتبی و عملی سالانه ثبت شده و نیازی به پودمان‌بندی ندارد.
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
    </div>
  );
};
