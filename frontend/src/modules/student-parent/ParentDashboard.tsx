import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  CreditCard,
  CalendarDays,
  CheckCircle2,
  Award,
  Clock,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  MessageSquare,
  Users,
} from 'lucide-react';

export const ParentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-l from-purple-500/10 via-purple-100/30 to-white p-6 rounded-2xl border border-purple-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 space-x-reverse mb-1">
            <Users className="h-6 w-6 text-purple-600 shrink-0" />
            <span className="text-xl font-bold text-ink-darker">
              پرتال اولیاء گرامی: {user?.firstName} {user?.lastName}
            </span>
            <Badge variant="female">فرزند: امیرعلی صادقی</Badge>
          </div>
          <p className="text-xs text-gray-500">
            پایش وضعیت تحصیلی، کارگاهی، مالی و ارتباط مستقیم با هنرآموزان و مشاوران هنرستان
          </p>
        </div>

        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/parent/visits')}
            className="text-xs flex items-center space-x-1 space-x-reverse"
          >
            <Clock className="h-3.5 w-3.5 text-purple-600" />
            <span>وقت ملاقات با معلمان</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/chat')}
            className="text-xs flex items-center space-x-1 space-x-reverse"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>پیام‌رسان هنرستان</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/parent/fees')}
            className="text-xs flex items-center space-x-1 space-x-reverse"
          >
            <span>امور شهریه</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Tuition */}
        <Card className="p-6 border hover:border-amber-500 transition-all">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-500">مانده شهریه سال تحصیلی</span>
            <CreditCard className="h-5 w-5 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-ink-darker">
            ۱۰ <span className="text-xs font-normal text-gray-500">میلیون تومان</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <Badge variant="success">۲ قسط تسویه شده</Badge>
            <span className="text-gray-400">سررسید بعدی: بهمن</span>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/parent/fees')}
            className="w-full mt-4 text-xs bg-emerald-600 hover:bg-emerald-700"
          >
            پرداخت آنلاین با درگاه زرین‌پال
          </Button>
        </Card>

        {/* Card 2: Attendance */}
        <Card className="p-6 border hover:border-primary transition-all">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-500">وضعیت تردد و حضور</span>
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">
            حضور منظم (۱۰۰٪)
          </div>
          <div className="mt-3 text-xs text-gray-500 space-y-1">
            <div>ورود امروز: <strong className="text-ink-darker">۰۷:۳۵ صبح</strong></div>
            <div>غیبت غیرموجه: <strong className="text-emerald-600">۰ مورد</strong></div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/parent/reports')}
            className="w-full mt-4 text-xs"
          >
            مشاهده گزارش تحصیلی
          </Button>
        </Card>

        {/* Card 3: Academic Standing */}
        <Card className="p-6 border hover:border-blue-500 transition-all">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-500">معدل و پیشرفت درسی</span>
            <Award className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-primary">
            ۱۹.۳۱
          </div>
          <div className="mt-3 text-xs text-gray-500 space-y-1">
            <div>رتبه در کلاس: <strong className="text-ink-darker">رتبه ۲ (ممتاز)</strong></div>
            <div>وضعیت انضباطی: <strong className="text-emerald-600">عادی و بدون مورد منفی</strong></div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/student/grades')}
            className="w-full mt-4 text-xs"
          >
            دانلود کارنامه ترمیک
          </Button>
        </Card>
      </div>
    </div>
  );
};
