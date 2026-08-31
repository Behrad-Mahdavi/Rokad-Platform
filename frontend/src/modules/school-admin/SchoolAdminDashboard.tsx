import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../lib/auth/auth-store';
import { useTenantStore } from '../../lib/auth/tenant-store';
import { apiClient } from '../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { GraduationCap, Users, Receipt, CalendarCheck, HelpCircle } from 'lucide-react';

export const SchoolAdminDashboard: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const currentTenant = useTenantStore((state) => state.currentTenant);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSchoolStats = async () => {
      try {
        if (currentTenant?.id) {
          const res = await apiClient.get(`/saas/subscriptions/tenant/${currentTenant.id}`);
          setStats(res.data);
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
      {/* Header Welcome */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-ink-darker">
            سلام، {user?.firstName} {user?.lastName} 👋
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            به پنل مدیریت یکپارچه {currentTenant?.name || 'مدرسه'} خوش آمدید.
          </p>
        </div>
        <Badge variant="default" className="text-xs px-3 py-1">
          سال تحصیلی ۱۴۰۴-۱۴۰۵ (فعال)
        </Badge>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Students Quota */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">دانش‌آموزان ثبت‌نامی</CardTitle>
            <GraduationCap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-extrabold text-ink-darker">
                {stats?.quotas?.students?.currentUsage || 1}
                <span className="text-xs font-normal text-gray-500 mr-1.5">
                  / {stats?.quotas?.students?.maxAllowed || 400} ظرفیت
                </span>
              </div>
            )}
            <p className="text-[11px] text-emerald-600 font-medium mt-1">در وضعیت مجاز</p>
          </CardContent>
        </Card>

        {/* Card 2: Teachers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">کادر و دبیران</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-extrabold text-ink-darker">
                {stats?.quotas?.teachers?.currentUsage || 1}
                <span className="text-xs font-normal text-gray-500 mr-1.5">
                  / {stats?.quotas?.teachers?.maxAllowed || 40} سهمیه
                </span>
              </div>
            )}
            <p className="text-[11px] text-gray-500 font-medium mt-1">دبیران فعال ترم جاری</p>
          </CardContent>
        </Card>

        {/* Card 3: Finance / Fees */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">شهریه و دریافت‌ها</CardTitle>
            <Receipt className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-ink-darker">
              ۱۰ <span className="text-xs font-normal text-gray-500">میلیون تومان</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">تسویه آنلاین درگاه زرین‌پال</p>
          </CardContent>
        </Card>

        {/* Card 4: Attendance & Exams */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">حضور و غیاب امروز</CardTitle>
            <CalendarCheck className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-ink-darker">۹۸٪</div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">ثبت الکترونیکی کامل</p>
          </CardContent>
        </Card>
      </div>

      {/* Modules Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-sm text-ink-darker mb-2 flex items-center space-x-2 space-x-reverse">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span>مدیریت ساختار آموزشی</span>
          </h3>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            تعریف مقاطع، رشته‌های تحصیلی، پایه‌ها، کلاس‌ها و تخصیص دروس به معلمان.
          </p>
          <a href="/app/admin/academic" className="text-xs text-primary font-bold hover:underline">
            ورود به بخش کلاس‌ها ←
          </a>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-sm text-ink-darker mb-2 flex items-center space-x-2 space-x-reverse">
            <Receipt className="h-4 w-4 text-amber-500" />
            <span>امور مالی و قرارداد شهریه</span>
          </h3>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            تنظیم قراردادهای مالی، اقساط هوشمند، فیش‌های واریزی و فیش حقوق پرسنل.
          </p>
          <a href="/app/admin/finance/fees" className="text-xs text-amber-600 font-bold hover:underline">
            ورود به امور مالی ←
          </a>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-sm text-ink-darker mb-2 flex items-center space-x-2 space-x-reverse">
            <HelpCircle className="h-4 w-4 text-blue-500" />
            <span>بانک سوال و آزمون‌ساز</span>
          </h3>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            مشاهده آزمون‌های آنلاین و حضوری، وضعیت شرکت‌کنندگان و صدور کارنامه ترمیک.
          </p>
          <a href="/app/admin/reports" className="text-xs text-blue-600 font-bold hover:underline">
            مشاهده گزارش نمرات ←
          </a>
        </Card>
      </div>
    </div>
  );
};
