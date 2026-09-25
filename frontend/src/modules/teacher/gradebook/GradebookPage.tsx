import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  toPersianDigits,
  formatJalaliDisplay,
} from '../../../utils/jalali';
import {
  BookOpen,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  Star,
  FileText,
  ChevronLeft,
  ArrowRight,
  GraduationCap,
  Clock,
  Sparkles,
  Calculator,
  RefreshCw,
  FileCheck,
  Layers,
  Award,
  ShieldAlert,
  Save,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────────────────────────────────

interface LessonItem {
  id: string;
  name: string;
  code?: string;
  units?: number;
  isModular?: boolean; // پودمانی یا عمومی
  podmanCount?: number;
  level?: { id: string; name: string };
  field?: { id: string; name: string };
  classroomsCount?: number;
}

interface ClassroomItem {
  id: string;
  name: string;
  code?: string;
  level?: { id: string; name: string };
  field?: { id: string; name: string };
  studentCount?: number;
  teacherName?: string;
}

interface StudentItem {
  id: string;
  studentId: string;
  studentCode?: string;
  nationalCode?: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

// General Theory Grade State
interface GeneralGradeState {
  continuous1?: number | string; // مستمر ۱
  final1?: number | string;      // پایانی ۱
  continuous2?: number | string; // مستمر ۲
  final2?: number | string;      // پایانی ۲
}

// Podman Grade State
interface PodmanGradeState {
  continuousScore: number | string; // نمره مستمر از ۵
  competencyScore: number;          // سطح شایستگی: ۱ (عدم احراز)، ۲ (در حد انتظار)، ۳ (بالاتر از حد انتظار)
  notes?: string;
}

export const GradebookPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);

  const isTeacher = user?.role === 'TEACHER';

  // Navigation Steps: 'LESSONS' (انتخاب درس) -> 'CLASSROOMS' (انتخاب کلاس) -> 'SHEET' (ماتریس نمرات)
  const [currentStep, setCurrentStep] = useState<'LESSONS' | 'CLASSROOMS' | 'SHEET'>('LESSONS');

  // Selected Context
  const [selectedLesson, setSelectedLesson] = useState<LessonItem | null>(null);
  const [selectedClassroom, setSelectedClassroom] = useState<ClassroomItem | null>(null);

  // Raw lists
  const [lessonsList, setLessonsList] = useState<LessonItem[]>([]);
  const [classroomsList, setClassroomsList] = useState<ClassroomItem[]>([]);
  const [studentsList, setStudentsList] = useState<StudentItem[]>([]);

  // Search & Filter States
  const [lessonSearchQuery, setLessonSearchQuery] = useState<string>('');
  const [lessonCategoryFilter, setLessonCategoryFilter] = useState<'ALL' | 'GENERAL' | 'MODULAR'>('ALL');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');

  // Modular Podman View State
  const [selectedPodmanNumber, setSelectedPodmanNumber] = useState<number>(1);

  // Grades In-Memory Edit State
  const [generalGrades, setGeneralGrades] = useState<Record<string, GeneralGradeState>>({});
  const [modularGrades, setModularGrades] = useState<Record<string, Record<number, PodmanGradeState>>>({});

  // Loading & Saving States
  const [isLoadingLessons, setIsLoadingLessons] = useState<boolean>(true);
  const [isLoadingSheet, setIsLoadingSheet] = useState<boolean>(false);
  const [isSavingGrades, setIsSavingGrades] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // 360-Degree Dossier Modal State
  const [dossierStudentId, setDossierStudentId] = useState<string | null>(null);
  const [dossierData, setDossierData] = useState<any>(null);
  const [isLoadingDossier, setIsLoadingDossier] = useState<boolean>(false);
  const [dossierActiveTab, setDossierActiveTab] = useState<'ORAL' | 'HOMEWORK' | 'ATTENDANCE' | 'QUICK_GRADE'>('ORAL');

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Initial Load: Fetch Lessons and Classrooms
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchLessons = async () => {
      try {
        setIsLoadingLessons(true);
        const [lessonsRes, classesRes] = await Promise.all([
          apiClient.get('/classes/lessons'),
          apiClient.get('/classes/classrooms'),
        ]);

        const rawLessons = lessonsRes?.data || lessonsRes || [];
        const rawClassrooms = classesRes?.data || classesRes || [];

        const classroomsArr = Array.isArray(rawClassrooms) ? rawClassrooms : [];
        setClassroomsList(classroomsArr);

        const mappedLessons: LessonItem[] = (Array.isArray(rawLessons) ? rawLessons : []).map((l: any) => ({
          id: l.id,
          name: l.name,
          code: l.code,
          units: l.units,
          isModular: !!l.isModular,
          podmanCount: l.podmanCount || 5,
          level: l.level,
          field: l.field,
          classroomsCount: classroomsArr.length,
        }));

        setLessonsList(mappedLessons);

        // Handle URL parameters if coming from another module
        const lessonIdParam = searchParams.get('lessonId');
        const classIdParam = searchParams.get('classroomId');

        if (lessonIdParam) {
          const foundLesson = mappedLessons.find((l) => l.id === lessonIdParam);
          if (foundLesson) {
            setSelectedLesson(foundLesson);
            if (classIdParam) {
              const foundClass = classroomsArr.find((c: any) => c.id === classIdParam);
              if (foundClass) {
                setSelectedClassroom(foundClass);
                setCurrentStep('SHEET');
              } else {
                setCurrentStep('CLASSROOMS');
              }
            } else {
              setCurrentStep('CLASSROOMS');
            }
          }
        }
      } catch (err: any) {
        console.error('Error fetching lessons:', err);
        toast.error('خطا در دریافت لیست دروس و کلاس‌ها');
      } finally {
        setIsLoadingLessons(false);
      }
    };

    fetchLessons();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Fetch Classroom Grade Sheet
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (currentStep !== 'SHEET' || !selectedClassroom || !selectedLesson) return;

    const fetchSheetData = async () => {
      try {
        setIsLoadingSheet(true);
        setHasUnsavedChanges(false);

        const [studentsRes, gradebookRes, podmanRes] = await Promise.all([
          apiClient.get(`/classes/classrooms/${selectedClassroom.id}/students`),
          apiClient.get(`/gradebook/classroom/${selectedClassroom.id}?lessonId=${selectedLesson.id}`).catch(() => null),
          selectedLesson.isModular
            ? apiClient.get(`/gradebook/classroom/${selectedClassroom.id}/podman-matrix?lessonId=${selectedLesson.id}`).catch(() => null)
            : Promise.resolve(null),
        ]);

        const rawStudents = studentsRes?.data || studentsRes || [];
        const studentsArr = Array.isArray(rawStudents)
          ? rawStudents
          : Array.isArray(rawStudents?.students)
            ? rawStudents.students
            : Array.isArray(rawStudents?.enrollments)
              ? rawStudents.enrollments
              : [];

        const normalizedStudents: StudentItem[] = studentsArr.map((s: any) => {
          const profile = s.student || (s.user ? s : s);
          const userObj = profile.user || s.user || {};
          const realStudentId = s.studentId || profile.id || s.id;

          return {
            id: realStudentId,
            studentId: realStudentId,
            studentCode: profile.studentCode || s.studentCode || s.code || '',
            nationalCode: userObj.nationalId || s.nationalCode || '',
            firstName: userObj.firstName || s.firstName || 'دانش‌آموز',
            lastName: userObj.lastName || s.lastName || '',
            avatarUrl: userObj.avatarUrl || s.avatarUrl || null,
          };
        });

        setStudentsList(normalizedStudents);

        // 2.1 Process General Grades
        const generalMap: Record<string, GeneralGradeState> = {};
        normalizedStudents.forEach((st) => {
          generalMap[st.studentId] = {
            continuous1: '',
            final1: '',
            continuous2: '',
            final2: '',
          };
        });

        const rawGradebook = gradebookRes?.data || gradebookRes;
        if (rawGradebook && Array.isArray(rawGradebook.grades)) {
          rawGradebook.grades.forEach((g: any) => {
            if (generalMap[g.studentId]) {
              if (g.gradeType === 'CLASS_ACTIVITY' || g.gradeType === 'MIDTERM') {
                generalMap[g.studentId].continuous1 = g.score;
              } else if (g.gradeType === 'FINAL_TERM_1') {
                generalMap[g.studentId].final1 = g.score;
              } else if (g.gradeType === 'FINAL_TERM_2') {
                generalMap[g.studentId].final2 = g.score;
              }
            }
          });
        }
        setGeneralGrades(generalMap);

        // 2.2 Process Modular Grades
        const podmanMap: Record<string, Record<number, PodmanGradeState>> = {};
        normalizedStudents.forEach((st) => {
          podmanMap[st.studentId] = {};
          for (let i = 1; i <= 5; i++) {
            podmanMap[st.studentId][i] = {
              continuousScore: '',
              competencyScore: 2,
              notes: '',
            };
          }
        });

        const rawPodman = podmanRes?.data || podmanRes;
        if (rawPodman && Array.isArray(rawPodman.students)) {
          rawPodman.students.forEach((pst: any) => {
            const sid = pst.studentId;
            if (podmanMap[sid] && pst.podmanGrades) {
              for (let i = 1; i <= 5; i++) {
                const pg = pst.podmanGrades[i];
                if (pg) {
                  podmanMap[sid][i] = {
                    continuousScore: pg.continuousScore !== undefined ? pg.continuousScore : '',
                    competencyScore: pg.competencyScore || 2,
                    notes: pg.notes || '',
                  };
                }
              }
            }
          });
        }
        setModularGrades(podmanMap);
      } catch (err: any) {
        console.error('Error fetching sheet data:', err);
        toast.error('خطا در بارگذاری جدول ارزشیابی و اسامی دانش‌آموزان');
      } finally {
        setIsLoadingSheet(false);
      }
    };

    fetchSheetData();
  }, [currentStep, selectedClassroom?.id, selectedLesson?.id]);

  // ─────────────────────────────────────────────────────────────────────────
  // 3. 360-Degree Dossier Loader
  // ─────────────────────────────────────────────────────────────────────────
  const handleOpenDossier = async (studentId: string) => {
    if (!selectedClassroom || !selectedLesson) return;
    setDossierStudentId(studentId);
    setDossierActiveTab('ORAL');
    try {
      setIsLoadingDossier(true);
      const res: any = await apiClient.get(
        `/gradebook/student/${studentId}/dossier?classroomId=${selectedClassroom.id}&lessonId=${selectedLesson.id}`,
      );
      const raw = res?.data || res;
      setDossierData(raw?.data || raw);
    } catch (err: any) {
      console.error('Error loading student dossier:', err);
      toast.error('خطا در دریافت پرونده تحصیلی دانش‌آموز');
    } finally {
      setIsLoadingDossier(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Save General or Podman Grades
  // ─────────────────────────────────────────────────────────────────────────
  const handleSaveGrades = async () => {
    if (!selectedClassroom || !selectedLesson) return;

    try {
      setIsSavingGrades(true);

      if (selectedLesson.isModular) {
        const podmanPayload = {
          classroomId: selectedClassroom.id,
          lessonId: selectedLesson.id,
          podmanNumber: selectedPodmanNumber,
          grades: Object.entries(modularGrades)
            .filter(([_, pMap]) => pMap[selectedPodmanNumber]?.continuousScore !== '')
            .map(([studentId, pMap]) => ({
              studentId,
              continuousScore: Math.min(5, Math.max(0, parseFloat(String(pMap[selectedPodmanNumber].continuousScore)) || 0)),
              competencyScore: pMap[selectedPodmanNumber].competencyScore,
              notes: pMap[selectedPodmanNumber].notes || '',
            })),
        };

        if (podmanPayload.grades.length === 0) {
          toast.info('نمره‌ای برای پودمان ' + toPersianDigits(selectedPodmanNumber) + ' وارد نشده است');
          return;
        }

        await apiClient.post('/gradebook/podman/bulk', podmanPayload);
        toast.success(`نمرات پودمان ${toPersianDigits(selectedPodmanNumber)} با موفقیت ثبت شد`);
      } else {
        const entries = Object.entries(generalGrades);

        const c1Grades = entries
          .filter(([_, g]) => g.continuous1 !== '' && g.continuous1 !== undefined)
          .map(([studentId, g]) => ({ studentId, score: parseFloat(String(g.continuous1)) || 0 }));
        if (c1Grades.length > 0) {
          await apiClient.post('/gradebook/bulk', {
            classroomId: selectedClassroom.id,
            lessonId: selectedLesson.id,
            gradeType: 'CLASS_ACTIVITY',
            title: 'مستمر نوبت اول',
            maxScore: 20,
            grades: c1Grades,
          });
        }

        const f1Grades = entries
          .filter(([_, g]) => g.final1 !== '' && g.final1 !== undefined)
          .map(([studentId, g]) => ({ studentId, score: parseFloat(String(g.final1)) || 0 }));
        if (f1Grades.length > 0) {
          await apiClient.post('/gradebook/bulk', {
            classroomId: selectedClassroom.id,
            lessonId: selectedLesson.id,
            gradeType: 'FINAL_TERM_1',
            title: 'پایانی نوبت اول',
            maxScore: 20,
            grades: f1Grades,
          });
        }

        const f2Grades = entries
          .filter(([_, g]) => g.final2 !== '' && g.final2 !== undefined)
          .map(([studentId, g]) => ({ studentId, score: parseFloat(String(g.final2)) || 0 }));
        if (f2Grades.length > 0) {
          await apiClient.post('/gradebook/bulk', {
            classroomId: selectedClassroom.id,
            lessonId: selectedLesson.id,
            gradeType: 'FINAL_TERM_2',
            title: 'پایانی نوبت دوم',
            maxScore: 20,
            grades: f2Grades,
          });
        }

        toast.success('تمامی نمرات رسمی با موفقیت ذخیره شدند');
      }

      setHasUnsavedChanges(false);
    } catch (err: any) {
      console.error('Error saving grades:', err);
      toast.error('خطا در ثبت نمرات: ' + (err?.response?.data?.message || err?.message));
    } finally {
      setIsSavingGrades(false);
    }
  };

  // Filtered Lessons
  const filteredLessons = useMemo(() => {
    return lessonsList.filter((l) => {
      const matchesSearch =
        l.name.toLowerCase().includes(lessonSearchQuery.toLowerCase()) ||
        (l.code && l.code.includes(lessonSearchQuery));
      if (!matchesSearch) return false;

      if (lessonCategoryFilter === 'GENERAL') return !l.isModular;
      if (lessonCategoryFilter === 'MODULAR') return l.isModular;
      return true;
    });
  }, [lessonsList, lessonSearchQuery, lessonCategoryFilter]);

  // Filtered Students in Sheet
  const filteredStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return studentsList;
    const q = studentSearchQuery.trim().toLowerCase();
    return studentsList.filter((s) => {
      const full = `${s.firstName} ${s.lastName}`.toLowerCase();
      const code = (s.studentCode || '').toLowerCase();
      const nat = (s.nationalCode || '').toLowerCase();
      return full.includes(q) || code.includes(q) || nat.includes(q);
    });
  }, [studentsList, studentSearchQuery]);

  // Compute Sheet KPIs
  const sheetStats = useMemo(() => {
    const total = studentsList.length;
    if (total === 0) return { total: 0, recorded: 0, passRate: 0, average: 0 };

    if (selectedLesson?.isModular) {
      let recorded = 0;
      let passed = 0;
      let sum = 0;
      studentsList.forEach((s) => {
        const pod = modularGrades[s.studentId]?.[selectedPodmanNumber];
        if (pod && pod.continuousScore !== '') {
          recorded++;
          const finalScore = parseFloat(String(pod.continuousScore)) + pod.competencyScore * 5;
          sum += finalScore;
          if (finalScore >= 12) passed++;
        }
      });
      return {
        total,
        recorded,
        passRate: recorded > 0 ? Math.round((passed / recorded) * 100) : 0,
        average: recorded > 0 ? Number((sum / recorded).toFixed(2)) : 0,
      };
    } else {
      let recorded = 0;
      let passed = 0;
      let sum = 0;
      studentsList.forEach((s) => {
        const g = generalGrades[s.studentId];
        if (g && (g.continuous1 !== '' || g.final1 !== '' || g.final2 !== '')) {
          recorded++;
          const c1 = parseFloat(String(g.continuous1)) || 0;
          const f1 = parseFloat(String(g.final1)) || 0;
          const c2 = parseFloat(String(g.continuous2)) || 0;
          const f2 = parseFloat(String(g.final2)) || 0;
          const annual = (c1 * 1 + f1 * 2 + c2 * 1 + f2 * 4) / 8;
          sum += annual;
          if (annual >= 10) passed++;
        }
      });
      return {
        total,
        recorded,
        passRate: recorded > 0 ? Math.round((passed / recorded) * 100) : 0,
        average: recorded > 0 ? Number((sum / recorded).toFixed(2)) : 0,
      };
    }
  }, [studentsList, selectedLesson, selectedPodmanNumber, generalGrades, modularGrades]);

  return (
    <div className="space-y-6 pb-24 font-sans text-right" dir="rtl">
      {/* ─────────────────────────────────────────────────────────────────────
          PAGE HEADER & BREADCRUMBS
      ───────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-card border-3 border-black p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_#fff]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary/20 text-primary border border-primary/40 px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {isTeacher ? 'میز کار مربی' : 'سامانه مدیریت و معاونت آموزشی'}
            </span>

            {/* Breadcrumb Navigation */}
            <div className="flex items-center text-xs font-bold text-muted-foreground gap-1.5 mr-2">
              <button
                type="button"
                onClick={() => {
                  setCurrentStep('LESSONS');
                  setSelectedLesson(null);
                  setSelectedClassroom(null);
                }}
                className={`hover:text-foreground transition-colors ${currentStep === 'LESSONS' ? 'text-foreground font-black underline' : ''}`}
              >
                دروس
              </button>
              {selectedLesson && (
                <>
                  <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep('CLASSROOMS');
                      setSelectedClassroom(null);
                    }}
                    className={`hover:text-foreground transition-colors ${currentStep === 'CLASSROOMS' ? 'text-foreground font-black underline' : ''}`}
                  >
                    {selectedLesson.name}
                  </button>
                </>
              )}
              {selectedClassroom && (
                <>
                  <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-foreground font-black">
                    کلاس {selectedClassroom.name}
                  </span>
                </>
              )}
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-primary" />
            ارزشیابی و ثبت نمرات
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
            {currentStep === 'LESSONS' && 'گام اول: لطفاً درس مورد نظر را برای ارزیابی و ورود نمرات انتخاب کنید.'}
            {currentStep === 'CLASSROOMS' && `گام دوم: کلاس مورد نظر برای درس «${selectedLesson?.name}» را انتخاب کنید.`}
            {currentStep === 'SHEET' && `شیت ثبت نمرات کلاس «${selectedClassroom?.name}» در درس «${selectedLesson?.name}».`}
          </p>
        </div>

        {/* Global Action / Back Button */}
        {currentStep !== 'LESSONS' && (
          <Button
            variant="outline"
            onClick={() => {
              if (currentStep === 'SHEET') setCurrentStep('CLASSROOMS');
              else if (currentStep === 'CLASSROOMS') setCurrentStep('LESSONS');
            }}
            className="border-2 border-black font-black text-xs h-10 shadow-[2px_2px_0px_#000] self-start md:self-auto"
          >
            <ArrowRight className="w-4 h-4 ml-1.5" />
            بازگشت به {currentStep === 'SHEET' ? 'انتخاب کلاس' : 'انتخاب درس'}
          </Button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          STEP 1: LESSONS GRID VIEW (انتخاب درس)
      ───────────────────────────────────────────────────────────────────── */}
      {currentStep === 'LESSONS' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-100 dark:bg-neutral-900 border-2 border-black p-3 rounded-2xl shadow-[3px_3px_0px_#000]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
              <Input
                value={lessonSearchQuery}
                onChange={(e) => setLessonSearchQuery(e.target.value)}
                placeholder="جستجوی درس بر اساس نام یا کد..."
                className="pr-9 h-10 bg-white dark:bg-card border-2 border-black font-bold text-xs"
              />
            </div>

            {/* Category Filter Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-white dark:bg-card p-1 rounded-xl border border-black/30 text-xs font-black">
              {[
                { key: 'ALL', label: 'همه دروس' },
                { key: 'GENERAL', label: 'عمومی و نظری' },
                { key: 'MODULAR', label: 'پودمانی و فنی' },
              ].map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setLessonCategoryFilter(cat.key as any)}
                  className={`py-1.5 px-3 rounded-lg transition-all text-center ${lessonCategoryFilter === cat.key
                      ? 'bg-amber-400 text-black border border-black shadow-[1px_1px_0px_#000]'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          {isLoadingLessons ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-44 rounded-2xl border-2 border-black" />
              ))}
            </div>
          ) : filteredLessons.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-card border-3 border-dashed border-black rounded-3xl space-y-2">
              <BookOpen className="w-10 h-10 text-muted-foreground mx-auto" />
              <h3 className="font-black text-sm text-foreground">درسی یافت نشد</h3>
              <p className="text-xs text-muted-foreground">با فیلتر یا عبارت جستجوی دیگری تلاش کنید.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  onClick={() => {
                    setSelectedLesson(lesson);
                    setCurrentStep('CLASSROOMS');
                  }}
                  className="cursor-pointer group relative bg-white dark:bg-card border-3 border-black p-5 rounded-3xl transition-all transform hover:-translate-y-1 shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] dark:shadow-[4px_4px_0px_#fff]"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000]">
                      {lesson.isModular ? (
                        <Layers className="w-6 h-6 text-amber-600" />
                      ) : (
                        <BookOpen className="w-6 h-6 text-primary" />
                      )}
                    </div>

                    <Badge
                      variant={lesson.isModular ? 'warning' : 'neutral'}
                      className="border-2 border-black font-black text-[11px] px-2.5 py-0.5 shadow-[1px_1px_0px_#000]"
                    >
                      {lesson.isModular ? 'پودمانی (۵ پودمان)' : 'عمومی / نظری'}
                    </Badge>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {lesson.name}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-bold mt-2">
                    {lesson.code && (
                      <span className="font-mono bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded border border-black/20">
                        کد: {lesson.code}
                      </span>
                    )}
                    {lesson.units && (
                      <span>
                        {toPersianDigits(lesson.units)} واحد درسی
                      </span>
                    )}
                  </div>

                  {/* Footer details */}
                  <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between text-xs font-black text-foreground">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="w-4 h-4 text-primary" />
                      {toPersianDigits(lesson.classroomsCount || 0)} کلاس متصل
                    </span>

                    <span className="text-primary flex items-center gap-1 group-hover:underline">
                      انتخاب کلاس
                      <ChevronLeft className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          STEP 2: CLASSROOMS GRID VIEW (انتخاب کلاس برای درس مشخص)
      ───────────────────────────────────────────────────────────────────── */}
      {currentStep === 'CLASSROOMS' && selectedLesson && (
        <div className="space-y-4">
          {/* Active Lesson Header Strip */}
          <div className="bg-amber-100 dark:bg-amber-950/70 border-3 border-black p-4 rounded-2xl flex items-center justify-between shadow-[3px_3px_0px_#000]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-black border-2 border-black flex items-center justify-center font-black">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-foreground">
                  درس انتخابی: {selectedLesson.name}
                </h2>
                <p className="text-xs font-bold text-muted-foreground">
                  نوع ارزشیابی: {selectedLesson.isModular ? 'پودمانی شایستگی‌محور (فنی و حرفه‌ای)' : 'نمرات رسمی کارنامه (مستمر و پایانی نوبت اول و دوم)'}
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentStep('LESSONS')}
              className="border-2 border-black font-bold text-xs h-9"
            >
              تغییر درس
            </Button>
          </div>

          <h3 className="text-sm font-black text-foreground mr-1">
            کلاس‌های متصل به این درس (لطفاً کلاس را انتخاب کنید):
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classroomsList.map((cls) => (
              <div
                key={cls.id}
                onClick={() => {
                  setSelectedClassroom(cls);
                  setCurrentStep('SHEET');
                }}
                className="cursor-pointer group relative bg-white dark:bg-card border-3 border-black p-5 rounded-3xl transition-all transform hover:-translate-y-1 shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary border-2 border-black flex items-center justify-center font-black">
                    <Users className="w-5 h-5" />
                  </div>
                  <Badge variant="neutral" className="border-2 border-black font-black text-[11px]">
                    {cls.level?.name || 'کلاس درس'}
                  </Badge>
                </div>

                <h4 className="text-base font-black text-foreground group-hover:text-primary transition-colors">
                  کلاس {cls.name}
                </h4>

                <div className="text-xs text-muted-foreground font-bold mt-1">
                  {cls.field?.name ? `رشته: ${cls.field.name}` : 'رشته عمومی مدرسه'}
                </div>

                <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between text-xs font-black">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <GraduationCap className="w-4 h-4 text-emerald-600" />
                    ورود به شیت نمرات
                  </span>
                  <span className="text-primary flex items-center gap-1 group-hover:underline">
                    ارزشیابی نمرات
                    <ChevronLeft className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          STEP 3: SMART EVALUATION SHEET (ماتریس هوشمند نمرات کلاس)
      ───────────────────────────────────────────────────────────────────── */}
      {currentStep === 'SHEET' && selectedLesson && selectedClassroom && (
        <div className="space-y-4">
          {/* Top Sheet Toolbar */}
          <div className="bg-white dark:bg-card border-3 border-black p-4 rounded-3xl shadow-[4px_4px_0px_#000] space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-400 text-black border-2 border-black flex items-center justify-center font-black shrink-0 shadow-[2px_2px_0px_#000]">
                  {selectedLesson.isModular ? <Layers className="w-6 h-6" /> : <Calculator className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black text-foreground">
                      کلاس {selectedClassroom.name} — درس {selectedLesson.name}
                    </h2>
                    <Badge variant={selectedLesson.isModular ? 'warning' : 'ecosystem'} className="border-2 border-black font-black text-[10px]">
                      {selectedLesson.isModular ? 'پودمانی' : 'عمومی / کارنامه'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-bold mt-0.5">
                    💡 با کلیک روی نام هر دانش‌آموز، پرونده ۳۶۰ درجه عملکرد و سوابق تکالیف/پرسش‌های او باز می‌شود.
                  </p>
                </div>
              </div>

              {/* Class Switcher & Search */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative min-w-[200px]">
                  <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="جستجوی نام یا کدملی..."
                    className="pr-9 h-9 border-2 border-black text-xs font-bold"
                  />
                </div>

                <Button
                  size="sm"
                  disabled={isSavingGrades}
                  onClick={handleSaveGrades}
                  className="bg-emerald-500 hover:bg-emerald-600 text-black border-2 border-black font-black text-xs h-9 shadow-[2px_2px_0px_#000] flex items-center gap-1.5"
                >
                  {isSavingGrades ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  ذخیره تغییرات نمرات
                </Button>
              </div>
            </div>

            {/* Modular Podman Selector Tabs (if modular) */}
            {selectedLesson.isModular && (
              <div className="pt-2 border-t border-black/10 flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-500" />
                  انتخاب پودمان جهت نمره‌دهی:
                </span>

                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSelectedPodmanNumber(num)}
                      className={`py-1.5 px-3 rounded-xl text-xs font-black border-2 transition-all text-center ${selectedPodmanNumber === num
                          ? 'bg-amber-400 text-black border-black shadow-[2px_2px_0px_#000] scale-105'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-muted-foreground border-transparent hover:border-black/30'
                        }`}
                    >
                      پودمان {toPersianDigits(num)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mini KPI Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-black/10 text-center">
              <div className="bg-neutral-50 dark:bg-neutral-900/60 p-2 rounded-xl border border-black/10">
                <span className="text-[10px] font-bold text-muted-foreground block">کل دانش‌آموزان</span>
                <span className="text-sm font-black text-foreground">{toPersianDigits(sheetStats.total)} نفر</span>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-900/60 p-2 rounded-xl border border-black/10">
                <span className="text-[10px] font-bold text-muted-foreground block">نمرات ثبت‌شده</span>
                <span className="text-sm font-black text-primary">{toPersianDigits(sheetStats.recorded)} از {toPersianDigits(sheetStats.total)}</span>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-900/60 p-2 rounded-xl border border-black/10">
                <span className="text-[10px] font-bold text-muted-foreground block">میانگین کلاس</span>
                <span className="text-sm font-black text-amber-600">{toPersianDigits(sheetStats.average)} از ۲۰</span>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-900/60 p-2 rounded-xl border border-black/10">
                <span className="text-[10px] font-bold text-muted-foreground block">درصد قبولی</span>
                <span className="text-sm font-black text-emerald-600">{toPersianDigits(sheetStats.passRate)}٪</span>
              </div>
            </div>
          </div>

          {/* TABLE: GENERAL (THEORY) VS MODULAR (VOCATIONAL) */}
          {isLoadingSheet ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-14 rounded-2xl border-2 border-black" />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-card border-3 border-black rounded-3xl shadow-[4px_4px_0px_#000] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-100 dark:bg-neutral-900 border-b-2 border-black text-foreground font-black">
                      <th className="py-3 px-3 w-12 text-center">#</th>
                      <th className="py-3 px-4 min-w-[200px]">نام و نام خانوادگی</th>
                      <th className="py-3 px-3 min-w-[100px] text-center">کد دانش‌آموزی</th>

                      {/* Dynamic Columns based on lesson type */}
                      {selectedLesson.isModular ? (
                        <>
                          <th className="py-3 px-3 min-w-[130px] text-center bg-amber-50/70 dark:bg-amber-950/30">
                            مستمر پودمان {toPersianDigits(selectedPodmanNumber)} (از ۵)
                          </th>
                          <th className="py-3 px-3 min-w-[180px] text-center bg-sky-50/70 dark:bg-sky-950/30">
                            سطح شایستگی فنی
                          </th>
                          <th className="py-3 px-3 min-w-[110px] text-center bg-emerald-50/70 dark:bg-emerald-950/30">
                            نمره پودمان (از ۲۰)
                          </th>
                          <th className="py-3 px-3 min-w-[100px] text-center">وضعیت</th>
                        </>
                      ) : (
                        <>
                          <th className="py-3 px-3 min-w-[100px] text-center bg-sky-50/70 dark:bg-sky-950/30">مستمر ۱ (از ۲۰)</th>
                          <th className="py-3 px-3 min-w-[100px] text-center bg-sky-50/70 dark:bg-sky-950/30">پایانی ۱ (از ۲۰)</th>
                          <th className="py-3 px-3 min-w-[90px] text-center font-bold text-muted-foreground">نوبت اول</th>
                          <th className="py-3 px-3 min-w-[100px] text-center bg-amber-50/70 dark:bg-amber-950/30">مستمر ۲ (از ۲۰)</th>
                          <th className="py-3 px-3 min-w-[100px] text-center bg-amber-50/70 dark:bg-amber-950/30">پایانی ۲ (از ۲۰)</th>
                          <th className="py-3 px-3 min-w-[100px] text-center bg-emerald-50/70 dark:bg-emerald-950/30 font-black">نمره سالانه</th>
                          <th className="py-3 px-3 min-w-[90px] text-center">نتیجه</th>
                        </>
                      )}

                      <th className="py-3 px-3 w-28 text-center">پرونده ۳۶۰°</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y border-black/10">
                    {filteredStudents.map((st, idx) => {
                      const sid = st.studentId;

                      if (selectedLesson.isModular) {
                        const podData = modularGrades[sid]?.[selectedPodmanNumber] || {
                          continuousScore: '',
                          competencyScore: 2,
                          notes: '',
                        };

                        const contVal = parseFloat(String(podData.continuousScore));
                        const hasGrade = !isNaN(contVal);
                        const finalScore = hasGrade ? Number((contVal + podData.competencyScore * 5).toFixed(2)) : null;
                        const isPassed = finalScore !== null ? finalScore >= 12 : null;

                        return (
                          <tr key={sid} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-900/40 transition-colors">
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-muted-foreground">{toPersianDigits(idx + 1)}</td>

                            {/* Student Name: CLICKABLE TO OPEN 360 DOSSIER */}
                            <td className="py-2.5 px-4">
                              <button
                                type="button"
                                onClick={() => handleOpenDossier(sid)}
                                className="text-right group/st flex items-center gap-2 hover:underline focus:outline-none"
                              >
                                <span className="w-7 h-7 rounded-lg bg-neutral-200 dark:bg-neutral-800 border border-black/30 flex items-center justify-center font-bold text-[11px] shrink-0">
                                  {st.firstName?.[0] || 'د'}
                                </span>
                                <div>
                                  <div className="font-black text-foreground group-hover/st:text-primary transition-colors">
                                    {st.firstName} {st.lastName}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <span>مشاهده سوابق و تکالیف</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </div>
                                </div>
                              </button>
                            </td>

                            <td className="py-2.5 px-3 text-center font-mono font-bold text-muted-foreground">
                              {st.studentCode ? toPersianDigits(st.studentCode) : 'ـ'}
                            </td>

                            {/* Continuous Score Input (0 to 5) */}
                            <td className="py-2.5 px-3 text-center bg-amber-50/30 dark:bg-amber-950/10">
                              <Input
                                type="number"
                                step="0.25"
                                min="0"
                                max="5"
                                value={podData.continuousScore}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setModularGrades((prev) => ({
                                    ...prev,
                                    [sid]: {
                                      ...prev[sid],
                                      [selectedPodmanNumber]: {
                                        ...prev[sid][selectedPodmanNumber],
                                        continuousScore: val,
                                      },
                                    },
                                  }));
                                  setHasUnsavedChanges(true);
                                }}
                                placeholder="۰ تا ۵"
                                className="h-8 w-20 text-center font-bold text-xs mx-auto border-2 border-black"
                              />
                            </td>

                            {/* Competency Score Selector: 1, 2, 3 */}
                            <td className="py-2.5 px-3 text-center bg-sky-50/30 dark:bg-sky-950/10">
                              <div className="grid grid-cols-3 gap-1 max-w-[170px] mx-auto font-black text-[10px]">
                                {[
                                  { val: 1, label: '۱: عدم احراز' },
                                  { val: 2, label: '۲: در حد انتظار' },
                                  { val: 3, label: '۳: بالاتر' },
                                ].map((item) => (
                                  <button
                                    key={item.val}
                                    type="button"
                                    onClick={() => {
                                      setModularGrades((prev) => ({
                                        ...prev,
                                        [sid]: {
                                          ...prev[sid],
                                          [selectedPodmanNumber]: {
                                            ...prev[sid][selectedPodmanNumber],
                                            competencyScore: item.val,
                                          },
                                        },
                                      }));
                                      setHasUnsavedChanges(true);
                                    }}
                                    className={`py-1 px-1 rounded-lg border transition-all ${podData.competencyScore === item.val
                                        ? 'bg-sky-500 text-white border-black shadow-[1px_1px_0px_#000]'
                                        : 'bg-white dark:bg-neutral-800 text-muted-foreground border-neutral-300'
                                      }`}
                                  >
                                    {item.label}
                                  </button>
                                ))}
                              </div>
                            </td>

                            {/* Final Podman Score (out of 20) */}
                            <td className="py-2.5 px-3 text-center bg-emerald-50/30 dark:bg-emerald-950/10 font-mono font-black text-sm">
                              {finalScore !== null ? (
                                <span className={finalScore >= 12 ? 'text-emerald-700' : 'text-rose-600'}>
                                  {toPersianDigits(finalScore)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">ـ</span>
                              )}
                            </td>

                            {/* Passed status */}
                            <td className="py-2.5 px-3 text-center">
                              {isPassed !== null ? (
                                <Badge
                                  variant={isPassed ? 'ecosystem' : 'female'}
                                  className="text-[10px] font-black"
                                >
                                  {isPassed ? 'قبول' : 'جبرانی'}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-[10px]">ثبت‌نشده</span>
                              )}
                            </td>

                            {/* Dossier button */}
                            <td className="py-2.5 px-3 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenDossier(sid)}
                                className="h-7 px-2 border-2 border-black font-black text-[10px] shadow-[1px_1px_0px_#000]"
                              >
                                پرونده ۳۶۰°
                              </Button>
                            </td>
                          </tr>
                        );
                      }

                      // General Theory Lesson Row
                      const gData = generalGrades[sid] || {
                        continuous1: '',
                        final1: '',
                        continuous2: '',
                        final2: '',
                      };

                      const c1 = gData.continuous1 !== '' ? parseFloat(String(gData.continuous1)) : null;
                      const f1 = gData.final1 !== '' ? parseFloat(String(gData.final1)) : null;
                      const c2 = gData.continuous2 !== '' ? parseFloat(String(gData.continuous2)) : null;
                      const f2 = gData.final2 !== '' ? parseFloat(String(gData.final2)) : null;

                      const term1Avg = c1 !== null && f1 !== null ? Number(((c1 + f1) / 2).toFixed(2)) : null;

                      const hasAnnual = c1 !== null && f1 !== null && c2 !== null && f2 !== null;
                      const annualGrade = hasAnnual
                        ? Number(((c1 * 1 + f1 * 2 + c2 * 1 + f2 * 4) / 8).toFixed(2))
                        : null;
                      const isPassed = annualGrade !== null ? annualGrade >= 10 : null;

                      return (
                        <tr key={sid} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-900/40 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-muted-foreground">{toPersianDigits(idx + 1)}</td>

                          {/* Student Name: CLICKABLE TO OPEN 360 DOSSIER */}
                          <td className="py-2.5 px-4">
                            <button
                              type="button"
                              onClick={() => handleOpenDossier(sid)}
                              className="text-right group/st flex items-center gap-2 hover:underline focus:outline-none"
                            >
                              <span className="w-7 h-7 rounded-lg bg-neutral-200 dark:bg-neutral-800 border border-black/30 flex items-center justify-center font-bold text-[11px] shrink-0">
                                {st.firstName?.[0] || 'د'}
                              </span>
                              <div>
                                <div className="font-black text-foreground group-hover/st:text-primary transition-colors">
                                  {st.firstName} {st.lastName}
                                </div>
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <span>مشاهده سوابق و تکالیف</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </div>
                              </div>
                            </button>
                          </td>

                          <td className="py-2.5 px-3 text-center font-mono font-bold text-muted-foreground">
                            {st.studentCode ? toPersianDigits(st.studentCode) : 'ـ'}
                          </td>

                          {/* Continuous 1 */}
                          <td className="py-2.5 px-3 text-center bg-sky-50/30 dark:bg-sky-950/10">
                            <Input
                              type="number"
                              step="0.25"
                              min="0"
                              max="20"
                              value={gData.continuous1}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGeneralGrades((prev) => ({
                                  ...prev,
                                  [sid]: { ...prev[sid], continuous1: val },
                                }));
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="۰-۲۰"
                              className="h-8 w-16 text-center font-bold text-xs mx-auto border-2 border-black"
                            />
                          </td>

                          {/* Final 1 */}
                          <td className="py-2.5 px-3 text-center bg-sky-50/30 dark:bg-sky-950/10">
                            <Input
                              type="number"
                              step="0.25"
                              min="0"
                              max="20"
                              value={gData.final1}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGeneralGrades((prev) => ({
                                  ...prev,
                                  [sid]: { ...prev[sid], final1: val },
                                }));
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="۰-۲۰"
                              className="h-8 w-16 text-center font-bold text-xs mx-auto border-2 border-black"
                            />
                          </td>

                          {/* Term 1 Avg */}
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-muted-foreground">
                            {term1Avg !== null ? toPersianDigits(term1Avg) : 'ـ'}
                          </td>

                          {/* Continuous 2 */}
                          <td className="py-2.5 px-3 text-center bg-amber-50/30 dark:bg-amber-950/10">
                            <Input
                              type="number"
                              step="0.25"
                              min="0"
                              max="20"
                              value={gData.continuous2}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGeneralGrades((prev) => ({
                                  ...prev,
                                  [sid]: { ...prev[sid], continuous2: val },
                                }));
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="۰-۲۰"
                              className="h-8 w-16 text-center font-bold text-xs mx-auto border-2 border-black"
                            />
                          </td>

                          {/* Final 2 */}
                          <td className="py-2.5 px-3 text-center bg-amber-50/30 dark:bg-amber-950/10">
                            <Input
                              type="number"
                              step="0.25"
                              min="0"
                              max="20"
                              value={gData.final2}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGeneralGrades((prev) => ({
                                  ...prev,
                                  [sid]: { ...prev[sid], final2: val },
                                }));
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="۰-۲۰"
                              className="h-8 w-16 text-center font-bold text-xs mx-auto border-2 border-black"
                            />
                          </td>

                          {/* Annual Grade */}
                          <td className="py-2.5 px-3 text-center bg-emerald-50/40 dark:bg-emerald-950/20 font-mono font-black text-sm">
                            {annualGrade !== null ? (
                              <span className={annualGrade >= 10 ? 'text-emerald-700' : 'text-rose-600'}>
                                {toPersianDigits(annualGrade)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">ـ</span>
                            )}
                          </td>

                          {/* Passed status */}
                          <td className="py-2.5 px-3 text-center">
                            {isPassed !== null ? (
                              <Badge
                                variant={isPassed ? 'ecosystem' : 'female'}
                                className="text-[10px] font-black"
                              >
                                {isPassed ? 'قبول' : 'تجدید'}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">ناتمام</span>
                            )}
                          </td>

                          {/* Dossier Button */}
                          <td className="py-2.5 px-3 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenDossier(sid)}
                              className="h-7 px-2 border-2 border-black font-black text-[10px] shadow-[1px_1px_0px_#000]"
                            >
                              پرونده ۳۶۰°
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          STEP 4: 360-DEGREE STUDENT DOSSIER MODAL (پرونده ۳۶۰ درجه عملکرد)
      ───────────────────────────────────────────────────────────────────── */}
      {dossierStudentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 animate-in fade-in">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-card border-3 border-black rounded-3xl shadow-[6px_6px_0px_#000] overflow-hidden flex flex-col text-right" dir="rtl">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b-2 border-black bg-neutral-100 dark:bg-neutral-900 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary text-black border-2 border-black flex items-center justify-center font-black text-lg shadow-[2px_2px_0px_#000]">
                  {dossierData?.student?.firstName?.[0] || 'د'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-foreground">
                      {dossierData?.student?.name || 'پرونده تحصیلی دانش‌آموز'}
                    </h3>
                    {dossierData?.kpis?.overallScore !== null && dossierData?.kpis?.overallScore !== undefined && (
                      <span className="bg-amber-400 text-black px-2 py-0.5 rounded-lg border border-black font-mono font-black text-xs shadow-[1px_1px_0px_#000]">
                        شاخص کل: {toPersianDigits(dossierData.kpis.overallScore)} از ۲۰
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-bold mt-0.5">
                    کلاس {selectedClassroom?.name} • درس {selectedLesson?.name}
                    {dossierData?.student?.studentCode && ` • کدداتش‌آموزی: ${toPersianDigits(dossierData.student.studentCode)}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDossierStudentId(null);
                  setDossierData(null);
                }}
                className="w-8 h-8 rounded-full border-2 border-black bg-white dark:bg-card hover:bg-neutral-100 flex items-center justify-center font-black text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {isLoadingDossier ? (
                <div className="py-16 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
                  <p className="text-xs font-black text-foreground">در حال واکشی اطلاعات پرونده ۳۶۰ درجه دانش‌آموز...</p>
                </div>
              ) : !dossierData ? (
                <div className="py-10 text-center text-xs text-muted-foreground font-bold">
                  اطلاعاتی برای این دانش‌آموز ثبت نشده است.
                </div>
              ) : (
                <>
                  {/* KPI Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-neutral-50 dark:bg-neutral-900 border-2 border-black p-3 rounded-2xl text-center">
                    <div className="bg-white dark:bg-card p-2 rounded-xl border border-black/10">
                      <span className="text-[10px] font-bold text-muted-foreground block">درصد حضور در درس</span>
                      <span className="text-sm font-black text-foreground">
                        {toPersianDigits(dossierData.kpis?.attendanceRate || 100)}٪
                      </span>
                      <span className="text-[9px] text-muted-foreground block mt-0.5">
                        ({toPersianDigits(dossierData.kpis?.presentCount || 0)} حاضر / {toPersianDigits(dossierData.kpis?.absentCount || 0)} غایب)
                      </span>
                    </div>

                    <div className="bg-white dark:bg-card p-2 rounded-xl border border-black/10">
                      <span className="text-[10px] font-bold text-muted-foreground block">میانگین پرسش کلاسی</span>
                      <span className="text-sm font-black text-amber-600">
                        {dossierData.kpis?.oralAverage !== null
                          ? `${toPersianDigits(dossierData.kpis.oralAverage)} از ۲۰`
                          : 'ثبت‌نشده'}
                      </span>
                      <span className="text-[9px] text-muted-foreground block mt-0.5">
                        ({toPersianDigits(dossierData.kpis?.oralGradesCount || 0)} جلسه پرسش)
                      </span>
                    </div>

                    <div className="bg-white dark:bg-card p-2 rounded-xl border border-black/10">
                      <span className="text-[10px] font-bold text-muted-foreground block">وضعیت تکالیف</span>
                      <span className="text-sm font-black text-sky-600">
                        {toPersianDigits(dossierData.kpis?.submittedHomeworks || 0)} از {toPersianDigits(dossierData.kpis?.totalHomeworks || 0)}
                      </span>
                      <span className="text-[9px] text-muted-foreground block mt-0.5">
                        میانگین: {dossierData.kpis?.homeworkAverage !== null ? toPersianDigits(dossierData.kpis.homeworkAverage) : 'ـ'}
                      </span>
                    </div>

                    <div className="bg-white dark:bg-card p-2 rounded-xl border border-black/10">
                      <span className="text-[10px] font-bold text-muted-foreground block">برآیند انضباطی</span>
                      <span className="text-sm font-black text-emerald-600">
                        {toPersianDigits(dossierData.kpis?.positiveRewardsCount || 0)} تشویق
                      </span>
                      <span className="text-[9px] text-rose-600 block mt-0.5 font-bold">
                        {toPersianDigits(dossierData.kpis?.negativeDisciplineCount || 0)} تذکر/منفی
                      </span>
                    </div>
                  </div>

                  {/* Modal Navigation Tabs */}
                  <div className="grid grid-cols-3 gap-1.5 bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl border border-black/20 text-xs font-black">
                    <button
                      type="button"
                      onClick={() => setDossierActiveTab('ORAL')}
                      className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${dossierActiveTab === 'ORAL'
                          ? 'bg-white dark:bg-card text-foreground border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                          : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      پرسش کلاسی و جلسات
                    </button>

                    <button
                      type="button"
                      onClick={() => setDossierActiveTab('HOMEWORK')}
                      className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${dossierActiveTab === 'HOMEWORK'
                          ? 'bg-white dark:bg-card text-foreground border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                          : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      <FileCheck className="w-3.5 h-3.5 text-sky-500" />
                      ارزشیابی تکالیف
                    </button>

                    <button
                      type="button"
                      onClick={() => setDossierActiveTab('ATTENDANCE')}
                      className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${dossierActiveTab === 'ATTENDANCE'
                          ? 'bg-white dark:bg-card text-foreground border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                          : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      <Clock className="w-3.5 h-3.5 text-emerald-500" />
                      حضور و غیاب و انضباط
                    </button>
                  </div>

                  {/* Tab 1: Oral Questions & Sessions */}
                  {dossierActiveTab === 'ORAL' && (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {dossierData.sessions?.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground font-bold">
                          جلسه‌ای برای این دانش‌آموز در این درس ثبت نشده است.
                        </div>
                      ) : (
                        dossierData.sessions.map((sess: any) => (
                          <div
                            key={sess.id}
                            className="bg-neutral-50 dark:bg-neutral-900 border-2 border-black/20 p-2.5 rounded-xl space-y-1 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-black text-foreground">
                                {formatJalaliDisplay(sess.date, false)}
                                {sess.periodNumber && ` (زنگ ${toPersianDigits(sess.periodNumber)})`}
                              </span>

                              {sess.oralGrade !== null && sess.oralGrade !== undefined ? (
                                <span className="font-black text-amber-900 bg-amber-200 dark:bg-amber-950 px-2 py-0.5 rounded border border-amber-500 text-[11px]">
                                  نمره پرسش: {toPersianDigits(sess.oralGrade)} از ۲۰
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground font-bold">بدون پرسش</span>
                              )}
                            </div>

                            {sess.rewardDisciplineType && sess.rewardDisciplineType !== 'NONE' && (
                              <div className="text-[11px] font-bold text-primary pt-0.5">
                                مورد انضباطی/تشویقی: {sess.rewardDisciplineType} {sess.rewardDisciplineNote && `(${sess.rewardDisciplineNote})`}
                              </div>
                            )}

                            {sess.sessionNote && (
                              <p className="text-[11px] text-muted-foreground pt-1 italic bg-white dark:bg-card p-1.5 rounded border border-black/10">
                                «{sess.sessionNote}»
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Tab 2: Homeworks */}
                  {dossierActiveTab === 'HOMEWORK' && (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {dossierData.homeworks?.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground font-bold">
                          تکلیفی برای این درس تعریف نشده است.
                        </div>
                      ) : (
                        dossierData.homeworks.map((hw: any) => (
                          <div
                            key={hw.id}
                            className="bg-neutral-50 dark:bg-neutral-900 border-2 border-black/20 p-2.5 rounded-xl flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-black text-foreground">{hw.title}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                مهلت: {formatJalaliDisplay(hw.dueDate, false)}
                              </div>
                            </div>

                            <div className="text-left">
                              {hw.score !== null ? (
                                <span className="font-black text-emerald-700 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-400">
                                  نمره: {toPersianDigits(hw.score)} از {toPersianDigits(hw.maxScore)}
                                </span>
                              ) : hw.isSubmitted ? (
                                <Badge variant="neutral" className="text-[10px]">در انتظار تصحیح</Badge>
                              ) : (
                                <Badge variant="female" className="text-[10px]">تحویل‌نشده</Badge>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Tab 3: Attendance History */}
                  {dossierActiveTab === 'ATTENDANCE' && (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {dossierData.sessions?.map((sess: any) => (
                        <div
                          key={sess.id}
                          className="bg-neutral-50 dark:bg-neutral-900 border-2 border-black/20 p-2.5 rounded-xl flex items-center justify-between text-xs"
                        >
                          <span className="font-black text-foreground">
                            {formatJalaliDisplay(sess.date, false)}
                            {sess.periodNumber && ` — زنگ ${toPersianDigits(sess.periodNumber)}`}
                          </span>

                          <Badge
                            variant={
                              sess.status === 'PRESENT'
                                ? 'ecosystem'
                                : sess.status === 'ABSENT'
                                  ? 'female'
                                  : 'college'
                            }
                            className="text-[10px] px-2 py-0.5"
                          >
                            {sess.status === 'PRESENT' && 'حاضر'}
                            {sess.status === 'ABSENT' && 'غایب'}
                            {sess.status === 'TARDY' && `تاخیر (${toPersianDigits(sess.delayMinutes)}د)`}
                            {sess.status === 'EXCUSED_ABSENT' && 'موجه'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t-2 border-black bg-neutral-100 dark:bg-neutral-900 flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDossierStudentId(null);
                  setDossierData(null);
                }}
                className="border-2 border-black font-black text-xs h-9 shadow-[1px_1px_0px_#000]"
              >
                بستن پرونده
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
