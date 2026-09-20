import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  CreditCard,
  CalendarDays,
  Award,
  Clock,
  ArrowUpRight,
  Users,
} from 'lucide-react';

export const ParentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="relative overflow-hidden rokad-card p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-ink-darker dark:text-white">
              پرتال اولیاء: {user?.firstName} {user?.lastName}
            </h1>
            <Badge variant="female" className="text-[11px] mt-1">فرزند: امیرعلی صادقی</Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/parent/visits')}
            className="flex-1 sm:flex-none"
          >
            <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span>ملاقات با مربیان</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/parent/fees')}
            className="flex-1 sm:flex-none"
          >
            <span>امور شهریه</span>
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Card 1: Tuition */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">مانده شهریه</span>
              <CreditCard className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-ink-darker dark:text-white font-mono">
              ۱۰ <span className="text-xs font-normal text-gray-500 dark:text-gray-400">میلیون تومان</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs">
              <Badge variant="success" className="text-[10px]">۲ قسط تسویه</Badge>
              <span className="text-gray-500 dark:text-gray-400">سررسید: بهمن</span>
            </div>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/app/parent/fees')}
            className="w-full mt-4 text-xs font-bold"
          >
            پرداخت شهریه
          </Button>
        </Card>

        {/* Card 2: Attendance */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">وضعیت حضور</span>
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
              حضور منظم (۱۰۰٪)
            </div>
            <div className="mt-2.5 text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <div>ورود امروز: <strong className="text-ink-darker dark:text-white font-mono">۰۷:۳۵</strong></div>
              <div>غیبت غیرموجه: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">۰</strong></div>
            </div>
          </div>
          <Button
            variant="outline"
            size="md"
            onClick={() => navigate('/app/parent/reports')}
            className="w-full mt-4 text-xs font-bold"
          >
            گزارش تحصیلی
          </Button>
        </Card>

        {/* Card 3: Academic Standing */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">پیشرفت تحصیلی</span>
              <Award className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-primary font-mono">
              ۱۹.۳۱
            </div>
            <div className="mt-2.5 text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <div>رتبه کلاس: <strong className="text-ink-darker dark:text-white">رتبه ۲ (ممتاز)</strong></div>
              <div>وضعیت انضباطی: <strong className="text-emerald-600 dark:text-emerald-400">عادی</strong></div>
            </div>
          </div>
          <Button
            variant="outline"
            size="md"
            onClick={() => navigate('/app/student/grades')}
            className="w-full mt-4 text-xs font-bold"
          >
            مشاهده کارنامه
          </Button>
        </Card>
      </div>
    </div>
  );
};
