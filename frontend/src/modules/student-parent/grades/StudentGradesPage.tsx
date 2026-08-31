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
import {
  Award,
  Download,
  CheckCircle2,
  TrendingUp,
  GraduationCap,
} from 'lucide-react';

export const StudentGradesPage: React.FC = () => {
  const grades = [
    { lesson: 'حسابان و ریاضیات پیشرفته', units: 4, continuous: 19.5, midterm: 19.0, final: 20.0, total: 19.65 },
    { lesson: 'فیزیک و آزمایشگاه', units: 3, continuous: 18.5, midterm: 18.0, final: 19.0, total: 18.55 },
    { lesson: 'شیمی', units: 3, continuous: 20.0, midterm: 19.5, final: 19.5, total: 19.65 },
    { lesson: 'هندسه تحلیلی', units: 2, continuous: 19.0, midterm: 18.5, final: 19.0, total: 18.85 },
    { lesson: 'ادبیات فارسی', units: 2, continuous: 19.0, midterm: 19.0, final: 19.5, total: 19.20 },
    { lesson: 'زبان انگلیسی', units: 2, continuous: 20.0, midterm: 20.0, final: 20.0, total: 20.00 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink-darker flex items-center space-x-2 space-x-reverse">
            <Award className="h-6 w-6 text-primary" />
            <span>کارنامه رسمی و دفتر نمرات (Report Card & Grades)</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            کارنامه نمرات مستمر، ارزشیابی‌های میان‌ترم، پایانی و معدل کل تحصیلی
          </p>
        </div>

        <Button variant="outline" className="flex items-center space-x-1.5 space-x-reverse">
          <Download className="h-4 w-4" />
          <span>دانلود کارنامه رسمی (PDF)</span>
        </Button>
      </div>

      {/* GPA & Standing Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="text-xs text-gray-500 font-medium mb-1">معدل کل نیم‌سال</div>
          <div className="text-3xl font-extrabold text-primary font-mono">۱۹.۳۱</div>
          <Badge variant="success" className="mt-2">رتبه ۲ در پایه دهم</Badge>
        </Card>

        <Card className="p-6">
          <div className="text-xs text-gray-500 font-medium mb-1">نمره انضباط</div>
          <div className="text-3xl font-extrabold text-emerald-600 font-mono">۲۰.۰۰</div>
          <p className="text-[11px] text-gray-500 mt-2">عالی — بدون تاخیر یا غیبت غیرموجه</p>
        </Card>

        <Card className="p-6">
          <div className="text-xs text-gray-500 font-medium mb-1">تعداد واحدهای گذرانده</div>
          <div className="text-3xl font-extrabold text-ink-darker font-mono">۱۶ واحد</div>
          <p className="text-[11px] text-gray-500 mt-2">وضعیت تحصیلی: ممتاز</p>
        </Card>
      </div>

      {/* Official Grades Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center space-x-2 space-x-reverse">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span>ریز نمرات دروس نیم‌سال اول ۱۴۰۴-۱۴۰۵</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>عنوان درس</TableHead>
                <TableHead>تعداد واحد</TableHead>
                <TableHead className="text-center">نمره مستمر (۳۰٪)</TableHead>
                <TableHead className="text-center">میان‌ترم (۳۰٪)</TableHead>
                <TableHead className="text-center">پایانی (۴۰٪)</TableHead>
                <TableHead className="text-center">نمره نهایی (از ۲۰)</TableHead>
                <TableHead>نتیجه</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grades.map((g, idx) => (
                <TableRow key={idx}>
                  <TableCell><div className="font-bold text-ink-darker">{g.lesson}</div></TableCell>
                  <TableCell><span className="text-xs font-mono font-bold text-gray-600">{g.units}</span></TableCell>
                  <TableCell className="text-center font-mono text-xs">{g.continuous.toFixed(2)}</TableCell>
                  <TableCell className="text-center font-mono text-xs">{g.midterm.toFixed(2)}</TableCell>
                  <TableCell className="text-center font-mono text-xs">{g.final.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <span className="font-bold font-mono text-xs text-primary bg-primary-light px-2.5 py-1 rounded-lg">
                      {g.total.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell><Badge variant="success">قبول</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
