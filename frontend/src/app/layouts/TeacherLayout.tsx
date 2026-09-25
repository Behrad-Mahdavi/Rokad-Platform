import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';

export const TeacherLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0F17] text-ink-normal dark:text-gray-100 flex flex-col font-sans transition-colors">
      <Header />
      <div className="flex flex-1 relative">
        <Sidebar role="TEACHER" />
        <main className="flex-1 p-3 sm:p-5 md:p-6 pb-20 md:pb-8 max-w-7xl mx-auto w-full min-w-0 overflow-y-auto [scrollbar-gutter:stable]">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav role="TEACHER" />
    </div>
  );
};
