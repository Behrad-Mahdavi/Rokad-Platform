import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/api/client';
import { useAuthStore } from '../../lib/auth/auth-store';
import { useTenantStore } from '../../lib/auth/tenant-store';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  Building2,
  Users,
  CreditCard,
  HardDrive,
  Activity,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  LogIn,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const SuperAdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const mrrData = [
    { month: 'فروردین', mrr: 120 },
    { month: 'اردیبهشت', mrr: 160 },
    { month: 'خرداد', mrr: 210 },
    { month: 'تیر', mrr: 280 },
    { month: 'مرداد', mrr: 360 },
    { month: 'شهریور', mrr: 480 },
  ];

  const tenantTypeData = [
    { name: 'مدارس پسرانه', value: 45, color: '#202A5A' },
    { name: 'مدارس دخترانه', value: 40, color: '#E0195B' },
    { name: 'کالج و آموزشگاه', value: 25, color: '#F8A41D' },
    { name: 'باشگاه‌های مهارتی', value: 15, color: '#652D90' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metRes, tenRes] = await Promise.all([
          apiClient.get('/saas/platform/metrics').catch(() => null),
          apiClient.get('/saas/tenants').catch(() => null),
        ]);
        if (metRes?.data) setMetrics(metRes.data);
        if (tenRes?.data) setTenants(tenRes.data);
      } catch (e) {
        console.error('Failed to load SaaS metrics', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFastImpersonate = async (tenant: any) => {
    try {
      const res = await apiClient.post('/saas/tenants/impersonate', {
        tenantId: tenant.id,
        reason: 'پشتیبانی فنی سریع از داشبورد سوپرادمین',
      });
      const { accessToken, impersonatedUser } = res.data;
      useAuthStore.getState().login(
        {
          id: impersonatedUser.id,
          phone: impersonatedUser.phone,
          email: impersonatedUser.email,
          firstName: impersonatedUser.firstName,
          lastName: impersonatedUser.lastName,
          role: impersonatedUser.role,
          tenantId: tenant.id,
          isPlatformAdmin: true,
        },
        accessToken,
      );
      useTenantStore.getState().setCurrentTenant({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        type: tenant.type,
        theme: tenant.theme || 'ecosystem',
      });
      window.location.href = '/app/admin/dashboard';
    } catch (err: any) {
      alert(err.message || 'خطا در ورود نیابتی به مدرسه.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Title */}
      <div className="relative overflow-hidden bg-gradient-to-l from-primary/10 via-primary-light/20 to-white p-6 rounded-2xl border border-primary/20 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 space-x-reverse mb-1">
            <span className="text-xl font-bold text-ink-darker">
              مرکز فرماندهی کلان پلتفرم رُکاد (SaaS Control Plane) 👑
            </span>
            <Badge variant="default">SuperAdmin Root</Badge>
          </div>
          <p className="text-xs text-gray-500">
            مدیریت زیرساخت توزیع‌شده، تننت‌های آموزشی، سهمیه‌ها و نظارت بر کل جریان درآمد ماهیانه
          </p>
        </div>

        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/app/super-admin/ops'}
            className="text-xs"
          >
            لاگ‌های امنیتی
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => window.location.href = '/app/super-admin/tenants'}
            className="text-xs flex items-center space-x-1 space-x-reverse"
          >
            <span>راه‌اندازی مدرسه</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* 4 KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Tenants */}
        <Card className="p-5 border hover:border-primary transition-all">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
            <span>کل مراکز آموزشی</span>
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-extrabold text-ink-darker font-mono">
            {metrics?.tenants?.total || 125}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            {metrics?.tenants?.active || 120} مدرسه برخط و فعال
          </p>
        </Card>

        {/* Card 2: Total Users */}
        <Card className="p-5 border hover:border-blue-500 transition-all">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
            <span>کل کاربران پلتفرم</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-ink-darker font-mono">
            {((metrics?.users?.total || 45000)).toLocaleString('fa-IR')}
          </div>
          <p className="text-[11px] text-gray-500 font-medium mt-1">
            ۳۸,۰۰۰ دانش‌آموز • ۷,۰۰۰ دبیر و کادر
          </p>
        </Card>

        {/* Card 3: MRR */}
        <Card className="p-5 border hover:border-amber-500 transition-all">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
            <span>درآمد ماهانه پلتفرم (MRR)</span>
            <CreditCard className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-ink-darker font-mono">
            ۴۸۰ <span className="text-xs font-normal text-gray-500">میلیون تومان</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            +۲۴٪ رشد نسبت به ماه گذشته
          </p>
        </Card>

        {/* Card 4: Cloud Storage */}
        <Card className="p-5 border hover:border-purple-500 transition-all">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
            <span>فضای ابری مصرف‌شده</span>
            <HardDrive className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-extrabold text-ink-darker font-mono">
            ۱.۲ <span className="text-xs font-normal text-gray-500">ترابایت</span>
          </div>
          <p className="text-[11px] text-gray-500 font-medium mt-1">
            ذخیره‌سازی توزیع‌شده ابری MinIO
          </p>
        </Card>
      </div>

      {/* Analytics Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MRR Growth Chart */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-sm text-ink-darker">روند رشد درآمد ماهیانه پلتفرم (MRR)</h3>
              <p className="text-[11px] text-gray-400">نمودار فروش اشتراک‌های سالانه و ماهانه مدارس (میلیون تومان)</p>
            </div>
            <Badge variant="default">SaaS Growth</Badge>
          </div>

          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mrrData}>
                <defs>
                  <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#59BBAF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#59BBAF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#888888" fontSize={11} />
                <YAxis stroke="#888888" fontSize={11} />
                <Tooltip />
                <Area type="monotone" dataKey="mrr" stroke="#59BBAF" strokeWidth={3} fillOpacity={1} fill="url(#colorMrr)" name="درآمد ماهانه (میلیون تومان)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Quick Impersonate List */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 space-x-reverse mb-3">
              <LogIn className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-sm text-ink-darker">ورود نیابتی سریع (Impersonate)</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              ورود با یک کلیک به عنوان مدیر مدرسه جهت پشتیبانی فنی فوری بدون نیاز به رمز:
            </p>

            <div className="space-y-2">
              {tenants.slice(0, 3).map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl border bg-gray-50 flex items-center justify-between text-xs hover:bg-gray-100 transition-colors"
                >
                  <div className="truncate">
                    <div className="font-bold text-ink-darker truncate">{t.name}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{t.slug}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFastImpersonate(t)}
                    className="text-[11px] shrink-0"
                  >
                    ورود نیابتی
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <a
            href="/app/super-admin/tenants"
            className="block text-center text-xs text-primary font-bold hover:underline pt-4 border-t border-gray-100"
          >
            مشاهده تمام مدارس و مراکز ←
          </a>
        </Card>
      </div>
    </div>
  );
};
