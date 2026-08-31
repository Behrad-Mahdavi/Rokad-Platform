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
  Receipt,
  Plus,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
} from 'lucide-react';

export const FeesPage: React.FC = () => {
  const [contracts, setContracts] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isCreateContractOpen, setIsCreateContractOpen] = useState(false);
  const [isInstallmentsOpen, setIsInstallmentsOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);

  // Forms
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contractForm, setContractForm] = useState({
    studentId: '',
    academicYearId: '',
    contractNumber: `FEE-1404-${Math.floor(100 + Math.random() * 900)}`,
    totalAmount: 36000000,
    discountAmount: 6000000,
    discountReason: 'تخفیف ثبت‌نام زودهنگام و ممتاز',
    installmentCount: 3,
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [contractsRes, studentsRes, yearsRes] = await Promise.all([
        apiClient.get('/finance/contracts'),
        apiClient.get('/members/students'),
        apiClient.get('/academic/years'),
      ]);
      setContracts(contractsRes.data || []);
      setStudents(studentsRes.data || []);
      setAcademicYears(yearsRes.data || []);

      if (studentsRes.data?.length > 0) {
        setContractForm((prev) => ({ ...prev, studentId: studentsRes.data[0].id }));
      }
      if (yearsRes.data?.length > 0) {
        const current = yearsRes.data.find((y: any) => y.isCurrent) || yearsRes.data[0];
        setContractForm((prev) => ({ ...prev, academicYearId: current.id }));
      }
    } catch (err) {
      console.error('Failed to load fee contracts', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const finalAmount = contractForm.totalAmount - contractForm.discountAmount;
      const instAmount = Math.round(finalAmount / contractForm.installmentCount);

      // Auto-generate installments
      const installments = Array.from({ length: contractForm.installmentCount }).map((_, i) => {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + (i * 2) + 1);
        return {
          installmentNumber: i + 1,
          title: i === 0 ? 'پیش‌پرداخت شهریه' : `قسط شماره ${i + 1}`,
          amount: instAmount,
          dueDate: dueDate.toISOString(),
        };
      });

      await apiClient.post('/finance/contracts', {
        studentId: contractForm.studentId,
        academicYearId: contractForm.academicYearId,
        contractNumber: contractForm.contractNumber,
        totalAmount: contractForm.totalAmount,
        discountAmount: contractForm.discountAmount,
        discountReason: contractForm.discountReason,
        installments,
      });

      setIsCreateContractOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت قرارداد شهریه.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink-darker flex items-center space-x-2 space-x-reverse">
            <Receipt className="h-6 w-6 text-amber-500" />
            <span>مدیریت قراردادهای شهریه و اقساط (Student Fee Engine)</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            تنظیم قراردادهای مالی، تقسیط هوشمند، تراکنش‌های آنلاین درگاه زرین‌پال و صدور رسید الکترونیکی
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsCreateContractOpen(true)}
          className="flex items-center space-x-1.5 space-x-reverse"
        >
          <Plus className="h-4 w-4" />
          <span>ثبت قرارداد شهریه جدید</span>
        </Button>
      </div>

      {/* Contracts Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>شماره قرارداد</TableHead>
            <TableHead>دانش‌آموز</TableHead>
            <TableHead>مبلغ کل شهریه</TableHead>
            <TableHead>تخفیف</TableHead>
            <TableHead>مبلغ قابل پرداخت</TableHead>
            <TableHead>وضعیت اقساط</TableHead>
            <TableHead className="text-center">عملیات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell><Skeleton className="h-8 w-24 mx-auto" /></TableCell>
              </TableRow>
            ))
          ) : contracts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                هنوز قراردادی ثبت نشده است. از دکمه «ثبت قرارداد شهریه جدید» استفاده کنید.
              </TableCell>
            </TableRow>
          ) : (
            contracts.map((c) => {
              const paidCount = c.installments?.filter((i: any) => i.status === 'PAID').length || 0;
              const totalInst = c.installments?.length || 0;

              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <span className="font-mono font-bold text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {c.contractNumber}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-ink-darker">
                      {c.student?.user?.firstName} {c.student?.user?.lastName}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      شماره: {c.student?.studentNumber}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-xs text-ink-dark">
                      {(c.totalAmount / 1000000).toLocaleString('fa-IR')} م تومان
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-rose-600 font-medium">
                      {(c.discountAmount / 1000000).toLocaleString('fa-IR')} م
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-xs text-emerald-700">
                      {(c.finalPayableAmount / 1000000).toLocaleString('fa-IR')} م تومان
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={paidCount === totalInst ? 'success' : 'warning'}>
                      {paidCount} از {totalInst} قسط پرداخت‌شده
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedContract(c);
                        setIsInstallmentsOpen(true);
                      }}
                      className="text-xs"
                    >
                      <CreditCard className="h-3.5 w-3.5 ml-1" />
                      <span>مشاهده اقساط</span>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* 1. Modal: Create Fee Contract */}
      <Modal
        isOpen={isCreateContractOpen}
        onClose={() => setIsCreateContractOpen(false)}
        title="ثبت قرارداد شهریه و تقسیط هوشمند"
        description="تعریف مبالغ، تخفیفات و تولید خودکار اقساط ماهانه"
        maxWidth="lg"
      >
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateContract} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">انتخاب دانش‌آموز</label>
              <select
                value={contractForm.studentId}
                onChange={(e) => setContractForm({ ...contractForm, studentId: e.target.value })}
                className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.user?.firstName} {s.user?.lastName} ({s.studentNumber})
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="شماره قرارداد مالی"
              value={contractForm.contractNumber}
              onChange={(e) => setContractForm({ ...contractForm, contractNumber: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="مبلغ کل شهریه (تومان)"
              type="number"
              value={contractForm.totalAmount}
              onChange={(e) => setContractForm({ ...contractForm, totalAmount: Number(e.target.value) })}
              required
            />
            <Input
              label="مبلغ تخفیف مصوب (تومان)"
              type="number"
              value={contractForm.discountAmount}
              onChange={(e) => setContractForm({ ...contractForm, discountAmount: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="علت / بند تخفیف"
              placeholder="مثال: فرزند کادر آموزشی یا ثبت‌نام زودهنگام"
              value={contractForm.discountReason}
              onChange={(e) => setContractForm({ ...contractForm, discountReason: e.target.value })}
            />

            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">تعداد اقساط</label>
              <select
                value={contractForm.installmentCount}
                onChange={(e) => setContractForm({ ...contractForm, installmentCount: Number(e.target.value) })}
                className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={1}>یکجا (پیش‌پرداخت کامل)</option>
                <option value={2}>۲ قسط (ترم اول و دوم)</option>
                <option value={3}>۳ قسط (مهر، آبان، بهمن)</option>
                <option value={4}>۴ قسط ماهانه</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-gray-50 border rounded-xl flex justify-between items-center text-xs font-bold text-ink-darker">
            <span>مبلغ خالص قابل پرداخت:</span>
            <span className="text-emerald-700 font-mono text-sm">
              {((contractForm.totalAmount - contractForm.discountAmount) / 1000000).toLocaleString('fa-IR')} میلیون تومان
            </span>
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCreateContractOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              ثبت و صدور اقساط
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Modal: Installments Breakdown */}
      <Modal
        isOpen={isInstallmentsOpen}
        onClose={() => setIsInstallmentsOpen(false)}
        title={`اقساط قرارداد: ${selectedContract?.contractNumber}`}
        description={`دانش‌آموز: ${selectedContract?.student?.user?.firstName} ${selectedContract?.student?.user?.lastName}`}
        maxWidth="lg"
      >
        {selectedContract && (
          <div className="space-y-4">
            <div className="space-y-2">
              {selectedContract.installments?.map((inst: any) => (
                <div
                  key={inst.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border bg-gray-50 text-xs"
                >
                  <div>
                    <div className="font-bold text-ink-darker flex items-center space-x-1.5 space-x-reverse">
                      <span>{inst.title}</span>
                      {inst.status === 'PAID' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      سررسید: {new Date(inst.dueDate).toLocaleDateString('fa-IR')}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className="font-bold text-ink-dark font-mono">
                      {(inst.amount / 1000000).toLocaleString('fa-IR')} م تومان
                    </div>

                    {inst.status === 'PAID' ? (
                      <Badge variant="success">پرداخت‌شده (درگاه)</Badge>
                    ) : (
                      <Badge variant="warning">در انتظار پرداخت</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={() => setIsInstallmentsOpen(false)}>
                بستن
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
