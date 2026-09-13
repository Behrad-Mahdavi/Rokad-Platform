import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../../components/ui/Table';
import { StickyActionBar } from '../../../components/ui/StickyActionBar';
import { PersianDatePicker } from '../../../components/ui/PersianDatePicker';
import {
  gregorianToJalaliStr,
  jalaliToGregorianDate,
} from '../../../utils/jalali';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  Save,
  Users,
  AlertCircle,
  Award,
  ShieldAlert,
  Sparkles,
  Plus,
  TrendingUp,
  BarChart3,
  UserCheck,
  UserX,
  Smile,
  Frown,
  Send,
  X,
  FileCheck,
  GraduationCap,
} from 'lucide-react';

interface NormalizedStudent {
  id: string;
  studentCode?: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

interface AttendanceState {
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED_ABSENT' | 'TARDY';
  delayMinutes: number;
  note: string;
}

interface OralGradeState {
  score: string | number;
  description: string;
}

interface MatterModalState {
  isOpen: boolean;
  student: NormalizedStudent | null;
  type: 'POSITIVE' | 'NEGATIVE';
  title: string;
  description: string;
  points: number;
  actionTaken: string;
  notifiedParents: boolean;
}

export const GradebookPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const classroomIdParam = searchParams.get('classroomId');

  // Tabs: 'SESSION' (active logbook cockpit) | 'MATRIX' (all grades overview)
  const [activeTab, setActiveTab] = useState<'SESSION' | 'MATRIX'>('SESSION');

  // Selectors
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [date, setDate] = useState<string>(gregorianToJalaliStr(new Date()));
  const [periodNumber, setPeriodNumber] = useState<number>(1);
  const [sessionTopic, setSessionTopic] = useState<string>('');

