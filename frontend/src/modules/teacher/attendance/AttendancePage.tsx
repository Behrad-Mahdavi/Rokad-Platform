import React, { useEffect, useState } from 'react';
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
import { PersianDatePicker } from '../../../components/ui/PersianDatePicker';
import {
  gregorianToJalaliStr,
  jalaliToGregorianDate,
} from '../../../utils/jalali';
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  Save,
  Users,
  AlertCircle,
  UserCheck,
  UserX,
} from 'lucide-react';

interface NormalizedStudent {
  id: string;
  studentCode?: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

export const AttendancePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const classroomIdParam = searchParams.get('classroomId');

  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [date, setDate] = useState<string>(gregorianToJalaliStr(new Date()));
  const [students, setStudents] = useState<NormalizedStudent[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, { status: string; delayMinutes: number; note: string }>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Fetch classrooms
  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const res = await apiClient.get('/classes/classrooms');
        const list = res.data || [];
        setClassrooms(list);
        if (classroomIdParam && list.some((c: any) => c.id === classroomIdParam)) {
          setSelectedClassId(classroomIdParam);
        } else if (list.length > 0) {
          setSelectedClassId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load classrooms', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClassrooms();
  }, [classroomIdParam]);

  // 2. Fetch students & attendance for selected class and date
  useEffect(() => {
    if (!selectedClassId) return;

    const fetchStudentsAndAttendance = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        // Convert Jalali date to Gregorian YYYY-MM-DD for backend
        const gregorianDate = jalaliToGregorianDate(date);
        const dateStr = gregorianDate.toISOString().split('T')[0];

        const [studentsRes, attendanceRes] = await Promise.all([
          apiClient.get(`/classes/classrooms/${selectedClassId}/students`),
          apiClient
            .get(`/attendance/classroom/${selectedClassId}?date=${dateStr}`)
            .catch(() => ({ data: [] })),
        ]);

        // Normalize enrolled students list
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

        // Map existing attendance or default to PRESENT
        const map: Record<string, any> = {};
        const existingRecords = attendanceRes.data || [];

        normalized.forEach((s) => {
          const rec = existingRecords.find((r: any) => r.studentId === s.id);
          if (rec) {
            map[s.id] = {
              status: rec.status || 'PRESENT',
              delayMinutes: rec.delayMinutes || 0,
              note: rec.reason || rec.note || '',
            };
          } else {
            map[s.id] = {
              status: 'PRESENT',
              delayMinutes: 0,
              note: '',
            };
          }
        });

        setAttendanceMap(map);
      } catch (err: any) {
        console.error('Failed to load attendance', err);
        setErrorMessage('خطا در دریافت اطلاعات کلاس یا سوابق حضور و غیاب.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentsAndAttendance();
  }, [selectedClassId, date]);

  const setStudentStatus = (studentId: string, status: string) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
        delayMinutes: status === 'TARDY' ? 15 : 0,
      },
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedClassId) return;
    setIsSaving(true);
    setSaveSuccess(null);
    setErrorMessage(null);

    try {
      const currentClass = classrooms.find((c) => c.id === selectedClassId);
      const academicYearId = currentClass?.academicYearId || '';
      const gregorianDate = jalaliToGregorianDate(date);
      const dateStr = gregorianDate.toISOString().split('T')[0];

      const attendances = students.map((s) => ({
        studentId: s.id,
        status: attendanceMap[s.id]?.status || 'PRESENT',
        delayMinutes: Number(attendanceMap[s.id]?.delayMinutes || 0),
        reason: attendanceMap[s.id]?.note?.trim() || undefined,
      }));

      await apiClient.post('/attendance/students/bulk', {
        academicYearId,
        classroomId: selectedClassId,
        date: dateStr,
        attendances,
      });

      setSaveSuccess('حضور و غیاب این جلسه با موفقیت در سامانه ذخیره شد.');
      setTimeout(() => setSaveSuccess(null), 3500);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'خطا در ذخیره حضور و غیاب';
      setErrorMessage(Array.isArray(msg) ? msg.join(' - ') : msg);
    } finally {
      setIsSaving(false);
    }
  };

  const markAllPresent = () => {
    const map: Record<string, any> = {};
    students.forEach((s) => {
      map[s.id] = { status: 'PRESENT', delayMinutes: 0, note: '' };
    });
    setAttendanceMap(map);
  };

  // Stats calculation
  const presentCount = students.filter((s) => (attendanceMap[s.id]?.status || 'PRESENT') === 'PRESENT').length;
  const excusedCount = students.filter((s) => attendanceMap[s.id]?.status === 'EXCUSED_ABSENT').length;
  const absentCount = students.filter((s) => attendanceMap[s.id]?.status === 'ABSENT').length;
  const tardyCount = students.filter((s) => attendanceMap[s.id]?.status === 'TARDY').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink-darker flex items-center space-x-2 space-x-reverse">
            <CalendarDays className="h-6 w-6 text-primary" />
            <span>ثبت هوشمند حضور و غیاب کلاسی (Attendance Cockpit)</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            ثبت الکترونیکی وضعیت حضور، غیبت موجه/غیرموجه و تاخیر دانش‌آموزان با اطلاع‌رسانی خودکار به اولیاء
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleSaveAttendance}
          isLoading={isSaving}
          disabled={isLoading || students.length === 0}
          className="flex items-center space-x-1.5 space-x-reverse"
        >
          <Save className="h-4 w-4" />
          <span>ذخیره نهایی حضور و غیاب</span>
        </Button>
      </div>

      {/* Class and Date Selector Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="flex items-center space-x-2 space-x-reverse">
            <label className="text-xs font-bold text-ink-dark shrink-0">انتخاب کلاس:</label>
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

          <div className="flex items-center space-x-2 space-x-reverse min-w-[220px]">
            <label className="text-xs font-bold text-ink-dark shrink-0">تاریخ جلسه:</label>
            <PersianDatePicker value={date} onChange={setDate} />
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={markAllPresent}
          disabled={isLoading || students.length === 0}
          className="text-xs font-semibold"
        >
          علامت‌زدن همه به عنوان «حاضر»
        </Button>
      </div>

      {/* Stats Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-500 font-medium">کل هنرجویان کلاس</span>
            <div className="text-lg font-black text-ink-darker mt-0.5">{students.length}</div>
          </div>
          <Users className="w-5 h-5 text-gray-400" />
        </div>

        <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-emerald-700 font-medium">حاضرین</span>
            <div className="text-lg font-black text-emerald-700 mt-0.5">{presentCount}</div>
          </div>
          <UserCheck className="w-5 h-5 text-emerald-600" />
        </div>

        <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-rose-700 font-medium">غائبین (غیرموجه/موجه)</span>
            <div className="text-lg font-black text-rose-700 mt-0.5">{absentCount + excusedCount}</div>
          </div>
          <UserX className="w-5 h-5 text-rose-600" />
        </div>

        <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-blue-700 font-medium">تاخیر ورود</span>
            <div className="text-lg font-black text-blue-700 mt-0.5">{tardyCount}</div>
          </div>
          <Clock className="w-5 h-5 text-blue-600" />
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

      {/* Attendance Roster Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>نام و نام خانوادگی هنرجو</TableHead>
              <TableHead>شماره دانش‌آموزی</TableHead>
              <TableHead className="text-center">وضعیت حضور در کلاس</TableHead>
              <TableHead>دقایق تاخیر</TableHead>
              <TableHead>یادداشت یا علت غیبت</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-64 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                </TableRow>
              ))
            ) : students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-gray-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Users className="w-8 h-8 text-gray-300" />
                    <span>هیچ دانش‌آموزی در این کلاس ثبت‌نام نشده است.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              students.map((s) => {
                const currentStatus = attendanceMap[s.id]?.status || 'PRESENT';

                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-bold text-ink-darker">
                        {s.firstName} {s.lastName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-bold text-gray-600">
                        {s.studentCode || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1.5">
                        {/* 1. Present */}
                        <button
                          type="button"
                          onClick={() => setStudentStatus(s.id, 'PRESENT')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === 'PRESENT'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          حاضر
                        </button>

                        {/* 2. Excused Absent */}
                        <button
                          type="button"
                          onClick={() => setStudentStatus(s.id, 'EXCUSED_ABSENT')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === 'EXCUSED_ABSENT'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          غیبت موجه
                        </button>

                        {/* 3. Unexcused Absent */}
                        <button
                          type="button"
                          onClick={() => setStudentStatus(s.id, 'ABSENT')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === 'ABSENT'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          غیبت غیرموجه
                        </button>

                        {/* 4. Tardy */}
                        <button
                          type="button"
                          onClick={() => setStudentStatus(s.id, 'TARDY')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === 'TARDY'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          تاخیر ورود
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {currentStatus === 'TARDY' ? (
                        <div className="flex items-center space-x-1.5 space-x-reverse">
                          <input
                            type="number"
                            min="1"
                            max="120"
                            value={attendanceMap[s.id]?.delayMinutes || 15}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setAttendanceMap((prev) => ({
                                ...prev,
                                [s.id]: { ...prev[s.id], delayMinutes: val },
                              }));
                            }}
                            className="w-16 h-8 text-center text-xs font-bold border border-gray-300 rounded-lg px-1 outline-none focus:ring-1 focus:ring-primary"
                          />
                          <span className="text-[11px] text-gray-500">دقیقه</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <input
                        type="text"
                        placeholder="یادداشت یا علت غیبت..."
                        value={attendanceMap[s.id]?.note || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAttendanceMap((prev) => ({
                            ...prev,
                            [s.id]: { ...prev[s.id], note: val },
                          }));
                        }}
                        className="w-full h-8 text-xs border border-gray-200 rounded-lg px-2.5 bg-gray-50 focus:bg-white outline-none focus:border-primary"
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
