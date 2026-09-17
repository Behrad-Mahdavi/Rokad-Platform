import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { useTenantStore } from '../../lib/auth/tenant-store';
import { useWebPush } from '../../hooks/useWebPush';
import { toPersianDigits } from '../../lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import {
  User,
  Sun,
  Moon,
  Shield,
  KeyRound,
  LogOut,
  GraduationCap,
  BellRing,
  Smartphone,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  School,
  Phone,
  Lock,
  Send,
  Loader2,
} from 'lucide-react';
import { SecuritySection } from './components/SecuritySection';

export const ProfileSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { currentTenant, switchBranch } = useTenantStore();

  // Dark mode state
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const setTheme = (mode: 'light' | 'dark') => {
    const nextDark = mode === 'dark';
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('rokad-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('rokad-theme', 'light');
    }
  };

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  // Web push
  const {
    isSupported: isPushSupported,
    needsIOSInstall,
    isSubscribed: isPushSubscribed,
    isLoading: isPushLoading,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    sendTestNotification,
  } = useWebPush();
  const [testPushStatus, setTestPushStatus] = useState<string | null>(null);

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'سوپرادمین';
      case 'SCHOOL_ADMIN':
        return 'مدیریت';
      case 'TEACHER':
        return 'مربی';
      case 'STUDENT':
        return 'دانش‌آموز';
      case 'PARENT':
        return 'ولی دانش‌آموز';
      case 'STAFF':
        return 'کادر اجرایی';
      default:
        return 'کاربر';
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPassError('تکرار کلمه عبور جدید با کلمه عبور همخوانی ندارد.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPassError('کلمه عبور جدید باید حداقل ۶ کاراکتر باشد.');
      return;
    }

    setIsUpdatingPass(true);
    setTimeout(() => {
      setIsUpdatingPass(false);
      setPassSuccess('رمز عبور حساب کاربری با موفقیت به‌روزرسانی شد.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPassSuccess(null), 4000);
    }, 800);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-12 animate-in fade-in duration-300">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="بازگشت"
            className="p-2 rounded-xl bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:text-primary transition-all active:scale-95 shadow-2xs"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-black text-lg sm:text-xl text-ink-darker dark:text-white">
              پروفایل و تنظیمات
            </h1>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold gap-1.5"
        >
          <LogOut className="w-4 h-4" />
          <span>خروج از حساب</span>
        </Button>
      </div>

      {/* User Identity Hero Card */}
      <Card className="overflow-hidden border border-primary/25 dark:border-gray-800 bg-gradient-to-br from-white via-primary/5 to-teal-500/10 dark:from-[#151C28] dark:via-[#151C28] dark:to-primary/15 shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-right">
            {/* Big Avatar */}
            <div className="relative shrink-0">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.firstName}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-primary shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-darker text-white flex items-center justify-center shadow-male dark:shadow-ecosystem border-2 border-white dark:border-gray-700">
                  <User className="w-10 h-10 text-white" />
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 text-white rounded-lg ring-2 ring-white dark:ring-gray-800">
                <Sparkles className="w-3 h-3" />
              </span>
            </div>

            {/* Information */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-lg font-black text-ink-darker dark:text-white">
                  {user ? `${user.firstName} ${user.lastName}` : 'کاربر مهمان'}
                </h2>
                <Badge variant="default" className="text-[11px] py-0.5 px-2.5">
                  {getRoleLabel(user?.role)}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  <span className="font-mono">{user?.phone ? toPersianDigits(user.phone) : 'ثبت نشده'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <School className="w-3.5 h-3.5 text-male" />
                  <span>{currentTenant?.name || 'هنرستان رُکاد'}</span>
                </div>
              </div>

              {/* Branch quick badge */}
              <div className="pt-1 flex items-center justify-center sm:justify-start gap-2">
                <span className="text-[11px] text-gray-400">شعبه فعال:</span>
                <Badge variant={currentTenant?.slug === 'rokad-girls' ? 'female' : 'male'} className="text-[10px]">
                  {currentTenant?.slug === 'rokad-girls' ? 'هنرستان دخترانه' : 'هنرستان پسرانه'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme Selection Section */}
      <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#151C28]">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-extrabold">حالت نمایش (تم)</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-3">
            {/* Light Option */}
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center gap-2.5 text-center cursor-pointer ${
                !isDark
                  ? 'border-primary bg-primary/5 shadow-xs'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-2xs">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-xs block text-ink-darker dark:text-white">حالت روز (روشن)</span>
              </div>
              {!isDark && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-primary">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>فعال است</span>
                </div>
              )}
            </button>

            {/* Dark Option */}
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center gap-2.5 text-center cursor-pointer ${
                isDark
                  ? 'border-primary bg-primary/10 shadow-xs'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-slate-800 text-teal-300 flex items-center justify-center shadow-2xs">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-xs block text-ink-darker dark:text-white">حالت شب (تاریک)</span>
              </div>
              {isDark && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-primary">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>فعال است</span>
                </div>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Branch Switcher Section */}
      <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#151C28]">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-male/10 text-male">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-extrabold">تغییر شعبه هنرستان</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => switchBranch('boys')}
              className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                currentTenant?.slug === 'rokad-boys'
                  ? 'border-male bg-male/10 dark:bg-male/20 text-male-dark dark:text-male-light font-bold shadow-xs'
                  : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-male" />
                <span className="text-xs font-bold">شعبه پسرانه</span>
              </div>
              {currentTenant?.slug === 'rokad-boys' && <CheckCircle2 className="w-4 h-4 text-male" />}
            </button>

            <button
              type="button"
              onClick={() => switchBranch('girls')}
              className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                currentTenant?.slug === 'rokad-girls'
                  ? 'border-female bg-female/10 dark:bg-female/20 text-female-dark dark:text-pink-300 font-bold shadow-xs'
                  : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-female" />
                <span className="text-xs font-bold">شعبه دخترانه</span>
              </div>
              {currentTenant?.slug === 'rokad-girls' && <CheckCircle2 className="w-4 h-4 text-female" />}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Push Notifications Section */}
      {isPushSupported && (
        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#151C28]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-teal-500/10 text-primary">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-extrabold">اعلان‌های روی دستگاه (Web Push)</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {needsIOSInstall ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Smartphone className="w-4 h-4" />
                  <span>راهنمای فعال‌سازی در آیفون (iOS)</span>
                </div>
                <p className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-300">
                  در سافاری دکمه Share را بزنید و سپس «Add to Home Screen» را انتخاب کنید تا امکان دریافت اعلان فعال شود.
                </p>
              </div>
            ) : isPushSubscribed ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>اعلان‌های این دستگاه فعال و متصل است.</span>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={async () => {
                      setTestPushStatus('در حال ارسال...');
                      const ok = await sendTestNotification();
                      if (ok) {
                        setTestPushStatus('ارسال شد!');
                        setTimeout(() => setTestPushStatus(null), 2500);
                      } else {
                        setTestPushStatus('خطا در ارسال');
                        setTimeout(() => setTestPushStatus(null), 2500);
                      }
                    }}
                    disabled={isPushLoading}
                    className="px-2.5 py-1 text-xs bg-white dark:bg-[#1E2738] text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg font-bold flex items-center gap-1 shadow-2xs hover:bg-emerald-50 transition-all cursor-pointer"
                  >
                    {isPushLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    <span>{testPushStatus || 'تست نوتیفیکیشن'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => unsubscribePush()}
                    disabled={isPushLoading}
                    className="text-[11px] text-gray-400 hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    غیرفعال‌سازی
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  اعلان‌های مستقیم روی این دستگاه غیرفعال هستند.
                </span>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={async () => {
                    await subscribePush();
                  }}
                  disabled={isPushLoading}
                  className="text-xs"
                >
                  {isPushLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" /> : null}
                  فعال‌سازی اعلان‌ها
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Security Suite: 2FA, Active Sessions, and Password Management */}
      <SecuritySection />
    </div>
  );
};
