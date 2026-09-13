import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { apiClient } from '../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Award,
  BookOpen,
  Clock,
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
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-l from-primary/10 via-primary-light/20 to-white p-6 rounded-2xl border border-primary/20 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 space-x-reverse mb-1">
            <GraduationCap className="h-6 w-6 text-primary shrink-0" />
            <span className="text-xl font-bold text-ink-darker">
              سلام، {user?.firstName} عزیز!
            </span>
            {scheduleData?.classroom ? (
              <Badge variant="default" className="flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5" />
                <span>
                  {scheduleData.classroom.level?.name ? `پایه ${scheduleData.classroom.level.name} - ` : ''}
                  {scheduleData.classroom.field?.name ? `${scheduleData.classroom.field.name} ` : ''}
                  ({scheduleData.classroom.name})
                </span>
              </Badge>
            ) : (
              <Badge variant="neutral">هنرجوی هنرستان رکاد</Badge>
            )}
          </div>
          <p className="text-xs text-gray-500">
            برنامه کارگاهی، پروژه‌های عملی در انتظار تحویل و پودمان‌های ارزشیابی شما
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/student/schedule')}
            className="text-xs flex items-center space-x-1 space-x-reverse"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>برنامه هفتگی کلاس من</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/student/grades')}
            className="text-xs"
          >
            مشاهده کارنامه
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/student/exams')}
            className="text-xs flex items-center space-x-1 space-x-reverse"
          >
            <span>آزمون‌های من</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border hover:border-primary transition-all">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
            <span>معدل کل نیم‌سال</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-extrabold text-primary">۱۹.۳۱</div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">رتبه ۲ در پایه دهم</p>
        </Card>

        <Card className="p-5 border hover:border-amber-500 transition-all">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
            <span>تکالیف نیازمند تحویل</span>
            <FileCheck className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-ink-darker">۲ تکلیف</div>
          <p className="text-[11px] text-amber-600 font-medium mt-1">مهلت نزدیک‌ترین: فردا</p>
        </Card>

        <Card className="p-5 border hover:border-blue-500 transition-all">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
            <span>آزمون‌های آنلاین فعال</span>
            <HelpCircle className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-3xl font-extrabold text-ink-darker">۱ آزمون</div>
          <p className="text-[11px] text-blue-600 font-medium mt-1">آماده برگزاری آنلاین</p>
        </Card>

        <Card className="p-5 border hover:border-purple-500 transition-all">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
            <span>نمره انضباط</span>
            <Award className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-600">۲۰.۰۰</div>
          <p className="text-[11px] text-gray-500 font-medium mt-1">بدون تاخیر یا غیبت</p>
        </Card>
      </div>

      {/* Today's Schedule Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-ink-darker flex items-center gap-2">
                <span>برنامه کلاسی امروز شما</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold">
                  {DAY_NAMES[todayKey]}
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">
                {scheduleData?.classroom
                  ? `کلاس ${scheduleData.classroom.name}`
                  : 'در حال بارگذاری...'}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/student/schedule')}
            className="text-xs self-start sm:self-auto"
          >
            <span>مشاهده کل هفته</span>
            <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
          </Button>
        </div>

        {isScheduleLoading ? (
          <div className="py-8 text-center text-xs text-gray-400">در حال بارگذاری برنامه درسی...</div>
        ) : todaySchedules.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {todaySchedules.map((item: any) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all flex flex-col justify-between text-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="font-bold text-[11px] text-primary">
                      زنگ {item.periodNumber}
                    </span>
                    <span className="font-mono text-[10px] text-gray-500 dir-ltr bg-white px-1.5 py-0.5 rounded border border-gray-100">
                      {item.startTime} - {item.endTime}
                    </span>
                  </div>
                  <div className="font-bold text-ink-darker line-clamp-1">
                    {item.lesson?.name || 'درس'}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-2 pt-2 border-t border-primary/10">
                  <User className="h-3 w-3 text-primary shrink-0" />
                  <span className="truncate">
                    {item.teacher?.user?.firstName} {item.teacher?.user?.lastName || 'دبیر'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            برای روز {DAY_NAMES[todayKey]} زنگ درسی در سامانه ثبت نشده است یا امروز روز تعطیل است.
          </div>
        )}
      </Card>

      {/* Main Content: Homework & Online Exams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Homework List */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-sm text-ink-darker">تکالیف درسی پیش‌رو</h3>
              <p className="text-[11px] text-gray-400">تمرینات مشخص‌شده توسط معلمان</p>
            </div>
            <a href="/app/student/homework" className="text-xs text-primary font-bold hover:underline">
              مشاهده همه ←
            </a>
          </div>

          <div className="space-y-3">
            {realHomework.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                در حال حاضر هیچ تکلیف فعالی ثبت نشده است.
              </div>
            ) : (
              realHomework.slice(0, 4).map((hw) => {
                const mySub = hw.submissions && hw.submissions.length > 0 ? hw.submissions[0] : null;
                const isGraded = mySub && (mySub.score !== null && mySub.score !== undefined);
                const isSubmitted = mySub && !isGraded;

                return (
                  <div key={hw.id} className="p-3.5 rounded-xl border bg-gray-50 flex items-center justify-between text-xs gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-ink-darker truncate">{hw.title}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                        {hw.lesson?.name || 'درس'} •{' '}
                        {isGraded ? (
                          <span className="text-emerald-600 font-bold">نمره ثبت شد: {mySub.score}</span>
                        ) : isSubmitted ? (
                          <span className="text-blue-600 font-bold">در انتظار تصحیح دبیر</span>
                        ) : (
                          <span className="text-amber-600 font-bold">مهلت تحویل فعال</span>
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
                      className="text-xs shrink-0 flex items-center space-x-1 space-x-reverse"
                    >
                      <Send className="h-3 w-3" />
                      <span>{isGraded ? 'مشاهده بازخورد' : isSubmitted ? 'مشاهده پاسخ' : 'ارسال پاسخ'}</span>
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Online Exams List */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-sm text-ink-darker">آزمون‌های آنلاین فعال</h3>
              <p className="text-[11px] text-gray-400">پاسخ‌برگ آنلاین با زمان‌بندی سرور</p>
            </div>
            <Badge variant="success">آماده شرکت</Badge>
          </div>

          <div className="space-y-3">
            {realExams.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                آزمون آنلاین فعالی در حال حاضر وجود ندارد.
              </div>
            ) : (
              realExams.slice(0, 3).map((ex) => (
                <div key={ex.id} className="p-3.5 rounded-xl border bg-primary-light/30 border-primary/30 flex items-center justify-between text-xs gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-ink-darker truncate">{ex.title}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                      {ex.lesson?.name || 'درس'} • مدت: {ex.durationMinutes || 60} دقیقه
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/app/student/exams?examId=${ex.id}&action=start`)}
                    className="text-xs shrink-0 flex items-center space-x-1.5 space-x-reverse"
                  >
                    <Play className="h-3 w-3" />
                    <span>شروع آزمون</span>
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
