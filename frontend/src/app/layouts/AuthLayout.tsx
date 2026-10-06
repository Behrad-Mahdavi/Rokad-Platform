import React from 'react';
import { Outlet } from 'react-router-dom';
import { ScrollToTop } from '../../components/common/ScrollToTop';
import union1 from '../../assets/images/Union.svg';
import union2 from '../../assets/images/Union2.svg';
import union3 from '../../assets/images/Union3.svg';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-[#0B0F17] text-ink-normal dark:text-gray-100 font-sans transition-colors overflow-hidden">
      <ScrollToTop />
      {/* Brand Panel */}
      <div className="hidden lg:block w-[45%] h-screen overflow-hidden relative bg-black bg-gradient-to-t from-[#19A297] to-[#59BBAF] select-none">
        <img
          className="absolute bottom-10 -right-[110px] scale-140 pointer-events-none"
          alt=""
          src={union1}
        />
        <img
          className="absolute scale-60 -left-[100px] bottom-0 pointer-events-none"
          alt=""
          src={union2}
        />
        <img
          className="absolute left-[70px] top-10 pointer-events-none"
          alt=""
          src={union3}
        />
        <div className="absolute left-15 bottom-40 text-left z-10" dir="ltr">
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

