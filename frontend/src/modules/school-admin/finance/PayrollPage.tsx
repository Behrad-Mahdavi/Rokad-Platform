import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../../components/ui/Table';
import {
  Wallet,
  Plus,
  Send,
  Briefcase,
  FileCheck,
  CheckCircle2,
  Building,
} from 'lucide-react';

export const PayrollPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'SLIPS' | 'PROFILES'>('SLIPS');
  const [slips, setSlips] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isGenerateSlipOpen, setIsGenerateSlipOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Forms
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [slipForm, setSlipForm] = useState({
    userId: '',
    year: 1404,
    month: 8, // آبان
    grossPay: 25000000,
    totalDeductions: 1750000,
    netPay: 23250000,
    items: [
      { type: 'BASE_SALARY', title: 'حقوق پایه ماهانه', amount: 22000000 },
      { type: 'HOURLY_TEACHING', title: 'حق‌التدریس ۱۰ ساعت فوق‌برنامه', amount: 3000000 },
      { type: 'INSURANCE_DEDUCTION', title: 'کسر بیمه سهم کارمند (۷٪)', amount: -1750000 },
    ],
  });

  const [profileForm, setProfileForm] = useState({
    userId: '',
    contractType: 'FULL_TIME_SALARY',
    baseMonthlySalary: 22000000,
    hourlyRate: 350000,
    bankName: 'بانک ملت',
    bankAccountNumber: '1234567890',
    bankShebaNumber: 'IR120120000000001234567890',
    insuranceNumber: '88776655',
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [slipsRes, profilesRes, teachersRes] = await Promise.all([
        apiClient.get('/payroll/slips'),
        apiClient.get('/payroll/profiles'),
        apiClient.get('/members/teachers'),
      ]);
      setSlips(slipsRes.data || []);
      setProfiles(profilesRes.data || []);
      setTeachers(teachersRes.data || []);

      if (teachersRes.data?.length > 0) {
        setSlipForm((prev) => ({ ...prev, userId: teachersRes.data[0].user?.id }));
        setProfileForm((prev) => ({ ...prev, userId: teachersRes.data[0].user?.id }));
      }
    } catch (err) {
      console.error('Failed to load payroll data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerateSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/payroll/slips', {
        userId: slipForm.userId,
        year: Number(slipForm.year),
        month: Number(slipForm.month),
        grossPay: Number(slipForm.grossPay),
        totalDeductions: Number(slipForm.totalDeductions),
        netPay: Number(slipForm.netPay),
        items: slipForm.items,
      });
      setIsGenerateSlipOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'خطا در صدور فیش حقوقی.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/payroll/profiles', profileForm);
      setIsProfileModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت پرونده حقوقی.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMonthName = (month: number) => {
    const months = ['', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    return months[month] || `ماه ${month}`;
  };

  return (
    <div className="space-y-6">
      {/* Header & CTA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink-darker flex items-center space-x-2 space-x-reverse">
            <Wallet className="h-6 w-6 text-primary" />
            <span>موتور حقوق و دستمزد پرسنل (Staff Payroll Engine)</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            تعریف پرونده حقوقی پرسنل، اطلاعات شبا، صدور خودکار فیش ماهیانه و ثبت شماره پرداخت پایا
          </p>
        </div>

        <div className="flex gap-2">
          {activeTab === 'SLIPS' && (
            <Button variant="primary" onClick={() => setIsGenerateSlipOpen(true)}>
              <Plus className="h-4 w-4 ml-1" />
              <span>صدور فیش حقوقی جدید</span>
            </Button>
          )}
          {activeTab === 'PROFILES' && (
            <Button variant="primary" onClick={() => setIsProfileModalOpen(true)}>
              <Plus className="h-4 w-4 ml-1" />
              <span>تعریف پروفایل حقوقی</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 space-x-reverse border-b border-gray-200">
        <button
          onClick={() => setActiveTab('SLIPS')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 space-x-reverse ${
            activeTab === 'SLIPS'
              ? 'border-primary text-primary-dark'
              : 'border-transparent text-gray-500 hover:text-ink-dark'
          }`}
        >
          <FileCheck className="h-4 w-4" />
          <span>فیش‌های حقوقی صادرشده ({slips.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PROFILES')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 space-x-reverse ${
            activeTab === 'PROFILES'
              ? 'border-primary text-primary-dark'
              : 'border-transparent text-gray-500 hover:text-ink-dark'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          <span>پروفایل‌های حقوقی پرسنل ({profiles.length})</span>
        </button>
      </div>

      {/* Tab 1: Monthly Slips Table */}
      {activeTab === 'SLIPS' && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>شماره فیش</TableHead>
              <TableHead>نام پرسنل</TableHead>
              <TableHead>دوره / ماه</TableHead>
              <TableHead>ناخالص حقوق</TableHead>
              <TableHead>کسورات قانونی</TableHead>
              <TableHead>خالص پرداختی</TableHead>
              <TableHead>وضعیت پرداخت</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                </TableRow>
              ))
            ) : slips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  هنوز فیش حقوقی صادر نشده است. از دکمه «صدور فیش حقوقی جدید» استفاده کنید.
                </TableCell>
              </TableRow>
            ) : (
              slips.map((s) => (
                <TableRow key={s.id}>
                  <TableCell><span className="font-mono font-bold text-xs bg-gray-100 px-2 py-0.5 rounded">{s.slipNumber}</span></TableCell>
                  <TableCell>
                    <div className="font-bold text-ink-darker">
                      {s.user?.firstName} {s.user?.lastName}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium text-ink-dark">
                      {getMonthName(s.month)} {s.year}
                    </span>
                  </TableCell>
                  <TableCell><span className="text-xs font-bold font-mono">{(s.grossPay / 1000000).toLocaleString('fa-IR')} م</span></TableCell>
                  <TableCell><span className="text-xs text-rose-600 font-mono">{(s.totalDeductions / 1000000).toLocaleString('fa-IR')} م</span></TableCell>
                  <TableCell><span className="text-xs font-bold text-emerald-700 font-mono">{(s.netPay / 1000000).toLocaleString('fa-IR')} م تومان</span></TableCell>
                  <TableCell>
                    {s.status === 'PAID' ? (
                      <Badge variant="success">پرداخت‌شده (پایا)</Badge>
                    ) : (
                      <Badge variant="warning">در انتظار پرداخت</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {/* Tab 2: Profiles Table */}
      {activeTab === 'PROFILES' && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>نام پرسنل</TableHead>
              <TableHead>نوع قرارداد</TableHead>
              <TableHead>حقوق پایه ماهیانه</TableHead>
              <TableHead>نرخ ساعتی</TableHead>
              <TableHead>شماره شبا بانکی</TableHead>
              <TableHead>وضعیت</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="font-bold text-ink-darker">
                    {p.user?.firstName} {p.user?.lastName}
                  </div>
                </TableCell>
                <TableCell><Badge variant="default">{p.contractType === 'FULL_TIME_SALARY' ? 'تمام‌وقت' : 'حق‌التدریس'}</Badge></TableCell>
                <TableCell><span className="font-bold text-xs font-mono">{(p.baseMonthlySalary / 1000000).toLocaleString('fa-IR')} م تومان</span></TableCell>
                <TableCell><span className="text-xs font-mono text-gray-600">{(p.hourlyRate).toLocaleString('fa-IR')} تومان/ساعت</span></TableCell>
                <TableCell><span className="font-mono text-xs text-gray-500">{p.bankShebaNumber || '—'}</span></TableCell>
                <TableCell><Badge variant="success">فعال</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* 1. Modal: Generate Slip */}
      <Modal
        isOpen={isGenerateSlipOpen}
        onClose={() => setIsGenerateSlipOpen(false)}
        title="صدور فیش حقوقی ماهیانه"
        description="محاسبه حقوق ناخالص، کسورات بیمه و ثبت فیش حقوقی"
        maxWidth="lg"
      >
        <form onSubmit={handleGenerateSlip} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">انتخاب پرسنل / دبیر</label>
              <select
                value={slipForm.userId}
                onChange={(e) => setSlipForm({ ...slipForm, userId: e.target.value })}
                className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.user?.id}>
                    {t.user?.firstName} {t.user?.lastName} ({t.personnelCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="سال"
                type="number"
                value={slipForm.year}
                onChange={(e) => setSlipForm({ ...slipForm, year: Number(e.target.value) })}
                required
              />
              <Input
                label="ماه (۱ تا ۱۲)"
                type="number"
                value={slipForm.month}
                onChange={(e) => setSlipForm({ ...slipForm, month: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="حقوق ناخالص (تومان)"
              type="number"
              value={slipForm.grossPay}
              onChange={(e) => setSlipForm({ ...slipForm, grossPay: Number(e.target.value), netPay: Number(e.target.value) - slipForm.totalDeductions })}
              required
            />
            <Input
              label="کسورات بیمه و مالیات (تومان)"
              type="number"
              value={slipForm.totalDeductions}
              onChange={(e) => setSlipForm({ ...slipForm, totalDeductions: Number(e.target.value), netPay: slipForm.grossPay - Number(e.target.value) })}
              required
            />
            <Input
              label="خالص پرداختی (تومان)"
              type="number"
              value={slipForm.netPay}
              readOnly
              className="bg-gray-50 font-bold text-emerald-700"
            />
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsGenerateSlipOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              صدور فیش حقوقی
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Modal: Create Profile */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="تعریف پرونده و پروفایل حقوقی پرسنل"
        description="ثبت حقوق پایه، قرارداد و اطلاعات حساب بانکی"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">انتخاب پرسنل</label>
            <select
              value={profileForm.userId}
              onChange={(e) => setProfileForm({ ...profileForm, userId: e.target.value })}
              className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.user?.id}>
                  {t.user?.firstName} {t.user?.lastName} ({t.personnelCode})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="حقوق پایه ماهانه (تومان)"
              type="number"
              value={profileForm.baseMonthlySalary}
              onChange={(e) => setProfileForm({ ...profileForm, baseMonthlySalary: Number(e.target.value) })}
              required
            />
            <Input
              label="نرخ تدریس ساعتی (تومان)"
              type="number"
              value={profileForm.hourlyRate}
              onChange={(e) => setProfileForm({ ...profileForm, hourlyRate: Number(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="نام بانک"
              value={profileForm.bankName}
              onChange={(e) => setProfileForm({ ...profileForm, bankName: e.target.value })}
              required
            />
            <Input
              label="شماره شبا (با IR)"
              value={profileForm.bankShebaNumber}
              onChange={(e) => setProfileForm({ ...profileForm, bankShebaNumber: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsProfileModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              ذخیره پرونده حقوقی
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
