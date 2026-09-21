import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { useTenantStore } from '../../lib/auth/tenant-store';
import { apiClient } from '../../lib/api/client';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  GraduationCap,
  Users,
  Receipt,
  CalendarCheck,
  TrendingUp,
  ArrowUpRight,
  SlidersHorizontal,
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
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const currentTenant = useTenantStore((state) => state.currentTenant);
  const [stats, setStats] = useState<any>(null);
  const [, setIsLoading] = useState(true);

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
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="relative overflow-hidden rokad-card p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-ink-darker dark:text-white">
              درود، {user?.firstName} {user?.lastName}
            </h1>
            <Badge variant="default" className="text-[11px] mt-1">مدیریت هنرستان</Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/admin/reports')}
            className="flex-1 sm:flex-none"
          >
            گزارش جامع
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/admin/academic')}
            className="flex-1 sm:flex-none"
          >
            <span>کارگاه‌ها و دروس</span>
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Students */}
        <Card className="p-4 sm:p-5">
          <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
            <span>دانش‌آموزان فعال</span>
            <GraduationCap className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-ink-darker dark:text-white font-mono">
            {stats?.quotas?.students?.currentUsage || 320}
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400 mr-1 font-mono">/ {stats?.quotas?.students?.maxAllowed || 400}</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: '80%' }} />
          </div>
        </Card>

        {/* Card 2: Teachers */}
        <Card className="p-4 sm:p-5">
          <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
            <span>کادر آموزشی</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-ink-darker dark:text-white font-mono">
            {stats?.quotas?.teachers?.currentUsage || 28}
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400 mr-1 font-mono">/ {stats?.quotas?.teachers?.maxAllowed || 40}</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '70%' }} />
          </div>
        </Card>

        {/* Card 3: Fee Collection */}
        <Card className="p-4 sm:p-5">
          <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
            <span>وصول شهریه</span>
            <Receipt className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-500 dark:text-amber-400 font-mono">
            ۳۹۰ <span className="text-xs font-normal text-gray-500 dark:text-gray-400">میلیون تومان</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '92%' }} />
          </div>
        </Card>

        {/* Card 4: Attendance */}
        <Card className="p-4 sm:p-5">
          <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
            <span>میانگین حضور</span>
            <CalendarCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
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
        <Card className="p-4 sm:p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black text-sm sm:text-base text-ink-darker dark:text-white">
              روند وصول شهریه
            </h2>
            <Badge variant="default">میلیون تومان</Badge>
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
        <Card className="p-4 sm:p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black text-sm sm:text-base text-ink-darker dark:text-white">
              نرخ حضور هفتگی
            </h2>
            <Badge variant="college">میانگین ۹۷٪</Badge>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card
          onClick={() => navigate('/app/admin/members?tab=students')}
          className="p-4 sm:p-5 cursor-pointer group flex flex-col justify-between min-h-[110px]"
        >
          <div>
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <GraduationCap className="h-4.5 w-4.5" />
            </div>
            <h3 className="font-bold text-sm text-ink-darker dark:text-white mb-0.5">ثبت‌نام دانش‌آموز</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">ایجاد پرونده و صدور دسترسی</p>
          </div>
        </Card>

        <Card
          onClick={() => navigate('/app/admin/finance/fees')}
          className="p-4 sm:p-5 cursor-pointer group flex flex-col justify-between min-h-[110px]"
        >
          <div>
            <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <Receipt className="h-4.5 w-4.5" />
            </div>
            <h3 className="font-bold text-sm text-ink-darker dark:text-white mb-0.5">مدیریت شهریه و اقساط</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">تقسیط و صدور لینک پرداخت</p>
          </div>
        </Card>

        <Card
          onClick={() => navigate('/app/admin/finance/payroll')}
          className="p-4 sm:p-5 cursor-pointer group flex flex-col justify-between min-h-[110px]"
        >
          <div>
            <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
            <h3 className="font-bold text-sm text-ink-darker dark:text-white mb-0.5">حقوق و دستمزد پرسنل</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">صدور فیش و تسویه حقوق</p>
          </div>
        </Card>

        <Card
          onClick={() => navigate('/app?manageBanners=true')}
          className="p-4 sm:p-5 cursor-pointer group flex flex-col justify-between min-h-[110px]"
        >
          <div>
            <div className="h-9 w-9 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <SlidersHorizontal className="h-4.5 w-4.5" />
            </div>
            <h3 className="font-bold text-sm text-ink-darker dark:text-white mb-0.5">بنرهای صفحه اصلی</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">مدیریت اسلایدر و اطلاعیه‌ها</p>
          </div>
        </Card>
      </div>
    </div>
  );
};
