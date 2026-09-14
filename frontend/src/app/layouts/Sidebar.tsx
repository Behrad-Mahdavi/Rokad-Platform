import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Sliders,
  ShieldCheck,
  Activity,
  GraduationCap,
  Users,
  CalendarDays,
  FileCheck,
  BookOpen,
  HelpCircle,
  BarChart3,
  Receipt,
  Wallet,
  MessageSquare,
  Sparkles,
  X,
  Vote,
  School,
  ShieldAlert,
  UserCheck,
  Award,
  FileQuestion,
} from 'lucide-react';
import { UserRole } from '../../types/auth';
import { useSidebarStore } from '../../lib/ui/sidebar-store';

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface SidebarProps {
  role: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const { isOpen, close } = useSidebarStore();
  const location = useLocation();

  // Auto-close mobile drawer when location/route changes
  useEffect(() => {
    close();
  }, [location.pathname, close]);

  const getNavItems = (): { section: string; items: NavItem[] }[] => {
    const commsSection = {
      section: 'ارتباطات و اطلاع‌رسانی',
      items: [
        { title: 'بورد اطلاعیه‌ها', href: '/app/notices', icon: FileCheck },
        { title: 'تقویم و رویدادها (۱۴۰۵)', href: '/app/calendar', icon: CalendarDays },
        { title: 'نظرسنجی و آراء', href: '/app/polls', icon: Vote },
      ],
    };

    switch (role) {
      case 'SUPER_ADMIN':
        return [
          {
            section: 'مرکز فرماندهی SaaS',
            items: [
              { title: 'داشبورد متریک‌ها', href: '/app/super-admin/dashboard', icon: LayoutDashboard },
              { title: 'مدیریت شعب و تننت‌ها', href: '/app/super-admin/tenants', icon: Building2 },
              { title: 'پلن‌های اشتراک و سهمیه‌ها', href: '/app/super-admin/subscriptions', icon: CreditCard },
              { title: 'قالب‌های نقش پویا', href: '/app/super-admin/role-templates', icon: Sliders },
              { title: 'عملیات و وضعیت سامانه', href: '/app/super-admin/ops', icon: Activity },
            ],
          },
          commsSection,
        ];

      case 'SCHOOL_ADMIN':
      case 'STAFF':
        return [
          {
            section: 'مدیریت هنرستان',
            items: [
              { title: 'داشبورد مدیریت', href: '/app/admin/dashboard', icon: LayoutDashboard },
              { title: 'پروفایل و وبلاگ مدرسه', href: '/app/admin/profile', icon: School },
              { title: 'ساختار سال و کلاس‌ها', href: '/app/admin/academic', icon: GraduationCap },
              { title: 'برنامه هفتگی کلاس‌ها', href: '/app/admin/schedule', icon: CalendarDays },
              { title: 'مدیریت هنرجویان و پرسنل', href: '/app/admin/members', icon: Users },
              { title: 'امور انضباطی و تشویقی', href: '/app/admin/matters', icon: ShieldAlert },
            ],
          },
          {
            section: 'امور مالی و اداری',
            items: [
              { title: 'شهریه و اقساط', href: '/app/admin/finance/fees', icon: Receipt },
              { title: 'حقوق و دستمزد', href: '/app/admin/finance/payroll', icon: Wallet },
              { title: 'گزارش‌های جامع', href: '/app/admin/reports', icon: BarChart3 },
            ],
          },
          commsSection,
        ];

      case 'TEACHER':
        return [
          {
            section: 'میز کار هنرآموز / دبیر',
            items: [
              { title: 'داشبورد کلاس‌ها', href: '/app/teacher/dashboard', icon: LayoutDashboard },
              { title: 'برنامه هفتگی کلاس‌ها', href: '/app/teacher/schedule', icon: CalendarDays },
              { title: 'دفتر کلاسی', href: '/app/teacher/gradebook', icon: BookOpen },
              { title: 'تکالیف و بازخورد', href: '/app/teacher/homework', icon: FileCheck },
              { title: 'بانک سوالات متمرکز', href: '/app/teacher/question-bank', icon: FileQuestion },
              { title: 'آزمون‌های آنلاین', href: '/app/teacher/exams', icon: HelpCircle },
              { title: 'طرح درس و محتوا', href: '/app/teacher/lessons', icon: BookOpen },
              { title: 'موارد انضباطی و تشویقی', href: '/app/teacher/matters', icon: ShieldAlert },
              { title: 'ملاقات با اولیاء', href: '/app/teacher/visits', icon: UserCheck },
            ],
          },
          commsSection,
        ];

      case 'STUDENT':
        return [
          {
            section: 'پرتال هنرجو',
            items: [
              { title: 'داشبورد تحصیلی', href: '/app/student/dashboard', icon: LayoutDashboard },
              { title: 'برنامه هفتگی کلاس', href: '/app/student/schedule', icon: CalendarDays },
              { title: 'تکالیف من', href: '/app/student/homework', icon: FileCheck },
              { title: 'آزمون‌های آنلاین', href: '/app/student/exams', icon: HelpCircle },
              { title: 'کارنامه و نمرات', href: '/app/student/grades', icon: BarChart3 },
              { title: 'موارد انضباطی و تشویقی', href: '/app/student/matters', icon: Award },
              { title: 'محتوا و جزوات', href: '/app/student/materials', icon: BookOpen },
            ],
          },
          commsSection,
        ];

      case 'PARENT':
        return [
          {
            section: 'پرتال اولیاء هنرجو',
            items: [
              { title: 'داشبورد فرزندان', href: '/app/parent/dashboard', icon: LayoutDashboard },
              { title: 'برنامه هفتگی فرزند', href: '/app/parent/schedule', icon: CalendarDays },
              { title: 'پرداخت شهریه و اقساط', href: '/app/parent/fees', icon: CreditCard },
              { title: 'کارنامه و نمرات', href: '/app/parent/reports', icon: BarChart3 },
              { title: 'موارد انضباطی و تشویقی', href: '/app/parent/matters', icon: Award },
              { title: 'ملاقات با کادر آموزشی', href: '/app/parent/visits', icon: UserCheck },
            ],
          },
          commsSection,
        ];

      default:
        return [commsSection];
    }
  };

  const navSections = getNavItems();

  const renderNavSections = () => (
    <div className="space-y-5">
      {navSections.map((section, idx) => (
        <div key={idx} className="space-y-1">
          <h2 className="px-3 text-[10px] sm:text-[11px] font-black tracking-wider text-gray-400 uppercase">
            {section.section}
          </h2>
          <nav className="space-y-0.5">
            {section.items.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  twMerge(
                    clsx(
                      'flex items-center space-x-3 space-x-reverse px-3 py-2 sm:py-2.5 rounded-xl text-xs font-medium transition-all group select-none',
                      isActive
                        ? 'bg-primary-light text-primary-darker font-bold border border-primary/20 shadow-xs'
                        : 'text-ink-normal hover:bg-gray-50 hover:text-ink-darker',
                    ),
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>{item.title}</span>
                {item.badge && (
                  <span className="mr-auto bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      ))}
    </div>
  );

  const renderFooterBanner = () => (
    <div className="rounded-xl bg-gradient-to-br from-primary-light to-white p-3 border border-primary/20 text-center shadow-2xs">
      <div className="flex items-center justify-center space-x-2 space-x-reverse text-primary-dark font-bold text-xs">
        <img src="/logo.svg" alt="رُکاد" className="h-4 w-4 rounded-md object-cover inline-block shrink-0 shadow-2xs" />
        <span>هوشمندسازی رُکاد</span>
      </div>
      <p className="text-[10px] text-gray-500 mt-0.5">
        نسل نوین مدیریت یکپارچه آموزشی
      </p>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 border-l border-gray-200 bg-white min-h-[calc(100vh-4rem)] flex-col shrink-0 shadow-xs">
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 no-scrollbar">
          {renderNavSections()}
        </div>
        <div className="p-3.5 border-t border-gray-100 bg-white shrink-0">
          {renderFooterBanner()}
        </div>
      </aside>

      {/* 2. Mobile Off-canvas Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={close}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* 3. Mobile Off-canvas Drawer */}
      <aside
        className={twMerge(
          clsx(
            'fixed inset-y-0 right-0 z-50 w-72 sm:w-80 bg-white border-l border-gray-200 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out lg:hidden',
            isOpen ? 'translate-x-0' : 'translate-x-full',
          ),
        )}
      >
        {/* Drawer Header (Attached directly to top) */}
        <div className="p-3.5 sm:p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.svg"
              alt="رُکاد"
              className="h-8 w-8 rounded-xl object-cover border border-gray-200 shadow-2xs shrink-0"
            />
            <div>
              <span className="font-bold text-xs text-ink-darker block leading-tight">
                منوی دسترسی سریع
              </span>
              <span className="text-[10px] text-gray-400 font-medium leading-tight">
                پلتفرم مدیریت آموزشی رُکاد
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={close}
            aria-label="بستن منو"
            className="h-8 w-8 rounded-lg text-gray-400 hover:text-ink-dark hover:bg-gray-200/60 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Nav Sections (Immediately below header, NO gap!) */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4 no-scrollbar">
          {renderNavSections()}
        </div>

        {/* Docked Drawer Footer */}
        <div className="p-3.5 sm:p-4 border-t border-gray-100 bg-white shrink-0">
          {renderFooterBanner()}
        </div>
      </aside>
    </>
  );
};
