import React from 'react';
import { useAuthStore } from '../../lib/auth/auth-store';
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
  Send,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  const upcomingHomework = [
    { title: 'تمرینات فصل دوم هندسه تحلیلی', lesson: 'ریاضی ۱', deadline: 'فردا ۱۸:۰۰', score: 20 },
    { title: 'گزارش آزمایشگاه گرما و ترمودینامیک', lesson: 'فیزیک', deadline: 'پنجشنبه', score: 20 },
  ];

  const onlineExams = [
    { title: 'آزمون تستی میان‌ترم حسابان ۱', lesson: 'حسابان', duration: '۶۰ دقیقه', status: 'READY' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-l from-primary/10 via-primary-light/20 to-white p-6 rounded-2xl border border-primary/20 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 space-x-reverse mb-1">
            <span className="text-xl font-bold text-ink-darker">
              سلام، {user?.firstName} عزیز! 🎓
            </span>
            <Badge variant="default">پایه دهم ریاضی (کلاس ۱۰۱)</Badge>
          </div>
          <p className="text-xs text-gray-500">
            برنامه درسی، تکالیف در انتظار ارسال و وضعیت کارنامه نمرات شما
          </p>
        </div>

        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/app/student/grades'}
            className="text-xs"
          >
            مشاهده کارنامه
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => window.location.href = '/app/student/exams'}
            className="text-xs flex items-center space-x-1 space-x-reverse"
          >
            <span>آزمون‌های من</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 border hover:border-primary transition-all">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
            <span>معدل کل نیم‌سال</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-extrabold text-primary font-mono">۱۹.۳۱</div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">رتبه ۲ در پایه دهم</p>
        </Card>

        <Card className="p-5 border hover:border-amber-500 transition-all">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
            <span>تکالیف نیازمند تحویل</span>
            <FileCheck className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-ink-darker font-mono">۲ تکلیف</div>
          <p className="text-[11px] text-amber-600 font-medium mt-1">مهلت نزدیک‌ترین: فردا</p>
        </Card>

        <Card className="p-5 border hover:border-blue-500 transition-all">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
            <span>آزمون‌های آنلاین فعال</span>
            <HelpCircle className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-3xl font-extrabold text-ink-darker font-mono">۱ آزمون</div>
          <p className="text-[11px] text-blue-600 font-medium mt-1">آماده برگزاری آنلاین</p>
        </Card>

        <Card className="p-5 border hover:border-purple-500 transition-all">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
            <span>نمره انضباط</span>
            <Award className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 font-mono">۲۰.۰۰</div>
          <p className="text-[11px] text-gray-500 font-medium mt-1">بدون تاخیر یا غیبت</p>
        </Card>
      </div>

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
            {upcomingHomework.map((hw, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border bg-gray-50 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-ink-darker">{hw.title}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {hw.lesson} • مهلت: <span className="text-amber-600 font-bold">{hw.deadline}</span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => window.location.href = '/app/student/homework'}
                  className="text-xs flex items-center space-x-1 space-x-reverse"
                >
                  <Send className="h-3 w-3" />
                  <span>ارسال پاسخ</span>
                </Button>
              </div>
            ))}
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
            {onlineExams.map((ex, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border bg-primary-light/30 border-primary/30 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-ink-darker">{ex.title}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    درس {ex.lesson} • مدت زمان: {ex.duration}
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => window.location.href = '/app/student/exams'}
                  className="text-xs flex items-center space-x-1.5 space-x-reverse"
                >
                  <Play className="h-3 w-3" />
                  <span>شروع آزمون</span>
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
