import React from 'react';
import { NavLink } from 'react-router-dom';
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
} from 'lucide-react';
import { UserRole } from '../../types/auth';

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
  const getNavItems = (): { section: string; items: NavItem[] }[] => {
    switch (role) {
      case 'SUPER_ADMIN':
        return [
          {
            section: 'مرکز فرماندهی SaaS',
            items: [
              { title: 'داشبورد متریک‌ها', href: '/app/super-admin/dashboard', icon: LayoutDashboard },
              { title: 'مدیریت مدارس و تننت‌ها', href: '/app/super-admin/tenants', icon: Building2 },
              { title: 'پلن‌های اشتراک و سهمیه‌ها', href: '/app/super-admin/subscriptions', icon: CreditCard },
              { title: 'قالب‌های نقش پویا', href: '/app/super-admin/role-templates', icon: Sliders },
              { title: 'عملیات و وضعیت سامانه', href: '/app/super-admin/ops', icon: Activity },
            ],
          },
        ];

      case 'SCHOOL_ADMIN':
      case 'STAFF':
        return [
          {
            section: 'مدیریت مدرسه',
            items: [
              { title: 'داشبورد مدیریت', href: '/app/admin/dashboard', icon: LayoutDashboard },
              { title: 'ساختار سال و کلاس‌ها', href: '/app/admin/academic', icon: GraduationCap },
              { title: 'مدیریت دانش‌آموزان و پرسنل', href: '/app/admin/members', icon: Users },
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
        ];

      case 'TEACHER':
        return [
          {
            section: 'میز کار معلم',
            items: [
              { title: 'داشبورد کلاس‌ها', href: '/app/teacher/dashboard', icon: LayoutDashboard },
              { title: 'حضور و غیاب', href: '/app/teacher/attendance', icon: CalendarDays },
              { title: 'تکالیف و بازخورد', href: '/app/teacher/homework', icon: FileCheck },
              { title: 'بانک سوال و آزمون‌ها', href: '/app/teacher/exams', icon: HelpCircle },
              { title: 'دفتر کلاسی و نمرات', href: '/app/teacher/gradebook', icon: BarChart3 },
              { title: 'طرح درس و محتوا', href: '/app/teacher/lessons', icon: BookOpen },
            ],
          },
        ];

      case 'STUDENT':
        return [
          {
            section: 'پرتال دانش‌آموز',
            items: [
              { title: 'داشبورد تحصیلی', href: '/app/student/dashboard', icon: LayoutDashboard },
              { title: 'تکالیف من', href: '/app/student/homework', icon: FileCheck },
              { title: 'آزمون‌های آنلاین', href: '/app/student/exams', icon: HelpCircle },
              { title: 'کارنامه و نمرات', href: '/app/student/grades', icon: BarChart3 },
              { title: 'محتوا و جزوات', href: '/app/student/materials', icon: BookOpen },
            ],
          },
        ];

      case 'PARENT':
        return [
          {
            section: 'پرتال اولیاء',
            items: [
              { title: 'داشبورد فرزندان', href: '/app/parent/dashboard', icon: LayoutDashboard },
              { title: 'پرداخت شهریه و اقساط', href: '/app/parent/fees', icon: CreditCard },
              { title: 'وضعیت انضباطی و نمرات', href: '/app/parent/reports', icon: BarChart3 },
              { title: 'ملاقات با کادر آموزشی', href: '/app/parent/visits', icon: CalendarDays },
            ],
          },
        ];

      default:
        return [];
    }
  };

  const navSections = getNavItems();

  return (
    <aside className="w-64 border-l border-gray-200 bg-white min-h-[calc(100vh-4rem)] flex flex-col justify-between p-4 shrink-0 shadow-sm">
      <div className="space-y-6">
        {/* Navigation Sections */}
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1.5">
            <h2 className="px-3 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
              {section.section}
            </h2>
            <nav className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    twMerge(
                      clsx(
                        'flex items-center space-x-3 space-x-reverse px-3 py-2.5 rounded-lg text-xs font-medium transition-all group',
                        isActive
                          ? 'bg-primary-light text-primary-darker font-bold border border-primary/20 shadow-sm'
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

      {/* Footer Banner */}
      <div className="rounded-xl bg-gradient-to-br from-primary-light to-white p-3.5 border border-primary/20 text-center">
        <div className="flex items-center justify-center space-x-1.5 space-x-reverse text-primary-dark font-bold text-xs">
          <Sparkles className="h-4 w-4" />
          <span>هوشمندسازی رُکاد</span>
        </div>
        <p className="text-[11px] text-gray-500 mt-1">
          نسل نوین مدیریت یکپارچه آموزشی
        </p>
      </div>
    </aside>
  );
};
