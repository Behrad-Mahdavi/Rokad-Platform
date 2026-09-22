import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { apiClient } from '../../lib/api/client';
import { toPersianDigits } from '../../lib/utils';
import { Bell, User } from 'lucide-react';
import rokadLogoWhite from '../../assets/logo-rokad-white.png';

interface NotificationItem {
  id: string;
  read: boolean;
}

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Notification count
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchUnreadCount = async () => {
    try {
      const res = await apiClient.get<NotificationItem[]>('/notifications');
      const list = res.data || [];
      if (Array.isArray(list)) {
        const count = list.filter((n) => !n.read).length;
        setUnreadCount(count);
      }
    } catch {
      // quiet fallback
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const timer = setInterval(fetchUnreadCount, 30000);

      // Sync fresh profile from server (including avatarUrl)
      apiClient
        .get('/auth/me')
        .then((res: any) => {
          const freshUser = res?.data?.user || res?.user;
          if (freshUser && freshUser.avatarUrl !== user.avatarUrl) {
            useAuthStore.getState().setUser({
              ...user,
              ...freshUser,
            });
          }
        })
        .catch(() => {});

      return () => clearInterval(timer);
    }
  }, [user?.id]);

  return (
    <>
      {/* Pinned Fixed Header - Stays permanently fixed during scroll */}
      <header className="fixed top-0 inset-x-0 z-50 h-16 sm:h-18 bg-primary dark:bg-[#121824] border-b-2 border-primary-dark dark:border-[#1E293B] text-white px-3.5 sm:px-6 flex items-center justify-between transition-colors shadow-xs select-none">
        {/* Right side (RTL start) - User Profile Icon Button (No box, pure icon) */}
        <div className="flex items-center z-10">
          <button
            type="button"
            onClick={() => navigate('/app/profile')}
            title="پروفایل کاربری"
            aria-label="پروفایل کاربری"
            className="relative p-2 rounded-full text-white hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center min-w-[44px] min-h-[44px] cursor-pointer"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.firstName}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-white/30"
              />
            ) : (
              <User className="w-6 h-6 sm:w-6.5 sm:h-6.5 text-white transition-transform" strokeWidth={2.2} />
            )}
          </button>
        </div>

        {/* Center - Absolute Centered Pure Solid White Logo */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto">
          <button
            type="button"
            onClick={() => navigate('/app')}
            title="صفحه اصلی رکاد"
            aria-label="صفحه اصلی رکاد"
            className="flex items-center justify-center min-h-[44px] min-w-[44px] p-1 cursor-pointer transition-transform duration-150 hover:scale-105 active:scale-95"
          >
            <img
              src={rokadLogoWhite}
              alt="لوگوی رکاد"
              className="h-10 sm:h-11 max-h-[44px] w-auto object-contain shrink-0"
            />
          </button>
        </div>

        {/* Left side (RTL end) - Notifications Button (No box, pure icon) */}
        <div className="flex items-center z-10">
          <button
            type="button"
            onClick={() => navigate('/app/notifications')}
            title="اعلان‌ها"
            aria-label="اعلان‌ها"
            className="relative p-2 rounded-full text-white hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center min-w-[44px] min-h-[44px] cursor-pointer"
          >
            <Bell className="w-6 h-6 sm:w-6.5 sm:h-6.5 text-white transition-transform" strokeWidth={2.2} />
            {unreadCount > 0 && (
              <span className="absolute top-1 left-1 h-4.5 min-w-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border border-white/80 shadow-xs">
                {toPersianDigits(unreadCount)}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Structural Document Flow Spacer - Guarantees zero jump or overlap under fixed header */}
      <div className="h-16 sm:h-18 shrink-0 pointer-events-none" aria-hidden="true" />
    </>
  );
};
