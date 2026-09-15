import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { apiClient } from '../../lib/api/client';
import { useWebPush } from '../../hooks/useWebPush';
import { toPersianDigits } from '../../lib/utils';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Bell,
  BellRing,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Inbox,
  Loader2,
  Send,
  Smartphone,
  Sparkles,
  Volume2,
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

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  // Push notifications hook
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

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get<NotificationItem[]>('/notifications');
      const list = res.data || [];
      setNotifications(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user?.id]);

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
      if (notif.targetUrl) {
        navigate(notif.targetUrl);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredNotifications = notifications.filter((n) =>
    filter === 'UNREAD' ? !n.read : true
  );

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-12 animate-in fade-in duration-300">
      {/* Header Bar */}
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
            <div className="flex items-center gap-2">
              <h1 className="font-black text-lg sm:text-xl text-ink-darker dark:text-white">
                اعلان‌ها و رویدادها
              </h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-bold">
                  {toPersianDigits(unreadCount)} جدید
                </span>
              )}
            </div>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            className="text-xs font-bold text-primary hover:bg-primary/10 border-primary/30"
          >
            خوانده‌شدن همه
          </Button>
        )}
      </div>

      {/* Web Push Banner */}
      {isPushSupported && (
        <div className="p-3.5 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-teal-50/50 dark:via-gray-800/40 to-primary/5 shadow-2xs">
          {needsIOSInstall ? (
            <div className="space-y-1.5 text-right">
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-xs">
                <Smartphone className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>فعال‌سازی اعلان در آیفون (iOS)</span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                جهت دریافت نوتیفیکیشن در آیفون، ابتدا دکمه <span className="font-bold text-gray-800 dark:text-gray-100">Share (اشتراک‌گذاری)</span> در نوار سافاری را لمس و گزینه <span className="font-bold text-primary">«Add to Home Screen»</span> را انتخاب فرمایید.
              </p>
            </div>
          ) : isPushSubscribed ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                  اعلان‌های آنلاین روی این دستگاه فعال است
                </span>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
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
                  className="px-2.5 py-1 bg-white dark:bg-[#1C2536] hover:bg-emerald-50 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                >
                  {isPushLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  <span>{testPushStatus || 'تست اعلان'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => unsubscribePush()}
                  disabled={isPushLoading}
                  className="text-[10px] text-gray-400 hover:text-rose-500 transition-colors cursor-pointer"
                >
                  خاموش
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <BellRing className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs font-bold text-ink-darker dark:text-white truncate">
                  دریافت فوری پیام‌ها و هشدارهای مهم
                </span>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={async () => {
                  const ok = await subscribePush();
                  if (ok) {
                    setTimeout(() => sendTestNotification(), 600);
                  }
                }}
                disabled={isPushLoading}
                className="text-xs shrink-0"
              >
                {isPushLoading ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : <CheckCircle2 className="w-3.5 h-3.5 ml-1" />}
                فعال‌سازی در این دستگاه
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'ALL'
              ? 'bg-primary text-white shadow-xs'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          همه ({toPersianDigits(notifications.length)})
        </button>
        <button
          type="button"
          onClick={() => setFilter('UNREAD')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'UNREAD'
              ? 'bg-primary text-white shadow-xs'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          خوانده‌نشده ({toPersianDigits(unreadCount)})
        </button>
      </div>

      {/* Notification List */}
      <div className="space-y-2.5">
        {isLoading && notifications.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span>در حال دریافت اعلان‌ها...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400 bg-white dark:bg-[#151C28] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center gap-2 shadow-2xs">
            <Inbox className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            <span className="font-bold text-ink-normal dark:text-gray-300">هیچ اعلانی در این بخش وجود ندارد.</span>
            <span className="text-[11px] text-gray-400">تمام پیام‌های جدید شما در این صفحه قرار می‌گیرند.</span>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-4 rounded-2xl border text-xs transition-all cursor-pointer group shadow-2xs hover:shadow-xs ${
                notif.read
                  ? 'bg-white dark:bg-[#151C28] border-gray-200/80 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  : 'bg-primary/5 dark:bg-primary/10 border-primary/30 text-ink-darker dark:text-white font-medium hover:border-primary/50'
              }`}
            >
              <div className="flex justify-between items-start mb-1.5 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
                  )}
                  <h3 className="font-bold text-xs sm:text-sm text-foreground dark:text-white group-hover:text-primary transition-colors truncate">
                    {notif.title}
                  </h3>
                </div>
                <span className="text-[10px] text-gray-400 font-mono shrink-0">
                  {notif.time}
                </span>
              </div>

              <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300 mb-3">
                {notif.desc}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px]">
                <Badge variant={notif.badge || 'neutral'} className="text-[10px] py-0.5 px-2">
                  {notif.type}
                </Badge>
                {notif.targetUrl && (
                  <span className="text-primary font-bold flex items-center gap-1 group-hover:underline">
                    <span>مشاهده و جزئیات</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