  // Data
  const [students, setStudents] = useState<NormalizedStudent[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceState>>({});
  const [gradesMap, setGradesMap] = useState<Record<string, OralGradeState>>({});
  const [studentMattersCount, setStudentMattersCount] = useState<
    Record<string, { positive: number; negative: number }>
  >({});
  const [matrixData, setMatrixData] = useState<any>(null);

  // States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Matter Modal
  const [matterModal, setMatterModal] = useState<MatterModalState>({
    isOpen: false,
    student: null,
    type: 'POSITIVE',
    title: '',
    description: '',
    points: 2,
    actionTaken: '',
    notifiedParents: false,
  });
  const [isSubmittingMatter, setIsSubmittingMatter] = useState<boolean>(false);

  // 1. Fetch classrooms & lessons on mount
  useEffect(() => {
    const fetchInitialMeta = async () => {
      try {
        setIsLoading(true);
        const [classesRes, lessonsRes] = await Promise.all([
          apiClient.get('/classes/classrooms'),
          apiClient.get('/classes/lessons').catch(() => ({ data: [] })),
        ]);

        const classList = classesRes.data || [];
        setClassrooms(classList);

        const lessonList = lessonsRes.data || [];
        setLessons(lessonList);
        if (lessonList.length > 0) {
          setSelectedLessonId(lessonList[0].id);
        }

        if (classroomIdParam && classList.some((c: any) => c.id === classroomIdParam)) {
          setSelectedClassId(classroomIdParam);
        } else if (classList.length > 0) {
          setSelectedClassId(classList[0].id);
        }
      } catch (err) {
        console.error('Failed to load initial logbook metadata', err);
        setErrorMessage('خطا در دریافت اطلاعات کلاس‌ها و دروس');
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialMeta();
  }, [classroomIdParam]);

  // 2. Fetch students, attendance, grades, and matters when classroom, date, or lesson changes
  useEffect(() => {
    if (!selectedClassId) return;

    const fetchSessionData = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const gregorianDate = jalaliToGregorianDate(date);
        const dateStr = gregorianDate.toISOString().split('T')[0];

        const [studentsRes, attendanceRes, gradebookRes, mattersRes] = await Promise.all([
          apiClient.get(`/classes/classrooms/${selectedClassId}/students`),
          apiClient
            .get(`/attendance/classroom/${selectedClassId}?date=${dateStr}`)
            .catch(() => ({ data: [] })),
          apiClient
            .get(`/gradebook/classroom/${selectedClassId}${selectedLessonId ? `?lessonId=${selectedLessonId}` : ''}`)
            .catch(() => ({ data: null })),
          apiClient
            .get('/matters')
            .catch(() => ({ data: [] })),
        ]);

        // Normalize students
        const rawStudents = studentsRes.data || [];
        const normalized: NormalizedStudent[] = rawStudents.map((item: any) => {
          if (item.student) {
            return {
              id: item.student.id,
              studentCode: item.student.studentCode || item.student.studentNumber,
              firstName: item.student.user?.firstName || '',
              lastName: item.student.user?.lastName || '',
              avatarUrl: item.student.user?.avatarUrl,
            };
          }
          return {
            id: item.id,
            studentCode: item.studentCode || item.studentNumber,
            firstName: item.user?.firstName || item.firstName || '',
            lastName: item.user?.lastName || item.lastName || '',
            avatarUrl: item.user?.avatarUrl || item.avatarUrl,
          };
        });
        setStudents(normalized);

        // Map attendance
        const rawAttendance = attendanceRes.data || [];
        const attMap: Record<string, AttendanceState> = {};
        normalized.forEach((s) => {
          const rec = rawAttendance.find((a: any) => a.studentId === s.id);
          if (rec) {
            attMap[s.id] = {
              status: rec.status,
              delayMinutes: rec.delayMinutes || 0,
              note: rec.reason || '',
            };
          } else {
            attMap[s.id] = {
              status: 'PRESENT',
              delayMinutes: 0,
              note: '',
            };
          }
        });
        setAttendanceMap(attMap);

        // Map oral questioning grades recorded for this date
        const gMap: Record<string, OralGradeState> = {};
        if (gradebookRes?.data?.grades) {
          setMatrixData(gradebookRes.data);
          const classGrades = gradebookRes.data.grades;
          normalized.forEach((s) => {
            const todayGrade = classGrades.find((g: any) => {
              if (g.studentId !== s.id) return false;
              if (selectedLessonId && g.lessonId && g.lessonId !== selectedLessonId) return false;
              const gDate = new Date(g.date).toISOString().split('T')[0];
              return gDate === dateStr;
            });

            if (todayGrade) {
              gMap[s.id] = {
                score: todayGrade.score,
                description: todayGrade.description || todayGrade.title || '',
              };
            } else {
              gMap[s.id] = { score: '', description: '' };
            }
          });
        } else {
          normalized.forEach((s) => {
            gMap[s.id] = { score: '', description: '' };
          });
        }
        setGradesMap(gMap);

        // Map matters count
        const rawMatters = mattersRes.data || [];
        const mCount: Record<string, { positive: number; negative: number }> = {};
        normalized.forEach((s) => {
          const sMatters = rawMatters.filter((m: any) => m.studentId === s.id);
          mCount[s.id] = {
            positive: sMatters.filter((m: any) => m.type === 'POSITIVE').length,
            negative: sMatters.filter((m: any) => m.type === 'NEGATIVE').length,
          };
        });
        setStudentMattersCount(mCount);
      } catch (err) {
        console.error('Failed to load session data', err);
        setErrorMessage('خطا در بارگذاری اطلاعات جلسه دفتر کلاسی');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessionData();
  }, [selectedClassId, date, selectedLessonId]);

  // Quick Attendance Status Setter
  const setAttendanceStatus = (
    studentId: string,
    status: 'PRESENT' | 'ABSENT' | 'EXCUSED_ABSENT' | 'TARDY'
  ) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
        delayMinutes: status === 'TARDY' ? (prev[studentId]?.delayMinutes || 10) : 0,
      },
    }));
  };

  const setDelayMinutes = (studentId: string, minutes: number) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        delayMinutes: minutes,
      },
    }));
  };

  const setAttendanceNote = (studentId: string, note: string) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        note,
      },
    }));
  };

  // Grade Setter
  const setOralScore = (studentId: string, score: string | number) => {
    setGradesMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        score,
      },
    }));
  };

  const setOralDescription = (studentId: string, description: string) => {
    setGradesMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        description,
      },
    }));
  };

  // Mark all present
  const markAllPresent = () => {
    const map: Record<string, AttendanceState> = {};
    students.forEach((s) => {
      map[s.id] = {
        status: 'PRESENT',
        delayMinutes: 0,
        note: attendanceMap[s.id]?.note || '',
      };
    });
    setAttendanceMap(map);
  };

  // Save the entire classroom logbook session
  const handleSaveSession = async () => {
    if (!selectedClassId) {
      setErrorMessage('لطفاً ابتدا یک کلاس درس انتخاب نمایید.');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(null);
    setErrorMessage(null);

    try {
      const gregorianDate = jalaliToGregorianDate(date);
      const dateStr = gregorianDate.toISOString().split('T')[0];

      // 1. Save Attendance
      const attendancePayload = {
        classroomId: selectedClassId,
        date: dateStr,
        periodNumber: Number(periodNumber) || 1,
        attendances: students.map((s) => ({
          studentId: s.id,
          status: attendanceMap[s.id]?.status || 'PRESENT',
          delayMinutes: attendanceMap[s.id]?.status === 'TARDY' ? Number(attendanceMap[s.id]?.delayMinutes) || 0 : 0,
          reason: attendanceMap[s.id]?.note || undefined,
        })),
      };

      await apiClient.post('/attendance/students/bulk', attendancePayload);

      // 2. Save Oral Question / Class Activity Grades if any entered
      const gradedStudents = students.filter(
        (s) =>
          gradesMap[s.id]?.score !== '' &&
          gradesMap[s.id]?.score !== undefined &&
          gradesMap[s.id]?.score !== null
      );

      let gradeMessage = '';
      if (gradedStudents.length > 0 && selectedLessonId) {
        const gradePayload = {
          classroomId: selectedClassId,
          lessonId: selectedLessonId,
          gradeType: 'CLASS_ACTIVITY',
          title: sessionTopic.trim() || 'پرسش کلاسی و فعالیت جلسه',
          date: dateStr,
          maxScore: 20,
          grades: gradedStudents.map((s) => ({
            studentId: s.id,
            score: Number(gradesMap[s.id]?.score),
            description: gradesMap[s.id]?.description || undefined,
          })),
        };

        const res = await apiClient.post('/gradebook/bulk', gradePayload);
        gradeMessage = ` و نمرات پرسش کلاسی ${gradedStudents.length} هنرجو در لیست نمرات و کارنامه ثبت گردید`;
      }

      setSaveSuccess(
        `دفتر کلاسی این جلسه با موفقیت ذخیره شد (حضور و غیاب برای تمام هنرجویان${gradeMessage}).`
      );
      setTimeout(() => setSaveSuccess(null), 5000);

      // Refresh matrix data
      if (selectedLessonId) {
        const matrixRes = await apiClient.get(
          `/gradebook/classroom/${selectedClassId}?lessonId=${selectedLessonId}`
        ).catch(() => null);
        if (matrixRes?.data) setMatrixData(matrixRes.data);
      }
    } catch (err: any) {
      console.error('Failed to save logbook session', err);
      setErrorMessage(
        err.response?.data?.message || 'خطا در ذخیره اطلاعات دفتر کلاسی. لطفاً مجدداً تلاش نمایید.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Open Quick Matter Modal for student
  const openMatterModal = (
    student: NormalizedStudent,
    type: 'POSITIVE' | 'NEGATIVE',
    defaultTitle: string = ''
  ) => {
    setMatterModal({
      isOpen: true,
      student,
      type,
      title: defaultTitle,
      description: '',
      points: type === 'POSITIVE' ? 2 : 1,
      actionTaken: type === 'POSITIVE' ? 'ثبت تشویق در دفتر کلاسی' : 'تذکر کلاسی',
      notifiedParents: false,
    });
  };

  // Submit Matter
  const handleSubmitMatter = async () => {
    if (!matterModal.student || !matterModal.title.trim()) {
      alert('لطفاً عنوان مورد انضباطی یا تشویقی را مشخص فرمایید.');
      return;
    }

    setIsSubmittingMatter(true);
    try {
      await apiClient.post('/matters', {
        studentId: matterModal.student.id,
        type: matterModal.type,
        title: matterModal.title.trim(),
        description: matterModal.description.trim() || undefined,
        points: Number(matterModal.points) || 1,
        actionTaken: matterModal.actionTaken.trim() || undefined,
        notifiedParents: matterModal.notifiedParents,
      });

      // Update local count
      const sId = matterModal.student.id;
      setStudentMattersCount((prev) => ({
        ...prev,
        [sId]: {
          positive: prev[sId]?.positive + (matterModal.type === 'POSITIVE' ? 1 : 0),
          negative: prev[sId]?.negative + (matterModal.type === 'NEGATIVE' ? 1 : 0),
        },
      }));

      setSaveSuccess(
        `مورد ${matterModal.type === 'POSITIVE' ? 'تشویقی' : 'انضباطی'} برای ${matterModal.student.firstName} ${matterModal.student.lastName} با موفقیت ثبت شد.`
      );
      setTimeout(() => setSaveSuccess(null), 4000);
      setMatterModal((prev) => ({ ...prev, isOpen: false }));
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطا در ثبت مورد انضباطی یا تشویقی');
    } finally {
      setIsSubmittingMatter(false);
    }
  };

  // Stats calculation
  const presentCount = students.filter(
    (s) => (attendanceMap[s.id]?.status || 'PRESENT') === 'PRESENT'
  ).length;
  const excusedCount = students.filter(
    (s) => attendanceMap[s.id]?.status === 'EXCUSED_ABSENT'
  ).length;
  const absentCount = students.filter(
    (s) => attendanceMap[s.id]?.status === 'ABSENT'
  ).length;
  const tardyCount = students.filter(
    (s) => attendanceMap[s.id]?.status === 'TARDY'
  ).length;
  const oralGradedCount = students.filter(
    (s) => gradesMap[s.id]?.score !== '' && gradesMap[s.id]?.score !== undefined
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-ink-darker">
                دفتر کلاسی الکترونیکی (Classroom Cockpit)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                مدیریت یکپارچه هر جلسه: ثبت حضور و غیاب، نمرات پرسش کلاسی و ارزشیابی مستمر، و موارد انضباطی و تشویقی
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="bg-gray-100 p-1 rounded-xl flex items-center text-xs font-bold">
            <button
              onClick={() => setActiveTab('SESSION')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'SESSION'
                  ? 'bg-white text-primary shadow-xs font-black'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              دفتر کلاسی این جلسه
            </button>
            <button
              onClick={() => setActiveTab('MATRIX')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'MATRIX'
                  ? 'bg-white text-primary shadow-xs font-black'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ماتریس و ریز نمرات کلاس
            </button>
          </div>

          <Button
            variant="primary"
            onClick={handleSaveSession}
            isLoading={isSaving}
            disabled={isLoading || students.length === 0}
            className="flex items-center space-x-1.5 space-x-reverse text-xs font-bold"
          >
            <Save className="h-4 w-4" />
            <span>ذخیره دفتر کلاسی</span>
          </Button>
        </div>
      </div>

      {/* Session Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Classroom Selector */}
          <div className="flex items-center space-x-2 space-x-reverse">
            <label className="text-xs font-bold text-ink-dark shrink-0">کلاس:</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="h-10 text-xs px-3 rounded-lg border border-gray-300 bg-white font-medium focus:ring-2 focus:ring-primary outline-none"
            >
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.code ? `(${c.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Lesson Selector */}
          <div className="flex items-center space-x-2 space-x-reverse">
            <label className="text-xs font-bold text-ink-dark shrink-0">درس:</label>
            <select
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              className="h-10 text-xs px-3 rounded-lg border border-gray-300 bg-white font-medium focus:ring-2 focus:ring-primary outline-none max-w-[200px]"
            >
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Jalali Date Picker */}
          <div className="flex items-center space-x-2 space-x-reverse min-w-[200px]">
            <label className="text-xs font-bold text-ink-dark shrink-0">تاریخ:</label>
            <PersianDatePicker value={date} onChange={setDate} />
          </div>

          {/* Period Number */}
          <div className="flex items-center space-x-2 space-x-reverse">
            <label className="text-xs font-bold text-ink-dark shrink-0">زنگ:</label>
            <select
              value={periodNumber}
              onChange={(e) => setPeriodNumber(Number(e.target.value))}
              className="h-10 text-xs px-3 rounded-lg border border-gray-300 bg-white font-medium focus:ring-2 focus:ring-primary outline-none"
            >
              <option value={1}>زنگ ۱ (۰۸:۰۰ - ۰۹:۳۰)</option>
              <option value={2}>زنگ ۲ (۰۹:۴۵ - ۱۱:۱۵)</option>
              <option value={3}>زنگ ۳ (۱۱:۳۰ - ۱۳:۰۰)</option>
              <option value={4}>زنگ ۴ (۱۳:۱۵ - ۱۴:۴۵)</option>
            </select>
          </div>
        </div>

        {/* Session Topic Input & Quick Button */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <input
            type="text"
            placeholder="مبحث یا طرح درس جلسه امروز..."
            value={sessionTopic}
            onChange={(e) => setSessionTopic(e.target.value)}
            className="h-10 text-xs px-3 rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary outline-none w-full lg:w-64"
          />

          <Button
            variant="secondary"
            size="sm"
            onClick={markAllPresent}
            disabled={isLoading || students.length === 0}
            className="text-xs font-semibold shrink-0"
          >
            حاضر زدن همه
          </Button>
        </div>
      </div>

      {/* Stats Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-500 font-medium">کل هنرجویان</span>
            <div className="text-lg font-black text-ink-darker mt-0.5">{students.length}</div>
          </div>
          <Users className="w-5 h-5 text-gray-400" />
        </div>

        <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-emerald-800 font-medium">حاضرین</span>
            <div className="text-lg font-black text-emerald-700 mt-0.5">{presentCount}</div>
          </div>
          <UserCheck className="w-5 h-5 text-emerald-600" />
        </div>

        <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-rose-800 font-medium">غائبین (غیرموجه/موجه)</span>
            <div className="text-lg font-black text-rose-700 mt-0.5">{absentCount + excusedCount}</div>
          </div>
          <UserX className="w-5 h-5 text-rose-600" />
        </div>

        <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-blue-800 font-medium">تأخیر ورود</span>
            <div className="text-lg font-black text-blue-700 mt-0.5">{tardyCount}</div>
          </div>
          <Clock className="w-5 h-5 text-blue-600" />
        </div>

        <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-amber-800 font-medium">پرسش کلاسی امروز</span>
            <div className="text-lg font-black text-amber-700 mt-0.5">{oralGradedCount} نفر</div>
          </div>
          <Sparkles className="w-5 h-5 text-amber-600" />
        </div>
      </div>

      {/* Feedback Messages */}
      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center space-x-2 space-x-reverse text-xs font-medium animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 flex items-center space-x-2 space-x-reverse text-xs font-medium animate-in fade-in">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ACTIVE LOGBOOK COCKPIT VIEW */}
      {activeTab === 'SESSION' && (
        <div className="space-y-4">
          {/* 1. MOBILE CARD LIST (< md) */}
          <div className="md:hidden space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-full rounded-xl" />
                  <Skeleton className="h-9 w-full rounded-xl" />
                </div>
              ))
            ) : students.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 text-gray-400">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <span className="text-xs font-bold">هیچ دانش‌آموزی در این کلاس یافت نشد.</span>
              </div>
            ) : (
              students.map((student, idx) => {
                const currentAtt = attendanceMap[student.id] || {
                  status: 'PRESENT',
                  delayMinutes: 0,
                  note: '',
                };
                const currentGrade = gradesMap[student.id] || { score: '', description: '' };
                const matters = studentMattersCount[student.id] || { positive: 0, negative: 0 };

                return (
                  <div
                    key={student.id}
                    className="p-4 bg-white rounded-2xl border border-gray-200/90 shadow-xs space-y-3.5"
                  >
                    {/* Student Info Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {student.avatarUrl ? (
                          <img
                            src={student.avatarUrl}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
                            {student.firstName?.[0] || 'ه'}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-sm text-ink-darker">
                            {student.firstName} {student.lastName}
                          </div>
                          <div className="font-mono text-[11px] text-gray-400">
                            کد: {student.studentCode || '—'}
                          </div>
                        </div>
                      </div>

                      {/* Matters Counter Badge */}
                      {(matters.positive > 0 || matters.negative > 0) && (
                        <div className="flex items-center gap-1 text-[11px] font-bold">
                          {matters.positive > 0 && (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              +{matters.positive}
                            </span>
                          )}
                          {matters.negative > 0 && (
                            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              -{matters.negative}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Attendance Large Touch Buttons */}
                    <div>
                      <div className="text-[11px] font-bold text-gray-500 mb-1.5">وضعیت حضور:</div>
                      <div className="grid grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAttendanceStatus(student.id, 'PRESENT')}
                          className={`min-h-[44px] text-xs font-bold rounded-xl transition-all flex items-center justify-center ${
                            currentAtt.status === 'PRESENT'
                              ? 'bg-emerald-600 text-white shadow-xs font-black'
                              : 'bg-gray-100 text-gray-600 hover:bg-emerald-50'
                          }`}
                        >
                          حاضر
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttendanceStatus(student.id, 'ABSENT')}
                          className={`min-h-[44px] text-xs font-bold rounded-xl transition-all flex items-center justify-center ${
                            currentAtt.status === 'ABSENT'
                              ? 'bg-rose-600 text-white shadow-xs font-black'
                              : 'bg-gray-100 text-gray-600 hover:bg-rose-50'
                          }`}
                        >
                          غایب
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttendanceStatus(student.id, 'EXCUSED_ABSENT')}
                          className={`min-h-[44px] text-xs font-bold rounded-xl transition-all flex items-center justify-center ${
                            currentAtt.status === 'EXCUSED_ABSENT'
                              ? 'bg-amber-600 text-white shadow-xs font-black'
                              : 'bg-gray-100 text-gray-600 hover:bg-amber-50'
                          }`}
                        >
                          موجه
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttendanceStatus(student.id, 'TARDY')}
                          className={`min-h-[44px] text-xs font-bold rounded-xl transition-all flex items-center justify-center ${
                            currentAtt.status === 'TARDY'
                              ? 'bg-blue-600 text-white shadow-xs font-black'
                              : 'bg-gray-100 text-gray-600 hover:bg-blue-50'
                          }`}
                        >
                          تأخیر
                        </button>
                      </div>

                      {/* Tardy minutes selector */}
                      {currentAtt.status === 'TARDY' && (
                        <div className="mt-2 p-2 bg-blue-50/80 rounded-xl border border-blue-200 flex items-center justify-between text-xs text-blue-900">
                          <span>دقایق تأخیر ورود:</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              max="90"
                              value={currentAtt.delayMinutes || 10}
                              onChange={(e) => setDelayMinutes(student.id, Number(e.target.value))}
                              className="w-16 h-8 text-center text-xs font-bold border border-blue-300 rounded-lg bg-white outline-none"
                            />
                            <span className="text-[11px]">دقیقه</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Oral Question Score Field */}
                    <div className="pt-2 border-t border-gray-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-600">نمره پرسش کلاسی (از ۲۰):</span>
                        <div className="flex items-center gap-1">
                          {[20, 18, 15, 12].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setOralScore(student.id, val)}
                              className="min-h-[32px] px-2 text-[11px] font-bold rounded-lg bg-gray-100 hover:bg-amber-100 hover:text-amber-800 text-gray-700 transition-colors"
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          max="20"
                          placeholder="نمره (اختیاری)"
                          value={currentGrade.score}
                          onChange={(e) => setOralScore(student.id, e.target.value)}
                          className={`w-28 h-10 text-center text-xs font-black rounded-xl border outline-none ${
                            currentGrade.score !== ''
                              ? 'bg-amber-50 border-amber-300 text-amber-900 ring-2 ring-amber-400'
                              : 'bg-gray-50 border-gray-300'
                          }`}
                        />
                        <input
                          type="text"
                          placeholder="مبحث / توضیح پرسش..."
                          value={currentGrade.description}
                          onChange={(e) => setOralDescription(student.id, e.target.value)}
                          className="flex-1 h-10 text-xs px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none"
                        />
                      </div>
                    </div>

                    {/* Disciplinary & Commendation Actions */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openMatterModal(student, 'POSITIVE', 'پاسخگویی عالی به پرسش کلاسی')
                        }
                        className="flex-1 min-h-[40px] text-xs font-bold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Smile className="w-4 h-4 text-emerald-600" />
                        <span>+ تشویق</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          openMatterModal(student, 'NEGATIVE', 'تذکر کلاسی و عدم تمرکز')
                        }
                        className="flex-1 min-h-[40px] text-xs font-bold rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Frown className="w-4 h-4 text-rose-600" />
                        <span>- تذکر</span>
                      </button>
                    </div>

                    {/* Student Note */}
                    <input
                      type="text"
                      placeholder="یادداشت جلسه برای این هنرجو..."
                      value={currentAtt.note}
                      onChange={(e) => setAttendanceNote(student.id, e.target.value)}
                      className="w-full h-9 text-xs px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none text-gray-700"
                    />
                  </div>
                );
              })
            )}
          </div>

          {/* 2. DESKTOP MATRIX TABLE (>= md) */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80">
                  <TableHead className="w-12 text-center font-bold">#</TableHead>
                  <TableHead className="w-52">مشخصات هنرجو</TableHead>
                  <TableHead className="text-center w-72">حضور و غیاب جلسه</TableHead>
                  <TableHead className="w-64 text-center">نمره پرسش کلاسی (از ۲۰)</TableHead>
                  <TableHead className="text-center w-56">موارد انضباطی و تشویقی</TableHead>
                  <TableHead>یادداشت جلسه دبیر</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-6 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-64 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-44 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-40 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    </TableRow>
                  ))
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="w-8 h-8 text-gray-300" />
                        <span>هیچ دانش‌آموزی در این کلاس ثبت‌نام نشده است.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student, idx) => {
                    const currentAtt = attendanceMap[student.id] || {
                      status: 'PRESENT',
                      delayMinutes: 0,
                      note: '',
                    };
                    const currentGrade = gradesMap[student.id] || { score: '', description: '' };
                    const matters = studentMattersCount[student.id] || { positive: 0, negative: 0 };

                    return (
                      <TableRow key={student.id} className="hover:bg-gray-50/50 transition-colors">
                        {/* 1. Index */}
                        <TableCell className="text-center font-mono text-xs text-gray-400">
                          {idx + 1}
                        </TableCell>

                        {/* 2. Student Info */}
                        <TableCell>
                          <div className="flex items-center space-x-2.5 space-x-reverse">
                            {student.avatarUrl ? (
                              <img
                                src={student.avatarUrl}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover border border-gray-200"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                                {student.firstName?.[0] || 'ه'}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-ink-darker text-xs">
                                {student.firstName} {student.lastName}
                              </div>
                              <div className="font-mono text-[10px] text-gray-400">
                                {student.studentCode || 'کد ندارد'}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* 3. Attendance Buttons */}
                        <TableCell className="text-center">
                          <div className="inline-flex items-center p-1 bg-gray-100 rounded-lg gap-1">
                            <button
                              type="button"
                              onClick={() => setAttendanceStatus(student.id, 'PRESENT')}
                              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                                currentAtt.status === 'PRESENT'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-gray-600 hover:text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              حاضر
                            </button>

                            <button
                              type="button"
                              onClick={() => setAttendanceStatus(student.id, 'ABSENT')}
                              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                                currentAtt.status === 'ABSENT'
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'text-gray-600 hover:text-rose-700 hover:bg-rose-50'
                              }`}
                            >
                              غایب
                            </button>

                            <button
                              type="button"
                              onClick={() => setAttendanceStatus(student.id, 'EXCUSED_ABSENT')}
                              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                                currentAtt.status === 'EXCUSED_ABSENT'
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'text-gray-600 hover:text-amber-700 hover:bg-amber-50'
                              }`}
                            >
                              موجه
                            </button>

                            <button
                              type="button"
                              onClick={() => setAttendanceStatus(student.id, 'TARDY')}
                              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                                currentAtt.status === 'TARDY'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-gray-600 hover:text-blue-700 hover:bg-blue-50'
                              }`}
                            >
                              تأخیر
                            </button>
                          </div>

                          {/* Delay Minutes input if TARDY */}
                          {currentAtt.status === 'TARDY' && (
                            <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] text-blue-700">
                              <span>دقایق:</span>
                              <input
                                type="number"
                                min="1"
                                max="90"
                                value={currentAtt.delayMinutes || 10}
                                onChange={(e) => setDelayMinutes(student.id, Number(e.target.value))}
                                className="w-14 h-6 text-center text-xs font-bold border border-blue-300 rounded bg-blue-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                              />
                              <span>دقیقه</span>
                            </div>
                          )}
                        </TableCell>

                        {/* 4. Oral Questioning & Activity Grade */}
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.25"
                                min="0"
                                max="20"
                                placeholder="نمره (۰-۲۰)"
                                value={currentGrade.score}
                                onChange={(e) => setOralScore(student.id, e.target.value)}
                                className={`w-24 h-8 text-center text-xs font-black rounded-lg border outline-none transition-colors ${
                                  currentGrade.score !== ''
                                    ? 'bg-amber-50/80 border-amber-300 text-amber-900 font-mono ring-1 ring-amber-400'
                                    : 'bg-gray-50 border-gray-300 text-gray-700 focus:bg-white focus:ring-2 focus:ring-primary'
                                }`}
                              />

                              {/* Quick score pills */}
                              <div className="flex items-center gap-0.5">
                                {[20, 18, 15].map((val) => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => setOralScore(student.id, val)}
                                    className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-gray-100 hover:bg-amber-100 hover:text-amber-800 text-gray-600 transition-colors"
                                  >
                                    {val}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {currentGrade.score !== '' && (
                              <input
                                type="text"
                                placeholder="توضیحات سوال یا مبحث..."
                                value={currentGrade.description}
                                onChange={(e) => setOralDescription(student.id, e.target.value)}
                                className="w-full h-6 text-[10px] px-2 rounded border border-gray-200 bg-gray-50 focus:bg-white outline-none text-gray-700"
                              />
                            )}
                          </div>
                        </TableCell>

                        {/* 5. Disciplinary & Commendation Matters */}
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center justify-center gap-1">
                              {/* Quick Positive Button */}
                              <button
                                type="button"
                                onClick={() =>
                                  openMatterModal(student, 'POSITIVE', 'پاسخگویی عالی به پرسش کلاسی')
                                }
                                title="ثبت تشویق"
                                className="px-2 py-1 text-[11px] font-bold rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 transition-colors"
                              >
                                <Smile className="w-3.5 h-3.5 text-emerald-600" />
                                <span>+ تشویق</span>
                              </button>

                              {/* Quick Negative Button */}
                              <button
                                type="button"
                                onClick={() =>
                                  openMatterModal(student, 'NEGATIVE', 'تذکر کلاسی و عدم تمرکز')
                                }
                                title="ثبت تذکر انضباطی"
                                className="px-2 py-1 text-[11px] font-bold rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 flex items-center gap-1 transition-colors"
                              >
                                <Frown className="w-3.5 h-3.5 text-rose-600" />
                                <span>- تذکر</span>
                              </button>
                            </div>

                            {/* Matters count badge */}
                            {(matters.positive > 0 || matters.negative > 0) && (
                              <div className="flex items-center gap-1 text-[10px] font-bold">
                                {matters.positive > 0 && (
                                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                    +{matters.positive} تشویق
                                  </span>
                                )}
                                {matters.negative > 0 && (
                                  <span className="text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                    -{matters.negative} مورد
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* 6. Session Note */}
                        <TableCell>
                          <input
                            type="text"
                            placeholder="یادداشت جلسه (اختیاری)..."
                            value={currentAtt.note}
                            onChange={(e) => setAttendanceNote(student.id, e.target.value)}
                            className="w-full h-8 text-xs px-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:ring-1 focus:ring-primary outline-none text-gray-700"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Sticky Action Bar on Mobile */}
          <StickyActionBar className="md:hidden">
            <div className="w-full flex items-center justify-between gap-3">
              <div className="text-xs font-bold text-gray-600">
                حاضر: {presentCount} | غایب: {absentCount}
              </div>
              <Button
                variant="primary"
                onClick={handleSaveSession}
                isLoading={isSaving}
                disabled={isLoading || students.length === 0}
                className="flex items-center gap-1.5 text-xs font-bold px-5 h-11"
              >
                <Save className="h-4 w-4" />
                <span>ذخیره دفتر کلاسی</span>
              </Button>
            </div>
          </StickyActionBar>
        </div>
      )}

      {/* MATRIX & CLASS GRADES OVERVIEW VIEW */}
      {activeTab === 'MATRIX' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-ink-darker flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span>ماتریس ریز نمرات ثبت‌شده کلاس درس</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                نمرات مستمر، پرسش‌های کلاسی، امتحانات و میانگین وزنی هر هنرجو
              </p>
            </div>

            {matrixData?.stats && (
              <div className="flex items-center gap-4 text-xs font-bold">
                <div className="bg-blue-50 text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200">
                  تعداد کل نمرات ثبت‌شده: {matrixData.stats.totalGradesRecorded}
                </div>
                <div className="bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200">
                  میانگین کلاس از ۲۰: {matrixData.stats.averageScoreOutOf20}
                </div>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>نام هنرجو</TableHead>
                  <TableHead>شماره دانش‌آموزی</TableHead>
                  <TableHead className="text-center">آخرین نمره فعالیت</TableHead>
                  <TableHead className="text-center">تعداد ارزشیابی‌ها</TableHead>
                  <TableHead className="text-center">میانگین تخمینی (۲۰)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student, idx) => {
                  const studentGrades =
                    matrixData?.grades?.filter((g: any) => g.studentId === student.id) || [];
                  const latestGrade = studentGrades[studentGrades.length - 1];
                  const avg =
                    studentGrades.length > 0
                      ? (
                          studentGrades.reduce((acc: number, cur: any) => acc + cur.score, 0) /
                          studentGrades.length
                        ).toFixed(2)
                      : '—';

                  return (
                    <TableRow key={student.id}>
                      <TableCell className="text-center font-mono text-xs text-gray-400">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-bold text-xs text-ink-darker">
                        {student.firstName} {student.lastName}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">
                        {student.studentCode || '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        {latestGrade ? (
                          <Badge variant="neutral" className="font-mono font-bold">
                            {latestGrade.score} ({latestGrade.title})
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs font-bold text-gray-600">
                        {studentGrades.length}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold font-mono text-sm text-primary">
                          {avg}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* QUICK DISCIPLINARY / COMMENDATION MODAL */}
      {matterModal.isOpen && matterModal.student && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                {matterModal.type === 'POSITIVE' ? (
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h3 className="text-base font-black text-ink-darker">
                    {matterModal.type === 'POSITIVE'
                      ? 'ثبت تشویق و امتیاز مثبت'
                      : 'ثبت مورد انضباطی یا تذکر'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    هنرجو: {matterModal.student.firstName} {matterModal.student.lastName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setMatterModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setMatterModal((prev) => ({
                      ...prev,
                      type: 'POSITIVE',
                      actionTaken: 'ثبت تشویق در دفتر کلاسی',
                    }))
                  }
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    matterModal.type === 'POSITIVE'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-xs'
                      : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}
                >
                  <Smile className="w-4 h-4 text-emerald-600" />
                  <span>تشویقی (امتیاز مثبت)</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setMatterModal((prev) => ({
                      ...prev,
                      type: 'NEGATIVE',
                      actionTaken: 'تذکر کلاسی',
                    }))
                  }
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    matterModal.type === 'NEGATIVE'
                      ? 'bg-rose-50 border-rose-400 text-rose-800 shadow-xs'
                      : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}
                >
                  <Frown className="w-4 h-4 text-rose-600" />
                  <span>انضباطی (تذکر / کسر امتیاز)</span>
                </button>
              </div>

              {/* Title Input & Quick Presets */}
              <div>
                <label className="text-xs font-bold text-ink-dark block mb-1.5">عنوان:</label>
                <input
                  type="text"
                  value={matterModal.title}
                  onChange={(e) =>
                    setMatterModal((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="مثلاً: پاسخگویی عالی به پرسش کلاسی یا بی‌نظمی در کلاس"
                  className="w-full h-10 text-xs px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none"
                />

                {/* Presets */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {(matterModal.type === 'POSITIVE'
                    ? [
                        'پاسخگویی عالی به پرسش',
                        'حل تمرین پای تخته',
                        'مشارکت فعال و خلاقیت',
                        'رعایت کامل آراستگی و نظم',
                      ]
                    : [
                        'بی‌نظمی در کلاس درس',
                        'عدم توجه به تدریس دبیر',
                        'صحبت بدون اجازه',
                        'تاخیر مکرر در ورود',
                        'عدم همراه داشتن کتاب و جزوه',
                      ]
                  ).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        setMatterModal((prev) => ({ ...prev, title: preset }))
                      }
                      className="text-[10px] px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Points & Action */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-ink-dark block mb-1.5">
                    امتیاز ({matterModal.type === 'POSITIVE' ? '+' : '-'}):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={matterModal.points}
                    onChange={(e) =>
                      setMatterModal((prev) => ({
                        ...prev,
                        points: Number(e.target.value) || 1,
                      }))
                    }
                    className="w-full h-10 text-xs px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-ink-dark block mb-1.5">
                    اقدام انجام‌شده:
                  </label>
                  <input
                    type="text"
                    value={matterModal.actionTaken}
                    onChange={(e) =>
                      setMatterModal((prev) => ({ ...prev, actionTaken: e.target.value }))
                    }
                    placeholder="اقدام صورت‌گرفته..."
                    className="w-full h-10 text-xs px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-ink-dark block mb-1.5">
                  توضیحات تکمیلی دبیر:
                </label>
                <textarea
                  rows={2}
                  value={matterModal.description}
                  onChange={(e) =>
                    setMatterModal((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="جزئیات واقعه سر کلاس..."
                  className="w-full text-xs p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              {/* Notify Parents Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-primary" />
                  <div>
                    <div className="text-xs font-bold text-ink-dark">اطلاع‌رسانی به اولیاء</div>
                    <div className="text-[10px] text-gray-500">
                      ارسال پیامک و نوتیفیکیشن اختصاصی به والدین هنرجو
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={matterModal.notifiedParents}
                  onChange={(e) =>
                    setMatterModal((prev) => ({ ...prev, notifiedParents: e.target.checked }))
                  }
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setMatterModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-xs"
              >
                انصراف
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitMatter}
                isLoading={isSubmittingMatter}
                className="text-xs font-bold"
              >
                ثبت مورد در دفتر کلاسی
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
