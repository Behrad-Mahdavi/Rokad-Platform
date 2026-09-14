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
import { useWebPush } from '../../hooks/useWebPush';
import { formatToJalali, toPersianDigits } from '../../lib/utils';
import {
  LogOut,
  Shield,
  Bell,
  BellRing,
  Smartphone,
  Send,
  CheckCircle2,
  KeyRound,
  Menu,
  GraduationCap,
  ExternalLink,
  Inbox,
  Loader2,
  Calendar,
  Sun,
  Moon,
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

  // Dark mode state with sync to localStorage
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('rokad-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('rokad-theme', 'light');
    }
  };

  // Live Persian Date
  const [liveDate] = useState(() =>
    formatToJalali(new Date(), { showMonthName: true, includeDayName: true })
  );

  // Notification state
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotifLoading, setIsNotifLoading] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  // Web Push state (iOS & Android)
  const {
    isSupported: isPushSupported,
    needsIOSInstall,
    isSubscribed: isPushSubscribed,
    isLoading: isPushLoading,
    error: pushError,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    sendTestNotification,
  } = useWebPush();
  const [testPushStatus, setTestPushStatus] = useState<string | null>(null);

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
    <header className="h-20 border-b border-[#EAEAEA] dark:border-gray-800 bg-white/90 dark:bg-[#0B0F17]/90 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs transition-colors">
      {/* Right (in RTL: Start) - Hamburger + Tenant Info */}
      <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse min-w-0">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="منوی ناوبری"
          className="p-2 -mr-1 rounded-xl text-gray-600 dark:text-gray-300 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden shrink-0 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        <img
          src={currentTenant?.logoUrl || '/logo.svg'}
          alt="لوگوی رُکاد"
          className="h-10 w-10 rounded-xl object-cover border-[1.5px] border-gray-200 dark:border-gray-700 shadow-2xs shrink-0"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="font-bold text-xs sm:text-sm text-ink-darker dark:text-white leading-tight truncate max-w-[130px] sm:max-w-xs md:max-w-md">
              {currentTenant?.name || 'هنرستان فنی و حرفه‌ای رُکاد'}
            </h1>
            <Badge variant={currentTenant?.slug === 'rokad-girls' ? 'female' : 'male'} className="text-[9px] py-0 px-1.5 h-4 sm:hidden shrink-0">
              {currentTenant?.slug === 'rokad-girls' ? 'دخترانه' : 'پسرانه'}
            </Badge>
          </div>
          <div className="hidden sm:flex items-center space-x-2 space-x-reverse mt-0.5">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate">
              {currentTenant?.slug || 'rokad-boys'}
            </span>
            <Badge variant={currentTenant?.slug === 'rokad-girls' ? 'female' : 'male'} className="text-[10px] py-0 px-1.5 h-4">
              {currentTenant?.slug === 'rokad-girls' ? 'شعبه دخترانه' : 'شعبه پسرانه'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Center: Live Persian Date & Vocational School Switcher */}
      <div className="hidden md:flex items-center gap-3 shrink-0">
        {/* Live Jalali Date Chip */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-[#161D2A] border border-gray-200/80 dark:border-gray-700 text-xs font-semibold text-ink-normal/80 dark:text-gray-300 shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span>{liveDate}</span>
        </div>

        {/* Quick Branch Switcher */}
        <div className="flex items-center bg-gray-100/90 dark:bg-[#161D2A] p-1 rounded-xl border border-gray-200 dark:border-gray-700 text-xs shrink-0">
          <button
            type="button"
            onClick={() => switchBranch('boys')}
            title="سوئیچ به هنرستان پسرانه رُکاد"
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 space-x-reverse ${
              currentTenant?.slug === 'rokad-boys'
                ? 'bg-male text-white border border-male-dark shadow-[1.5px_1.5px_0_#0B0F1F]'
                : 'text-gray-600 dark:text-gray-300 hover:text-ink-dark dark:hover:text-white'
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5 shrink-0" />
            <span>پسرانه</span>
          </button>
          <button
            type="button"
            onClick={() => switchBranch('girls')}
            title="سوئیچ به هنرستان دخترانه رُکاد"
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 space-x-reverse ${
              currentTenant?.slug === 'rokad-girls'
                ? 'bg-female text-white border border-female-dark shadow-[1.5px_1.5px_0_#5B0823]'
                : 'text-gray-600 dark:text-gray-300 hover:text-ink-dark dark:hover:text-white'
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5 shrink-0" />
            <span>دخترانه</span>
          </button>
        </div>
      </div>

      {/* Left (in RTL: End) - Dark Mode Toggle, Notifications, User Profile */}
      <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse shrink-0">
        {/* Dark Mode Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          title={isDark ? 'تغییر به حالت روز (روشن)' : 'تغییر به حالت شب (تاریک)'}
          aria-label="تغییر تم روز و شب"
          className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#161D2A] text-ink-normal dark:text-gray-200 hover:text-primary dark:hover:text-primary transition-all active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
        >
          {isDark ? (
            <Sun className="h-4.5 w-4.5 text-amber-400" />
          ) : (
            <Moon className="h-4.5 w-4.5 text-male" />
          )}
        </button>

        {/* Notifications Popover Dropdown */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              if (!isNotifOpen) fetchNotifications();
            }}
            className="relative text-gray-500 dark:text-gray-300 hover:text-ink-dark dark:hover:text-white"
            title="اعلان‌ها و رویدادهای اختصاصی"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 left-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-white text-[10px] font-bold items-center justify-center">
                  {toPersianDigits(unreadCount)}
                </span>
              </span>
            )}
          </Button>

          {/* Popover Dropdown */}
          {isNotifOpen && (
            <div className="fixed inset-x-3 top-20 sm:absolute sm:inset-auto sm:left-0 sm:mt-2 sm:w-96 rounded-2xl bg-white dark:bg-[#151C28] p-4 shadow-male dark:shadow-ecosystem border-[1.5px] border-gray-200 dark:border-gray-700 z-50 animate-in fade-in slide-in-from-top-2 text-right">
              {/* Header of Popover */}
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/70 pb-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-ecosystem-light dark:bg-ecosystem-darker/60 text-primary flex items-center justify-center">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-ink-darker dark:text-white">اعلان‌ها و رویدادهای من</h4>
                    <span className="text-[10px] text-gray-400">
                      مخصوص رول {getRoleLabel(user?.role)}
                    </span>
                  </div>
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[10px] text-primary font-bold hover:underline bg-primary/10 dark:bg-primary/20 px-2 py-1 rounded-lg cursor-pointer transition-colors"
                  >
                    علامت‌گذاری همه خوانده‌شده
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-gray-100 dark:border-gray-700/70 text-xs">
                <button
                  type="button"
                  onClick={() => setNotifFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    notifFilter === 'ALL'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  همه ({toPersianDigits(notifications.length)})
                </button>
                <button
                  type="button"
                  onClick={() => setNotifFilter('UNREAD')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    notifFilter === 'UNREAD'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  خوانده‌نشده ({toPersianDigits(unreadCount)})
                </button>
              </div>

              {/* Web Push (iOS & Android) Device Banner */}
              {isPushSupported && (
                <div className="mb-2.5 p-2.5 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-teal-50/40 dark:via-gray-800/40 to-primary/5 transition-all">
                  {needsIOSInstall ? (
                    <div className="space-y-1 text-right">
                      <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-[11px]">
                        <Smartphone className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>فعال‌سازی اعلان در آیفون (iOS)</span>
                      </div>
                      <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed">
                        جهت دریافت نوتیفیکیشن در آیفون، ابتدا دکمه <span className="font-bold text-gray-800 dark:text-gray-200">Share (اشتراک‌گذاری)</span> در نوار پایین سافاری را لمس و گزینه <span className="font-bold text-primary">«Add to Home Screen»</span> را بزنید.
                      </p>
                    </div>
                  ) : isPushSubscribed ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 truncate">
                            نوتیفیکیشن این دستگاه فعال است
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={async () => {
                              setTestPushStatus('در حال ارسال...');
                              const ok = await sendTestNotification();
                              if (ok) {
                                setTestPushStatus('ارسال شد!');
                                setTimeout(() => setTestPushStatus(null), 3000);
                              } else {
                                setTestPushStatus('خطا در ارسال');
                                setTimeout(() => setTestPushStatus(null), 3000);
                              }
                            }}
                            disabled={isPushLoading}
                            className="px-2 py-0.5 bg-white dark:bg-[#1C2536] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                            title="تست ارسال نوتیفیکیشن روی همین دستگاه"
                          >
                            {isPushLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Send className="w-2.5 h-2.5" />}
                            <span>{testPushStatus || 'تست اعلان'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => unsubscribePush()}
                            disabled={isPushLoading}
                            className="text-[9px] text-gray-400 hover:text-rose-600 px-1 py-0.5 rounded transition-colors cursor-pointer"
                            title="غیرفعال کردن اعلان‌ها روی این دستگاه"
                          >
                            خاموش
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <BellRing className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="text-[11px] font-bold text-ink-darker dark:text-white truncate">
                            دریافت فوری اعلان‌ها (پوش)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await subscribePush();
                            if (ok) {
                              setTimeout(() => sendTestNotification(), 600);
                            }
                          }}
                          disabled={isPushLoading}
                          className="h-6 text-[10px] font-bold px-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg flex items-center gap-1 transition-all shadow-2xs shrink-0 cursor-pointer"
                        >
                          {isPushLoading ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-2.5 h-2.5" />
                          )}
                          <span>فعال‌سازی در این دستگاه</span>
                        </button>
                      </div>
                      {pushError && (
                        <p className="text-[9px] text-rose-600 dark:text-rose-400 leading-tight">{pushError}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Notification List */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
                {isNotifLoading && notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span>در حال بارگذاری اعلان‌ها...</span>
                  </div>
                ) : notifications.filter((n) => (notifFilter === 'UNREAD' ? !n.read : true)).length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-1.5">
                    <Inbox className="w-6 h-6 text-gray-300 dark:text-gray-600" />
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
                            ? 'bg-gray-50/60 dark:bg-[#1C2536]/40 border-gray-150 dark:border-gray-700/60 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1C2536]'
                            : 'bg-primary/5 dark:bg-primary/10 border-primary/25 text-ink-darker dark:text-white font-medium hover:bg-primary/10 dark:hover:bg-primary/15 shadow-xs'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {!n.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            )}
                            <span className="font-bold truncate text-foreground dark:text-white group-hover:text-primary transition-colors">
                              {n.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono shrink-0 whitespace-nowrap">
                            {n.time}
                          </span>
                        </div>

                        <p className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-300 line-clamp-2">
                          {n.desc}
                        </p>

                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-200/50 dark:border-gray-700/50 text-[10px]">
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
          className="flex items-center space-x-2 sm:space-x-3 space-x-reverse border-r border-gray-200 dark:border-gray-700 pr-2 sm:pr-3 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="hidden sm:block text-left">
            <div className="font-bold text-xs text-ink-normal dark:text-white text-right">
              {user ? `${user.firstName} ${user.lastName}` : 'کاربر مهمان'}
            </div>
            <div className="flex items-center justify-end space-x-1 space-x-reverse mt-0.5">
              {user?.role === 'SUPER_ADMIN' && <Shield className="h-3 w-3 text-amber-500 ml-0.5" />}
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {getRoleLabel(user?.role)}
              </span>
            </div>
          </div>

          <div className="h-9 w-9 rounded-full bg-primary-light dark:bg-primary-darker/60 text-primary-darker dark:text-primary-light border-[1.5px] border-primary/40 shadow-[1.5px_1.5px_0_#202A5A] dark:shadow-[1.5px_1.5px_0_#59BBAF] flex items-center justify-center font-bold text-xs">
            {user?.firstName ? user.firstName[0] : 'U'}
          </div>
        </div>

        {/* Logout Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={logout}
          title="خروج از حساب کاربری"
          className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
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
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs flex items-center space-x-2 space-x-reverse">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{passSuccess}</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-[#1C2536] p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">نام و نام خانوادگی:</span>
                <strong className="text-ink-normal dark:text-white">{user?.firstName} {user?.lastName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">شماره موبایل:</span>
                <span className="font-mono text-ink-normal dark:text-white">{user?.phone ? toPersianDigits(user.phone) : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">نقش کاربری:</span>
                <Badge variant="default">{getRoleLabel(user?.role)}</Badge>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="font-bold text-xs text-ink-dark dark:text-white flex items-center space-x-1.5 space-x-reverse">
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
