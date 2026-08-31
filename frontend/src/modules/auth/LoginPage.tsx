import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { useTenantStore } from '../../lib/auth/tenant-store';
import { apiClient } from '../../lib/api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Lock, Phone, School, UserCheck, AlertCircle } from 'lucide-react';
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
        <div className="flex items-center space-x-2 space-x-reverse text-primary-dark">
          <School className="h-6 w-6" />
          <CardTitle className="text-xl">ورود به پنل کاربری</CardTitle>
        </div>
        <CardDescription>
          جهت دسترسی به داشبورد، مشخصات مرکز و حساب کاربری خود را وارد کنید.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 flex items-center space-x-2 space-x-reverse rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="شناسه مدرسه (Tenant Slug)"
            placeholder="مثال: rokad-boys"
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
            ورود به سامانه
          </Button>
        </form>

        {/* Demo Fast Login Presets */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-[11px] font-bold text-gray-500 mb-2 text-right">
            ورود سریع با نقش‌های پیش‌فرض دمو:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => selectPreset('platform-root', '09120000000', 'RokadAdminPass2026!')}
              className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-right border border-gray-200 transition-colors"
            >
              <div className="font-bold text-ink-dark">👑 سوپرادمین</div>
              <div className="text-[10px] text-gray-500 font-mono">09120000000</div>
            </button>

            <button
              type="button"
              onClick={() => selectPreset('rokad-boys', '09121111111', 'RokadBoysPass2026!')}
              className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-right border border-gray-200 transition-colors"
            >
              <div className="font-bold text-ink-dark">🏫 مدیر مدرسه</div>
              <div className="text-[10px] text-gray-500 font-mono">09121111111</div>
            </button>

            <button
              type="button"
              onClick={() => selectPreset('rokad-boys', '09123000001', 'RokadPass2026!')}
              className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-right border border-gray-200 transition-colors"
            >
              <div className="font-bold text-ink-dark">👨‍🏫 معلم نمونه</div>
              <div className="text-[10px] text-gray-500 font-mono">09123000001</div>
            </button>

            <button
              type="button"
              onClick={() => selectPreset('rokad-boys', '09124000001', 'RokadPass2026!')}
              className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-right border border-gray-200 transition-colors"
            >
              <div className="font-bold text-ink-dark">🎓 دانش‌آموز</div>
              <div className="text-[10px] text-gray-500 font-mono">09124000001</div>
            </button>

            <button
              type="button"
              onClick={() => selectPreset('rokad-boys', '09125000001', 'RokadPass2026!')}
              className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-right border border-gray-200 transition-colors col-span-2"
            >
              <div className="font-bold text-ink-dark">👨‍👩‍👦 اولیاء دانش‌آموز</div>
              <div className="text-[10px] text-gray-500 font-mono">09125000001 • رمز: RokadPass2026!</div>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
