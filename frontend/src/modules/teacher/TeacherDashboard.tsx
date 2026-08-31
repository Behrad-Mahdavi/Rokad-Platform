import React from 'react';
import { useAuthStore } from '../../lib/auth/auth-store';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { CalendarDays, FileCheck, HelpCircle, BookOpen } from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-ink-darker">
            میز کار اختصاصی دبیر: {user?.firstName} {user?.lastName} 👨‍🏫
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            دسترسی سریع به فرآیندهای آموزشی، تصحیح تکالیف، آزمون‌ها و ثبت نمرات کلاسی
          </p>
        </div>
        <Badge variant="male">دبیر ریاضی و فیزیک</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="p-3 bg-primary-light text-primary-dark rounded-xl">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs text-gray-500">کلاس‌های امروز</div>
              <div className="text-lg font-bold text-ink-darker">۲ جلسه</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <FileCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs text-gray-500">تکالیف نیازمند بررسی</div>
              <div className="text-lg font-bold text-ink-darker">۱۲ ارسال جدید</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs text-gray-500">آزمون‌های فعال</div>
              <div className="text-lg font-bold text-ink-darker">۱ آزمون</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs text-gray-500">جزوات بارگذاری‌شده</div>
              <div className="text-lg font-bold text-ink-darker">۸ فایل</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
