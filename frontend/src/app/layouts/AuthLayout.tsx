import React from 'react';
import { Outlet } from 'react-router-dom';
import { ScrollToTop } from '../../components/common/ScrollToTop';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-gray-50 dark:bg-[#0B0F17] text-ink-normal dark:text-gray-100 font-sans transition-colors">
      <ScrollToTop />
      {/* Brand Panel (right side visually in RTL) */}
      <div className="hidden lg:flex lg:col-span-5 bg-primary p-12 xl:p-16 text-white flex-col justify-end relative overflow-hidden select-none">
        {/* Soft, silky ambient glow */}
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-white/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-black/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />

        {/* Clean, bold headline */}
        <div className="relative z-10 text-right">
          <h2 className="text-4xl lg:text-5xl xl:text-6xl font-black text-white leading-tight tracking-tight">
            به رکاد
            <br />
            خوش آمدید!
          </h2>
        </div>
      </div>

      {/* Main Form Container */}
      <main className="col-span-1 lg:col-span-7 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
