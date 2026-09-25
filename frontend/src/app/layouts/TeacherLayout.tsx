import React, { useRef, useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { ScrollToTop } from '../../components/common/ScrollToTop';

export const TeacherLayout: React.FC = () => {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    if (!pathname.includes('/events') && mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [pathname]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0F17] text-ink-normal dark:text-gray-100 flex flex-col font-sans transition-colors">
      <ScrollToTop />
      <Header />
      <div className="flex flex-1 relative">
        <Sidebar role="TEACHER" />
        <main
          ref={mainRef}
          className="flex-1 p-3 sm:p-5 md:p-6 pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:pb-8 max-w-7xl mx-auto w-full min-w-0 overflow-y-auto [scrollbar-gutter:stable]"
        >
          <Outlet />
        </main>
      </div>
      <MobileBottomNav role="TEACHER" />
    </div>
  );
};
