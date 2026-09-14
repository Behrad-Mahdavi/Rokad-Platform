import React from 'react';
import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  MessageSquare,
  Menu,
  GraduationCap,
  FileCheck,
  HelpCircle,
  BarChart3,
  CreditCard,
  Building2,
  Activity,
  BookOpen,
} from 'lucide-react';
import { UserRole } from '../../types/auth';
import { useSidebarStore } from '../../lib/ui/sidebar-store';

interface MobileBottomNavProps {
  role: UserRole;
}

interface NavItemDef {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ role }) => {
  const { toggle, isOpen } = useSidebarStore();

  const getRoleItems = (): NavItemDef[] => {
    switch (role) {
      case 'SUPER_ADMIN':
        return [
          { title: 'داشبورد', href: '/app/super-admin/dashboard', icon: LayoutDashboard },
          { title: 'مدارس', href: '/app/super-admin/tenants', icon: Building2 },
          { title: 'اشتراک‌ها', href: '/app/super-admin/subscriptions', icon: CreditCard },
          { title: 'عملیات', href: '/app/super-admin/ops', icon: Activity },
        ];

      case 'SCHOOL_ADMIN':
      case 'STAFF':
        return [
          { title: 'داشبورد', href: '/app/admin/dashboard', icon: LayoutDashboard },
          { title: 'برنامه هفتگی', href: '/app/admin/schedule', icon: CalendarDays },
          { title: 'اعضا و کادر', href: '/app/admin/members', icon: Users },
          { title: 'اطلاعیه‌ها', href: '/app/notices', icon: FileCheck },
        ];

      case 'TEACHER':
        return [
          { title: 'میز کار', href: '/app/teacher/dashboard', icon: LayoutDashboard },
          { title: 'برنامه کلاس', href: '/app/teacher/schedule', icon: CalendarDays },
          { title: 'دفتر کلاسی', href: '/app/teacher/gradebook', icon: BookOpen },
          { title: 'تکالیف', href: '/app/teacher/homework', icon: FileCheck },
        ];

      case 'STUDENT':
        return [
          { title: 'داشبورد', href: '/app/student/dashboard', icon: LayoutDashboard },
          { title: 'برنامه من', href: '/app/student/schedule', icon: CalendarDays },
          { title: 'تکالیف', href: '/app/student/homework', icon: FileCheck },
          { title: 'آزمون‌ها', href: '/app/student/exams', icon: HelpCircle },
        ];

      case 'PARENT':
        return [
          { title: 'داشبورد', href: '/app/parent/dashboard', icon: LayoutDashboard },
          { title: 'برنامه کلاسی', href: '/app/parent/schedule', icon: CalendarDays },
          { title: 'شهریه', href: '/app/parent/fees', icon: CreditCard },
          { title: 'کارنامه', href: '/app/parent/reports', icon: BarChart3 },
        ];

      default:
        return [
          { title: 'اطلاعیه‌ها', href: '/app/notices', icon: FileCheck },
          { title: 'تقویم', href: '/app/calendar', icon: CalendarDays },
        ];
    }
  };

  const navItems = getRoleItems();

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#0B0F17]/95 backdrop-blur-md border-t border-gray-200/80 dark:border-gray-800 px-2 py-1.5 flex items-center justify-around md:hidden shadow-lg pb-[max(0.375rem,env(safe-area-inset-bottom))]"
    >
      {navItems.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          className={({ isActive }) =>
            twMerge(
              clsx(
                'flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all text-[10px] font-medium select-none min-w-0',
                isActive
                  ? 'text-primary font-bold scale-105'
                  : 'text-gray-500 dark:text-gray-400 hover:text-ink-dark dark:hover:text-white',
              ),
            )
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={clsx(
                  'h-7 w-7 rounded-lg flex items-center justify-center transition-colors mb-0.5',
                  isActive
                    ? 'bg-ecosystem-light dark:bg-ecosystem-darker/60 text-primary-darker dark:text-primary-light shadow-[1.5px_1.5px_0_#59BBAF]'
                    : 'text-gray-500 dark:text-gray-400',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
              </div>
              <span className="truncate max-w-[60px] text-center">{item.title}</span>
            </>
          )}
        </NavLink>
      ))}

      {/* Menu / More Button */}
      <button
        type="button"
        onClick={toggle}
        className={clsx(
          'flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all text-[10px] font-medium select-none min-w-0',
          isOpen
            ? 'text-primary font-bold'
            : 'text-gray-500 dark:text-gray-400 hover:text-ink-dark dark:hover:text-white',
        )}
      >
        <div
          className={clsx(
            'h-7 w-7 rounded-lg flex items-center justify-center transition-colors mb-0.5',
            isOpen
              ? 'bg-ecosystem-light dark:bg-ecosystem-darker/60 text-primary-darker dark:text-primary-light shadow-[1.5px_1.5px_0_#59BBAF]'
              : 'text-gray-500 dark:text-gray-400',
          )}
        >
          <Menu className="h-4 w-4 shrink-0" />
        </div>
        <span className="truncate">بیشتر</span>
      </button>
    </nav>
  );
};
