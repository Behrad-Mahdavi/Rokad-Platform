import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTenantStore } from '../../lib/auth/tenant-store';
import {
  Boxes,
  Trophy,
  Home,
  PlayCircle,
  CalendarDays,
} from 'lucide-react';

interface MobileBottomNavProps {
  role?: string;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = () => {
  const location = useLocation();
  const currentTenant = useTenantStore((state) => state.currentTenant);
  const isGirlsBranch = currentTenant?.slug === 'rokad-girls';

  const isHomeActive =
    location.pathname === '/app' ||
    location.pathname === '/app/' ||
    location.pathname.endsWith('/dashboard');

  return (
    <nav
      aria-label="سوپراپلیکیشن ناوبری پایین"
      dir="rtl"
      className={clsx(
        'fixed bottom-0 inset-x-0 z-40 px-3 py-1.5 flex items-center justify-between md:hidden shadow-lg pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-colors',
        isGirlsBranch
          ? 'bg-girl dark:bg-[#2B0916] border-t-2 border-female-dark dark:border-[#52112A] text-white'
          : 'bg-sec dark:bg-[#121828] border-t-2 border-male-dark dark:border-[#232F46] text-white'
      )}
    >
      {/* 1. First on Right: پلتفرم کا */}
      <NavLink
        to="/app/ka-platform"
        className={({ isActive }) =>
          twMerge(
            clsx(
              'flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all text-[10px] font-medium select-none min-w-0',
              isActive
                ? 'text-white font-black scale-105'
                : 'text-gray-200 dark:text-gray-300 hover:text-white',
            ),
          )
        }
      >
        {({ isActive }) => (
          <>
            <div
              className={clsx(
                'h-7 w-7 rounded-xl flex items-center justify-center transition-all mb-0.5',
                isActive
                  ? 'bg-primary text-white border border-primary-light shadow-[1.5px_1.5px_0_#1F413D]'
                  : 'text-inherit',
              )}
            >
              <Boxes className="h-4 w-4 shrink-0" />
            </div>
            <span className="truncate max-w-[64px] text-center">پلتفرم کا</span>
          </>
        )}
      </NavLink>

      {/* 2. Second on Right: باشگاه */}
      <NavLink
        to="/app/club"
        className={({ isActive }) =>
          twMerge(
            clsx(
              'flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all text-[10px] font-medium select-none min-w-0',
              isActive
                ? 'text-white font-black scale-105'
                : 'text-gray-200 dark:text-gray-300 hover:text-white',
            ),
          )
        }
      >
        {({ isActive }) => (
          <>
            <div
              className={clsx(
                'h-7 w-7 rounded-xl flex items-center justify-center transition-all mb-0.5',
                isActive
                  ? 'bg-primary text-white border border-primary-light shadow-[1.5px_1.5px_0_#1F413D]'
                  : 'text-inherit',
              )}
            >
              <Trophy className="h-4 w-4 shrink-0" />
            </div>
            <span className="truncate max-w-[64px] text-center">باشگاه</span>
          </>
        )}
      </NavLink>

      {/* 3. Center: هوم / صفحه اصلی (بدون تایتل با رنگ سبز پرایمری برند در انتخاب) */}
      <NavLink
        to="/app"
        title="صفحه اصلی"
        aria-label="صفحه اصلی"
        className="flex flex-col items-center justify-center flex-1 py-0.5 px-1 select-none min-w-0 group"
      >
        <div
          className={clsx(
            'w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-95 shadow-md',
            isHomeActive
              ? 'bg-primary text-white shadow-[2px_2px_0_#1F413D] border-2 border-primary-light -translate-y-1'
              : isGirlsBranch
              ? 'bg-[#B31449] dark:bg-[#4E0920] text-white border border-[#E0195B] hover:bg-girl'
              : 'bg-[#2B3878] dark:bg-[#1C2640] text-white border border-male-dark hover:bg-sec',
          )}
        >
          <Home className="h-5 w-5 shrink-0" />
        </div>
      </NavLink>

      {/* 4. Left of Center: رسانه */}
      <NavLink
        to="/app/media"
        className={({ isActive }) =>
          twMerge(
            clsx(
              'flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all text-[10px] font-medium select-none min-w-0',
              isActive
                ? 'text-white font-black scale-105'
                : 'text-gray-200 dark:text-gray-300 hover:text-white',
            ),
          )
        }
      >
        {({ isActive }) => (
          <>
            <div
              className={clsx(
                'h-7 w-7 rounded-xl flex items-center justify-center transition-all mb-0.5',
                isActive
                  ? 'bg-primary text-white border border-primary-light shadow-[1.5px_1.5px_0_#1F413D]'
                  : 'text-inherit',
              )}
            >
              <PlayCircle className="h-4 w-4 shrink-0" />
            </div>
            <span className="truncate max-w-[64px] text-center">رسانه</span>
          </>
        )}
      </NavLink>

      {/* 5. Far Left: تقویم */}
      <NavLink
        to="/app/calendar"
        className={({ isActive }) =>
          twMerge(
            clsx(
              'flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all text-[10px] font-medium select-none min-w-0',
              isActive
                ? 'text-white font-black scale-105'
                : 'text-gray-200 dark:text-gray-300 hover:text-white',
            ),
          )
        }
      >
        {({ isActive }) => (
          <>
            <div
              className={clsx(
                'h-7 w-7 rounded-xl flex items-center justify-center transition-all mb-0.5',
                isActive
                  ? 'bg-primary text-white border border-primary-light shadow-[1.5px_1.5px_0_#1F413D]'
                  : 'text-inherit',
              )}
            >
              <CalendarDays className="h-4 w-4 shrink-0" />
            </div>
            <span className="truncate max-w-[64px] text-center">تقویم</span>
          </>
        )}
      </NavLink>
    </nav>
  );
};
