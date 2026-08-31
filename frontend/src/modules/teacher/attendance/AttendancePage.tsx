import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
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
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  Users,
  AlertCircle,
} from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: string; delayMinutes: number; note: string }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const res = await apiClient.get('/classes/classrooms');
        setClassrooms(res.data || []);
        if (res.data?.length > 0) {
          setSelectedClassId(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load classrooms', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClassrooms();
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;

    const fetchStudentsAndAttendance = async () => {
      try {
        setIsLoading(true);
        const [studentsRes, attendanceRes] = await Promise.all([
          apiClient.get(`/classes/classrooms/${selectedClassId}/students`),
          apiClient.get(`/attendance/records?classroomId=${selectedClassId}&date=${date}`),
        ]);

        const studentList = studentsRes.data || [];
        setStudents(studentList);

        // Map existing attendance or default to PRESENT
        const map: Record<string, any> = {};
        const existingRecords = attendanceRes.data || [];

        studentList.forEach((s: any) => {
          const rec = existingRecords.find((r: any) => r.studentId === s.id);
          if (rec) {
            map[s.id] = {
              status: rec.status,
              delayMinutes: rec.delayMinutes || 0,
              note: rec.note || '',
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
      } catch (err) {
        console.error('Failed to load attendance', err);
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
        delayMinutes: status === 'LATE' ? 15 : 0,
      },
    }));
  };

  const handleSaveAttendance = async () => {
    setIsSaving(true);
    setSaveSuccess(null);
    try {
      const records = students.map((s) => ({
        studentId: s.id,
        classroomId: selectedClassId,
        date: new Date(date).toISOString(),
        status: attendanceMap[s.id]?.status || 'PRESENT',
        delayMinutes: Number(attendanceMap[s.id]?.delayMinutes || 0),
        note: attendanceMap[s.id]?.note || '',
      }));

      await apiClient.post('/attendance/bulk', { records });
      setSaveSuccess('حضور و غیاب این جلسه با موفقیت در سامانه ذخیره شد.');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message || 'خطا در ثبت حضور و غیاب.');
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
          className="flex items-center space-x-1.5 space-x-reverse"
        >
          <Save className="h-4 w-4" />
          <span>ذخیره نهایی حضور و غیاب</span>
        </Button>
      </div>

      {/* Class and Date Selector Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2 space-x-reverse">
            <label className="text-xs font-bold text-ink-dark">انتخاب کلاس:</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="h-10 text-xs px-3 rounded-md border border-gray-300 bg-white font-medium focus:ring-2 focus:ring-primary"
            >
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            <label className="text-xs font-bold text-ink-dark">تاریخ جلسه:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 text-xs px-3 rounded-md border border-gray-300 bg-white font-mono focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <Button variant="secondary" size="sm" onClick={markAllPresent}>
          علامت‌زدن همه به عنوان «حاضر»
        </Button>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center space-x-2 space-x-reverse text-xs font-medium">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Attendance Roster Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>نام دانش‌آموز</TableHead>
            <TableHead>شماره دانش‌آموزی</TableHead>
            <TableHead className="text-center">وضعیت حضور در کلاس</TableHead>
            <TableHead>دقایق تاخیر</TableHead>
            <TableHead>یادداشت معلم</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-8 w-48 mx-auto" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
              </TableRow>
            ))
          ) : students.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                هیچ دانش‌آموزی در این کلاس ثبت نشده است.
              </TableCell>
            </TableRow>
          ) : (
            students.map((s) => {
              const currentStatus = attendanceMap[s.id]?.status || 'PRESENT';

              return (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-bold text-ink-darker">
                      {s.user?.firstName} {s.user?.lastName}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs font-bold text-gray-600">
                      {s.studentCode || s.studentNumber}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1.5">
                      {/* Present */}
                      <button
                        type="button"
                        onClick={() => setStudentStatus(s.id, 'PRESENT')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          currentStatus === 'PRESENT'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        حاضر
                      </button>

                      {/* Absent Excused */}
                      <button
                        type="button"
                        onClick={() => setStudentStatus(s.id, 'ABSENT_EXCUSED')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          currentStatus === 'ABSENT_EXCUSED'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        غیبت موجه
                      </button>

                      {/* Absent Unexcused */}
                      <button
                        type="button"
                        onClick={() => setStudentStatus(s.id, 'ABSENT_UNEXCUSED')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          currentStatus === 'ABSENT_UNEXCUSED'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        غیبت غیرموجه
                      </button>

                      {/* Late */}
                      <button
                        type="button"
                        onClick={() => setStudentStatus(s.id, 'LATE')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          currentStatus === 'LATE'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        تاخیر ورود
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {currentStatus === 'LATE' ? (
                      <div className="flex items-center space-x-1 space-x-reverse">
                        <input
                          type="number"
                          value={attendanceMap[s.id]?.delayMinutes || 15}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setAttendanceMap((prev) => ({
                              ...prev,
                              [s.id]: { ...prev[s.id], delayMinutes: val },
                            }));
                          }}
                          className="w-16 h-8 text-center text-xs font-bold border rounded px-1"
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
                      placeholder="یادداشت اختیاری..."
                      value={attendanceMap[s.id]?.note || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAttendanceMap((prev) => ({
                          ...prev,
                          [s.id]: { ...prev[s.id], note: val },
                        }));
                      }}
                      className="w-full h-8 text-xs border rounded px-2.5 bg-gray-50 focus:bg-white"
                    />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};
