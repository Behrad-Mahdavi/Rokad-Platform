import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../../components/ui/Table';
import { MobileDataTable } from '../../../components/ui/MobileDataTable';
import { ResponsivePageHeader } from '../../../components/ui/ResponsivePageHeader';
import {
  FileText,
  Download,
  TrendingUp,
  GraduationCap,
  Lock,
  Clock,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { toPersianDigits } from '../../../utils/jalali';

export const StudentGradesPage: React.FC = () => {
  // Report card is published strictly by the school principal
  const isPublished = typeof window !== 'undefined' && localStorage.getItem('rokad_report_card_published') === 'true';

  const grades = [
    { lesson: 'حسابان و ریاضیات پیشرفته', units: 4, continuous: 19.5, midterm: 19.0, final: 20.0, total: 19.65 },
    { lesson: 'فیزیک و آزمایشگاه', units: 3, continuous: 18.5, midterm: 18.0, final: 19.0, total: 18.55 },
    { lesson: 'شیمی', units: 3, continuous: 20.0, midterm: 19.5, final: 19.5, total: 19.65 },
    { lesson: 'هندسه تحلیلی', units: 2, continuous: 19.0, midterm: 18.5, final: 19.0, total: 18.85 },
    { lesson: 'ادبیات فارسی', units: 2, continuous: 19.0, midterm: 19.0, final: 19.5, total: 19.2 },
    { lesson: 'زبان انگلیسی', units: 2, continuous: 20.0, midterm: 20.0, final: 20.0, total: 20.0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <ResponsivePageHeader
        icon={FileText}
        title="کارنامه رسمی و دفتر نمرات تحصیلی"
        description="کارنامه نمرات مستمر، ارزشیابی‌های میان‌ترم، پایانی و معدل کل تحصیلی"
        actions={
          isPublished ? (
            <Button variant="outline" size="sm" className="flex items-center space-x-1.5 space-x-reverse text-xs">
              <Download className="h-3.5 w-3.5" />
              <span>دانلود کارنامه رسمی (PDF)</span>
            </Button>
          ) : undefined
        }
      />

      {!isPublished ? (
        /* Unpublished state: strictly hidden until published by school manager */
        <Card className="p-8 md:p-12 text-center border-2 border-dashed border-amber-300 bg-amber-50/40 rounded-2xl">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <Badge variant="warning" className="text-xs py-1 px-3">
                در انتظار تایید و انتشار توسط مدیریت مدرسه
              </Badge>
              <h3 className="text-lg font-bold text-ink-darker">
                کارنامه تحصیلی هنوز توسط مدیریت مدرسه منتشر نشده است
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                صدور و انتشار رسمی کارنامه نمرات و معدل کل تحصیلی منحصراً توسط مدیر مدرسه انجام می‌شود. به محض تایید نهایی و صدور مجوز انتشار توسط مدیریت، ریز نمرات و کارنامه شما در این بخش فعال و قابل دانلود خواهد شد.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2 text-xs text-amber-700 font-medium bg-amber-100/60 py-2 px-4 rounded-xl">
              <Clock className="w-4 h-4 shrink-0" />
              <span>وضعیت انتشار: غیرفعال (محرمانه تا زمان صدور توسط مدیر)</span>
            </div>
          </div>
        </Card>
      ) : (
        /* Published state: display official report card WITHOUT running discipline score */
        <>
          {/* GPA & Standing Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 border hover:border-primary transition-all">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-500 font-medium">معدل کل نیم‌سال</span>
                <TrendingUp className="h-5 w-5 text-primary shrink-0" />
              </div>
              <div className="text-2xl font-extrabold text-primary mb-3">۱۹.۳۱</div>
              <div className="flex items-center">
                <Badge variant="success">رتبه ۲ در پایه دهم</Badge>
              </div>
            </Card>

            <Card className="p-6 border hover:border-emerald-500 transition-all">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-500 font-medium">وضعیت تحصیلی</span>
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-600 mb-3">قبول ممتاز</div>
              <div className="flex items-center">
                <Badge variant="success">تایید شده توسط مدیریت</Badge>
              </div>
            </Card>

            <Card className="p-6 border hover:border-sec transition-all">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-500 font-medium">واحدهای گذرانده</span>
                <GraduationCap className="h-5 w-5 text-sec shrink-0" />
              </div>
              <div className="text-2xl font-extrabold text-ink-darker mb-3">
                ۱۶ <span className="text-xs font-normal text-gray-500">واحد</span>
              </div>
              <div className="flex items-center">
                <Badge variant="default">۶ عنوان درسی ارزشیابی شده</Badge>
              </div>
            </Card>
          </div>

          {/* Official Grades Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center space-x-2 space-x-reverse">
                <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                <span>ریز نمرات دروس نیم‌سال اول ۱۴۰۴-۱۴۰۵ (منتشر شده رسمی)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MobileDataTable
                data={grades}
                columns={[
                  {
                    key: 'lesson',
                    header: 'عنوان درس',
                    mobilePriority: 'primary',
                    render: (g) => <div className="font-bold text-ink-darker text-sm">{g.lesson}</div>,
                  },
                  {
                    key: 'total',
                    header: 'نمره نهایی (از ۲۰)',
                    mobilePriority: 'primary',
                    render: (g) => (
                      <span className="font-bold text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-lg font-mono">
                        {toPersianDigits(g.total.toFixed(2))}
                      </span>
                    ),
                  },
                  {
                    key: 'result',
                    header: 'نتیجه',
                    mobilePriority: 'secondary',
                    render: () => <Badge variant="success">قبول</Badge>,
                  },
                  {
                    key: 'units',
                    header: 'تعداد واحد',
                    mobilePriority: 'secondary',
                    render: (g) => (
                      <span className="text-xs font-bold text-gray-600 font-mono">
                        {toPersianDigits(g.units)} واحد
                      </span>
                    ),
                  },
                  {
                    key: 'continuous',
                    header: 'نمره مستمر (۳۰٪)',
                    mobilePriority: 'detail',
                    render: (g) => (
                      <span className="font-semibold text-xs text-ink-normal font-mono">
                        {toPersianDigits(g.continuous.toFixed(2))}
                      </span>
                    ),
                  },
                  {
                    key: 'midterm',
                    header: 'میان‌ترم (۳۰٪)',
                    mobilePriority: 'detail',
                    render: (g) => (
                      <span className="font-semibold text-xs text-ink-normal font-mono">
                        {toPersianDigits(g.midterm.toFixed(2))}
                      </span>
                    ),
                  },
                  {
                    key: 'final',
                    header: 'پایانی (۴۰٪)',
                    mobilePriority: 'detail',
                    render: (g) => (
                      <span className="font-semibold text-xs text-ink-normal font-mono">
                        {toPersianDigits(g.final.toFixed(2))}
                      </span>
                    ),
                  },
                ]}
                keyExtractor={(_, idx) => String(idx)}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
