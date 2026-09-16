import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
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
import { MobileDataTable, ColumnDef } from '../../../components/ui/MobileDataTable';
import {
  Users,
  GraduationCap,
  Briefcase,
  Plus,
  Search,
  UserPlus,
  Shield,
  AlertCircle,
  BookOpen,
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';
import { ResponsivePageHeader } from '../../../components/ui/ResponsivePageHeader';
import { useTenantStore } from '../../../lib/auth/tenant-store';

import { read, utils, writeFile } from 'xlsx';

export const MembersPage: React.FC = () => {
  const { currentTenant } = useTenantStore();
  const branchPrefix = (() => {
    const slug = (currentTenant?.slug || '').toLowerCase();
    const theme = (currentTenant?.theme || '').toUpperCase();
    if (slug.includes('girl') || theme === 'FEMALE') return 'g';
    if (slug.includes('college') || theme === 'COLLEGE') return 'c';
    return 'b';
  })();

  const [activeTab, setActiveTab] = useState<'STUDENTS' | 'TEACHERS'>('STUDENTS');
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isEditLessonsModalOpen, setIsEditLessonsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any | null>(null);
  const [editingLessonIds, setEditingLessonIds] = useState<string[]>([]);

  // Excel Bulk Import States
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelRows, setExcelRows] = useState<any[]>([]);
  const [excelResult, setExcelResult] = useState<{ total: number; success: number; failed: number; errors?: string[] } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Forms
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadExcelSample = () => {
    const sampleData = [
      {
        'کد ملی': '0012345678',
        'نام': 'امیرعلی',
        'نام خانوادگی': 'صادقی',
        'شماره دانش آموزی': '12345678',
        'شماره کلاس': '۱۰۱',
        'موبایل دانش آموز': '09121112233',
        'نام پدر': 'رضا',
        'موبایل پدر': '09124445566',
        'جنسیت': 'پسر',
      },
      {
        'کد ملی': '0012345679',
        'نام': 'سارا',
        'نام خانوادگی': 'محمدی',
        'شماره دانش آموزی': '12345679',
        'شماره کلاس': '۱۰۱',
        'موبایل دانش آموز': '09122223344',
        'نام پدر': 'علی',
        'موبایل پدر': '09125556677',
        'جنسیت': 'دختر',
      },
    ];
    const ws = utils.json_to_sheet(sampleData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'دانش‌آموزان');
    writeFile(wb, 'نمونه_ورود_گروهی_دانش‌آموزان_رکاد.xlsx');
  };

  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError(null);
      setExcelResult(null);
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = utils.sheet_to_json(sheet);
      if (!rows || rows.length === 0) {
        setError('فایل اکسل انتخاب‌شده فاقد داده یا سطر است.');
        return;
      }
      setExcelFile(file);
      setExcelRows(rows);
    } catch (err: any) {
      setError('خطا در خواندن فایل اکسل: ' + (err.message || 'فایل نامعتبر است'));
    }
  };

  const handleSubmitExcel = async () => {
    if (!excelRows.length) {
      setError('لطفاً ابتدا یک فایل اکسل دارای اطلاعات انتخاب کنید.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await apiClient.post('/members/students/bulk-excel', { items: excelRows });
      setExcelResult(res.data);
      fetchData();
    } catch (err: any) {
      setError('خطا در ثبت اطلاعات: ' + (err.message || 'خطای غیرمنتظره'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const [studentForm, setStudentForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    nationalCode: '',
    studentNumber: '',
    classroomId: '',
    password: '',
  });

  const [teacherForm, setTeacherForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    nationalCode: '',
    personnelCode: '',
    specialization: '',
    password: '',
    lessonIds: [] as string[],
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [studentsRes, teachersRes, classesRes, lessonsRes] = await Promise.all([
        apiClient.get('/members/students'),
        apiClient.get('/members/teachers'),
        apiClient.get('/classes/classrooms'),
        apiClient.get('/classes/lessons'),
      ]);
      setStudents(studentsRes.data || []);
      setTeachers(teachersRes.data || []);
      setClassrooms(classesRes.data || []);
      setLessons(lessonsRes.data || []);
      if (classesRes.data?.length > 0) {
        setStudentForm((prev) => ({ ...prev, classroomId: classesRes.data[0].id }));
      }
    } catch (err) {
      console.error('Failed to load members', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const derivedCode =
        studentForm.studentNumber.trim() ||
        studentForm.nationalCode.replace(/\D/g, '').replace(/^0+/, '') ||
        undefined;

      const payload = {
        firstName: studentForm.firstName.trim(),
        lastName: studentForm.lastName.trim(),
        phone: studentForm.phone.trim(),
        nationalCode: studentForm.nationalCode.trim() || undefined,
        studentCode: derivedCode,
        studentNumber: derivedCode,
        classroomId: studentForm.classroomId || undefined,
        password: studentForm.password || undefined,
      };

      await apiClient.post('/members/students', payload);
      setIsStudentModalOpen(false);
      setStudentForm({
        firstName: '',
        lastName: '',
        phone: '',
        nationalCode: '',
        studentNumber: '',
        classroomId: classrooms[0]?.id || '',
        password: 'StudentPass2026!',
      });
      fetchData();
    } catch (err: any) {
      setError(
        err.message ||
          (Array.isArray(err.message) ? err.message.join('، ') : 'خطا در ثبت‌نام دانش‌آموز.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        firstName: teacherForm.firstName.trim(),
        lastName: teacherForm.lastName.trim(),
        phone: teacherForm.phone.trim(),
        nationalCode: teacherForm.nationalCode.trim() || undefined,
        personnelCode: teacherForm.personnelCode.trim() || undefined,
        specialization: teacherForm.specialization.trim() || undefined,
        speciality: teacherForm.specialization.trim() || undefined,
        password: teacherForm.password || undefined,
        lessonIds: teacherForm.lessonIds,
      };

      await apiClient.post('/members/teachers', payload);
      setIsTeacherModalOpen(false);
      setTeacherForm({
        firstName: '',
        lastName: '',
        phone: '',
        nationalCode: '',
        personnelCode: '',
        specialization: '',
        password: '',
        lessonIds: [],
      });
      fetchData();
    } catch (err: any) {
      setError(
        err.message ||
          (Array.isArray(err.message) ? err.message.join('، ') : 'خطا در ثبت دبیر جدید.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditLessons = (teacher: any) => {
    setEditingTeacher(teacher);
    const currentLessonIds = teacher.teacherLessons?.map((tl: any) => tl.lessonId || tl.lesson?.id) || [];
    setEditingLessonIds(currentLessonIds);
    setIsEditLessonsModalOpen(true);
  };

  const handleSaveTeacherLessons = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.put(`/members/teachers/${editingTeacher.id}/lessons`, {
        lessonIds: editingLessonIds,
      });
      setIsEditLessonsModalOpen(false);
      setEditingTeacher(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'خطا در ذخیره دروس دبیر.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <ResponsivePageHeader
        icon={Users}
        title="مدیریت اعضا و ثبت‌نام دانش‌آموزان و کادر هنرستان"
        description="ثبت پرونده تحصیلی، اطلاعات اولیاء، پرونده‌های الکترونیکی و ورود دسته‌جمعی"
        actions={
          activeTab === 'STUDENTS' ? (
            <div className="flex items-center space-x-2 space-x-reverse w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  setIsExcelModalOpen(true);
                  setExcelResult(null);
                  setExcelFile(null);
                  setExcelRows([]);
                  setError(null);
                }}
                className="w-full sm:w-auto text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-bold"
              >
                <FileSpreadsheet className="h-4 w-4 ml-1.5 text-emerald-600" />
                <span>ورود گروهی با اکسل (.xlsx)</span>
              </Button>

              <Button variant="primary" size="sm" onClick={() => setIsStudentModalOpen(true)} className="w-full sm:w-auto">
                <UserPlus className="h-4 w-4 ml-1" />
                <span>ثبت‌نام فردی</span>
              </Button>
            </div>
          ) : (
            <Button variant="primary" size="sm" onClick={() => setIsTeacherModalOpen(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 ml-1" />
              <span>ثبت مربی یا پرسنل جدید</span>
            </Button>
          )
        }
      />

      {/* Tabs */}
      <div className="flex space-x-2 space-x-reverse border-b border-gray-200 overflow-x-auto scrollbar-none pb-0.5 touch-pan-x">
        <button
          onClick={() => setActiveTab('STUDENTS')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 space-x-reverse shrink-0 ${
            activeTab === 'STUDENTS'
              ? 'border-primary text-primary-dark'
              : 'border-transparent text-gray-500 hover:text-ink-dark'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          <span>دانش‌آموزان ({students.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('TEACHERS')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 space-x-reverse shrink-0 ${
            activeTab === 'TEACHERS'
              ? 'border-primary text-primary-dark'
              : 'border-transparent text-gray-500 hover:text-ink-dark'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          <span>دبیران و کادر آموزشی ({teachers.length})</span>
        </button>
      </div>

      {/* Tab 1: Students */}
      {activeTab === 'STUDENTS' && (
        <MobileDataTable
          data={students}
          columns={[
            {
              key: 'name',
              header: 'نام و نام خانوادگی',
              mobilePriority: 'primary',
              render: (s) => (
                <div className="font-bold text-ink-darker text-sm">
                  {s.user?.firstName} {s.user?.lastName}
                </div>
              ),
            },
            {
              key: 'classroom',
              header: 'کلاس درس',
              mobilePriority: 'primary',
              render: (s) => (
                <span className="text-xs bg-primary/10 text-primary-dark px-2.5 py-0.5 rounded-full font-bold">
                  {s.classroom?.name || 'کلاس ۱۰۱'}
                </span>
              ),
            },
            {
              key: 'studentNumber',
              header: 'شماره دانش‌آموزی',
              mobilePriority: 'secondary',
              render: (s) => <span className="font-mono text-xs font-bold">{s.studentNumber}</span>,
            },
            {
              key: 'status',
              header: 'وضعیت پرونده',
              mobilePriority: 'secondary',
              render: () => <Badge variant="success">ثبت‌نام قطعی</Badge>,
            },
            {
              key: 'nationalCode',
              header: 'کد ملی',
              mobilePriority: 'detail',
              render: (s) => <span className="font-mono text-xs text-gray-600">{s.nationalCode || '—'}</span>,
            },
            {
              key: 'phone',
              header: 'شماره تماس',
              mobilePriority: 'detail',
              render: (s) => <span className="font-mono text-xs text-gray-600">{s.user?.phone || '—'}</span>,
            },
          ]}
          keyExtractor={(s) => s.id}
          isLoading={isLoading}
          emptyMessage="هنوز دانش‌آموزی ثبت‌نام نشده است."
        />
      )}

      {/* Tab 2: Teachers */}
      {activeTab === 'TEACHERS' && (
        <MobileDataTable
          data={teachers}
          columns={[
            {
              key: 'name',
              header: 'نام دبیر / پرسنل',
              mobilePriority: 'primary',
              render: (t) => (
                <div className="font-bold text-ink-darker text-sm">
                  {t.user?.firstName} {t.user?.lastName}
                </div>
              ),
            },
            {
              key: 'specialization',
              header: 'تخصص تدریس',
              mobilePriority: 'primary',
              render: (t) => <span className="text-xs text-gray-700 font-bold">{t.specialization || 'عمومی'}</span>,
            },
            {
              key: 'personnelCode',
              header: 'کد پرسنلی',
              mobilePriority: 'secondary',
              render: (t) => <span className="font-mono text-xs font-bold">{t.personnelCode || '—'}</span>,
            },
            {
              key: 'lessons',
              header: 'دروس تخصیص‌یافته',
              mobilePriority: 'secondary',
              render: (t) => {
                const assignedLessons = t.teacherLessons?.map((tl: any) => tl.lesson) || [];
                if (assignedLessons.length === 0) {
                  return <span className="text-xs text-gray-400">بدون درس تخصیص‌یافته</span>;
                }
                return (
                  <div className="flex flex-wrap gap-1.5 max-w-xs">
                    {assignedLessons.map((l: any) => (
                      <span
                        key={l.id}
                        className="inline-flex items-center gap-1 text-[11px] bg-primary/10 text-primary-dark font-bold px-2 py-0.5 rounded border border-primary/20"
                        title={`پایه ${l.level?.name || '—'} | رشته ${l.field?.name || 'عمومی'}`}
                      >
                        <BookOpen className="h-3 w-3" />
                        {l.name}
                        {l.level?.name && (
                          <span className="text-[9px] text-gray-500">({l.level.name})</span>
                        )}
                      </span>
                    ))}
                  </div>
                );
              },
            },
            {
              key: 'phone',
              header: 'شماره تماس',
              mobilePriority: 'detail',
              render: (t) => <span className="font-mono text-xs text-gray-600">{t.user?.phone || '—'}</span>,
            },
            {
              key: 'contractStatus',
              header: 'وضعیت قرارداد',
              mobilePriority: 'detail',
              render: () => <Badge variant="male">دبیر فعال</Badge>,
            },
          ]}
          keyExtractor={(t) => t.id}
          isLoading={isLoading}
          emptyMessage="هنوز دبیری ثبت نشده است."
          cardActions={(t) => (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenEditLessons(t)}
              className="text-xs text-primary hover:text-primary-dark h-8 px-2.5"
            >
              <BookOpen className="h-3.5 w-3.5 ms-1" />
              ویرایش دروس
            </Button>
          )}
        />
      )}

      {/* 1. Modal: Enroll Student */}
      <Modal
        isOpen={isStudentModalOpen}
        onClose={() => {
          setIsStudentModalOpen(false);
          setError(null);
        }}
        title="ثبت‌نام دانش‌آموز جدید"
        description="ایجاد حساب کاربری، پرونده تحصیلی و انتساب به کلاس"
        maxWidth="lg"
      >
        {error && (
          <div className="mb-4 flex items-center space-x-2 space-x-reverse rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleEnrollStudent} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="نام دانش‌آموز"
              placeholder="مثال: رضا"
              value={studentForm.firstName}
              onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
              required
            />
            <Input
              label="نام خانوادگی"
              placeholder="مثال: حسینی"
              value={studentForm.lastName}
              onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="کد ملی (نام کاربری سامانه ورود یکپارچه)"
              placeholder="مثال: 0012345678"
              value={studentForm.nationalCode}
              onChange={(e) => {
                const nat = e.target.value;
                const derived = nat.replace(/\D/g, '').replace(/^0+/, '');
                setStudentForm((prev) => ({
                  ...prev,
                  nationalCode: nat,
                  studentNumber: derived,
                }));
              }}
              required
            />
            <Input
              label="شماره دانش‌آموزی (کد ملی بدون صفر)"
              placeholder="مثال: 12345678 (محاسبه خودکار)"
              value={studentForm.studentNumber}
              onChange={(e) => setStudentForm({ ...studentForm, studentNumber: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="شماره همراه (جهت اطلاع‌رسانی و پیامک خانواده)"
              placeholder="مثال: 09123333333"
              value={studentForm.phone}
              onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
              required
            />
            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">کلاس درس</label>
              <select
                value={studentForm.classroomId}
                onChange={(e) => setStudentForm({ ...studentForm, classroomId: e.target.value })}
                className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Unified Credentials Card Preview */}
          <div className="p-3 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 space-y-1 text-xs">
            <div className="font-bold text-ink-dark dark:text-white flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-primary" />
              <span>سامانه ورود یکپارچه (تولید خودکار اطلاعات ورود):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="bg-white dark:bg-[#1E293B] p-2 rounded border border-gray-200 dark:border-gray-700">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 block">نام کاربری سامانه:</span>
                <span className="font-mono font-bold text-ink-dark dark:text-white">
                  {studentForm.nationalCode ? studentForm.nationalCode : 'کد ملی هنرجو'}
                </span>
              </div>
              <div className="bg-white dark:bg-[#1E293B] p-2 rounded border border-gray-200 dark:border-gray-700">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 block">رمز عبور خودکار:</span>
                <span className="font-mono font-bold text-primary">
                  {studentForm.nationalCode
                    ? `${branchPrefix}${studentForm.nationalCode}`
                    : `${branchPrefix} + کد ملی`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsStudentModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              تکمیل ثبت‌نام
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Modal: Create Teacher */}
      <Modal
        isOpen={isTeacherModalOpen}
        onClose={() => {
          setIsTeacherModalOpen(false);
          setError(null);
        }}
        title="ثبت دبیر یا پرسنل جدید"
        description="ایجاد حساب کاربری آموزشی و ثبت کد پرسنلی"
        maxWidth="lg"
      >
        {error && (
          <div className="mb-4 flex items-center space-x-2 space-x-reverse rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateTeacher} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="نام"
              placeholder="مثال: محمد"
              value={teacherForm.firstName}
              onChange={(e) => setTeacherForm({ ...teacherForm, firstName: e.target.value })}
              required
            />
            <Input
              label="نام خانوادگی"
              placeholder="مثال: کاظمی"
              value={teacherForm.lastName}
              onChange={(e) => setTeacherForm({ ...teacherForm, lastName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="کد پرسنلی"
              placeholder="مثال: TCH-1404-01"
              value={teacherForm.personnelCode}
              onChange={(e) => setTeacherForm({ ...teacherForm, personnelCode: e.target.value })}
              required
            />
            <Input
              label="رشته / تخصص تدریس"
              placeholder="مثال: ریاضی و هندسه تحلیلی"
              value={teacherForm.specialization}
              onChange={(e) => setTeacherForm({ ...teacherForm, specialization: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="کد ملی (نام کاربری ورود)"
              placeholder="مثال: 0012345678"
              value={teacherForm.nationalCode}
              onChange={(e) => setTeacherForm({ ...teacherForm, nationalCode: e.target.value })}
            />
            <Input
              label="شماره تماس"
              placeholder="مثال: 09122222222"
              value={teacherForm.phone}
              onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
              required
            />
          </div>

          {/* Teacher Unified Credentials Card */}
          <div className="p-3 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 space-y-1 text-xs">
            <div className="font-bold text-ink-dark dark:text-white flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-primary" />
              <span>شناسه ورود یکپارچه دبیر:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="bg-white dark:bg-[#1E293B] p-2 rounded border border-gray-200 dark:border-gray-700">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 block">نام کاربری سامانه:</span>
                <span className="font-mono font-bold text-ink-dark dark:text-white">
                  {teacherForm.nationalCode ? teacherForm.nationalCode : (teacherForm.phone || 'کد ملی یا موبایل')}
                </span>
              </div>
              <div className="bg-white dark:bg-[#1E293B] p-2 rounded border border-gray-200 dark:border-gray-700">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 block">رمز عبور پیش‌فرض:</span>
                <span className="font-mono font-bold text-primary">
                  {teacherForm.nationalCode
                    ? `${branchPrefix}${teacherForm.nationalCode}`
                    : (teacherForm.phone || 'رمز پیش‌فرض')}
                </span>
              </div>
            </div>
          </div>

          {/* Multi-Select Lessons */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-ink-normal text-right">
              دروس تدریسی دبیر (انتخاب یک یا چند درس)
            </label>
            <p className="text-[11px] text-gray-500">
              یک درس می‌تواند چندین دبیر داشته باشد و این دبیر هم می‌تواند چندین درس مختلف را تدریس کند:
            </p>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2.5 space-y-1.5">
              {lessons.length === 0 ? (
                <div className="text-xs text-gray-400 py-2 text-center">
                  هیچ درسی تعریف نشده است. ابتدا در بخش ساختار آموزشی دروس را تعریف کنید.
                </div>
              ) : (
                lessons.map((lesson) => {
                  const isSelected = teacherForm.lessonIds.includes(lesson.id);
                  return (
                    <div
                      key={lesson.id}
                      onClick={() => {
                        setTeacherForm((prev) => ({
                          ...prev,
                          lessonIds: isSelected
                            ? prev.lessonIds.filter((id) => id !== lesson.id)
                            : [...prev.lessonIds, lesson.id],
                        }));
                      }}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-primary-50/60 border-primary shadow-xs'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-xs font-bold text-ink-dark">{lesson.name}</span>
                        <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {lesson.code}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 space-x-reverse">
                        {lesson.level?.name && (
                          <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded">
                            پایه {lesson.level.name}
                          </span>
                        )}
                        {lesson.field?.name ? (
                          <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-medium">
                            {lesson.field.name}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                            عمومی
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {teacherForm.lessonIds.length > 0 && (
              <div className="text-[11px] text-primary font-bold">
                {teacherForm.lessonIds.length} درس انتخاب شده است.
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsTeacherModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              ثبت دبیر
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Modal: Edit Teacher Lessons */}
      <Modal
        isOpen={isEditLessonsModalOpen}
        onClose={() => {
          setIsEditLessonsModalOpen(false);
          setEditingTeacher(null);
          setError(null);
        }}
        title={`مدیریت دروس تخصیص‌یافته به ${editingTeacher?.user?.firstName || ''} ${editingTeacher?.user?.lastName || ''}`}
        description="تخصیص، افزودن یا حذف دروس تدریسی این دبیر"
        maxWidth="lg"
      >
        {error && (
          <div className="mb-4 flex items-center space-x-2 space-x-reverse rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSaveTeacherLessons} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-ink-normal text-right">
              دروس تدریسی دبیر
            </label>
            <p className="text-[11px] text-gray-500">
              هر کدام از درس‌های زیر را می‌توانید برای این دبیر فعال یا غیرفعال کنید:
            </p>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2.5 space-y-1.5">
              {lessons.length === 0 ? (
                <div className="text-xs text-gray-400 py-2 text-center">درسی تعریف نشده است.</div>
              ) : (
                lessons.map((lesson) => {
                  const isSelected = editingLessonIds.includes(lesson.id);
                  return (
                    <div
                      key={lesson.id}
                      onClick={() => {
                        setEditingLessonIds((prev) =>
                          isSelected
                            ? prev.filter((id) => id !== lesson.id)
                            : [...prev, lesson.id],
                        );
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-md cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-primary-50/60 border-primary shadow-xs'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-xs font-bold text-ink-dark">{lesson.name}</span>
                        <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {lesson.code}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 space-x-reverse">
                        {lesson.level?.name && (
                          <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded">
                            پایه {lesson.level.name}
                          </span>
                        )}
                        {lesson.field?.name ? (
                          <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-medium">
                            {lesson.field.name}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                            عمومی
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="text-[11px] text-primary font-bold">
              {editingLessonIds.length} درس انتخاب شده است.
            </div>
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsEditLessonsModalOpen(false);
                setEditingTeacher(null);
              }}
            >
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              ذخیره دروس
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Modal: Bulk Excel Import for Students */}
      <Modal
        isOpen={isExcelModalOpen}
        onClose={() => {
          setIsExcelModalOpen(false);
          setExcelFile(null);
          setExcelRows([]);
          setExcelResult(null);
          setError(null);
        }}
        title="ورود گروهی دانش‌آموزان از طریق اکسل"
        description="بارگذاری دسته‌جمعی مشخصات دانش‌آموزان با استفاده از فایل اکسل (.xlsx یا .xls)"
        maxWidth="md"
      >
        <div className="space-y-5">
          {/* Download Template Banner */}
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5 space-x-reverse">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">فایل نمونه استاندارد اکسل</div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                  ستون‌های فایل: «کد ملی» (جهت تولید نام کاربری و رمز عبور)، نام، نام خانوادگی، شماره کلاس و شماره تماس
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadExcelSample}
              className="text-xs shrink-0 bg-white dark:bg-emerald-900/50 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100"
            >
              <Download className="h-3.5 w-3.5 ml-1" />
              <span>دانلود نمونه فایل</span>
            </Button>
          </div>

          {/* Unified Login Standard Notice for Excel */}
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs space-y-1.5">
            <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>سامانه ورود یکپارچه رُکاد در اکسل:</span>
            </div>
            <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
              با بارگذاری فایل اکسل، اطلاعات ورود برای تک‌تک هنرجویان به صورت کاملاً خودکار تولید می‌گردد:
              <br />
              • <strong>نام کاربری:</strong> کد ملی ۱۰ رقمی هنرجو
              <br />
              • <strong>رمز عبور پیش‌فرض:</strong> پیش‌وند شعبه + کد ملی (<strong>{branchPrefix}</strong> + کد ملی، مثال: <strong>{branchPrefix}0012345678</strong>)
            </p>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            className="hidden"
            onChange={handleExcelFileChange}
          />

          {/* Upload Drop/Click Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-gray-50/60 hover:bg-emerald-50/30"
          >
            <UploadCloud className="h-10 w-10 text-gray-400 mx-auto mb-2" />
            <div className="text-xs font-bold text-ink-darker">
              {excelFile ? excelFile.name : 'برای انتخاب فایل اکسل کلیک کنید'}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              فرمت‌های مجاز: .xlsx یا .xls
            </p>
            {excelRows.length > 0 && (
              <div className="mt-3 inline-flex items-center space-x-1 space-x-reverse bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{excelRows.length} دانش‌آموز در فایل شناسایی شد</span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 space-x-reverse rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Result Message */}
          {excelResult && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <div className="font-bold flex items-center space-x-1.5 space-x-reverse">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>عملیات با موفقیت انجام شد:</span>
              </div>
              <div>تعداد موفق: <strong>{excelResult.success}</strong> نفر</div>
              {excelResult.failed > 0 && (
                <div className="text-amber-700">تعداد ناموفق: <strong>{excelResult.failed}</strong> نفر</div>
              )}
              {excelResult.errors && excelResult.errors.length > 0 && (
                <div className="mt-2 text-[11px] text-red-600 space-y-0.5">
                  {excelResult.errors.slice(0, 3).map((err, idx) => (
                    <div key={idx}>• {err}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="flex justify-end space-x-2 space-x-reverse pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsExcelModalOpen(false);
                setExcelFile(null);
                setExcelRows([]);
                setExcelResult(null);
                setError(null);
              }}
            >
              بستن
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmitExcel}
              disabled={excelRows.length === 0}
              isLoading={isSubmitting}
            >
              ثبت نهایی {excelRows.length > 0 ? `(${excelRows.length} دانش‌آموز)` : ''}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
