import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
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
  Activity,
  AlertTriangle,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Shield,
  Clock,
} from 'lucide-react';

export const PlatformOpsPage: React.FC = () => {
  const [maintenance, setMaintenance] = useState<any>({ enabled: false, message: '' });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isPurging, setIsPurging] = useState(false);
  const [purgeSuccess, setPurgeSuccess] = useState<string | null>(null);
  const [maintenanceMsg, setMaintenanceMsg] = useState('سامانه در حال ارتقاء و بهبود زیرساخت است.');

  const fetchStatusAndLogs = async () => {
    try {
      setIsLoadingLogs(true);
      const [maintRes, logsRes] = await Promise.all([
        apiClient.get('/saas/platform/maintenance'),
        apiClient.get('/saas/platform/audit-logs?limit=30'),
      ]);
      setMaintenance(maintRes.data);
      if (maintRes.data.message) {
        setMaintenanceMsg(maintRes.data.message);
      }
      setAuditLogs(logsRes.data);
    } catch (err) {
      console.error('Failed to load ops status', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchStatusAndLogs();
  }, []);

  const handleToggleMaintenance = async () => {
    const nextState = !maintenance.enabled;
    try {
      const res = await apiClient.post('/saas/platform/maintenance', {
        enabled: nextState,
        message: maintenanceMsg,
      });
      setMaintenance(res.data);
    } catch (err) {
      console.error('Failed to toggle maintenance mode', err);
    }
  };

  const handlePurgeCache = async () => {
    setIsPurging(true);
    setPurgeSuccess(null);
    try {
      await apiClient.post('/saas/platform/cache/purge', { pattern: '*' });
      setPurgeSuccess('حافظه کش ردیس با موفقیت در سراسر پلتفرم پاک‌سازی شد.');
      setTimeout(() => setPurgeSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to purge cache', err);
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-ink-darker flex items-center space-x-2 space-x-reverse">
          <Activity className="h-6 w-6 text-primary" />
          <span>عملیات، نگهداری و امنیت سراسری پلتفرم</span>
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          کنترل وضعیت برخط سامانه، لاگ‌های امنیتی فراتننت و مدیریت حافظه کش ردیس
        </p>
      </div>

      {/* Maintenance & Cache Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Maintenance Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <AlertTriangle className={`h-5 w-5 ${maintenance.enabled ? 'text-amber-600' : 'text-gray-400'}`} />
              <h3 className="font-bold text-sm text-ink-darker">حالت تعمیرات سراسری (Maintenance Mode)</h3>
            </div>
            {maintenance.enabled ? (
              <Badge variant="destructive">فعال — سامانه در دسترس نیست</Badge>
            ) : (
              <Badge variant="success">غیرفعال — سامانه برخط</Badge>
            )}
          </div>

          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            در صورت فعال‌سازی، تمامی درخواست‌های کاربران عادی مسدود شده و پیام نگهداری نمایش داده می‌شود (به جز سوپرادمین).
          </p>

          <div className="space-y-3 mb-4">
            <Input
              label="پیام نمایشی به کاربران در صفحه نگهداری"
              value={maintenanceMsg}
              onChange={(e) => setMaintenanceMsg(e.target.value)}
            />
          </div>

          <Button
            variant={maintenance.enabled ? 'secondary' : 'destructive'}
            onClick={handleToggleMaintenance}
            className="w-full text-xs"
          >
            {maintenance.enabled ? 'غیرفعال‌سازی حالت تعمیرات و برخط کردن سامانه' : 'فعال‌سازی حالت تعمیرات پلتفرم'}
          </Button>
        </Card>

        {/* Redis Cache Purge Card */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2 space-x-reverse">
                <RefreshCw className="h-5 w-5 text-blue-500" />
                <h3 className="font-bold text-sm text-ink-darker">مدیریت حافظه کش ردیس (Redis Cache)</h3>
              </div>
              <Badge variant="default">توزیع‌شده</Badge>
            </div>

            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              کلیدهای کش فیچرفلگ‌ها، اسلاگ مدارس، اطلاعات تننت و نشست‌ها در ردیس ذخیره می‌شوند. در صورت اعمال تغییرات اضطراری می‌توانید کش را به صورت دستی بازنشانی کنید.
            </p>

            {purgeSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs flex items-center space-x-2 space-x-reverse">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{purgeSuccess}</span>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            onClick={handlePurgeCache}
            isLoading={isPurging}
            className="w-full text-xs flex items-center justify-center space-x-1.5 space-x-reverse"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
            <span>پاک‌سازی فوری تمام کلیدهای کش</span>
          </Button>
        </Card>
      </div>

      {/* Global Audit Logs Explorer */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center space-x-2 space-x-reverse">
            <Shield className="h-4 w-4 text-primary" />
            <span>دفتر کل لاگ‌های امنیتی و حسابرسی پلتفرم (Audit Logs)</span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchStatusAndLogs}>
            <RefreshCw className="h-3.5 w-3.5 ml-1" />
            <span>به‌روزرسانی</span>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>عملیات (Action)</TableHead>
                <TableHead>موجودیت</TableHead>
                <TableHead>مدرسه / تننت</TableHead>
                <TableHead>کاربر مجری</TableHead>
                <TableHead>زمان رویداد</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingLogs ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                    در حال بارگذاری لاگ‌های امنیتی...
                  </TableCell>
                </TableRow>
              ) : auditLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                    هیچ لاگ امنیتی ثبت نشده است.
                  </TableCell>
                </TableRow>
              ) : (
                auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <span className="font-mono font-bold text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-600 font-mono">{log.entity}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium text-ink-dark">
                        {log.tenant?.name || log.tenantId}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-600">
                        {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'سیستم / سوپرادمین'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[11px] text-gray-400 font-mono flex items-center space-x-1 space-x-reverse">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(log.createdAt).toLocaleString('fa-IR')}</span>
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
