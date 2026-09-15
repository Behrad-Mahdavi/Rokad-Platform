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
      return () => clearInterval(timer);
    }
  }, [user?.id]);

  return (
    <>
      {/* Pinned Fixed Header - Stays permanently fixed during scroll */}
      <header className="fixed top-0 inset-x-0 z-50 h-16 sm:h-18 bg-primary dark:bg-[#121824] border-b-2 border-primary-dark dark:border-[#1E293B] text-white px-3.5 sm:px-6 flex items-center justify-between transition-colors shadow-xs select-none">
        {/* Right side (RTL start) - User Profile Icon Button */}
        <div className="flex items-center z-10">
          <button
            type="button"
            onClick={() => navigate('/app/profile')}
            title="پروفایل و تنظیمات"
            aria-label="پروفایل و تنظیمات"
            className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white hover:bg-primary-light border border-white dark:bg-[#1A2333] dark:hover:bg-[#222E42] dark:border-[#2C3B52] text-primary-darker dark:text-white transition-all active:scale-95 shadow-xs cursor-pointer flex items-center justify-center group"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.firstName}
                className="w-full h-full rounded-2xl object-cover"
              />
            ) : (
              <User className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-primary-darker dark:text-white transition-transform group-hover:scale-105" strokeWidth={2.2} />
            )}
            {/* Online Dot */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-accent-green rounded-full ring-2 ring-white dark:ring-[#1A2333]" />
          </button>
        </div>

        {/* Center - Absolute Centered Pure Solid White Logo */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto">
          <button
            type="button"
            onClick={() => navigate('/app')}
            title="صفحه اصلی رُکاد"
            aria-label="صفحه اصلی رُکاد"
            className="flex items-center justify-center p-1 cursor-pointer transition-transform duration-150 hover:scale-105 active:scale-95"
          >
            <img
              src={rokadLogoWhite}
              alt="لوگوی رُکاد"
              className="h-10 sm:h-11 max-h-[44px] w-auto object-contain shrink-0"
            />
          </button>
        </div>

        {/* Left side (RTL end) - Refined Notifications Button */}
        <div className="flex items-center z-10">
          <button
            type="button"
            onClick={() => navigate('/app/notifications')}
            title="اعلان‌ها و رویدادها"
            aria-label="اعلان‌ها"
            className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white hover:bg-primary-light border border-white dark:bg-[#1A2333] dark:hover:bg-[#222E42] dark:border-[#2C3B52] text-primary-darker dark:text-white transition-all active:scale-95 shadow-xs cursor-pointer flex items-center justify-center"
          >
            <Bell className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-primary-darker dark:text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -left-1.5 h-5 min-w-[20px] px-1 rounded-full bg-girl text-white text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-[#121824] shadow-xs">
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
