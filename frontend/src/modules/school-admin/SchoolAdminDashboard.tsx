import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../lib/auth/auth-store';
import { useTenantStore } from '../../lib/auth/tenant-store';
import { apiClient } from '../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  GraduationCap,
  Users,
  Receipt,
  CalendarCheck,
  HelpCircle,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

export const SchoolAdminDashboard: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const currentTenant = useTenantStore((state) => state.currentTenant);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const financialTrend = [
    { month: 'مهر', collected: 120, target: 150 },
    { month: 'آبان', collected: 180, target: 200 },
    { month: 'آذر', collected: 240, target: 250 },
    { month: 'دی', collected: 310, target: 320 },
    { month: 'بهمن', collected: 390, target: 400 },
  ];

  const attendanceWeekly = [
    { day: 'شنبه', rate: 98 },
    { day: 'یکشنبه', rate: 96 },
    { day: 'دوشنبه', rate: 99 },
    { day: 'سه‌شنبه', rate: 97 },
    { day: 'چهارشنبه', rate: 95 },
  ];

  useEffect(() => {
    const fetchSchoolStats = async () => {
      try {
        if (currentTenant?.id) {
          const res = await apiClient.get(`/saas/subscriptions/tenant/${currentTenant.id}`).catch(() => null);
          if (res?.data) {
            setStats(res.data);
          }
        }
      } catch (e) {
        console.error('Failed to load tenant stats', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSchoolStats();
  }, [currentTenant?.id]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-white dark:bg-[#151C28] bg-gradient-to-l from-primary/15 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/5 dark:to-transparent p-3.5 sm:p-5 md:p-6 rounded-2xl border border-primary/30 dark:border-[#242F42] shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <span className="text-lg sm:text-xl font-black text-ink-darker dark:text-white">
              درود، {user?.firstName} {user?.lastName}
            </span>
            <Badge variant="default" className="text-[11px]">
              مدیریت هنرستان
            </Badge>
          </div>
        </div>

        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/app/admin/reports'}
            className="text-xs dark:bg-[#1C2536] dark:text-white dark:border-gray-700"
          >
            دانلود گزارش جامع
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => window.location.href = '/app/admin/academic'}
            className="text-xs flex items-center space-x-1 space-x-reverse"
          >
            <span>کارگاه‌ها و دروس</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Students */}
        <Card className="p-3.5 sm:p-5 border hover:border-primary transition-all">
          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            <span>دانش‌آموزان فعال</span>
            <GraduationCap className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-ink-darker dark:text-white">
            {stats?.quotas?.students?.currentUsage || 320}
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400 mr-1">/ {stats?.quotas?.students?.maxAllowed || 400}</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: '80%' }} />
          </div>
        </Card>

        {/* Card 2: Teachers */}
        <Card className="p-3.5 sm:p-5 border hover:border-blue-500 transition-all">
          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            <span>مربیان و کادر تخصصی</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-ink-darker dark:text-white">
            {stats?.quotas?.teachers?.currentUsage || 28}
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400 mr-1">/ {stats?.quotas?.teachers?.maxAllowed || 40}</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '70%' }} />
          </div>
        </Card>

        {/* Card 3: Fee Collection */}
        <Card className="p-3.5 sm:p-5 border hover:border-amber-500 transition-all">
          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            <span>وصول شهریه ترم جاری</span>
            <Receipt className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-500 dark:text-amber-400">
            ۳۹۰ <span className="text-xs font-normal text-gray-500 dark:text-gray-400">میلیون تومان</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '92%' }} />
          </div>
        </Card>

        {/* Card 4: Attendance */}
        <Card className="p-3.5 sm:p-5 border hover:border-emerald-500 transition-all">
          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            <span>میانگین حضور هفته</span>
            <CalendarCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            ۹۷.۴٪
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '97.4%' }} />
          </div>
        </Card>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Financial Collection Trend */}
        <Card className="p-4 sm:p-5 md:p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-sm text-ink-darker dark:text-white">روند وصول درآمدهای شهریه (میلیون تومان)</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">مقایسه وصولی واقعی با هدف‌گذاری بودجه</p>
            </div>
            <Badge variant="default">زرین‌پال / شاپرک</Badge>
          </div>
          <div className="h-60 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialTrend}>
                <defs>
                  <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#59BBAF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#59BBAF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#888888" fontSize={11} />
                <YAxis stroke="#888888" fontSize={11} />
                <Tooltip />
                <Area type="monotone" dataKey="collected" stroke="#59BBAF" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCollected)" name="وصولی واقعی" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Weekly Attendance Rate */}
        <Card className="p-4 sm:p-5 md:p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-sm text-ink-darker dark:text-white">نرخ حضور دانش‌آموزان در روزهای هفته</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">پایش غیبت و تأخیر در جلسات کلاسی</p>
            </div>
            <Badge variant="college">۹۷٪ میانگین</Badge>
          </div>
          <div className="h-60 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceWeekly}>
                <XAxis dataKey="day" stroke="#888888" fontSize={11} />
                <YAxis domain={[90, 100]} stroke="#888888" fontSize={11} />
                <Tooltip />
                <Bar dataKey="rate" fill="#202A5A" radius={[6, 6, 0, 0]} name="درصد حضور" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Quick Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          onClick={() => window.location.href = '/app/admin/members'}
          className="p-6 border hover:border-primary transition-all cursor-pointer group"
        >
          <div className="h-10 w-10 rounded-xl bg-primary-light dark:bg-primary/20 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Users className="h-5 w-5" />
          </div>
          <h4 className="font-bold text-sm text-ink-darker dark:text-white mb-1">ثبت‌نام دانش‌آموز جدید</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">ایجاد پرونده تحصیلی، صدور حساب کاربری و انتساب به کلاس</p>
        </Card>

        <Card
          onClick={() => window.location.href = '/app/admin/finance/fees'}
          className="p-6 border hover:border-amber-500 transition-all cursor-pointer group"
        >
          <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Receipt className="h-5 w-5" />
          </div>
          <h4 className="font-bold text-sm text-ink-darker dark:text-white mb-1">تنظیم قرارداد شهریه و اقساط</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">تقسیط هوشمند و صدور لینک پرداخت آنلاین زرین‌پال</p>
        </Card>

        <Card
          onClick={() => window.location.href = '/app/admin/finance/payroll'}
          className="p-6 border hover:border-blue-500 transition-all cursor-pointer group"
        >
          <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <TrendingUp className="h-5 w-5" />
          </div>
          <h4 className="font-bold text-sm text-ink-darker dark:text-white mb-1">محاسبه و صدور حقوق پرسنل</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">صدور فیش‌های حقوقی ماهانه و تولید فایل پایا بانکی</p>
        </Card>
      </div>
    </div>
  );
};
