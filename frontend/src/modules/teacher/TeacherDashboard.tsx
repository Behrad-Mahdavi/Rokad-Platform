import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { apiClient } from '../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  CalendarDays,
  FileCheck,
  HelpCircle,
  BookOpen,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  Users,
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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-white dark:bg-[#151C28] bg-gradient-to-l from-primary/15 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/5 dark:to-transparent p-3.5 sm:p-5 md:p-6 rounded-2xl border border-primary/30 dark:border-[#242F42] shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <BookOpen className="h-5 w-5 text-primary shrink-0" />
            <span className="text-lg sm:text-xl font-black text-ink-darker dark:text-white">
              خوش آمدید، {user?.firstName} {user?.lastName}
            </span>
            <Badge variant="male" className="text-[11px]">مربی تخصصی</Badge>
          </div>
        </div>

        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/teacher/attendance')}
            className="text-xs dark:bg-[#1C2536] dark:text-white dark:border-gray-700"
          >
            دفتر حضور و غیاب
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/teacher/homework')}
            className="text-xs flex items-center space-x-1 space-x-reverse"
          >
            <span>تصحیح تکالیف</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <Card className="p-3.5 sm:p-5 border hover:border-primary transition-all">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-1.5">
            <span>کلاس‌های امروز</span>
            <CalendarDays className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-ink-darker">۳ جلسه</div>
          <p className="text-[11px] text-primary font-medium mt-1">جلسه فعال: کلاس ۱۰۲</p>
        </Card>

        <Card className="p-3.5 sm:p-5 border hover:border-amber-500 transition-all">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-1.5">
            <span>تکالیف در انتظار تصحیح</span>
            <FileCheck className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-ink-darker">۱۲ ارسال</div>
          <p className="text-[11px] text-amber-600 font-medium mt-1">۳ تکلیف مهلت امروز</p>
        </Card>

        <Card className="p-3.5 sm:p-5 border hover:border-blue-500 transition-all">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-1.5">
            <span>آزمون آنلاین فعال</span>
            <HelpCircle className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-ink-darker">۱ آزمون</div>
          <p className="text-[11px] text-blue-600 font-medium mt-1">۲۸ شرکت‌کننده برخط</p>
        </Card>

        <Card className="p-3.5 sm:p-5 border hover:border-purple-500 transition-all">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-1.5">
            <span>میانگین نمرات کلاس‌ها</span>
            <Award className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-700">۱۹.۰۵</div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">رشد ممتاز آموزشی</p>
        </Card>
      </div>

      {/* Main Row: Schedule & Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Today's Schedule Card */}
        <Card className="p-4 sm:p-5 md:p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-black text-base sm:text-lg text-ink-darker">برنامه تدریس امروز شما</h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default">امروز</Badge>
              <a href="/app/teacher/schedule" className="text-xs text-primary font-bold hover:underline">
                کل برنامه هفتگی ←
              </a>
            </div>
          </div>

          <div className="space-y-3">
            {todaySchedules.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                امروز در سامانه کلاسی برای شما ثبت نشده است.
              </div>
            ) : (
              todaySchedules.map((s) => (
                <div key={s.id} className="p-3.5 rounded-xl border bg-gray-50 flex items-center justify-between text-xs gap-3">
                  <div>
                    <div className="font-bold text-ink-darker">{s.classroom?.name}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      {s.lesson?.name} • ساعت {s.startTime} تا {s.endTime}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/app/teacher/attendance?classroomId=${s.classroomId}`)}
                    className="text-xs shrink-0"
                  >
                    ثبت حضور و غیاب
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Pending Submissions Card */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-sm text-ink-darker">تکالیف فعال و پاسخ‌های دریافتی</h3>
              <p className="text-[11px] text-gray-400">بررسی سریع و نمره‌دهی تمرینات دانش‌آموزان</p>
            </div>
            <a href="/app/teacher/homework" className="text-xs text-primary font-bold hover:underline">
              مشاهده همه ←
            </a>
          </div>

          <div className="space-y-3">
            {homeworkList.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                در حال حاضر تکلیفی ثبت نشده است.
              </div>
            ) : (
              homeworkList.slice(0, 3).map((hw) => (
                <div key={hw.id} className="p-3.5 rounded-xl border bg-gray-50 flex items-center justify-between text-xs gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-ink-darker truncate">
                      {hw.title} ({hw.classroom?.name || 'کلاس'})
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                      {hw.lesson?.name || 'درس'} • {hw._count?.submissions || 0} پاسخ ارسال‌شده
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/app/teacher/homework?homeworkId=${hw.id}&action=submissions`)}
                    className="text-xs shrink-0"
                  >
                    تصحیح و نمره
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
