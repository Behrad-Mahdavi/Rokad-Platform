import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { useTenantStore } from '../../lib/auth/tenant-store';
import { apiClient } from '../../lib/api/client';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useSidebarStore } from '../../lib/ui/sidebar-store';
import {
  LogOut,
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
  Menu,
  GraduationCap,
  ExternalLink,
  Inbox,
  Filter,
  Loader2,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  read: boolean;
  type: string;
  badge?: 'default' | 'success' | 'warning' | 'destructive' | 'neutral' | 'college' | 'male' | 'female';
  targetUrl?: string;
  createdAt?: string;
}

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { currentTenant, switchBranch } = useTenantStore();
  const { toggle: toggleSidebar } = useSidebarStore();

  // Notification state
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotifLoading, setIsNotifLoading] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const fetchNotifications = async () => {
    try {
      setIsNotifLoading(true);
      const res = await apiClient.get<NotificationItem[]>('/notifications');
      const list = res.data || [];
      setNotifications(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setIsNotifLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user?.id, currentTenant?.id]);

  // Profile Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
  });
  const [passSuccess, setPassSuccess] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = async () => {
    try {
      const ids = notifications.filter((n) => !n.read).map((n) => n.id);
      if (ids.length > 0) {
        await apiClient.post('/notifications/mark-all-read', { notificationIds: ids });
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    try {
      if (!notif.read) {
        apiClient.patch(`/notifications/${notif.id}/read`).catch(() => {});
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
      }
      setIsNotifOpen(false);
      if (notif.targetUrl) {
        navigate(notif.targetUrl);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'سوپرادمین کلان';
      case 'SCHOOL_ADMIN':
        return 'مدیریت هنرستان';
      case 'TEACHER':
        return 'هنرآموز / دبیر تخصصی';
      case 'STUDENT':
        return 'هنرجو';
      case 'PARENT':
        return 'ولی هنرجو';
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
    <header className="h-16 border-b border-gray-200 bg-white px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Left (in RTL: Right) - Hamburger + Tenant & Title */}
      <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse min-w-0">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="منوی ناوبری"
          className="p-2 -mr-1 rounded-xl text-gray-600 hover:text-primary hover:bg-gray-100 lg:hidden shrink-0 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        <img
          src={currentTenant?.logoUrl || '/logo.svg'}
          alt="لوگوی رُکاد"
          className="h-9 w-9 rounded-xl object-cover border border-gray-200/80 shadow-2xs shrink-0"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="font-bold text-xs sm:text-sm text-ink-darker leading-tight truncate max-w-[130px] sm:max-w-xs md:max-w-md">
              {currentTenant?.name || 'هنرستان فنی و حرفه‌ای رُکاد'}
            </h1>
            <Badge variant={currentTenant?.slug === 'rokad-girls' ? 'female' : 'male'} className="text-[9px] py-0 px-1.5 h-4 sm:hidden shrink-0">
              {currentTenant?.slug === 'rokad-girls' ? 'دخترانه' : 'پسرانه'}
            </Badge>
          </div>
          <div className="hidden sm:flex items-center space-x-2 space-x-reverse mt-0.5">
            <span className="text-[11px] text-gray-500 font-mono truncate">
              {currentTenant?.slug || 'rokad-boys'}
            </span>
            <Badge variant={currentTenant?.slug === 'rokad-girls' ? 'female' : 'male'} className="text-[10px] py-0 px-1.5 h-4">
              {currentTenant?.slug === 'rokad-girls' ? 'شعبه دخترانه' : 'شعبه پسرانه'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Center/Quick Switcher: Boys vs Girls Vocational School (Desktop) */}
      <div className="hidden sm:flex items-center bg-gray-100/90 p-1 rounded-xl border border-gray-200 text-xs shrink-0">
        <button
          type="button"
          onClick={() => switchBranch('boys')}
          title="سوئیچ به هنرستان پسرانه رُکاد"
          className={`px-2 sm:px-3 py-1 rounded-lg font-bold transition-all flex items-center space-x-1.5 space-x-reverse ${
            currentTenant?.slug === 'rokad-boys'
              ? 'bg-sec text-white shadow-sm'
              : 'text-gray-600 hover:text-ink-dark'
          }`}
        >
          <GraduationCap className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">هنرستان</span>
          <span>پسرانه</span>
        </button>
        <button
          type="button"
          onClick={() => switchBranch('girls')}
          title="سوئیچ به هنرستان دخترانه رُکاد"
          className={`px-2 sm:px-3 py-1 rounded-lg font-bold transition-all flex items-center space-x-1.5 space-x-reverse ${
            currentTenant?.slug === 'rokad-girls'
              ? 'bg-girl text-white shadow-sm'
              : 'text-gray-600 hover:text-ink-dark'
          }`}
        >
          <GraduationCap className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">هنرستان</span>
          <span>دخترانه</span>
        </button>
      </div>

      {/* Right (in RTL: Left) - Notifications, User & Actions */}
      <div className="flex items-center space-x-2 sm:space-x-4 space-x-reverse shrink-0">
        {/* Notifications Popover Dropdown */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              if (!isNotifOpen) fetchNotifications();
            }}
            className="relative text-gray-500 hover:text-ink-dark"
            title="اعلان‌ها و رویدادهای اختصاصی"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 left-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-white text-[10px] font-bold items-center justify-center">
                  {unreadCount}
                </span>
              </span>
            )}
          </Button>

          {/* Popover Dropdown */}
          {isNotifOpen && (
            <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:left-0 sm:mt-2 sm:w-96 rounded-2xl bg-white p-4 shadow-2xl border border-gray-200 z-50 animate-in fade-in slide-in-from-top-2">
              {/* Header of Popover */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-ink-darker">اعلان‌ها و رویدادهای من</h4>
                    <span className="text-[10px] text-gray-400">
                      مخصوص رول {getRoleLabel(user?.role)}
                    </span>
                  </div>
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[10px] text-primary font-bold hover:underline bg-primary/5 px-2 py-1 rounded-lg"
                  >
                    علامت‌گذاری همه خوانده‌شده
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-gray-100 text-xs">
                <button
                  type="button"
                  onClick={() => setNotifFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    notifFilter === 'ALL'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  همه ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotifFilter('UNREAD')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    notifFilter === 'UNREAD'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  خوانده‌نشده ({unreadCount})
                </button>
              </div>

              {/* Notification List */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
                {isNotifLoading && notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span>در حال بارگذاری اعلان‌ها...</span>
                  </div>
                ) : notifications.filter((n) => (notifFilter === 'UNREAD' ? !n.read : true)).length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5">
                    <Inbox className="w-6 h-6 text-gray-300" />
                    <span>هیچ اعلانی در این بخش وجود ندارد.</span>
                  </div>
                ) : (
                  notifications
                    .filter((n) => (notifFilter === 'UNREAD' ? !n.read : true))
                    .map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3 rounded-xl border text-xs transition-all cursor-pointer group ${
                          n.read
                            ? 'bg-gray-50/60 border-gray-150 text-gray-500 hover:bg-gray-100'
                            : 'bg-primary/5 border-primary/25 text-ink-darker font-medium hover:bg-primary/10 shadow-xs'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {!n.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            )}
                            <span className="font-bold truncate text-foreground group-hover:text-primary transition-colors">
                              {n.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono shrink-0 whitespace-nowrap">
                            {n.time}
                          </span>
                        </div>

                        <p className="text-[11px] leading-relaxed text-gray-600 line-clamp-2">
                          {n.desc}
                        </p>

                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-200/50 text-[10px]">
                          <Badge variant={n.badge || 'neutral'} className="text-[9px] py-0 px-1.5 h-4">
                            {n.type}
                          </Badge>
                          {n.targetUrl && (
                            <span className="text-primary font-semibold flex items-center gap-0.5 group-hover:underline">
                              <span>مشاهده و اقدام</span>
                              <ExternalLink className="w-3 h-3 ml-0.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Trigger */}
        <div
          onClick={() => setIsProfileModalOpen(true)}
          className="flex items-center space-x-2 sm:space-x-3 space-x-reverse border-r border-gray-200 pr-2 sm:pr-4 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="hidden sm:block text-left">
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
