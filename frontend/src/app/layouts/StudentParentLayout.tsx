import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { useAuthStore } from '../../lib/auth/auth-store';

export const StudentParentLayout: React.FC = () => {
  const role = useAuthStore((state) => state.user?.role) || 'STUDENT';
  const effectiveRole = role === 'PARENT' ? 'PARENT' : 'STUDENT';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0F17] text-ink-normal dark:text-gray-100 flex flex-col font-sans transition-colors">
      <Header />
      <div className="flex flex-1 relative">
        <Sidebar role={effectiveRole} />
        <main className="flex-1 p-3 sm:p-5 md:p-6 pb-20 md:pb-8 max-w-7xl mx-auto w-full min-w-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav role={effectiveRole} />
    </div>
  );
};
