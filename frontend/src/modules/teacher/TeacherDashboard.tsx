import React from 'react';
import { useAuthStore } from '../../lib/auth/auth-store';
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

export const TeacherDashboard: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  const todaySchedule = [
    { period: 'زنگ اول (۰۸:۰۰ - ۰۹:۳۰)', class: 'کلاس ۱۰۱ — ریاضی و فیزیک', lesson: 'حسابان و دیفرانسیل ۱', status: 'COMPLETED' },
    { period: 'زنگ دوم (۱۰:۰۰ - ۱۱:۳۰)', class: 'کلاس ۱۰۲ — تجربی', lesson: 'ریاضی و آمار ۲', status: 'IN_PROGRESS' },
    { period: 'زنگ سوم (۱۲:۰۰ - ۱۳:۳۰)', class: 'کلاس ۱۰۳ — انسانی', lesson: 'ریاضی و آمار علوم انسانی', status: 'UPCOMING' },
  ];

  const pendingSubmissions = [
    { student: 'امیرعلی صادقی', class: 'کلاس ۱۰۱', title: 'تمرینات فصل دوم هندسه', sentTime: '۲ ساعت پیش' },
    { student: 'محمدرضا کاظمی', class: 'کلاس ۱۰۱', title: 'حل المسائل مشتق توابع', sentTime: '۴ ساعت پیش' },
    { student: 'سینا احمدی', class: 'کلاس ۱۰۲', title: 'تکلیف آمار و احتمال', sentTime: 'دیروز' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-l from-primary/10 via-primary-light/20 to-white p-6 rounded-2xl border border-primary/20 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 space-x-reverse mb-1">
            <span className="text-xl font-bold text-ink-darker">
              خوش آمدید، {user?.firstName} {user?.lastName} 👨‍🏫
            </span>
            <Badge variant="male">دبیر تخصصی ریاضیات</Badge>
          </div>
          <p className="text-xs text-gray-500">
            برنامه کلاسی امروز، تکالیف ارسالی دانش‌آموزان و وضعیت ارزشیابی تحصیلی
          </p>
        </div>

        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/app/teacher/attendance'}
            className="text-xs"
          >
            دفتر حضور و غیاب
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => window.location.href = '/app/teacher/homework'}
            className="text-xs flex items-center space-x-1 space-x-reverse"
          >
            <span>تصحیح تکالیف</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border hover:border-primary transition-all">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
            <span>کلاس‌های امروز</span>
            <CalendarDays className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-extrabold text-ink-darker font-mono">۳ جلسه</div>
          <p className="text-[11px] text-primary font-medium mt-1">جلسه فعال: کلاس ۱۰۲</p>
        </Card>

        <Card className="p-5 border hover:border-amber-500 transition-all">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
            <span>تکالیف در انتظار تصحیح</span>
            <FileCheck className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-ink-darker font-mono">۱۲ ارسال</div>
          <p className="text-[11px] text-amber-600 font-medium mt-1">۳ تکلیف مهلت امروز</p>
        </Card>

        <Card className="p-5 border hover:border-blue-500 transition-all">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
            <span>آزمون آنلاین فعال</span>
            <HelpCircle className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-ink-darker font-mono">۱ آزمون</div>
          <p className="text-[11px] text-blue-600 font-medium mt-1">۲۸ شرکت‌کننده برخط</p>
        </Card>

        <Card className="p-5 border hover:border-purple-500 transition-all">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
            <span>میانگین نمرات کلاس‌ها</span>
            <Award className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-extrabold text-purple-700 font-mono">۱۹.۰۵</div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">رشد ممتاز آموزشی</p>
        </Card>
      </div>

      {/* Main Row: Schedule & Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule Card */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-sm text-ink-darker">برنامه تدریس امروز شما</h3>
              <p className="text-[11px] text-gray-400">زمان‌بندی زنگ‌های کلاسی و حضور و غیاب</p>
            </div>
            <Badge variant="default">امروز</Badge>
          </div>

          <div className="space-y-3">
            {todaySchedule.map((s, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border bg-gray-50 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-ink-darker">{s.class}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{s.lesson} • {s.period}</div>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  {s.status === 'COMPLETED' && <Badge variant="success">ثبت حضور انجام شد</Badge>}
                  {s.status === 'IN_PROGRESS' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => window.location.href = '/app/teacher/attendance'}
                      className="text-xs"
                    >
                      ثبت حضور جلسه جاری
                    </Button>
                  )}
                  {s.status === 'UPCOMING' && <Badge variant="neutral">ساعت ۱۲:۰۰</Badge>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Pending Submissions Card */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-sm text-ink-darker">ارسال‌های اخیر تکالیف</h3>
              <p className="text-[11px] text-gray-400">بررسی سریع و نمره‌دهی تمرینات دانش‌آموزان</p>
            </div>
            <a href="/app/teacher/homework" className="text-xs text-primary font-bold hover:underline">
              مشاهده همه ←
            </a>
          </div>

          <div className="space-y-3">
            {pendingSubmissions.map((sub, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border bg-gray-50 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-ink-darker">{sub.student} ({sub.class})</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{sub.title} • {sub.sentTime}</div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = '/app/teacher/homework'}
                  className="text-xs"
                >
                  تصحیح و نمره
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
