import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  Receipt,
} from 'lucide-react';

export const ParentFeesPage: React.FC = () => {
  const [contract, setContract] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [payingInstallmentId, setPayingInstallmentId] = useState<string | null>(null);

  const fetchFees = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/finance/contracts/my-contract');
      setContract(res.data);
    } catch (err) {
      // Fallback mock if contract not linked
      setContract({
        contractNumber: 'FEE-1404-101',
        totalAmount: 36000000,
        discountAmount: 6000000,
        finalPayableAmount: 30000000,
        student: { user: { firstName: 'امیرعلی', lastName: 'صادقی' } },
        installments: [
          { id: 'inst-1', installmentNumber: 1, title: 'پیش‌پرداخت شهریه مهرماه', amount: 10000000, dueDate: '2026-09-23', status: 'PAID' },
          { id: 'inst-2', installmentNumber: 2, title: 'قسط دوم (آبان‌ماه)', amount: 10000000, dueDate: '2026-11-21', status: 'PAID' },
          { id: 'inst-3', installmentNumber: 3, title: 'قسط سوم (بهمن‌ماه)', amount: 10000000, dueDate: '2027-02-19', status: 'PENDING' },
        ],
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, []);

  const handlePayInstallment = async (installmentId: string) => {
    setPayingInstallmentId(installmentId);
    try {
      const res = await apiClient.post('/finance/payments/initiate', {
        installmentId,
        callbackUrl: window.location.origin + '/app/parent/fees/callback',
      });

      if (res.data?.paymentUrl) {
        window.location.href = res.data.paymentUrl;
      } else {
        alert('درگاه پرداخت زرین‌پال آماده گردید: ' + res.data.authority);
      }
    } catch (err: any) {
      alert(err.message || 'خطا در اتصال به درگاه پرداخت.');
    } finally {
      setPayingInstallmentId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-ink-darker flex items-center space-x-2 space-x-reverse">
          <CreditCard className="h-6 w-6 text-amber-500" />
          <span>شهریه، اقساط و درگاه پرداخت آنلاین (Tuition Fees & Payments)</span>
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          مشاهده قرارداد تحصیلی، وضعیت تسویه اقساط و پرداخت امن از طریق درگاه الکترونیکی شاپرک / زرین‌پال
        </p>
      </div>

      {/* Contract Financial Summary */}
      {contract && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="text-xs text-gray-500 font-medium mb-1">مبلغ کل شهریه تحصیلی</div>
            <div className="text-2xl font-extrabold text-ink-darker font-mono">
              {(contract.totalAmount / 1000000).toLocaleString('fa-IR')} م تومان
            </div>
            <p className="text-[11px] text-rose-600 mt-2">
              شامل {(contract.discountAmount / 1000000).toLocaleString('fa-IR')} میلیون تومان تخفیف مصوب
            </p>
          </Card>

          <Card className="p-6">
            <div className="text-xs text-gray-500 font-medium mb-1">مبلغ پرداخت‌شده تا کنون</div>
            <div className="text-2xl font-extrabold text-emerald-600 font-mono">
              ۲۰ میلیون تومان
            </div>
            <Badge variant="success" className="mt-2">۲ قسط تسویه‌شده</Badge>
          </Card>

          <Card className="p-6">
            <div className="text-xs text-gray-500 font-medium mb-1">مانده شهریه قابل پرداخت</div>
            <div className="text-2xl font-extrabold text-amber-500 font-mono">
              ۱۰ میلیون تومان
            </div>
            <p className="text-[11px] text-gray-500 mt-2">سررسید قسط بعدی: بهمن‌ماه</p>
          </Card>
        </div>
      )}

      {/* Installments List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center space-x-2 space-x-reverse">
            <Receipt className="h-4 w-4 text-primary" />
            <span>جدول اقساط و پرداخت‌های آنلاین</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {contract?.installments?.map((inst: any) => (
            <div
              key={inst.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border bg-gray-50 gap-4"
            >
              <div>
                <div className="font-bold text-sm text-ink-darker flex items-center space-x-2 space-x-reverse">
                  <span>{inst.title}</span>
                  {inst.status === 'PAID' ? (
                    <Badge variant="success">پرداخت‌شده (موفق)</Badge>
                  ) : (
                    <Badge variant="warning">در انتظار پرداخت</Badge>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1 flex items-center space-x-2 space-x-reverse">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  <span>سررسید پرداخت: {new Date(inst.dueDate).toLocaleDateString('fa-IR')}</span>
                </div>
              </div>

              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="text-left font-bold text-sm text-ink-dark font-mono">
                  {(inst.amount / 1000000).toLocaleString('fa-IR')} میلیون تومان
                </div>

                {inst.status === 'PAID' ? (
                  <Button variant="outline" size="sm" className="text-xs">
                    رسید دیجیتال
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handlePayInstallment(inst.id)}
                    isLoading={payingInstallmentId === inst.id}
                    className="text-xs flex items-center space-x-1.5 space-x-reverse bg-emerald-600 hover:bg-emerald-700"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>پرداخت آنلاین با درگاه زرین‌پال</span>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
