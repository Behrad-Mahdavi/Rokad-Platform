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
  UserCheck,
  AlertCircle,
  GraduationCap,
  Shield,
  Users,
  Crown,
  BookOpen,
} from 'lucide-react';
import { ApiResponse } from '../../types/api';
import { LoginResponse } from '../../types/auth';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const { currentTenant, setCurrentTenant } = useTenantStore();

  const [tenantSlug, setTenantSlug] = useState(currentTenant?.slug || 'rokad-boys');
  const [identifier, setIdentifier] = useState('09121111111');
  const [password, setPassword] = useState('RokadBoysPass2026!');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res: ApiResponse<LoginResponse> = await apiClient.post(
        '/auth/login',
        { identifier, password },
        { headers: { 'x-tenant-slug': tenantSlug } },
      );

      const { user, accessToken, refreshToken } = res.data;

      // Update active tenant store
      setCurrentTenant({
        id: user.tenantId,
        name: res.data.tenant?.name || 'مدرسه رُکاد',
        slug: tenantSlug,
        type: 'SCHOOL',
        theme: (res.data.tenant?.theme || 'ecosystem').toLowerCase() as any,
      });

      // Update auth store
      login(user, accessToken, refreshToken);

      // Redirect based on role
      switch (user.role) {
        case 'SUPER_ADMIN':
          navigate('/app/super-admin/dashboard');
          break;
        case 'SCHOOL_ADMIN':
        case 'STAFF':
          navigate('/app/admin/dashboard');
          break;
        case 'TEACHER':
          navigate('/app/teacher/dashboard');
          break;
        case 'STUDENT':
          navigate('/app/student/dashboard');
          break;
        case 'PARENT':
          navigate('/app/parent/dashboard');
          break;
        default:
          navigate('/app/admin/dashboard');
      }
    } catch (err: any) {
      setError(
        err.message ||
          (Array.isArray(err.message) ? err.message.join('، ') : 'نام کاربری یا رمز عبور اشتباه است.'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Quick preset login switcher for paired development & testing
  const selectPreset = (slug: string, phone: string, pass: string) => {
    setTenantSlug(slug);
    setIdentifier(phone);
    setPassword(pass);
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

        {/* Branch Selector Switch */}
        <div className="pt-2">
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-[#1C2536] rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
            <button
              type="button"
              onClick={() => {
                setTenantSlug('rokad-boys');
                setIdentifier('09121111111');
                setPassword('Rokad1404!');
              }}
              className={`py-2 rounded-lg font-bold transition-all flex items-center justify-center space-x-1.5 space-x-reverse ${
                tenantSlug === 'rokad-boys'
                  ? 'bg-sec text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-ink-dark dark:hover:text-white'
              }`}
            >
              <GraduationCap className="h-4 w-4 shrink-0" />
              <span>هنرستان پسرانه</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTenantSlug('rokad-girls');
                setIdentifier('09121111112');
                setPassword('Rokad1404!');
              }}
              className={`py-2 rounded-lg font-bold transition-all flex items-center justify-center space-x-1.5 space-x-reverse ${
                tenantSlug === 'rokad-girls'
                  ? 'bg-girl text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-ink-dark dark:hover:text-white'
              }`}
            >
              <GraduationCap className="h-4 w-4 shrink-0" />
              <span>هنرستان دخترانه</span>
            </button>
          </div>
        </div>
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
            label="شناسه شعبه هنرستان"
            placeholder="مثال: rokad-boys یا rokad-girls"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            required
          />

          <Input
            label="شماره موبایل یا نام کاربری"
            placeholder="مثال: 09121111111"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />

          <Input
            label="رمز عبور"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" variant="primary" className="w-full h-11 text-base mt-2" isLoading={isLoading}>
            ورود به سامانه هنرستان
          </Button>
        </form>

        {/* Demo Fast Login Presets */}
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-2 text-right">
            ورود سریع با نقش‌های پیش‌فرض هنرستان رُکاد:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
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

            <button
              type="button"
              onClick={() => selectPreset('rokad-boys', '09123000001', 'RokadPass2026!')}
              className="p-2 rounded-lg bg-gray-50 dark:bg-[#1C2536] hover:bg-gray-100 dark:hover:bg-[#242F42] text-right border border-gray-200 dark:border-gray-700 transition-colors"
            >
              <div className="font-bold text-ink-dark dark:text-white flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>هنرآموز / معلم</span>
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">09123000001</div>
            </button>

            <button
              type="button"
              onClick={() => selectPreset('rokad-boys', '09124000001', 'RokadPass2026!')}
              className="p-2 rounded-lg bg-gray-50 dark:bg-[#1C2536] hover:bg-gray-100 dark:hover:bg-[#242F42] text-right border border-gray-200 dark:border-gray-700 transition-colors"
            >
              <div className="font-bold text-ink-dark dark:text-white flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-sec dark:text-indigo-400 shrink-0" />
                <span>هنرجوی پسرانه</span>
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">09124000001</div>
            </button>

            <button
              type="button"
              onClick={() => selectPreset('rokad-girls', '09124000002', 'RokadPass2026!')}
              className="p-2 rounded-lg bg-gray-50 dark:bg-[#1C2536] hover:bg-gray-100 dark:hover:bg-[#242F42] text-right border border-gray-200 dark:border-gray-700 transition-colors"
            >
              <div className="font-bold text-ink-dark dark:text-white flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-girl dark:text-pink-400 shrink-0" />
                <span>هنرجوی دخترانه</span>
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">09124000002</div>
            </button>

            <button
              type="button"
              onClick={() => selectPreset('platform-root', '09120000000', 'RokadAdminPass2026!')}
              className="p-2 rounded-lg bg-gray-50 dark:bg-[#1C2536] hover:bg-gray-100 dark:hover:bg-[#242F42] text-right border border-gray-200 dark:border-gray-700 transition-colors"
            >
              <div className="font-bold text-ink-dark dark:text-white flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                <span>سوپرادمین کلان</span>
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">09120000000</div>
            </button>

            <button
              type="button"
              onClick={() => selectPreset('rokad-boys', '09125000001', 'RokadPass2026!')}
              className="p-2 rounded-lg bg-gray-50 dark:bg-[#1C2536] hover:bg-gray-100 dark:hover:bg-[#242F42] text-right border border-gray-200 dark:border-gray-700 transition-colors col-span-2"
            >
              <div className="font-bold text-ink-dark dark:text-white flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>اولیاء هنرجو</span>
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">09125000001 • رمز: RokadPass2026!</div>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
