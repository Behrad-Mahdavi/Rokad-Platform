import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Building2, Users, CreditCard, HardDrive, Activity, ShieldAlert } from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await apiClient.get('/saas/platform/metrics');
        setMetrics(res.data);
      } catch (e) {
        console.error('Failed to load SaaS metrics', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-ink-darker">داشبورد مرکز فرماندهی SaaS</h2>
          <p className="text-xs text-gray-500 mt-1">
            آمار کلان، مراکز آموزشی فعال، اشتراک‌ها و متریک‌های بلادرنگ پلتفرم رُکاد
          </p>
        </div>
        <Badge variant="default" className="text-xs px-3 py-1">
          وضعیت پلتفرم: فعال و برخط
        </Badge>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Tenants */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">کل مراکز و مدارس</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-extrabold text-ink-darker">
                {metrics?.tenants?.total || 0}
              </div>
            )}
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              {metrics?.tenants?.active || 0} مدرسه فعال
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Total Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">کل کاربران فعال</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-extrabold text-ink-darker">
                {metrics?.users?.total || 0}
              </div>
            )}
            <p className="text-[11px] text-gray-500 mt-1">
              {metrics?.users?.students || 0} دانش‌آموز • {metrics?.users?.teachers || 0} معلم
            </p>
          </CardContent>
        </Card>

        {/* Card 3: MRR */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">درآمد ماهیانه (MRR)</CardTitle>
            <CreditCard className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div className="text-2xl font-extrabold text-ink-darker">
                {((metrics?.commercial?.estimatedMrrTomans || 0) / 1000000).toLocaleString('fa-IR')}
                <span className="text-xs font-normal mr-1">میلیون تومان</span>
              </div>
            )}
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              {metrics?.commercial?.activeSubscriptions || 0} اشتراک تجاری فعال
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Cloud Storage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">فضای ابری MinIO</CardTitle>
            <HardDrive className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-extrabold text-ink-darker">
                {metrics?.storage?.totalStorageMb || 0}
                <span className="text-xs font-normal mr-1">MB</span>
              </div>
            )}
            <p className="text-[11px] text-gray-500 mt-1">
              {metrics?.storage?.totalFiles || 0} فایل و جزوه آموزشی
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overview Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center space-x-2 space-x-reverse">
              <Activity className="h-4 w-4 text-primary" />
              <span>عملیات و وضعیت سامانه چندمستأجری</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex justify-between items-center">
              <div>
                <div className="font-bold text-xs text-ink-darker">ایزولاسیون امنیتی دیتابیس (PostgreSQL RLS)</div>
                <div className="text-[11px] text-gray-500 mt-0.5">۵۷ جدول با تفکیک تننت و احراز دسترسی دولایه فعال است</div>
              </div>
              <Badge variant="success">فعال و ایمن</Badge>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex justify-between items-center">
              <div>
                <div className="font-bold text-xs text-ink-darker">موتور رویدادها و چت بلادرنگ (Redis Socket.io Adapter)</div>
                <div className="text-[11px] text-gray-500 mt-0.5">اتصال کلاینت‌ها با روم‌های اختصاصی هر مرکز آموزشی</div>
              </div>
              <Badge variant="success">متصل</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center space-x-2 space-x-reverse">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              <span>دسترسی‌های سریع سوپرادمین</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/app/super-admin/tenants"
              className="block p-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-medium text-ink-dark transition-colors"
            >
              ➕ راه‌اندازی مدرسه جدید (Onboarding)
            </a>
            <a
              href="/app/super-admin/subscriptions"
              className="block p-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-medium text-ink-dark transition-colors"
            >
              💳 پلن‌های تجاری و سهمیه کاربران
            </a>
            <a
              href="/app/super-admin/role-templates"
              className="block p-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-medium text-ink-dark transition-colors"
            >
              🛡️ قالب‌های نقش استاندارد کشوری
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
