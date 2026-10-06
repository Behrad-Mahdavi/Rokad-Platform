import React from 'react';
import { Outlet } from 'react-router-dom';
import { ScrollToTop } from '../../components/common/ScrollToTop';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-[#0B0F17] text-ink-normal dark:text-gray-100 font-sans transition-colors overflow-hidden">
      <ScrollToTop />
      {/* Brand Panel */}
      <div className="hidden lg:block w-[45%] h-screen overflow-hidden relative bg-black bg-gradient-to-t from-[#19A297] to-[#59BBAF] select-none">
        <img
          className="absolute bottom-10 -right-[110px] scale-140 pointer-events-none"
          alt=""
          src="/src/assets/images/Union.png"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <img
          className="absolute scale-60 -left-[100px] bottom-0 pointer-events-none"
          alt=""
          src="/src/assets/images/Union2.png"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <img
          className="absolute left-[70px] pointer-events-none"
          alt=""
          src="/src/assets/images/Union3.png"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div className="absolute left-15 bottom-40 text-left" dir="ltr">
          <h2 className="text-white text-4xl font-gilory">Welcome To</h2>
          <h1 className="text-white text-5xl font-bold-gilory mt-1">KA Platform</h1>
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

