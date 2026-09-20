import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { apiClient } from '../../lib/api/client';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  FileCheck,
  HelpCircle,
  Play,
  Calendar,
  CalendarDays,
  Send,
  ArrowUpRight,
  TrendingUp,
  User,
  GraduationCap,
  ShieldAlert,
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

const DAY_NAMES: Record<string, string> = {
  SATURDAY: 'شنبه',
  SUNDAY: 'یکشنبه',
  MONDAY: 'دوشنبه',
  TUESDAY: 'سه‌شنبه',
  WEDNESDAY: 'چهارشنبه',
  THURSDAY: 'پنج‌شنبه',
};

export const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [scheduleData, setScheduleData] = useState<{ classroom: any; schedules: any[] } | null>(null);
  const [isScheduleLoading, setIsScheduleLoading] = useState(true);
  const [realHomework, setRealHomework] = useState<any[]>([]);
  const [realExams, setRealExams] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsScheduleLoading(true);
        const [schedRes, hwRes, examsRes] = await Promise.allSettled([
          apiClient.get('/classes/my-schedule'),
          apiClient.get('/homework'),
          apiClient.get('/exams'),
        ]);

        if (schedRes.status === 'fulfilled') {
          setScheduleData(schedRes.value.data);
        }
        if (hwRes.status === 'fulfilled') {
          const hw = Array.isArray(hwRes.value.data) ? hwRes.value.data : (hwRes.value as any)?.data || [];
          setRealHomework(hw);
        }
        if (examsRes.status === 'fulfilled') {
          const ex = Array.isArray(examsRes.value.data) ? examsRes.value.data : (examsRes.value as any)?.data || [];
          setRealExams(ex);
        }
      } catch (err) {
        console.error('Failed to load student dashboard data', err);
      } finally {
        setIsScheduleLoading(false);
      }
    };

    fetchData();
  }, []);

  const todayKey = getPersianDayKey();
  const todaySchedules = (scheduleData?.schedules || [])
    .filter((s: any) => s.dayOfWeek === todayKey)
    .sort((a: any, b: any) => a.periodNumber - b.periodNumber);

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rokad-card p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-ink-darker dark:text-white">
              درود، {user?.firstName} {user?.lastName}
            </h1>
            {scheduleData?.classroom ? (
              <Badge variant="default" className="text-[11px] mt-1">
                {scheduleData.classroom.level?.name ? `پایه ${scheduleData.classroom.level.name} - ` : ''}
                {scheduleData.classroom.field?.name ? `${scheduleData.classroom.field.name} ` : ''}
                ({scheduleData.classroom.name})
              </Badge>
            ) : (
              <Badge variant="neutral" className="text-[11px] mt-1">دانش‌آموز هنرستان</Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/student/schedule')}
            className="flex-1 sm:flex-none"
          >
            <Calendar className="h-4 w-4" />
            <span>برنامه هفتگی</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/student/grades')}
            className="flex-1 sm:flex-none"
          >
            کارنامه
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/student/exams')}
            className="flex-1 sm:flex-none"
          >
            <span>آزمون‌ها</span>
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <Card className="p-4 sm:p-5">
          <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
            <span>معدل نیم‌سال</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-primary font-mono">۱۹.۳۱</div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">رتبه ۲ پایه دهم</p>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
            <span>تکالیف جاری</span>
            <FileCheck className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-ink-darker dark:text-white font-mono">۲ تکلیف</div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">مهلت نزدیک‌ترین: فردا</p>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
            <span>آزمون‌های فعال</span>
            <HelpCircle className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-ink-darker dark:text-white font-mono">۱ آزمون</div>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-1">آماده شرکت آنلاین</p>
        </Card>

        <Card
          onClick={() => navigate('/app/student/matters')}
          className="p-4 sm:p-5 cursor-pointer group"
        >
          <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
            <span>پرونده انضباطی</span>
            <ShieldAlert className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-ink-darker dark:text-white group-hover:text-primary transition-colors">
            پرونده منظم
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">بدون مورد منفی</p>
        </Card>
      </div>

      {/* Today's Schedule Card */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-black text-sm sm:text-base text-ink-darker dark:text-white flex items-center gap-2">
                <span>برنامه کلاسی امروز</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold">
                  {DAY_NAMES[todayKey]}
                </span>
              </h2>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/student/schedule')}
            className="self-start sm:self-auto"
          >
            <span>برنامه کامل</span>
            <ArrowUpRight className="h-4 w-4 mr-1" />
          </Button>
        </div>

        {isScheduleLoading ? (
          <div className="py-8 text-center text-xs text-gray-400">در حال دریافت برنامه...</div>
        ) : todaySchedules.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {todaySchedules.map((item: any) => (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all flex flex-col justify-between text-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="font-bold text-[11px] text-primary">
                      زنگ {item.periodNumber}
                    </span>
                    <span className="font-mono text-[10px] text-gray-500 dark:text-gray-400 dir-ltr bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-100 dark:border-gray-700">
                      {item.startTime} - {item.endTime}
                    </span>
                  </div>
                  <div className="font-bold text-ink-darker dark:text-white line-clamp-1">
                    {item.lesson?.name || 'درس'}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-primary/10">
                  <User className="h-3 w-3 text-primary shrink-0" />
                  <span className="truncate">
                    {item.teacher?.user?.firstName} {item.teacher?.user?.lastName || 'دبیر'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            امروز کلاس درسی برنامه‌ریزی نشده است.
          </div>
        )}
      </Card>

      {/* Main Content: Homework & Online Exams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Homework List */}
        <Card className="p-4 sm:p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black text-sm sm:text-base text-ink-darker dark:text-white">
              تکالیف درسی
            </h2>
            <button
              type="button"
              onClick={() => navigate('/app/student/homework')}
              className="text-xs text-primary font-bold hover:underline min-h-[36px] flex items-center"
            >
              مشاهده همه ←
            </button>
          </div>

          <div className="space-y-3">
            {realHomework.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                تکلیف فعالی وجود ندارد.
              </div>
            ) : (
              realHomework.slice(0, 4).map((hw) => {
                const mySub = hw.submissions && hw.submissions.length > 0 ? hw.submissions[0] : null;
                const isGraded = mySub && (mySub.score !== null && mySub.score !== undefined);
                const isSubmitted = mySub && !isGraded;

                return (
                  <div key={hw.id} className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 flex items-center justify-between text-xs gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-ink-darker dark:text-white truncate">{hw.title}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {hw.lesson?.name || 'درس'} •{' '}
                        {isGraded ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">نمره: {mySub.score}</span>
                        ) : isSubmitted ? (
                          <span className="text-blue-600 dark:text-blue-400 font-bold">در انتظار تصحیح</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-bold">مهلت تحویل فعال</span>
                        )}
                      </div>
                    </div>

                    <Button
                      variant={isGraded ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() =>
                        navigate(
                          `/app/student/homework?homeworkId=${hw.id}${!isGraded && !isSubmitted ? '&action=submit' : ''}`
                        )
                      }
                      className="shrink-0"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{isGraded ? 'بازخورد' : isSubmitted ? 'پاسخ' : 'ارسال'}</span>
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Online Exams List */}
        <Card className="p-4 sm:p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black text-sm sm:text-base text-ink-darker dark:text-white">
              آزمون‌های آنلاین
            </h2>
            <Badge variant="success">آماده شرکت</Badge>
          </div>

          <div className="space-y-3">
            {realExams.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                آزمون فعالی وجود ندارد.
              </div>
            ) : (
              realExams.slice(0, 3).map((ex) => (
                <div key={ex.id} className="p-3.5 rounded-xl border bg-primary-light/30 dark:bg-primary-darker/20 border-primary/30 flex items-center justify-between text-xs gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-ink-darker dark:text-white truncate">{ex.title}</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {ex.lesson?.name || 'درس'} • {ex.durationMinutes || 60} دقیقه
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/app/student/exams?examId=${ex.id}&action=start`)}
                    className="shrink-0"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>شروع</span>
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
