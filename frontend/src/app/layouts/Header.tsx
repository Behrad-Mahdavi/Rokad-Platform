import React, { useState } from 'react';
import { useAuthStore } from '../../lib/auth/auth-store';
import { useTenantStore } from '../../lib/auth/tenant-store';
import { apiClient } from '../../lib/api/client';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import {
  LogOut,
  Palette,
  School,
  Shield,
  Bell,
  CheckCircle2,
  Clock,
  User,
  KeyRound,
  FileCheck,
  CreditCard,
  MessageSquare,
} from 'lucide-react';
import { BrandThemeKey } from '../../types/tenant';

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  read: boolean;
  type: 'HOMEWORK' | 'FEE' | 'CHAT' | 'SYSTEM';
}

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { currentTenant, theme, setTheme } = useTenantStore();

  // Notification state
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'n-1',
      title: 'تکلیف جدید ریاضی ثبت شد',
      desc: 'دکتر کاظمی: تمرینات فصل دوم هندسه تحلیلی برای کلاس ۱۰۱ ثبت شد.',
      time: '۱۰ دقیقه پیش',
      read: false,
      type: 'HOMEWORK',
    },
    {
      id: 'n-2',
      title: 'پرداخت آنلاین شهریه تایید شد',
      desc: 'قسط شهریه دانش‌آموز امیرعلی صادقی با موفقیت تسویه گردید.',
      time: '۱ ساعت پیش',
      read: false,
      type: 'FEE',
    },
    {
      id: 'n-3',
      title: 'پیام جدید در کانال کلاس ۱۰۱',
      desc: 'زمان آزمون میان‌ترم به ساعت ۱۰ صبح تغییر یافت.',
      time: '۳ ساعت پیش',
      read: true,
      type: 'CHAT',
    },
  ]);

  // Profile Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
  });
  const [passSuccess, setPassSuccess] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const themes: { key: BrandThemeKey; label: string; color: string }[] = [
    { key: 'ecosystem', label: 'اکوسیستم (اصلی)', color: '#59BBAF' },
    { key: 'male', label: 'پسرانه', color: '#202A5A' },
    { key: 'female', label: 'دخترانه', color: '#E0195B' },
    { key: 'college', label: 'کالج', color: '#F8A41D' },
    { key: 'club', label: 'کلوپ', color: '#652D90' },
  ];

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'سوپرادمین سامانه';
      case 'SCHOOL_ADMIN':
        return 'مدیر مدرسه';
      case 'TEACHER':
        return 'معلم / کادر آموزشی';
      case 'STUDENT':
        return 'دانش‌آموز';
      case 'PARENT':
        return 'ولی دانش‌آموز';
      default:
        return 'کاربر سامانه';
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setPassSuccess('رمز عبور با موفقیت به‌روزرسانی شد.');
      setTimeout(() => {
        setIsProfileModalOpen(false);
        setPassSuccess(null);
        setPasswordForm({ currentPassword: '', newPassword: '' });
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Left (in RTL: Right) - Tenant & Title */}
      <div className="flex items-center space-x-3 space-x-reverse">
        <div className="h-9 w-9 rounded-lg bg-primary-light flex items-center justify-center text-primary-dark border border-primary/20">
          <School className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-bold text-sm text-ink-darker leading-tight">
            {currentTenant?.name || 'پلتفرم جامع مدارس رُکاد'}
          </h1>
          <div className="flex items-center space-x-2 space-x-reverse mt-0.5">
            <span className="text-[11px] text-gray-500 font-mono">
              {currentTenant?.slug || 'rokad-platform'}
            </span>
            <Badge variant="default" className="text-[10px] py-0 px-1.5 h-4">
              نسخه ۱.۰
            </Badge>
          </div>
        </div>
      </div>

      {/* Right (in RTL: Left) - Notifications, Theme, User & Actions */}
      <div className="flex items-center space-x-4 space-x-reverse">
        {/* Theme Picker */}
        <div className="hidden md:flex items-center bg-gray-50 border border-gray-200 rounded-lg p-1 space-x-1 space-x-reverse">
          <Palette className="h-4 w-4 text-gray-400 mx-1" />
          {themes.map((t) => (
            <button
              key={t.key}
              onClick={() => setTheme(t.key)}
              title={t.label}
              className={`h-5 w-5 rounded-full transition-transform ${
                theme === t.key ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'opacity-70 hover:opacity-100'
              }`}
              style={{ backgroundColor: t.color }}
            />
          ))}
        </div>

        {/* Notifications Popover Dropdown */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative text-gray-500 hover:text-ink-dark"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 left-1.5 h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Button>

          {/* Popover Dropdown */}
          {isNotifOpen && (
            <div className="absolute left-0 mt-2 w-80 rounded-2xl bg-white p-4 shadow-xl border border-gray-200 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                <div className="font-bold text-xs text-ink-darker flex items-center space-x-1.5 space-x-reverse">
                  <Bell className="h-4 w-4 text-primary" />
                  <span>اعلانات و پیام‌های زنده</span>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[10px] text-primary font-bold hover:underline"
                  >
                    خوانده‌شدن همه
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-2.5 rounded-xl border text-xs transition-colors ${
                      n.read ? 'bg-gray-50/50 border-gray-100 text-gray-500' : 'bg-primary-light/20 border-primary/20 text-ink-darker font-medium'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold">{n.title}</span>
                      <span className="text-[9px] text-gray-400 font-mono">{n.time}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-gray-600">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Trigger */}
        <div
          onClick={() => setIsProfileModalOpen(true)}
          className="flex items-center space-x-3 space-x-reverse border-r border-gray-200 pr-4 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="text-left">
            <div className="font-bold text-xs text-ink-normal text-right">
              {user ? `${user.firstName} ${user.lastName}` : 'کاربر مهمان'}
            </div>
            <div className="flex items-center justify-end space-x-1 space-x-reverse mt-0.5">
              {user?.role === 'SUPER_ADMIN' && <Shield className="h-3 w-3 text-amber-500 ml-0.5" />}
              <span className="text-[10px] text-gray-500">
                {getRoleLabel(user?.role)}
              </span>
            </div>
          </div>

          <div className="h-9 w-9 rounded-full bg-primary-light text-primary border border-primary/30 flex items-center justify-center font-bold text-xs">
            {user?.firstName ? user.firstName[0] : 'U'}
          </div>
        </div>

        {/* Logout Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={logout}
          title="خروج از حساب کاربری"
          className="text-gray-500 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Profile & Security Modal */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="پروفایل و تنظیمات امنیتی حساب کاربری"
        description="اطلاعات هویتی و تغییر کلمه عبور"
        maxWidth="md"
      >
        {passSuccess ? (
          <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs flex items-center space-x-2 space-x-reverse">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{passSuccess}</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">نام و نام خانوادگی:</span>
                <strong>{user?.firstName} {user?.lastName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">شماره موبایل:</span>
                <span className="font-mono">{user?.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">نقش کاربری:</span>
                <Badge variant="default">{getRoleLabel(user?.role)}</Badge>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-3 pt-2 border-t border-gray-100">
              <div className="font-bold text-xs text-ink-dark flex items-center space-x-1.5 space-x-reverse">
                <KeyRound className="h-4 w-4 text-primary" />
                <span>تغییر رمز عبور</span>
              </div>

              <Input
                label="رمز عبور فعلی"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
              />

              <Input
                label="رمز عبور جدید"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                required
              />

              <div className="flex justify-end space-x-2 space-x-reverse pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsProfileModalOpen(false)}>
                  بستن
                </Button>
                <Button type="submit" variant="primary">
                  ذخیره رمز عبور جدید
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </header>
  );
};
