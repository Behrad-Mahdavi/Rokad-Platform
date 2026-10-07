import React from 'react';
import { Outlet } from 'react-router-dom';
import { ScrollToTop } from '../../components/common/ScrollToTop';
import loginPattern from '../../assets/images/login-pattern.svg';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-[#0B0F17] text-ink-normal dark:text-gray-100 font-sans transition-colors overflow-hidden">
      <ScrollToTop />
      {/* Brand Panel */}
      <div className="hidden lg:block w-[45%] h-screen overflow-hidden relative bg-black bg-gradient-to-t from-[#19A297] to-[#59BBAF] select-none">
        <img
          className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-30"
          alt=""
          src={loginPattern}
        />
        <div className="absolute right-12 sm:right-14 bottom-40 text-right z-10" dir="rtl">
          <h2 className="text-white text-4xl font-semibold">به پلتفرم رکاد</h2>
          <h1 className="text-white text-5xl font-black mt-2">خوش آمدید !</h1>
        </div>
      </div>

      {/* Main Form Container */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-12 min-h-screen overflow-y-auto">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

