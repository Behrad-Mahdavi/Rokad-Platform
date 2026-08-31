import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import {
  BarChart3,
  TrendingUp,
  Receipt,
  GraduationCap,
  CalendarCheck,
  CheckCircle2,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-ink-darker flex items-center space-x-2 space-x-reverse">
          <BarChart3 className="h-6 w-6 text-primary" />
          <span>گزارش‌های جامع و تحلیلی مدرسه (Comprehensive Reports)</span>
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          تراز مالی وصول شهریه، آمار تجمیعی حضور و غیاب، معدل کلاسی و ارزیابی تحصیلی
        </p>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500 font-medium">درصد وصول شهریه ترم جاری</div>
            <Receipt className="h-5 w-5 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-ink-darker">۷۸٪</div>
          <div className="w-full bg-gray-100 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-amber-500 h-2 rounded-full" style={{ width: '78%' }} />
          </div>
          <p className="text-[11px] text-gray-500 mt-2">۲۲٪ مانده اقساط در موعد بهمن‌ماه</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500 font-medium">میانگین حضور دانش‌آموزان</div>
            <CalendarCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="text-2xl font-extrabold text-ink-darker">۹۶.۴٪</div>
          <div className="w-full bg-gray-100 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-primary h-2 rounded-full" style={{ width: '96.4%' }} />
          </div>
          <p className="text-[11px] text-emerald-600 mt-2 font-medium">انضباط تحصیلی بسیار مطلوب</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500 font-medium">میانگین معدل مدرسه</div>
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-ink-darker">۱۸.۷۵</div>
          <div className="w-full bg-gray-100 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '93.7%' }} />
          </div>
          <p className="text-[11px] text-blue-600 mt-2 font-medium">+۰.۶۵ رشد نسبت به نیم‌سال قبل</p>
        </Card>
      </div>

      {/* Breakdown Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Class Averages Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center space-x-2 space-x-reverse">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span>میانگین نمرات به تفکیک کلاس‌ها</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
              <div>
                <div className="font-bold text-xs text-ink-darker">کلاس ۱۰۱ — ریاضی و فیزیک</div>
                <div className="text-[11px] text-gray-500">۲۸ دانش‌آموز</div>
              </div>
              <Badge variant="default" className="text-xs font-bold font-mono">۱۹.۲۰</Badge>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
              <div>
                <div className="font-bold text-xs text-ink-darker">کلاس ۱۰۲ — علوم تجربی</div>
                <div className="text-[11px] text-gray-500">۳۰ دانش‌آموز</div>
              </div>
              <Badge variant="default" className="text-xs font-bold font-mono">۱۸.۸۵</Badge>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
              <div>
                <div className="font-bold text-xs text-ink-darker">کلاس ۱۰۳ — ادبیات و علوم انسانی</div>
                <div className="text-[11px] text-gray-500">۲۵ دانش‌آموز</div>
              </div>
              <Badge variant="default" className="text-xs font-bold font-mono">۱۸.۲۰</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Quick Report Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center space-x-2 space-x-reverse">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>صدور و خروجی فایل گزارش‌ها</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3.5 rounded-xl border border-gray-200 flex justify-between items-center">
              <div>
                <div className="font-bold text-xs text-ink-darker">کارنامه ترم اول (فرمت چاپی آموزش و پرورش)</div>
                <div className="text-[11px] text-gray-500">خروجی رسمی PDF شامل رتبه، انضباط و معدل</div>
              </div>
              <Button variant="outline" size="sm">دانلود کارنامه‌ها</Button>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-200 flex justify-between items-center">
              <div>
                <div className="font-bold text-xs text-ink-darker">فایل دیسکت بانک پرداخت پایا حقوق</div>
                <div className="text-[11px] text-gray-500">فرمت استاندارد شبا جهت بارگذاری در بانک</div>
              </div>
              <Button variant="outline" size="sm">دریافت فایل پایا</Button>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-200 flex justify-between items-center">
              <div>
                <div className="font-bold text-xs text-ink-darker">گزارش وضعیت بدهی و مطالبات شهریه</div>
                <div className="text-[11px] text-gray-500">خروجی اکسل اقساط معوقه و واریزی‌ها</div>
              </div>
              <Button variant="outline" size="sm">خروجی اکسل</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
