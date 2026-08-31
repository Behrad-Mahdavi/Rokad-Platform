import React from 'react';
import { useAuthStore } from '../../lib/auth/auth-store';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Award, BookOpen, Clock, FileCheck } from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary-light to-white p-6 rounded-2xl border border-primary/20 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-ink-darker">
            سلام، {user?.firstName}! 🎓
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            کلاس دهم ریاضی (کلاس ۱۰۱) • سال تحصیلی ۱۴۰۴-۱۴۰۵
          </p>
        </div>
        <Badge variant="default" className="text-xs px-3 py-1">
          معدل ترم: ۱۹.۴۵
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5">
          <div className="flex items-center space-x-3 space-x-reverse mb-3">
            <Clock className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold text-sm text-ink-dark">تکالیف پیش‌رو</h3>
          </div>
          <p className="text-xs text-gray-500">
            تکلیف ریاضی ۱: حل مسائل فصل دوم هندسه تحلیلی (مهلت تا فردا ساعت ۱۸:۰۰)
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center space-x-3 space-x-reverse mb-3">
            <Award className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-sm text-ink-dark">آزمون‌های آنلاین</h3>
          </div>
          <p className="text-xs text-gray-500">
            آزمون میان‌ترم حسابان ۱: تاریخ ۱۲ آبان‌ماه (زمان: ۶۰ دقیقه)
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center space-x-3 space-x-reverse mb-3">
            <BookOpen className="h-5 w-5 text-blue-500" />
            <h3 className="font-bold text-sm text-ink-dark">جزوات و ویدیوها</h3>
          </div>
          <p className="text-xs text-gray-500">
            جزوه دست‌نویس فصل مشتق و تست‌های کنکور بارگذاری شد.
          </p>
        </Card>
      </div>
    </div>
  );
};
