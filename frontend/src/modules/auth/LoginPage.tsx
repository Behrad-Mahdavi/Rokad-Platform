import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { useTenantStore } from '../../lib/auth/tenant-store';
import { apiClient } from '../../lib/api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import {
  Lock,
  Phone,
  School,
  AlertCircle,
  GraduationCap,
  Shield,
  Users,
  Crown,
  BookOpen,
  Target,
} from 'lucide-react';
import { ApiResponse } from '../../types/api';
import { LoginResponse } from '../../types/auth';
import { TwoFactorVerificationModal } from './components/TwoFactorVerificationModal';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const { currentTenant, setCurrentTenant } = useTenantStore();

  const [tenantSlug, setTenantSlug] = useState(currentTenant?.slug || 'rokad-boys');
  const [identifier, setIdentifier] = useState('09121111111');
  const [password, setPassword] = useState('RokadBoysPass2026!');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 2FA state
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [tempToken, setTempToken] = useState('');

  const handle2FASuccess = (res: any) => {
    const loginData = res.data || res;
    const { user, accessToken, refreshToken } = loginData;

    setCurrentTenant({
      id: user.tenantId,
      name: loginData.tenant?.name || 'مدرسه رُکاد',
      slug: tenantSlug,
      type: 'SCHOOL',
      theme: (loginData.tenant?.theme || 'ecosystem').toLowerCase() as any,
    });

    login(user, accessToken, refreshToken);
    setIs2FAModalOpen(false);
    navigate('/app');
  };

  const applyLoginSuccess = (res: any) => {
    const loginData = res?.data || res;
    const { user, accessToken, refreshToken } = loginData || {};
    if (!user || !accessToken) {
      throw new Error('پاسخ نامعتبر از سرویس ورود');
    }

    setCurrentTenant({
      id: user.tenantId,
      name: loginData.tenant?.name || 'مدرسه رُکاد',
      slug: tenantSlug,
      type: 'SCHOOL',
      theme: (loginData.tenant?.theme || 'ecosystem').toLowerCase() as any,
    });

    login(user, accessToken, refreshToken);
    navigate('/app');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res: any = await apiClient.post(
        '/auth/login',
        { identifier, password },
        { headers: { 'x-tenant-slug': tenantSlug } },
      );

      // Check if 2FA verification is required
      if (res?.requiresTwoFactor) {
        setTempToken(res.tempToken);
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
            ? 'شعبه یافت نشد؛ شناسه شعبه را بررسی کنید'
            : 'خطا در ورود؛ دوباره تلاش کنید');

      // Real API error (4xx/5xx with response) — show it, never fake-login.
      if (err?.response || (status && status !== 0)) {
        setError(msg);
      } else {
        // Network unreachable only
        setError('اتصال به سرور برقرار نیست؛ اتصال اینترنت را بررسی کنید');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Quick preset: fills credentials and performs a REAL login.
  const selectPreset = (slug: string, phone: string, pass: string) => {
    setTenantSlug(slug);
    setIdentifier(phone);
    setPassword(pass);
    setError(null);
    void (async () => {
      setIsLoading(true);
      try {
        const res: any = await apiClient.post(
          '/auth/login',
          { identifier: phone, password: pass },
          { headers: { 'x-tenant-slug': slug } },
        );
        if (res?.requiresTwoFactor) {
          setTempToken(res.tempToken);
          setIs2FAModalOpen(true);
          return;
        }
        // applyLoginSuccess uses tenantSlug state — set slug on store first
        const loginData = res?.data || res;
        const { user, accessToken, refreshToken } = loginData || {};
        if (!user || !accessToken) throw new Error('پاسخ نامعتبر از سرویس ورود');
        setCurrentTenant({
          id: user.tenantId,
          name: loginData.tenant?.name || 'مدرسه رُکاد',
          slug,
          type: 'SCHOOL',
          theme: (loginData.tenant?.theme || 'ecosystem').toLowerCase() as any,
        });
        login(user, accessToken, refreshToken);
        navigate('/app');
      } catch (err: any) {
        const status = err?.response?.status ?? err?.statusCode;
        const msg =
          err?.message ||
          err?.response?.data?.message ||
          (status === 401 ? 'شناسه یا رمز عبور نادرست است' : 'خطا در ورود');
        if (err?.response || (status && status !== 0)) setError(msg);
        else setError('اتصال به سرور برقرار نیست');
      } finally {
        setIsLoading(false);
      }
    })();
  };

  return (
    <Card className="shadow-lg border-gray-200">
      <CardHeader className="text-right space-y-2">
        <div className="flex items-center space-x-2.5 space-x-reverse">
          <img
            src="/logo.svg"
            alt="لوگوی رُکاد"
            className="h-8 w-8 rounded-xl object-cover shadow-2xs shrink-0"
          />
          <CardTitle className="text-xl">ورود به هنرستان‌های رُکاد</CardTitle>
        </div>
        <CardDescription>
          سامانه هوشمند و یکپارچه هنرستان‌های غیردولتی دخترانه و پسرانه رُکاد
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 flex items-center space-x-2 space-x-reverse rounded-lg bg-red-50 dark:bg-rose-950/40 p-3 text-xs text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="شناسه شعبه هنرستان یا کالج"
            placeholder="مثال: rokad-boys یا rokad-girls یا rokad-college"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            required
          />

          <Input
            label="کد ملی یا نام کاربری"
            placeholder="مثال: 0012345678 (کد ملی) یا شماره همراه"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />

          <Input
            label="رمز عبور"
            type="password"
            placeholder="مثال: b0012345678 یا رمز اختصاصی"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" variant="primary" className="w-full h-11 text-base mt-2" isLoading={isLoading}>
            ورود به سامانه یکپارچه
          </Button>
        </form>

        {/* Demo Fast Login Presets */}
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-2 text-right">
            ورود سریع با سامانه ورود یکپارچه رُکاد (کد ملی + رمز استاندارد):
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Unified Boys Student */}
            <button
              type="button"
              onClick={() => selectPreset('rokad-boys', '0012345678', 'b0012345678')}
              className="p-2 rounded-lg bg-sec/5 dark:bg-sec/15 hover:bg-sec/10 dark:hover:bg-sec/25 text-right border border-sec/30 transition-colors"
            >
              <div className="font-bold text-sec dark:text-indigo-400 flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                <span>هنرجوی پسرانه</span>
              </div>
              <div className="text-[10px] text-gray-600 dark:text-gray-300 font-mono mt-0.5">
                0012345678 • b...
              </div>
            </button>

            {/* Unified Girls Student */}
            <button
              type="button"
              onClick={() => selectPreset('rokad-girls', '0023456789', 'g0023456789')}
              className="p-2 rounded-lg bg-pink-50 dark:bg-pink-950/20 hover:bg-pink-100 dark:hover:bg-pink-950/40 text-right border border-pink-200 dark:border-pink-800 transition-colors"
            >
              <div className="font-bold text-pink-700 dark:text-pink-300 flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                <span>هنرجوی دخترانه</span>
              </div>
              <div className="text-[10px] text-gray-600 dark:text-gray-300 font-mono mt-0.5">
                0023456789 • g...
              </div>
            </button>

            {/* Unified College Student */}
            <button
              type="button"
              onClick={() => selectPreset('rokad-college', '0034567890', 'c0034567890')}
              className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/20 hover:bg-teal-100 dark:hover:bg-teal-950/40 text-right border border-teal-200 dark:border-teal-800 transition-colors"
            >
              <div className="font-bold text-teal-700 dark:text-teal-300 flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                <span>دانشجوی کالج</span>
              </div>
              <div className="text-[10px] text-gray-600 dark:text-gray-300 font-mono mt-0.5">
                0034567890 • c...
              </div>
            </button>

            {/* Teacher */}
            <button
              type="button"
              onClick={() => selectPreset('rokad-boys', '09123000001', 'RokadPass2026!')}
              className="p-2 rounded-lg bg-gray-50 dark:bg-[#1C2536] hover:bg-gray-100 dark:hover:bg-[#242F42] text-right border border-gray-200 dark:border-gray-700 transition-colors"
            >
              <div className="font-bold text-ink-dark dark:text-white flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>مربی</span>
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">09123000001</div>
            </button>

            {/* Coach */}
            <button
              type="button"
              onClick={() => selectPreset('rokad-boys', '09129990001', 'RokadPass2026!')}
              className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 text-right border border-emerald-200 dark:border-emerald-800 transition-colors"
            >
              <div className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>کوچ و مشاور</span>
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">09129990001</div>
            </button>

            {/* Admin Boys */}
            <button
              type="button"
              onClick={() => selectPreset('rokad-boys', '09121111111', 'RokadBoysPass2026!')}
              className="p-2 rounded-lg bg-gray-50 dark:bg-[#1C2536] hover:bg-gray-100 dark:hover:bg-[#242F42] text-right border border-gray-200 dark:border-gray-700 transition-colors"
            >
              <div className="font-bold text-ink-dark dark:text-white flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-sec dark:text-indigo-400 shrink-0" />
                <span>مدیر پسرانه</span>
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">09121111111</div>
            </button>

            {/* Admin Girls */}
            <button
              type="button"
              onClick={() => selectPreset('rokad-girls', '09121111112', 'RokadGirlsPass2026!')}
              className="p-2 rounded-lg bg-gray-50 dark:bg-[#1C2536] hover:bg-gray-100 dark:hover:bg-[#242F42] text-right border border-gray-200 dark:border-gray-700 transition-colors"
            >
              <div className="font-bold text-ink-dark dark:text-white flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-girl dark:text-pink-400 shrink-0" />
                <span>مدیر دخترانه</span>
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">09121111112</div>
            </button>

            {/* SuperAdmin */}
            <button
              type="button"
              onClick={() => selectPreset('platform-root', '09120000000', 'RokadAdminPass2026!')}
              className="p-2 rounded-lg bg-gray-50 dark:bg-[#1C2536] hover:bg-gray-100 dark:hover:bg-[#242F42] text-right border border-gray-200 dark:border-gray-700 transition-colors col-span-2"
            >
              <div className="font-bold text-ink-dark dark:text-white flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                <span>سوپرادمین کلان پلتفرم رُکاد</span>
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">09120000000 • مدیریت کل سامانه‌ها</div>
            </button>
          </div>
        </div>
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
