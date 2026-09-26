import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { useTenantStore } from '../../lib/auth/tenant-store';
import { apiClient } from '../../lib/api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { AlertCircle } from 'lucide-react';
import { TwoFactorVerificationModal } from './components/TwoFactorVerificationModal';
import { toEnglishDigits } from '../../lib/utils';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const { currentTenant, setCurrentTenant } = useTenantStore();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 2FA state
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [tempToken, setTempToken] = useState('');

  const handle2FASuccess = (res: any) => {
    const loginData = res?.data || res;
    const user = loginData?.user;
    const accessToken = loginData?.accessToken;
    const refreshToken = loginData?.refreshToken;

    if (!user) {
      setError(loginData?.message || 'اطلاعات کاربری پس از تأیید دو مرحله‌ای دریافت نشد.');
      return;
    }

    const tenant = loginData?.tenant || user?.tenant;
    const effectiveTenantId = user.tenantId || tenant?.id || currentTenant?.id || 'd51697c7-85cd-423f-a526-b567590638f1';
    const effectiveSlug = tenant?.slug || currentTenant?.slug || 'rokad-boys';

    setCurrentTenant({
      id: effectiveTenantId,
      name: tenant?.name || 'مدرسه رکاد',
      slug: effectiveSlug,
      type: 'SCHOOL',
      theme: (tenant?.theme || 'ecosystem').toLowerCase() as any,
    });

    login({ ...user, tenantId: effectiveTenantId }, accessToken, refreshToken);
    setIs2FAModalOpen(false);
    navigate('/app');
  };

  const applyLoginSuccess = (res: any) => {
    const loginData = res?.data || res;
    const { user, accessToken, refreshToken } = loginData || {};
    if (!user || !accessToken) {
      throw new Error(loginData?.message || 'پاسخ نامعتبر از سرویس ورود');
    }

    const tenant = loginData?.tenant || user?.tenant;
    const effectiveTenantId = user.tenantId || tenant?.id || currentTenant?.id || 'd51697c7-85cd-423f-a526-b567590638f1';
    const effectiveSlug = tenant?.slug || currentTenant?.slug || 'rokad-boys';

    setCurrentTenant({
      id: effectiveTenantId,
      name: tenant?.name || 'مدرسه رُکاد',
      slug: effectiveSlug,
      type: 'SCHOOL',
      theme: (tenant?.theme || 'ecosystem').toLowerCase() as any,
    });

    login({ ...user, tenantId: effectiveTenantId }, accessToken, refreshToken);
    navigate('/app');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = toEnglishDigits(identifier).trim();
    const cleanPass = toEnglishDigits(password).trim();

    if (!cleanId || !cleanPass) {
      setError('لطفاً نام کاربری/شماره همراه و رمز عبور را وارد کنید.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res: any = await apiClient.post('/auth/login', {
        identifier: cleanId,
        password: cleanPass,
      });

      const responsePayload = res?.data || res;

      // Check if 2FA verification is required
      if (responsePayload?.requiresTwoFactor || res?.requiresTwoFactor) {
        const token = responsePayload?.tempToken || res?.tempToken;
        setTempToken(token);
        setIs2FAModalOpen(true);
        return;
      }

      applyLoginSuccess(res);
    } catch (err: any) {
      const status = err?.response?.status ?? err?.statusCode;
      const msg =
        err?.message ||
        err?.response?.data?.message ||
        (status === 401
          ? 'شناسه یا رمز عبور نادرست است'
          : status === 404
            ? 'شعبه یا کاربر یافت نشد'
            : 'خطا در ورود؛ لطفاً دوباره تلاش کنید');

      if (err?.response || (status && status !== 0)) {
        setError(msg);
      } else {
        setError('اتصال به سرور برقرار نیست؛ اتصال اینترنت را بررسی کنید');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg border-gray-200">
      <CardHeader className="text-right space-y-1.5 pb-3">
        <div className="flex items-center space-x-2.5 space-x-reverse">
          <img
            src="/logo.svg"
            alt="لوگوی رکاد"
            className="h-8 w-8 rounded-xl object-cover shadow-2xs shrink-0"
          />
          <CardTitle className="text-lg sm:text-xl">ورود به سامانه رکاد</CardTitle>
        </div>
        <CardDescription className="text-xs">
          سامانه یکپارچه هوشمند هنرستان‌های رکاد
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 flex items-center space-x-2 space-x-reverse rounded-xl bg-red-50 dark:bg-rose-950/40 p-3 text-xs text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Input
            label="نام کاربری یا شماره همراه"
            placeholder="کد ملی یا شماره همراه"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="رمز عبور"
            type="password"
            placeholder="رمز عبور حساب"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" variant="primary" className="w-full h-11 text-sm sm:text-base mt-2" isLoading={isLoading}>
            ورود به حساب
          </Button>
        </form>
      </CardContent>

      <TwoFactorVerificationModal
        isOpen={is2FAModalOpen}
        tempToken={tempToken}
        onSuccess={handle2FASuccess}
        onClose={() => setIs2FAModalOpen(false)}
      />
    </Card>
  );
};
