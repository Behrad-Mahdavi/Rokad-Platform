import React from 'react';
import { Outlet } from 'react-router-dom';
import { School, Sparkles } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-gray-50 dark:bg-[#0B0F17] text-ink-normal dark:text-gray-100 font-sans transition-colors">
      {/* Left Brand Panel (in RTL: right side visually) */}
      <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-primary-darker via-primary to-primary-dark p-12 text-white flex-col justify-between relative overflow-hidden">
        {/* Background decorative patterns */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-black/20 blur-3xl pointer-events-none" />

        {/* Top Logo */}
        <div className="flex items-center space-x-3 space-x-reverse relative z-10">
          <img
            src="/logo.svg"
            alt="لوگوی رسمی رُکاد"
            className="h-12 w-12 rounded-2xl object-cover border border-white/30 shadow-lg shrink-0"
          />
          <div>
            <h1 className="font-bold text-2xl tracking-tight">هنرستان‌های رُکاد</h1>
            <p className="text-xs text-white/80">شعبه تخصصی دخترانه و پسرانه</p>
          </div>
        </div>

        {/* Center Hero Copy */}
        <div className="space-y-6 relative z-10">
          <div className="inline-flex items-center space-x-2 space-x-reverse bg-white/15 px-3 py-1.5 rounded-full text-xs backdrop-blur-md border border-white/20">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span>پلتفرم جامع و هوشمند مدیریت هنرستان</span>
          </div>

          <h2 className="text-3xl font-extrabold leading-snug">
            پلتفرم جامع رکاد
          </h2>

          <p className="text-sm text-white/80 leading-relaxed">
            سامانه رُکاد با پشتیبانی از سیستم ارزشیابی شایستگی‌محور، برنامه هفتگی کارگاهی، آزمون‌های آنلاین، حضور و غیاب هوشمند و چت کلاسی، فرآیندهای هنرستان را به سطحی نوین ارتقاء می‌دهد.
          </p>
        </div>

        {/* Bottom Metadata */}
        <div className="text-xs text-white/60 relative z-10 flex justify-between items-center border-t border-white/10 pt-6">
          <span>نسخه تخصصی هنرستان‌های رُکاد</span>
          <span>امنیت و ایزولاسیون اطلاعات شعب</span>
        </div>
      </div>

      {/* Right Form Container */}
      <main className="col-span-1 lg:col-span-7 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
