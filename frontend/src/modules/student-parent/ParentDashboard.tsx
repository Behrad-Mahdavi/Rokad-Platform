import React from 'react';
import { useAuthStore } from '../../lib/auth/auth-store';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { CreditCard, CalendarDays, CheckCircle } from 'lucide-react';

export const ParentDashboard: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-ink-darker">
            پرتال اولیاء گرامی: {user?.firstName} {user?.lastName} 👨‍👩‍👦
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            فرزند: علی حسینی • پایه دهم ریاضی
          </p>
        </div>
        <Badge variant="female">پرتال اولیاء</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <CreditCard className="h-5 w-5 text-amber-500" />
              <h3 className="font-bold text-sm text-ink-dark">شهریه و اقساط تحصیلی</h3>
            </div>
            <Badge variant="success">قسط اول پرداخت‌شده</Badge>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed mb-4">
            قسط دوم شهریه به مبلغ ۱۰,۰۰۰,۰۰۰ تومان در تاریخ ۱ بهمن‌ماه سررسید خواهد شد.
          </p>
          <Button variant="primary" size="sm" className="w-full">
            پرداخت آنلاین با درگاه زرین‌پال
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <CalendarDays className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-sm text-ink-dark">وضعیت تردد و انضباطی</h3>
            </div>
            <Badge variant="default">حضور منظم</Badge>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed mb-4">
            امروز ساعت ۰۷:۳۵ ورود ثبت شد. غیبت غیرموجه ثبت نشده است.
          </p>
          <Button variant="outline" size="sm" className="w-full">
            مشاهده گزارش کامل حضور و غیاب
          </Button>
        </Card>
      </div>
    </div>
  );
};
