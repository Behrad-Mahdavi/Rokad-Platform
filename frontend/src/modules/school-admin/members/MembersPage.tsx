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
import {
  Users,
  GraduationCap,
  Briefcase,
  Plus,
  Search,
  UserPlus,
  Shield,
} from 'lucide-react';

export const MembersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'STUDENTS' | 'TEACHERS'>('STUDENTS');
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);

  // Forms
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [studentForm, setStudentForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    nationalCode: '',
    studentNumber: '',
    classroomId: '',
    password: 'StudentPass2026!',
  });

  const [teacherForm, setTeacherForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    personnelCode: '',
    specialization: '',
    password: 'TeacherPass2026!',
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [studentsRes, teachersRes, classesRes] = await Promise.all([
        apiClient.get('/members/students'),
        apiClient.get('/members/teachers'),
        apiClient.get('/classes/classrooms'),
      ]);
      setStudents(studentsRes.data || []);
      setTeachers(teachersRes.data || []);
      setClassrooms(classesRes.data || []);
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
      await apiClient.post('/members/students', studentForm);
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
      setError(err.message || 'خطا در ثبت‌نام دانش‌آموز.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/members/teachers', teacherForm);
      setIsTeacherModalOpen(false);
      setTeacherForm({
        firstName: '',
        lastName: '',
        phone: '',
        personnelCode: '',
        specialization: '',
        password: 'TeacherPass2026!',
      });
      fetchData();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت دبیر جدید.');
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
            <Users className="h-6 w-6 text-primary" />
            <span>مدیریت اعضا و ثبت‌نام دانش‌آموزان و کادر (Members)</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            ثبت پرونده تحصیلی، اطلاعات اولیاء، تخصیص نقش‌های پرسنل و پرونده‌های الکترونیکی
          </p>
        </div>

        <div className="flex gap-2">
          {activeTab === 'STUDENTS' && (
            <Button variant="primary" onClick={() => setIsStudentModalOpen(true)}>
              <UserPlus className="h-4 w-4 ml-1" />
              <span>ثبت‌نام دانش‌آموز جدید</span>
            </Button>
          )}
          {activeTab === 'TEACHERS' && (
            <Button variant="primary" onClick={() => setIsTeacherModalOpen(true)}>
              <Plus className="h-4 w-4 ml-1" />
              <span>ثبت دبیر یا پرسنل جدید</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 space-x-reverse border-b border-gray-200">
        <button
          onClick={() => setActiveTab('STUDENTS')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 space-x-reverse ${
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
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 space-x-reverse ${
            activeTab === 'TEACHERS'
              ? 'border-primary text-primary-dark'
              : 'border-transparent text-gray-500 hover:text-ink-dark'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          <span>دبیران و کادر آموزشی ({teachers.length})</span>
        </button>
      </div>

      {/* Tab 1: Students Table */}
      {activeTab === 'STUDENTS' && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>نام و نام خانوادگی</TableHead>
              <TableHead>شماره دانش‌آموزی</TableHead>
              <TableHead>کد ملی</TableHead>
              <TableHead>کلاس درس</TableHead>
              <TableHead>شماره تماس</TableHead>
              <TableHead>وضعیت پرونده</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                </TableRow>
              ))
            ) : students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  هنوز دانش‌آموزی ثبت‌نام نشده است.
                </TableCell>
              </TableRow>
            ) : (
              students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-bold text-ink-darker">
                      {s.user?.firstName} {s.user?.lastName}
                    </div>
                  </TableCell>
                  <TableCell><span className="font-mono text-xs font-bold">{s.studentNumber}</span></TableCell>
                  <TableCell><span className="font-mono text-xs text-gray-600">{s.nationalCode}</span></TableCell>
                  <TableCell>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-medium">
                      {s.classroom?.name || 'کلاس ۱۰۱'}
                    </span>
                  </TableCell>
                  <TableCell><span className="font-mono text-xs text-gray-600">{s.user?.phone || '—'}</span></TableCell>
                  <TableCell><Badge variant="success">ثبت‌نام قطعی</Badge></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {/* Tab 2: Teachers Table */}
      {activeTab === 'TEACHERS' && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>نام دبیر / پرسنل</TableHead>
              <TableHead>کد پرسنلی</TableHead>
              <TableHead>تخصص / رشته تدریس</TableHead>
              <TableHead>شماره تماس</TableHead>
              <TableHead>وضعیت قرارداد</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                </TableRow>
              ))
            ) : teachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  هنوز دبیری ثبت نشده است.
                </TableCell>
              </TableRow>
            ) : (
              teachers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="font-bold text-ink-darker">
                      {t.user?.firstName} {t.user?.lastName}
                    </div>
                  </TableCell>
                  <TableCell><span className="font-mono text-xs font-bold">{t.personnelCode}</span></TableCell>
                  <TableCell><span className="text-xs text-gray-700">{t.specialization || 'عمومی'}</span></TableCell>
                  <TableCell><span className="font-mono text-xs text-gray-600">{t.user?.phone || '—'}</span></TableCell>
                  <TableCell><Badge variant="male">دبیر فعال</Badge></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {/* 1. Modal: Enroll Student */}
      <Modal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        title="ثبت‌نام دانش‌آموز جدید"
        description="ایجاد حساب کاربری، پرونده تحصیلی و انتساب به کلاس"
        maxWidth="lg"
      >
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleEnrollStudent} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="کد ملی (۱۰ رقم)"
              placeholder="مثال: 0012345678"
              value={studentForm.nationalCode}
              onChange={(e) => setStudentForm({ ...studentForm, nationalCode: e.target.value })}
              required
            />
            <Input
              label="شماره دانش‌آموزی"
              placeholder="مثال: STU-1404-001"
              value={studentForm.studentNumber}
              onChange={(e) => setStudentForm({ ...studentForm, studentNumber: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="شماره تماس (نام کاربری ورود)"
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
        onClose={() => setIsTeacherModalOpen(false)}
        title="ثبت دبیر یا پرسنل جدید"
        description="ایجاد حساب کاربری آموزشی و ثبت کد پرسنلی"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateTeacher} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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

          <Input
            label="شماره تماس"
            placeholder="مثال: 09122222222"
            value={teacherForm.phone}
            onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
            required
          />

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
    </div>
  );
};
