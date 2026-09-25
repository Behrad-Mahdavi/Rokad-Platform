import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiClient } from '../../../lib/api/client';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
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
  Eye,
  Phone,
  MapPin,
  Home,
  HeartPulse,
  CreditCard,
  FileText,
  Calendar,
  Edit3,
  Save,
  KeyRound,
} from 'lucide-react';
import { ResponsivePageHeader } from '../../../components/ui/ResponsivePageHeader';
import { useTenantStore } from '../../../lib/auth/tenant-store';
import { toPersianDigits, formatToJalali } from '../../../lib/utils';
import { PasswordRevealModal, TargetMember } from '../vault/PasswordRevealModal';

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

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: 'STUDENTS' | 'TEACHERS' =
    tabParam === 'staff' || tabParam === 'teachers' || tabParam === 'kader'
      ? 'TEACHERS'
      : 'STUDENTS';

  const handleTabChange = (newTab: 'STUDENTS' | 'TEACHERS') => {
    setSearchParams({ tab: newTab === 'TEACHERS' ? 'staff' : 'students' });
    setSearch('');
  };

  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const query = search.trim().toLowerCase();
    return students.filter((s) => {
      const fullName = `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.toLowerCase();
      const nationalCode = (s.nationalCode || '').toLowerCase();
      const studentNumber = (s.studentNumber || s.studentCode || '').toLowerCase();
      const classroom = (s.classroom?.name || '').toLowerCase();
      const phone = (s.user?.phone || '').toLowerCase();
      const father = (s.fatherName || s.fatherFullName || '').toLowerCase();
      const mother = (s.motherFullName || '').toLowerCase();
      return (
        fullName.includes(query) ||
        nationalCode.includes(query) ||
        studentNumber.includes(query) ||
        classroom.includes(query) ||
        phone.includes(query) ||
        father.includes(query) ||
        mother.includes(query)
      );
    });
  }, [students, search]);

  const filteredTeachers = useMemo(() => {
    if (!search.trim()) return teachers;
    const query = search.trim().toLowerCase();
    return teachers.filter((t) => {
      const fullName = `${t.user?.firstName || ''} ${t.user?.lastName || ''}`.toLowerCase();
      const specialization = (t.specialization || '').toLowerCase();
      const personnelCode = (t.personnelCode || '').toLowerCase();
      const phone = (t.user?.phone || '').toLowerCase();
      const lessonsStr = (t.teacherLessons?.map((tl: any) => tl.lesson?.name).join(' ') || '').toLowerCase();
      return (
        fullName.includes(query) ||
        specialization.includes(query) ||
        personnelCode.includes(query) ||
        phone.includes(query) ||
        lessonsStr.includes(query)
      );
    });
  }, [teachers, search]);

  // Modals
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentModalTab, setStudentModalTab] = useState<'IDENTITY' | 'FATHER' | 'MOTHER' | 'CONTACT'>('IDENTITY');

  // Dossier Modal
  const [selectedStudentDossier, setSelectedStudentDossier] = useState<any | null>(null);
  const [dossierTab, setDossierTab] = useState<'IDENTITY' | 'FATHER' | 'MOTHER' | 'CONTACT'>('IDENTITY');
  const [isEditingDossier, setIsEditingDossier] = useState(false);
  const [dossierEditForm, setDossierEditForm] = useState<any>({});
  const [vaultTarget, setVaultTarget] = useState<TargetMember | null>(null);

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
    // نمونه فایل ۲۸ ستونی استاندارد منطبق بر SAMPLE.xlsx با ۲ سطر نمونه
    const sampleData = [
      {
        'نام:': 'امیرعلی',
        'نام خانوادگی:': 'صادقی',
        'نام پدر:': 'رضا',
        'پایه تحصیلی:': 'دهم',
        'تاریخ تولد:': '1388/05/12',
        'محل تولد:': 'مشهد',
        'کد ملی:': '0921234567',
        'سریال شناسنامه:': '123456',
        'سری حرفی:': 'الف',
        'سری عددی:': '12',
        'محل صدور:': 'مشهد',
        'وضعیت جسمانی:': 'سالم',
        'نام و نام‌خانوادگی پدر:': 'رضا صادقی',
        'کد ملی پدر:': '0931234567',
        'تحصیلات پدر:': 'کارشناسی ارشد',
        'شغل پدر:': 'مهندس برق',
        'نام و نام‌خانوادگی مادر:': 'فاطمه حسینی',
        'کد ملی مادر:': '0941234567',
        'تحصیلات مادر:': 'کارشناسی',
        'شغل مادر:': 'معلم',
        'آدرس منزل:': 'مشهد، بلوار سجاد، خیابان بهار، پلاک ۱۲',
        'شماره ثابت:': '05137654321',
        'شماره همراه پدر:': '09151112233',
        'شماره همراه مادر:': '09154445566',
        'آدرس محل کار پدر:': 'مشهد، شهرک صنعتی طوس، فاز ۲',
        'آدرس محل کار مادر:': 'مشهد، دبستان اندیشه',
        'شماره همراه دانش‌آموز:': '09351234567',
        'عکس پرسنلی:': '',
      },
      {
        'نام:': 'سارا',
        'نام خانوادگی:': 'محمدی',
        'نام پدر:': 'علی',
        'پایه تحصیلی:': 'یازدهم',
        'تاریخ تولد:': '1387/08/25',
        'محل تولد:': 'تهران',
        'کد ملی:': '0012345678',
        'سریال شناسنامه:': '654321',
        'سری حرفی:': 'ب',
        'سری عددی:': '34',
        'محل صدور:': 'تهران',
        'وضعیت جسمانی:': 'سالم',
        'نام و نام‌خانوادگی پدر:': 'علی محمدی',
        'کد ملی پدر:': '0023456789',
        'تحصیلات پدر:': 'دکتری',
        'شغل پدر:': 'استاد دانشگاه',
        'نام و نام‌خانوادگی مادر:': 'مریم کریمی',
        'کد ملی مادر:': '0034567890',
        'تحصیلات مادر:': 'کارشناسی ارشد',
        'شغل مادر:': 'پزشک',
        'آدرس منزل:': 'تهران، سعادت‌آباد، خیابان سرو غربی، پلاک ۲۴',
        'شماره ثابت:': '02122334455',
        'شماره همراه پدر:': '09121112233',
        'شماره همراه مادر:': '09124445566',
        'آدرس محل کار پدر:': 'تهران، دانشگاه علم و صنعت',
        'آدرس محل کار مادر:': 'تهران، بیمارستان میلاد',
        'شماره همراه دانش‌آموز:': '09191234567',
        'عکس پرسنلی:': '',
      },
    ];
    const ws = utils.json_to_sheet(sampleData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'دانش‌آموزان');
    writeFile(wb, 'نمونه_استاندارد_ورود_دانش‌آموزان_رکاد.xlsx');
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

  const initialStudentFormState = {
    firstName: '',
    lastName: '',
    phone: '',
    nationalCode: '',
    studentNumber: '',
    classroomId: '',
    password: '',
    // 28 Fields from SAMPLE.xlsx
    fatherName: '',
    gradeLevel: 'دهم',
    birthDate: '',
    birthPlace: '',
    certificateNumber: '',
    certificateSeriesLetter: 'الف',
    certificateSeriesNumber: '',
    issuePlace: '',
    physicalCondition: 'سالم',
    // Father
    fatherFullName: '',
    fatherNationalId: '',
    fatherEducation: '',
    fatherOccupation: '',
    fatherPhone: '',
    fatherWorkAddress: '',
    // Mother
    motherFullName: '',
    motherNationalId: '',
    motherEducation: '',
    motherOccupation: '',
    motherPhone: '',
    motherWorkAddress: '',
    // Contact & Residence
    homeAddress: '',
    landlinePhone: '',
    studentMobile: '',
    avatarUrl: '',
  };

  const [studentForm, setStudentForm] = useState(initialStudentFormState);

  const [teacherForm, setTeacherForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    nationalCode: '',
    personnelCode: '',
    specialization: '',
    degree: '',
    studyField: '',
    landlinePhone: '',
    homeAddress: '',
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
        phone: studentForm.studentMobile.trim() || studentForm.phone.trim() || studentForm.fatherPhone.trim() || studentForm.motherPhone.trim(),
        nationalCode: studentForm.nationalCode.trim() || undefined,
        studentCode: derivedCode,
        studentNumber: derivedCode,
        classroomId: studentForm.classroomId || undefined,
        password: studentForm.password || undefined,
        // 28 Fields from SAMPLE.xlsx
        fatherName: studentForm.fatherName.trim() || undefined,
        gradeLevel: studentForm.gradeLevel.trim() || undefined,
        birthDate: studentForm.birthDate.trim() || undefined,
        birthPlace: studentForm.birthPlace.trim() || undefined,
        certificateNumber: studentForm.certificateNumber.trim() || undefined,
        certificateSeriesLetter: studentForm.certificateSeriesLetter.trim() || undefined,
        certificateSeriesNumber: studentForm.certificateSeriesNumber.trim() || undefined,
        issuePlace: studentForm.issuePlace.trim() || undefined,
        physicalCondition: studentForm.physicalCondition.trim() || undefined,
        fatherFullName: studentForm.fatherFullName.trim() || undefined,
        fatherNationalId: studentForm.fatherNationalId.trim() || undefined,
        fatherEducation: studentForm.fatherEducation.trim() || undefined,
        fatherOccupation: studentForm.fatherOccupation.trim() || undefined,
        fatherPhone: studentForm.fatherPhone.trim() || undefined,
        fatherWorkAddress: studentForm.fatherWorkAddress.trim() || undefined,
        motherFullName: studentForm.motherFullName.trim() || undefined,
        motherNationalId: studentForm.motherNationalId.trim() || undefined,
        motherEducation: studentForm.motherEducation.trim() || undefined,
        motherOccupation: studentForm.motherOccupation.trim() || undefined,
        motherPhone: studentForm.motherPhone.trim() || undefined,
        motherWorkAddress: studentForm.motherWorkAddress.trim() || undefined,
        homeAddress: studentForm.homeAddress.trim() || undefined,
        landlinePhone: studentForm.landlinePhone.trim() || undefined,
        studentMobile: studentForm.studentMobile.trim() || undefined,
        avatarUrl: studentForm.avatarUrl.trim() || undefined,
      };

      await apiClient.post('/members/students', payload);
      setIsStudentModalOpen(false);
      setStudentForm(initialStudentFormState);
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

  const handleOpenDossier = (student: any) => {
    setSelectedStudentDossier(student);
    setDossierTab('IDENTITY');
    setIsEditingDossier(false);
    setDossierEditForm({
      firstName: student.user?.firstName || '',
      lastName: student.user?.lastName || '',
      phone: student.user?.phone || '',
      nationalCode: student.nationalCode || '',
      studentCode: student.studentCode || '',
      fatherName: student.fatherName || '',
      gradeLevel: student.gradeLevel || 'دهم',
      birthDate: student.birthDate ? formatToJalali(student.birthDate) : '',
      birthPlace: student.birthPlace || '',
      certificateNumber: student.certificateNumber || '',
      certificateSeriesLetter: student.certificateSeriesLetter || 'الف',
      certificateSeriesNumber: student.certificateSeriesNumber || '',
      issuePlace: student.issuePlace || '',
      physicalCondition: student.physicalCondition || student.medicalNotes || 'سالم',
      fatherFullName: student.fatherFullName || '',
      fatherNationalId: student.fatherNationalId || '',
      fatherEducation: student.fatherEducation || '',
      fatherOccupation: student.fatherOccupation || '',
      fatherPhone: student.fatherPhone || '',
      fatherWorkAddress: student.fatherWorkAddress || '',
      motherFullName: student.motherFullName || '',
      motherNationalId: student.motherNationalId || '',
      motherEducation: student.motherEducation || '',
      motherOccupation: student.motherOccupation || '',
      motherPhone: student.motherPhone || '',
      motherWorkAddress: student.motherWorkAddress || '',
      homeAddress: student.homeAddress || student.address || '',
      landlinePhone: student.landlinePhone || '',
      studentMobile: student.studentMobile || '',
      avatarUrl: student.user?.avatarUrl || '',
    });
  };

  const handleSaveDossier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentDossier) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...dossierEditForm,
      };
      await apiClient.put(`/members/students/${selectedStudentDossier.id}`, payload);
      setIsEditingDossier(false);
      await fetchData();
      const updatedRes = await apiClient.get('/members/students');
      const found = (updatedRes.data || []).find((s: any) => s.id === selectedStudentDossier.id);
      if (found) setSelectedStudentDossier(found);
    } catch (err: any) {
      setError(err.message || 'خطا در به‌روزرسانی پرونده دانش‌آموز.');
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
        degree: teacherForm.degree.trim() || undefined,
        studyField: teacherForm.studyField.trim() || undefined,
        landlinePhone: teacherForm.landlinePhone.trim() || undefined,
        homeAddress: teacherForm.homeAddress.trim() || undefined,
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
        degree: '',
        studyField: '',
        landlinePhone: '',
        homeAddress: '',
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
      {/* Header & Actions */}
      {activeTab === 'STUDENTS' ? (
        <ResponsivePageHeader
          icon={GraduationCap}
          title="مدیریت دانش‌آموزان"
          description="ثبت پرونده تحصیلی، اطلاعات اولیاء، پرونده‌های الکترونیکی و ورود دسته‌جمعی"
          actions={
            <div className="flex items-center space-x-2 space-x-reverse w-full sm:w-auto">
              <Link to="/app/admin/vault">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="w-full sm:w-auto text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-bold"
                >
                  <KeyRound className="h-4 w-4 ml-1.5 text-amber-600 dark:text-amber-400" />
                  <span>گاوصندوق رمزها</span>
                </Button>
              </Link>

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
                <span>ثبت‌نام فردی دانش‌آموز</span>
              </Button>
            </div>
          }
        />
      ) : (
        <ResponsivePageHeader
          icon={Briefcase}
          title="مدیریت کادر آموزشی"
          description="مدیریت دبیران، کادر اجرایی، تخصص تدریس و تخصیص دروس مدرسه"
          actions={
            <Button variant="primary" size="sm" onClick={() => setIsTeacherModalOpen(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 ml-1" />
              <span>ثبت کادر آموزشی جدید</span>
            </Button>
          }
        />
      )}

      {/* Modern Tabs Bar & Live Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 pb-3">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-gray-100/90 dark:bg-gray-800/80 w-fit">
          <button
            type="button"
            onClick={() => handleTabChange('STUDENTS')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer select-none ${
              activeTab === 'STUDENTS'
                ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                : 'text-gray-500 hover:text-ink-darker dark:hover:text-white'
            }`}
          >
            <GraduationCap className="h-4 w-4 shrink-0" />
            <span>دانش‌آموزان</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-lg font-mono font-bold ${
                activeTab === 'STUDENTS'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-gray-200/70 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              {toPersianDigits(students.length)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('TEACHERS')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer select-none ${
              activeTab === 'TEACHERS'
                ? 'bg-white dark:bg-[#151C28] text-club-normal dark:text-club-light shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                : 'text-gray-500 hover:text-ink-darker dark:hover:text-white'
            }`}
          >
            <Briefcase className="h-4 w-4 shrink-0" />
            <span>کادر آموزشی</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-lg font-mono font-bold ${
                activeTab === 'TEACHERS'
                  ? 'bg-club-light dark:bg-club-darker text-club-normal dark:text-club-light'
                  : 'bg-gray-200/70 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              {toPersianDigits(teachers.length)}
            </span>
          </button>
        </div>

        {/* Live Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === 'STUDENTS' ? 'جستجو در دانش‌آموزان...' : 'جستجو در کادر آموزشی...'}
            className="pr-9 pl-8 text-xs h-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white text-xs p-1 cursor-pointer"
              title="پاک کردن جستجو"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Students */}
      {activeTab === 'STUDENTS' && (
        <MobileDataTable
          data={filteredStudents}
          columns={[
            {
              key: 'name',
              header: 'نام و نام خانوادگی',
              mobilePriority: 'primary',
              render: (s) => (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-xs text-ink-dark">
                    {s.user?.avatarUrl ? (
                      <img src={s.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      s.user?.firstName?.[0] || 'د'
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-ink-darker dark:text-white text-sm">
                      {s.user?.firstName} {s.user?.lastName}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <span>پایه:</span>
                      <span className="font-bold text-primary">{s.gradeLevel || 'دهم'}</span>
                      {s.fatherName && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">•</span>
                          <span>فرزند: {s.fatherName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: 'classroom',
              header: 'کلاس درس',
              mobilePriority: 'primary',
              render: (s) => (
                <span className="text-xs bg-primary/10 text-primary-dark dark:text-primary-light px-2.5 py-0.5 rounded-full font-bold">
                  {s.enrollments?.[0]?.classroom?.name || s.classroom?.name || 'کلاس عمومی'}
                </span>
              ),
            },
            {
              key: 'studentNumber',
              header: 'شماره دانش‌آموزی',
              mobilePriority: 'secondary',
              render: (s) => (
                <span className="font-mono text-xs font-bold text-ink-dark dark:text-gray-200">
                  {s.studentCode || s.studentNumber || '—'}
                </span>
              ),
            },
            {
              key: 'nationalCode',
              header: 'کد ملی',
              mobilePriority: 'detail',
              render: (s) => <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{s.nationalCode || '—'}</span>,
            },
            {
              key: 'phone',
              header: 'شماره همراه',
              mobilePriority: 'detail',
              render: (s) => (
                <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                  {s.studentMobile || s.user?.phone || s.fatherPhone || '—'}
                </span>
              ),
            },
            {
              key: 'actions',
              header: 'عملیات',
              mobilePriority: 'primary',
              render: (s) => (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenDossier(s)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-2xs border border-primary/20 cursor-pointer"
                    title="مشاهده پرونده الکترونیکی"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>پرونده</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVaultTarget(s)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-all shadow-2xs border border-amber-500/20 cursor-pointer"
                    title="مشاهده رمز عبور در گاوصندوق"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>رمز</span>
                  </button>
                </div>
              ),
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
          data={filteredTeachers}
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
              render: (t) => <span className="text-xs text-gray-700 font-bold">{t.specialization || t.speciality || 'عمومی'}</span>,
            },
            {
              key: 'degreeAndField',
              header: 'مدرک و رشته',
              mobilePriority: 'secondary',
              render: (t) => {
                const parts = [t.degree, t.studyField].filter(Boolean);
                return (
                  <span className="text-xs text-gray-600 font-medium">
                    {parts.length > 0 ? parts.join(' - ') : '—'}
                  </span>
                );
              },
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
              render: (t) => (
                <div className="text-xs">
                  <div className="font-mono text-gray-700 dark:text-gray-300 font-bold">{t.user?.phone || '—'}</div>
                  {t.landlinePhone && (
                    <div className="font-mono text-[10px] text-gray-500">ثابت: {t.landlinePhone}</div>
                  )}
                </div>
              ),
            },
            {
              key: 'contractStatus',
              header: 'وضعیت قرارداد',
              mobilePriority: 'detail',
              render: () => <Badge variant="male">دبیر فعال</Badge>,
            },
            {
              key: 'actions',
              header: 'عملیات',
              mobilePriority: 'primary',
              render: (t) => (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEditLessons(t)}
                    className="text-xs text-primary hover:text-primary-dark h-8 px-2"
                    title="ویرایش دروس"
                  >
                    <BookOpen className="h-3.5 w-3.5 ms-1" />
                    <span>دروس</span>
                  </Button>
                  <button
                    type="button"
                    onClick={() => setVaultTarget(t)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-all shadow-2xs border border-amber-500/20 cursor-pointer"
                    title="مشاهده رمز عبور در گاوصندوق"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>رمز</span>
                  </button>
                </div>
              ),
            },
          ]}
          keyExtractor={(t) => t.id}
          isLoading={isLoading}
          emptyMessage="هنوز دبیری ثبت نشده است."
          cardActions={(t) => (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenEditLessons(t)}
                className="text-xs text-primary hover:text-primary-dark h-8 px-2.5"
              >
                <BookOpen className="h-3.5 w-3.5 ms-1" />
                ویرایش دروس
              </Button>
              <button
                type="button"
                onClick={() => setVaultTarget(t)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-all shadow-2xs border border-amber-500/20 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>رمز عبور</span>
              </button>
            </div>
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
        {/* Tab switcher inside Student Modal */}
        <div className="flex items-center gap-1.5 p-1 mb-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setStudentModalTab('IDENTITY')}
            className={`flex-1 py-1.5 px-2 rounded-lg transition-all ${
              studentModalTab === 'IDENTITY'
                ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs'
                : 'text-gray-500 hover:text-ink-darker dark:hover:text-white'
            }`}
          >
            هویتی و تحصیلی
          </button>
          <button
            type="button"
            onClick={() => setStudentModalTab('FATHER')}
            className={`flex-1 py-1.5 px-2 rounded-lg transition-all ${
              studentModalTab === 'FATHER'
                ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs'
                : 'text-gray-500 hover:text-ink-darker dark:hover:text-white'
            }`}
          >
            مشخصات پدر
          </button>
          <button
            type="button"
            onClick={() => setStudentModalTab('MOTHER')}
            className={`flex-1 py-1.5 px-2 rounded-lg transition-all ${
              studentModalTab === 'MOTHER'
                ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs'
                : 'text-gray-500 hover:text-ink-darker dark:hover:text-white'
            }`}
          >
            مشخصات مادر
          </button>
          <button
            type="button"
            onClick={() => setStudentModalTab('CONTACT')}
            className={`flex-1 py-1.5 px-2 rounded-lg transition-all ${
              studentModalTab === 'CONTACT'
                ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs'
                : 'text-gray-500 hover:text-ink-darker dark:hover:text-white'
            }`}
          >
            سکونت و تماس
          </button>
        </div>

          {studentModalTab === 'IDENTITY' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="نام دانش‌آموز *"
                  placeholder="مثال: رضا"
                  value={studentForm.firstName}
                  onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
                  required
                />
                <Input
                  label="نام خانوادگی *"
                  placeholder="مثال: حسینی"
                  value={studentForm.lastName}
                  onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="نام پدر"
                  placeholder="مثال: علی"
                  value={studentForm.fatherName}
                  onChange={(e) => setStudentForm({ ...studentForm, fatherName: e.target.value })}
                />
                <Select
                  label="پایه تحصیلی"
                  value={studentForm.gradeLevel}
                  onChange={(e) => setStudentForm({ ...studentForm, gradeLevel: e.target.value })}
                >
                  <option value="دهم">دهم</option>
                  <option value="یازدهم">یازدهم</option>
                  <option value="دوازدهم">دوازدهم</option>
                </Select>
                <Select
                  label="کلاس درس"
                  value={studentForm.classroomId}
                  onChange={(e) => setStudentForm({ ...studentForm, classroomId: e.target.value })}
                >
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="کد ملی (نام کاربری سامانه ورود یکپارچه) *"
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
                  placeholder="مثال: 12345678"
                  value={studentForm.studentNumber}
                  onChange={(e) => setStudentForm({ ...studentForm, studentNumber: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="تاریخ تولد (شمسی)"
                  placeholder="مثال: 1388/05/12"
                  value={studentForm.birthDate}
                  onChange={(e) => setStudentForm({ ...studentForm, birthDate: e.target.value })}
                />
                <Input
                  label="محل تولد"
                  placeholder="مثال: مشهد"
                  value={studentForm.birthPlace}
                  onChange={(e) => setStudentForm({ ...studentForm, birthPlace: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Input
                  label="سریال شناسنامه"
                  placeholder="مثال: 123456"
                  value={studentForm.certificateNumber}
                  onChange={(e) => setStudentForm({ ...studentForm, certificateNumber: e.target.value })}
                />
                <Input
                  label="سری حرفی"
                  placeholder="مثال: الف"
                  value={studentForm.certificateSeriesLetter}
                  onChange={(e) => setStudentForm({ ...studentForm, certificateSeriesLetter: e.target.value })}
                />
                <Input
                  label="سری عددی"
                  placeholder="مثال: 12"
                  value={studentForm.certificateSeriesNumber}
                  onChange={(e) => setStudentForm({ ...studentForm, certificateSeriesNumber: e.target.value })}
                />
                <Input
                  label="محل صدور"
                  placeholder="مثال: مشهد"
                  value={studentForm.issuePlace}
                  onChange={(e) => setStudentForm({ ...studentForm, issuePlace: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="وضعیت جسمانی و سلامت"
                  placeholder="مثال: سالم، دارای آلرژی، ..."
                  value={studentForm.physicalCondition}
                  onChange={(e) => setStudentForm({ ...studentForm, physicalCondition: e.target.value })}
                />
                <Input
                  label="شماره همراه اولیه (پیش‌فرض) *"
                  placeholder="مثال: 09123333333"
                  value={studentForm.phone}
                  onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                  required
                />
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
                      {studentForm.nationalCode ? studentForm.nationalCode : 'کد ملی دانش‌آموز'}
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
            </div>
          )}

          {studentModalTab === 'FATHER' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="نام و نام‌خانوادگی پدر"
                  placeholder="مثال: رضا حسینی"
                  value={studentForm.fatherFullName}
                  onChange={(e) => setStudentForm({ ...studentForm, fatherFullName: e.target.value })}
                />
                <Input
                  label="کد ملی پدر"
                  placeholder="مثال: 0041234567"
                  value={studentForm.fatherNationalId}
                  onChange={(e) => setStudentForm({ ...studentForm, fatherNationalId: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="تحصیلات پدر"
                  placeholder="مثال: کارشناسی ارشد"
                  value={studentForm.fatherEducation}
                  onChange={(e) => setStudentForm({ ...studentForm, fatherEducation: e.target.value })}
                />
                <Input
                  label="شغل پدر"
                  placeholder="مثال: مهندس مکانیک"
                  value={studentForm.fatherOccupation}
                  onChange={(e) => setStudentForm({ ...studentForm, fatherOccupation: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="شماره همراه پدر"
                  placeholder="مثال: 09151112233"
                  value={studentForm.fatherPhone}
                  onChange={(e) => setStudentForm({ ...studentForm, fatherPhone: e.target.value })}
                />
                <Input
                  label="آدرس محل کار پدر"
                  placeholder="مثال: مشهد، شهرک صنعتی طوس"
                  value={studentForm.fatherWorkAddress}
                  onChange={(e) => setStudentForm({ ...studentForm, fatherWorkAddress: e.target.value })}
                />
              </div>
            </div>
          )}

          {studentModalTab === 'MOTHER' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="نام و نام‌خانوادگی مادر"
                  placeholder="مثال: زهرا رضایی"
                  value={studentForm.motherFullName}
                  onChange={(e) => setStudentForm({ ...studentForm, motherFullName: e.target.value })}
                />
                <Input
                  label="کد ملی مادر"
                  placeholder="مثال: 0051234567"
                  value={studentForm.motherNationalId}
                  onChange={(e) => setStudentForm({ ...studentForm, motherNationalId: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="تحصیلات مادر"
                  placeholder="مثال: کارشناسی"
                  value={studentForm.motherEducation}
                  onChange={(e) => setStudentForm({ ...studentForm, motherEducation: e.target.value })}
                />
                <Input
                  label="شغل مادر"
                  placeholder="مثال: دبیر"
                  value={studentForm.motherOccupation}
                  onChange={(e) => setStudentForm({ ...studentForm, motherOccupation: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="شماره همراه مادر"
                  placeholder="مثال: 09154445566"
                  value={studentForm.motherPhone}
                  onChange={(e) => setStudentForm({ ...studentForm, motherPhone: e.target.value })}
                />
                <Input
                  label="آدرس محل کار مادر"
                  placeholder="مثال: مشهد، خیابان راهنمایی"
                  value={studentForm.motherWorkAddress}
                  onChange={(e) => setStudentForm({ ...studentForm, motherWorkAddress: e.target.value })}
                />
              </div>
            </div>
          )}

          {studentModalTab === 'CONTACT' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="شماره همراه خود دانش‌آموز"
                  placeholder="مثال: 09351234567"
                  value={studentForm.studentMobile}
                  onChange={(e) => setStudentForm({ ...studentForm, studentMobile: e.target.value })}
                />
                <Input
                  label="شماره تلفن ثابت منزل"
                  placeholder="مثال: 05137654321"
                  value={studentForm.landlinePhone}
                  onChange={(e) => setStudentForm({ ...studentForm, landlinePhone: e.target.value })}
                />
              </div>
              <Input
                label="آدرس محل سکونت"
                placeholder="مثال: مشهد، بلوار سجاد، خیابان بهار، پلاک ۱۲"
                value={studentForm.homeAddress}
                onChange={(e) => setStudentForm({ ...studentForm, homeAddress: e.target.value })}
              />
              <Input
                label="آدرس لینک یا مسیر عکس پرسنلی"
                placeholder="مثال: https://... یا نام فایل تصویر"
                value={studentForm.avatarUrl}
                onChange={(e) => setStudentForm({ ...studentForm, avatarUrl: e.target.value })}
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex gap-1.5">
              {studentModalTab !== 'IDENTITY' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (studentModalTab === 'CONTACT') setStudentModalTab('MOTHER');
                    else if (studentModalTab === 'MOTHER') setStudentModalTab('FATHER');
                    else if (studentModalTab === 'FATHER') setStudentModalTab('IDENTITY');
                  }}
                >
                  مرحله قبل
                </Button>
              )}
              {studentModalTab !== 'CONTACT' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (studentModalTab === 'IDENTITY') setStudentModalTab('FATHER');
                    else if (studentModalTab === 'FATHER') setStudentModalTab('MOTHER');
                    else if (studentModalTab === 'MOTHER') setStudentModalTab('CONTACT');
                  }}
                >
                  مرحله بعد
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsStudentModalOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                ثبت نهایی پرونده دانش‌آموز
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Dossier Modal: شناسنامه و پرونده کامل الکترونیکی دانش‌آموز */}
      {selectedStudentDossier && (
        <Modal
          isOpen={!!selectedStudentDossier}
          onClose={() => {
            setSelectedStudentDossier(null);
            setIsEditingDossier(false);
          }}
          title={`شناسنامه و پرونده تحصیلی: ${selectedStudentDossier.user?.firstName || ''} ${selectedStudentDossier.user?.lastName || ''}`}
          description={`شماره دانش‌آموزی: ${selectedStudentDossier.studentCode || selectedStudentDossier.studentNumber || '—'} | کد ملی: ${selectedStudentDossier.nationalCode || '—'}`}
          maxWidth="2xl"
        >
          {error && (
            <div className="mb-4 flex items-center space-x-2 space-x-reverse rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Dossier Header Summary Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-l from-primary/10 via-primary/5 to-transparent border border-primary/20 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-primary/30 bg-white dark:bg-[#151C28] flex items-center justify-center font-black text-xl text-primary shrink-0 shadow-sm">
                {selectedStudentDossier.user?.avatarUrl ? (
                  <img src={selectedStudentDossier.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  selectedStudentDossier.user?.firstName?.[0] || 'د'
                )}
              </div>
              <div>
                <h3 className="font-black text-base text-ink-darker dark:text-white flex items-center gap-2">
                  <span>{selectedStudentDossier.user?.firstName} {selectedStudentDossier.user?.lastName}</span>
                  <Badge variant="success" className="text-[10px]">ثبت‌نام رسمی</Badge>
                </h3>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap items-center gap-2 font-mono">
                  <span>کد ملی: <strong className="text-ink-dark dark:text-white">{selectedStudentDossier.nationalCode || '—'}</strong></span>
                  <span>•</span>
                  <span>کلاس: <strong className="text-primary">{selectedStudentDossier.enrollments?.[0]?.classroom?.name || 'کلاس عمومی'}</strong></span>
                  <span>•</span>
                  <span>پایه: <strong className="text-primary">{selectedStudentDossier.gradeLevel || 'دهم'}</strong></span>
                </div>
              </div>
            </div>

            <Button
              variant={isEditingDossier ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setIsEditingDossier(!isEditingDossier)}
              className="text-xs shrink-0 self-end sm:self-center"
            >
              <Edit3 className="w-3.5 h-3.5 ml-1" />
              <span>{isEditingDossier ? 'مشاهده شناسنامه' : 'ویرایش اطلاعات'}</span>
            </Button>
          </div>

          {/* Dossier Tabs */}
          <div className="flex items-center gap-1.5 p-1 mb-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setDossierTab('IDENTITY')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all ${
                dossierTab === 'IDENTITY'
                  ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs'
                  : 'text-gray-500 hover:text-ink-darker dark:hover:text-white'
              }`}
            >
              هویتی و شناسنامه‌ای
            </button>
            <button
              type="button"
              onClick={() => setDossierTab('FATHER')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all ${
                dossierTab === 'FATHER'
                  ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs'
                  : 'text-gray-500 hover:text-ink-darker dark:hover:text-white'
              }`}
            >
              مشخصات پدر
            </button>
            <button
              type="button"
              onClick={() => setDossierTab('MOTHER')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all ${
                dossierTab === 'MOTHER'
                  ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs'
                  : 'text-gray-500 hover:text-ink-darker dark:hover:text-white'
              }`}
            >
              مشخصات مادر
            </button>
            <button
              type="button"
              onClick={() => setDossierTab('CONTACT')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all ${
                dossierTab === 'CONTACT'
                  ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs'
                  : 'text-gray-500 hover:text-ink-darker dark:hover:text-white'
              }`}
            >
              سکونت و تماس
            </button>
          </div>

          {isEditingDossier ? (
            <form onSubmit={handleSaveDossier} className="space-y-4">
              {dossierTab === 'IDENTITY' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="نام دانش‌آموز"
                      value={dossierEditForm.firstName}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, firstName: e.target.value })}
                      required
                    />
                    <Input
                      label="نام خانوادگی"
                      value={dossierEditForm.lastName}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, lastName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      label="نام پدر"
                      value={dossierEditForm.fatherName}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, fatherName: e.target.value })}
                    />
                    <Select
                      label="پایه تحصیلی"
                      value={dossierEditForm.gradeLevel}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, gradeLevel: e.target.value })}
                    >
                      <option value="دهم">دهم</option>
                      <option value="یازدهم">یازدهم</option>
                      <option value="دوازدهم">دوازدهم</option>
                    </Select>
                    <Input
                      label="وضعیت جسمانی"
                      value={dossierEditForm.physicalCondition}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, physicalCondition: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="تاریخ تولد (شمسی)"
                      value={dossierEditForm.birthDate}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, birthDate: e.target.value })}
                    />
                    <Input
                      label="محل تولد"
                      value={dossierEditForm.birthPlace}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, birthPlace: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <Input
                      label="سریال شناسنامه"
                      value={dossierEditForm.certificateNumber}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, certificateNumber: e.target.value })}
                    />
                    <Input
                      label="سری حرفی"
                      value={dossierEditForm.certificateSeriesLetter}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, certificateSeriesLetter: e.target.value })}
                    />
                    <Input
                      label="سری عددی"
                      value={dossierEditForm.certificateSeriesNumber}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, certificateSeriesNumber: e.target.value })}
                    />
                    <Input
                      label="محل صدور"
                      value={dossierEditForm.issuePlace}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, issuePlace: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {dossierTab === 'FATHER' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="نام و نام‌خانوادگی پدر"
                      value={dossierEditForm.fatherFullName}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, fatherFullName: e.target.value })}
                    />
                    <Input
                      label="کد ملی پدر"
                      value={dossierEditForm.fatherNationalId}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, fatherNationalId: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="تحصیلات پدر"
                      value={dossierEditForm.fatherEducation}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, fatherEducation: e.target.value })}
                    />
                    <Input
                      label="شغل پدر"
                      value={dossierEditForm.fatherOccupation}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, fatherOccupation: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="شماره همراه پدر"
                      value={dossierEditForm.fatherPhone}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, fatherPhone: e.target.value })}
                    />
                    <Input
                      label="آدرس محل کار پدر"
                      value={dossierEditForm.fatherWorkAddress}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, fatherWorkAddress: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {dossierTab === 'MOTHER' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="نام و نام‌خانوادگی مادر"
                      value={dossierEditForm.motherFullName}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, motherFullName: e.target.value })}
                    />
                    <Input
                      label="کد ملی مادر"
                      value={dossierEditForm.motherNationalId}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, motherNationalId: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="تحصیلات مادر"
                      value={dossierEditForm.motherEducation}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, motherEducation: e.target.value })}
                    />
                    <Input
                      label="شغل مادر"
                      value={dossierEditForm.motherOccupation}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, motherOccupation: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="شماره همراه مادر"
                      value={dossierEditForm.motherPhone}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, motherPhone: e.target.value })}
                    />
                    <Input
                      label="آدرس محل کار مادر"
                      value={dossierEditForm.motherWorkAddress}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, motherWorkAddress: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {dossierTab === 'CONTACT' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="شماره همراه خود دانش‌آموز"
                      value={dossierEditForm.studentMobile}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, studentMobile: e.target.value })}
                    />
                    <Input
                      label="شماره ثابت منزل"
                      value={dossierEditForm.landlinePhone}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, landlinePhone: e.target.value })}
                    />
                  </div>
                  <Input
                    label="آدرس منزل"
                    value={dossierEditForm.homeAddress}
                    onChange={(e) => setDossierEditForm({ ...dossierEditForm, homeAddress: e.target.value })}
                  />
                  <Input
                    label="لینک عکس پرسنلی"
                    value={dossierEditForm.avatarUrl}
                    onChange={(e) => setDossierEditForm({ ...dossierEditForm, avatarUrl: e.target.value })}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <Button type="button" variant="ghost" onClick={() => setIsEditingDossier(false)}>
                  انصراف
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting}>
                  <Save className="w-3.5 h-3.5 ml-1" />
                  <span>ذخیره تغییرات پرونده</span>
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {dossierTab === 'IDENTITY' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">نام پدر:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.fatherName || selectedStudentDossier.fatherFullName || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">پایه تحصیلی:</span>
                    <strong className="text-sm text-primary">
                      {selectedStudentDossier.gradeLevel || 'دهم'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">تاریخ تولد:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.birthDate ? formatToJalali(selectedStudentDossier.birthDate) : '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">محل تولد:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.birthPlace || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">سریال و سری شناسنامه:</span>
                    <strong className="text-sm text-ink-darker dark:text-white font-mono">
                      {selectedStudentDossier.certificateNumber || '—'} {selectedStudentDossier.certificateSeriesLetter ? `(سری ${selectedStudentDossier.certificateSeriesLetter} / ${selectedStudentDossier.certificateSeriesNumber || ''})` : ''}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">محل صدور شناسنامه:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.issuePlace || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 sm:col-span-2">
                    <span className="text-gray-500 block mb-1">وضعیت جسمانی و سلامت:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.physicalCondition || selectedStudentDossier.medicalNotes || 'سالم'}
                    </strong>
                  </div>
                </div>
              )}

              {dossierTab === 'FATHER' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">نام و نام‌خانوادگی پدر:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.fatherFullName || selectedStudentDossier.fatherName || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">کد ملی پدر:</span>
                    <strong className="text-sm text-ink-darker dark:text-white font-mono">
                      {selectedStudentDossier.fatherNationalId || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">تحصیلات پدر:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.fatherEducation || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">شغل پدر:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.fatherOccupation || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">شماره همراه پدر:</span>
                    <strong className="text-sm text-primary font-mono" dir="ltr">
                      {selectedStudentDossier.fatherPhone || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">آدرس محل کار پدر:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.fatherWorkAddress || '—'}
                    </strong>
                  </div>
                </div>
              )}

              {dossierTab === 'MOTHER' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">نام و نام‌خانوادگی مادر:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.motherFullName || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">کد ملی مادر:</span>
                    <strong className="text-sm text-ink-darker dark:text-white font-mono">
                      {selectedStudentDossier.motherNationalId || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">تحصیلات مادر:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.motherEducation || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">شغل مادر:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.motherOccupation || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">شماره همراه مادر:</span>
                    <strong className="text-sm text-primary font-mono" dir="ltr">
                      {selectedStudentDossier.motherPhone || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">آدرس محل کار مادر:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.motherWorkAddress || '—'}
                    </strong>
                  </div>
                </div>
              )}

              {dossierTab === 'CONTACT' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">شماره همراه دانش‌آموز:</span>
                    <strong className="text-sm text-primary font-mono" dir="ltr">
                      {selectedStudentDossier.studentMobile || selectedStudentDossier.user?.phone || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">شماره تلفن ثابت:</span>
                    <strong className="text-sm text-ink-darker dark:text-white font-mono" dir="ltr">
                      {selectedStudentDossier.landlinePhone || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 sm:col-span-2">
                    <span className="text-gray-500 block mb-1">آدرس محل سکونت:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.homeAddress || selectedStudentDossier.address || '—'}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSelectedStudentDossier(null);
                setIsEditingDossier(false);
              }}
            >
              بستن پرونده
            </Button>
          </div>
        </Modal>
      )}

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
              label="شماره تماس *"
              placeholder="مثال: 09122222222"
              value={teacherForm.phone}
              onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="مدرک تحصیلی"
              placeholder="مثال: کارشناسی ارشد"
              value={teacherForm.degree}
              onChange={(e) => setTeacherForm({ ...teacherForm, degree: e.target.value })}
            />
            <Input
              label="رشته تحصیلی"
              placeholder="مثال: آموزش ریاضی / مهندسی کامپیوتر"
              value={teacherForm.studyField}
              onChange={(e) => setTeacherForm({ ...teacherForm, studyField: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="شماره تلفن ثابت"
              placeholder="مثال: 05137654321"
              value={teacherForm.landlinePhone}
              onChange={(e) => setTeacherForm({ ...teacherForm, landlinePhone: e.target.value })}
            />
            <Input
              label="آدرس محل سکونت"
              placeholder="مثال: مشهد، بلوار سجاد، خیابان بهار، پلاک ۱۲"
              value={teacherForm.homeAddress}
              onChange={(e) => setTeacherForm({ ...teacherForm, homeAddress: e.target.value })}
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
              <span>سامانه ورود یکپارچه رکاد در اکسل:</span>
            </div>
            <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
              با بارگذاری فایل اکسل، اطلاعات ورود برای تک‌تک دانش‌آموزان به صورت کاملاً خودکار تولید می‌گردد:
              <br />
              • <strong>نام کاربری:</strong> کد ملی ۱۰ رقمی دانش‌آموز
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

      {/* Password Reveal Modal */}
      <PasswordRevealModal
        isOpen={!!vaultTarget}
        onClose={() => setVaultTarget(null)}
        targetMember={vaultTarget}
      />
    </div>
  );
};
