import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { apiClient } from '../../lib/api/client';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  CalendarDays,
  FileCheck,
  HelpCircle,
  BookOpen,
  ArrowUpRight,
  Award,
} from 'lucide-react';

const getPersianDayKey = (): string => {
  const dayIndex = new Date().getDay(); // 0 is Sunday, 6 is Saturday
  switch (dayIndex) {
    case 6: return 'SATURDAY';
    case 0: return 'SUNDAY';
    case 1: return 'MONDAY';
    case 2: return 'TUESDAY';
    case 3: return 'WEDNESDAY';
    case 4: return 'THURSDAY';
    default: return 'SATURDAY';
  }
};

export const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [schedRes, hwRes] = await Promise.allSettled([
          apiClient.get('/classes/my-schedule'),
          apiClient.get('/homework'),
        ]);

        if (schedRes.status === 'fulfilled') {
          const sData = schedRes.value.data;
          setSchedules(sData?.schedules || (Array.isArray(sData) ? sData : []));
        }
        if (hwRes.status === 'fulfilled') {
          const hData = hwRes.value.data;
          setHomeworkList(Array.isArray(hData) ? hData : (hData?.data || []));
        }
      } catch (err) {
        console.error('Failed to load teacher dashboard', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const todayKey = getPersianDayKey();
  const todaySchedules = schedules.filter((s: any) => s.dayOfWeek === todayKey);

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="relative overflow-hidden rokad-card p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-ink-darker dark:text-white">
              درود، {user?.firstName} {user?.lastName}
            </h1>
            <Badge variant="male" className="text-[11px] mt-1">مربی تخصصی</Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/teacher/attendance')}
            className="flex-1 sm:flex-none"
          >
            حضور و غیاب
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/teacher/homework')}
            className="flex-1 sm:flex-none"
          >
            <span>تصحیح تکالیف</span>
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <Card className="p-4 sm:p-5">
          <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
            <span>کلاس‌های امروز</span>
            <CalendarDays className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-ink-darker dark:text-white font-mono">۳ جلسه</div>
          <p className="text-[11px] text-primary font-medium mt-1">جلسه فعال: کلاس ۱۰۲</p>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
            <span>تکالیف نیازمند بررسی</span>
            <FileCheck className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-ink-darker dark:text-white font-mono">۱۲ ارسال</div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">۳ مهلت امروز</p>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
            <span>آزمون‌های فعال</span>
            <HelpCircle className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-ink-darker dark:text-white font-mono">۱ آزمون</div>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-1">۲۸ شرکت‌کننده</p>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
            <span>میانگین نمرات</span>
            <Award className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">۱۹.۰۵</div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">رشد مطلوب</p>
        </Card>
      </div>

      {/* Main Row: Schedule & Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Today's Schedule Card */}
        <Card className="p-4 sm:p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black text-sm sm:text-base text-ink-darker dark:text-white">
              برنامه تدریس امروز
            </h2>
            <div className="flex items-center gap-2">
              <Badge variant="default">امروز</Badge>
              <button
                type="button"
                onClick={() => navigate('/app/teacher/schedule')}
                className="text-xs text-primary font-bold hover:underline min-h-[36px] flex items-center"
              >
                برنامه کامل ←
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {todaySchedules.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                امروز کلاسی ثبت نشده است.
              </div>
            ) : (
              todaySchedules.map((s) => (
                <div key={s.id} className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 flex items-center justify-between text-xs gap-3">
                  <div>
                    <div className="font-bold text-ink-darker dark:text-white">{s.classroom?.name}</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                      {s.lesson?.name} • {s.startTime} تا {s.endTime}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/app/teacher/attendance?classroomId=${s.classroomId}`)}
                    className="shrink-0"
                  >
                    ثبت حضور
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Pending Submissions Card */}
        <Card className="p-4 sm:p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black text-sm sm:text-base text-ink-darker dark:text-white">
              تکالیف و پاسخ‌ها
            </h2>
            <button
              type="button"
              onClick={() => navigate('/app/teacher/homework')}
              className="text-xs text-primary font-bold hover:underline min-h-[36px] flex items-center"
            >
              مشاهده همه ←
            </button>
          </div>

          <div className="space-y-3">
            {homeworkList.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                تکلیفی ثبت نشده است.
              </div>
            ) : (
              homeworkList.slice(0, 3).map((hw) => (
                <div key={hw.id} className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 flex items-center justify-between text-xs gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-ink-darker dark:text-white truncate">
                      {hw.title} ({hw.classroom?.name || 'کلاس'})
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {hw.lesson?.name || 'درس'} • {hw._count?.submissions || 0} پاسخ
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/app/teacher/homework?homeworkId=${hw.id}&action=submissions`)}
                    className="shrink-0"
                  >
                    تصحیح
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
