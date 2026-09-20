import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { useTenantStore } from '../../lib/auth/tenant-store';
import { apiClient } from '../../lib/api/client';
import { formatToJalali, toPersianDigits } from '../../lib/utils';
import { Badge } from '../../components/ui/Badge';
import {
  BookOpen,
  FileCheck,
  HelpCircle,
  BarChart3,
  CalendarDays,
  Vote,
  Users,
  ShieldAlert,
  Receipt,
  UserCheck,
  Wallet,
  Building2,
  Activity,
  Sliders,
  FileQuestion,
  GraduationCap,
  Bell,
  LayoutDashboard,
  ChevronLeft,
  Compass,
  Target,
  Sparkles,
  MessageSquare,
} from 'lucide-react';

interface SuperAppCard {
  id: string;
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  badge?: string;
}

export const SuperAppHomePage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const currentTenant = useTenantStore((state) => state.currentTenant);

  // Live Persian Date
  const [liveDate] = useState(() =>
    formatToJalali(new Date(), { showMonthName: true, includeDayName: true })
  );

  // Quick stats state
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [homeworkCount, setHomeworkCount] = useState<number>(0);
  const [examsCount, setExamsCount] = useState<number>(0);
  const [eventsCount, setEventsCount] = useState<number>(0);

  useEffect(() => {
    const fetchQuickStats = async () => {
      try {
        const [hwRes, exRes, messagesRes, eventsRes] = await Promise.allSettled([
          apiClient.get('/homework'),
          apiClient.get('/exams'),
          apiClient.get('/messages/inbox?unreadOnly=true'),
          apiClient.get('/calendar/events'),
        ]);

        if (hwRes.status === 'fulfilled') {
          const list = Array.isArray(hwRes.value.data) ? hwRes.value.data : [];
          setHomeworkCount(list.length);
        }
        if (exRes.status === 'fulfilled') {
          const list = Array.isArray(exRes.value.data) ? exRes.value.data : [];
          setExamsCount(list.length);
        }
        if (messagesRes.status === 'fulfilled') {
          const res = messagesRes.value.data;
          const count = res?.meta?.unreadCount ?? (Array.isArray(res?.data) ? res.data.length : 0);
          setUnreadMessagesCount(count);
        }
        if (eventsRes.status === 'fulfilled') {
          const list = Array.isArray(eventsRes.value.data) ? eventsRes.value.data : [];
          setEventsCount(list.length);
        }
      } catch {
        // silent fallback
      }
    };

    fetchQuickStats();
  }, []);

  const getRoleTitle = () => {
    switch (user?.role) {
      case 'SUPER_ADMIN':
        return 'سوپرادمین کلان';
      case 'SCHOOL_ADMIN':
        return 'مدیریت';
      case 'STAFF':
        return 'کادر اجرایی';
      case 'TEACHER':
        return 'مربی';
      case 'STUDENT':
        return 'دانش‌آموز';
      case 'PARENT':
        return 'ولی دانش‌آموز';
      case 'COACH':
        return 'کوچ و مشاور';
      default:
        return 'کاربر';
    }
  };

  const getDashboardHref = (): string => {
    switch (user?.role) {
      case 'SUPER_ADMIN':
        return '/app/super-admin/dashboard';
      case 'SCHOOL_ADMIN':
      case 'STAFF':
        return '/app/admin/dashboard';
      case 'TEACHER':
        return '/app/teacher/dashboard';
      case 'COACH':
        return '/app/coaching';
      case 'PARENT':
        return '/app/parent/dashboard';
      case 'STUDENT':
      default:
        return '/app/student/dashboard';
    }
  };

  const getAcademicCards = (): SuperAppCard[] => {
    const rawCards = (() => {
      switch (user?.role) {
      case 'TEACHER':
        return [
          {
            id: 'dashboard',
            title: 'داشبورد',
            href: '/app/teacher/dashboard',
            icon: LayoutDashboard,
            iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
            iconColor: 'text-primary-dark dark:text-primary',
          },
          {
            id: 'gradebook',
            title: 'دفتر کلاسی',
            href: '/app/teacher/gradebook',
            icon: BarChart3,
            iconBg: 'bg-male-light dark:bg-[#182346]',
            iconColor: 'text-sec dark:text-[#8194EE]',
          },
          {
            id: 'homework',
            title: 'تکالیف',
            href: '/app/teacher/homework',
            icon: FileCheck,
            iconBg: 'bg-club-light dark:bg-[#2A173E]',
            iconColor: 'text-club dark:text-[#C084FC]',
          },
          {
            id: 'exams',
            title: 'آزمون‌ها',
            href: '/app/teacher/exams',
            icon: HelpCircle,
            iconBg: 'bg-college-light dark:bg-[#38260D]',
            iconColor: 'text-third dark:text-[#FBBF24]',
          },
          {
            id: 'question-bank',
            title: 'بانک سوالات',
            href: '/app/teacher/question-bank',
            icon: FileQuestion,
            iconBg: 'bg-male-light dark:bg-[#182346]',
            iconColor: 'text-sec dark:text-[#8194EE]',
          },
          {
            id: 'lessons',
            title: 'طرح درس',
            href: '/app/teacher/lessons',
            icon: BookOpen,
            iconBg: 'bg-female-light dark:bg-[#3D1426]',
            iconColor: 'text-girl dark:text-[#F472B6]',
          },
          {
            id: 'schedule',
            title: 'برنامه کلاسی',
            href: '/app/teacher/schedule',
            icon: CalendarDays,
            iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
            iconColor: 'text-primary-dark dark:text-primary',
          },
          {
            id: 'matters',
            title: 'امور انضباطی',
            href: '/app/teacher/matters',
            icon: ShieldAlert,
            iconBg: 'bg-college-light dark:bg-[#38260D]',
            iconColor: 'text-third dark:text-[#FBBF24]',
          },
          {
            id: 'visits',
            title: 'جلسات اولیا',
            href: '/app/teacher/visits',
            icon: Users,
            iconBg: 'bg-club-light dark:bg-[#2A173E]',
            iconColor: 'text-club dark:text-[#C084FC]',
          },
          {
            id: 'payroll',
            title: 'فیش حقوقی',
            href: '/app/teacher/payroll',
            icon: Wallet,
            iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
            iconColor: 'text-primary-dark dark:text-primary',
          },
        ];

      case 'SCHOOL_ADMIN':
      case 'STAFF':
        return [
          {
            id: 'dashboard',
            title: 'داشبورد',
            href: '/app/admin/dashboard',
            icon: LayoutDashboard,
            iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
            iconColor: 'text-primary-dark dark:text-primary',
          },
          {
            id: 'members',
            title: 'دانش‌آموزان و کادر',
            href: '/app/admin/members',
            icon: Users,
            iconBg: 'bg-male-light dark:bg-[#182346]',
            iconColor: 'text-sec dark:text-[#8194EE]',
          },
          {
            id: 'academic',
            title: 'کلاس‌ها و رشته‌ها',
            href: '/app/admin/academic',
            icon: GraduationCap,
            iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
            iconColor: 'text-primary-dark dark:text-primary',
          },
          {
            id: 'schedule',
            title: 'برنامه هفتگی',
            href: '/app/admin/schedule',
            icon: CalendarDays,
            iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
            iconColor: 'text-primary-dark dark:text-primary',
          },
          {
            id: 'matters',
            title: 'امور انضباطی',
            href: '/app/admin/matters',
            icon: ShieldAlert,
            iconBg: 'bg-college-light dark:bg-[#38260D]',
            iconColor: 'text-third dark:text-[#FBBF24]',
          },
          {
            id: 'fees',
            title: 'شهریه و مالی',
            href: '/app/admin/finance/fees',
            icon: Receipt,
            iconBg: 'bg-club-light dark:bg-[#2A173E]',
            iconColor: 'text-club dark:text-[#C084FC]',
          },
          {
            id: 'payroll',
            title: 'حقوق و دستمزد',
            href: '/app/admin/finance/payroll',
            icon: Wallet,
            iconBg: 'bg-male-light dark:bg-[#182346]',
            iconColor: 'text-sec dark:text-[#8194EE]',
          },
          {
            id: 'reports',
            title: 'گزارشات',
            href: '/app/admin/reports',
            icon: BarChart3,
            iconBg: 'bg-college-light dark:bg-[#38260D]',
            iconColor: 'text-third dark:text-[#FBBF24]',
          },
          {
            id: 'profile',
            title: 'پروفایل آموزشگاه',
            href: '/app/admin/profile',
            icon: Building2,
            iconBg: 'bg-male-light dark:bg-[#182346]',
            iconColor: 'text-sec dark:text-[#8194EE]',
          },
        ];

      case 'SUPER_ADMIN':
        return [
          {
            id: 'dashboard',
            title: 'داشبورد',
            href: '/app/super-admin/dashboard',
            icon: LayoutDashboard,
            iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
            iconColor: 'text-primary-dark dark:text-primary',
          },
          {
            id: 'tenants',
            title: 'مدیریت مدارس',
            href: '/app/super-admin/tenants',
            icon: Building2,
            iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
            iconColor: 'text-primary-dark dark:text-primary',
          },
          {
            id: 'subscriptions',
            title: 'اشتراک‌ها',
            href: '/app/super-admin/subscriptions',
            icon: Receipt,
            iconBg: 'bg-club-light dark:bg-[#2A173E]',
            iconColor: 'text-club dark:text-[#C084FC]',
          },
          {
            id: 'role-templates',
            title: 'قالب‌های نقش',
            href: '/app/super-admin/role-templates',
            icon: Sliders,
            iconBg: 'bg-college-light dark:bg-[#38260D]',
            iconColor: 'text-third dark:text-[#FBBF24]',
          },
          {
            id: 'ops',
            title: 'عملیات سیستم',
            href: '/app/super-admin/ops',
            icon: Activity,
            iconBg: 'bg-female-light dark:bg-[#3D1426]',
            iconColor: 'text-girl dark:text-[#F472B6]',
          },
        ];

      case 'PARENT':
        return [
          {
            id: 'dashboard',
            title: 'داشبورد',
            href: '/app/parent/dashboard',
            icon: LayoutDashboard,
            iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
            iconColor: 'text-primary-dark dark:text-primary',
          },
          {
            id: 'schedule',
            title: 'برنامه هفتگی',
            href: '/app/parent/schedule',
            icon: CalendarDays,
            iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
            iconColor: 'text-primary-dark dark:text-primary',
          },
          {
            id: 'fees',
            title: 'شهریه و اقساط',
            href: '/app/parent/fees',
            icon: Receipt,
            iconBg: 'bg-club-light dark:bg-[#2A173E]',
            iconColor: 'text-club dark:text-[#C084FC]',
          },
          {
            id: 'reports',
            title: 'کارنامه و نمرات',
            href: '/app/parent/reports',
            icon: GraduationCap,
            iconBg: 'bg-college-light dark:bg-[#38260D]',
            iconColor: 'text-third dark:text-[#FBBF24]',
          },
          {
            id: 'matters',
            title: 'امور انضباطی',
            href: '/app/parent/matters',
            icon: ShieldAlert,
            iconBg: 'bg-college-light dark:bg-[#38260D]',
            iconColor: 'text-third dark:text-[#FBBF24]',
          },
          {
            id: 'visits',
            title: 'جلسات با مربیان',
            href: '/app/parent/visits',
            icon: Users,
            iconBg: 'bg-club-light dark:bg-[#2A173E]',
            iconColor: 'text-club dark:text-[#C084FC]',
          },
        ];

      case 'COACH':
        return [
          {
            id: 'coaching-desk',
            title: 'میز کار کوچینگ',
            href: '/app/coaching',
            icon: Target,
            iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
            iconColor: 'text-primary-dark dark:text-primary',
          },
          {
            id: 'roadmap-events',
            title: 'رودمپ رویدادها',
            href: '/app/events',
            icon: Compass,
            iconBg: 'bg-college-light dark:bg-[#38260D]',
            iconColor: 'text-third dark:text-[#FBBF24]',
          },
          {
            id: 'messages',
            title: 'پیام‌ها و مکاتبات',
            href: '/app/messages',
            icon: MessageSquare,
            iconBg: 'bg-club-light dark:bg-[#2A173E]',
            iconColor: 'text-club dark:text-[#C084FC]',
            badge: unreadMessagesCount > 0 ? toPersianDigits(unreadMessagesCount) : undefined,
          },
          {
            id: 'polls',
            title: 'نظرسنجی و آراء',
            href: '/app/polls',
            icon: Vote,
            iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
            iconColor: 'text-primary-dark dark:text-primary',
          },
        ];

      case 'STUDENT':
      default:
        return [
          {
            id: 'dashboard',
            title: 'داشبورد',
            href: '/app/student/dashboard',
            icon: LayoutDashboard,
            iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
            iconColor: 'text-primary-dark dark:text-primary',
          },
          {
            id: 'homework',
            title: 'تکالیف',
            href: '/app/student/homework',
            icon: FileCheck,
            iconBg: 'bg-club-light dark:bg-[#2A173E]',
            iconColor: 'text-club dark:text-[#C084FC]',
            badge: homeworkCount > 0 ? toPersianDigits(homeworkCount) : undefined,
          },
          {
            id: 'exams',
            title: 'آزمون‌ها',
            href: '/app/student/exams',
            icon: HelpCircle,
            iconBg: 'bg-college-light dark:bg-[#38260D]',
            iconColor: 'text-third dark:text-[#FBBF24]',
            badge: examsCount > 0 ? toPersianDigits(examsCount) : undefined,
          },
          {
            id: 'grades',
            title: 'نمرات و کارنامه',
            href: '/app/student/grades',
            icon: BarChart3,
            iconBg: 'bg-male-light dark:bg-[#182346]',
            iconColor: 'text-sec dark:text-[#8194EE]',
          },
          {
            id: 'schedule',
            title: 'برنامه هفتگی',
            href: '/app/student/schedule',
            icon: CalendarDays,
            iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
            iconColor: 'text-primary-dark dark:text-primary',
          },
          {
            id: 'materials',
            title: 'جزوات و منابع',
            href: '/app/student/materials',
            icon: BookOpen,
            iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
            iconColor: 'text-primary-dark dark:text-primary',
          },
          {
            id: 'matters',
            title: 'امور انضباطی',
            href: '/app/student/matters',
            icon: ShieldAlert,
            iconBg: 'bg-female-light dark:bg-[#3D1426]',
            iconColor: 'text-girl dark:text-[#F472B6]',
          },
          ];
      }
    })();
    const BOTTOM_NAV_HREFS = ['/app/ka-platform', '/app/club', '/app/media', '/app/calendar', '/app'];
    return (rawCards || []).filter((c) => c.id !== 'dashboard' && !BOTTOM_NAV_HREFS.includes(c.href));
  };

  const sharedCards: SuperAppCard[] = [
    {
      id: 'events',
      title: 'رویدادها و رودمپ',
      href: '/app/events',
      icon: Compass,
      iconBg: 'bg-college-light dark:bg-[#38260D]',
      iconColor: 'text-third dark:text-[#FBBF24]',
      badge: eventsCount > 0 ? toPersianDigits(eventsCount) : undefined,
    },
    {
      id: 'coaching',
      title: 'کوچینگ و مربی‌گری',
      href: '/app/coaching',
      icon: Target,
      iconBg: 'bg-club-light dark:bg-[#2A173E]',
      iconColor: 'text-club dark:text-[#C084FC]',
    },
    {
      id: 'messages',
      title: 'پیام‌ها',
      href: '/app/messages',
      icon: MessageSquare,
      iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
      iconColor: 'text-primary-dark dark:text-primary',
      badge: unreadMessagesCount > 0 ? toPersianDigits(unreadMessagesCount) : undefined,
    },
    {
      id: 'polls',
      title: 'نظرسنجی',
      href: '/app/polls',
      icon: Vote,
      iconBg: 'bg-college-light dark:bg-[#38260D]',
      iconColor: 'text-third dark:text-[#FBBF24]',
    },
  ];

  const academicCards = getAcademicCards();

  return (
    <div className="space-y-5 pb-8 animate-in fade-in duration-300">
      {/* Super-App Welcome Box: Name + Role next to it, Date on Left */}
      <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#151C28] border-[1.5px] border-primary-dark/30 dark:border-gray-800 shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17]">
        {/* Right side: Greeting, Name, and Role Badge */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
          <span className="font-black text-sm sm:text-base text-ink-darker dark:text-white">
            درود، {user?.firstName} {user?.lastName}
          </span>
          <Badge
            variant="default"
            className="text-[10px] sm:text-xs py-0.5 px-2 font-bold"
          >
            {getRoleTitle()}
          </Badge>
        </div>

        {/* Left side: Persian Date */}
        <div className="text-left shrink-0">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-300">
            {liveDate}
          </span>
        </div>
      </div>

      {/* Rectangular Dashboard Button */}
      <button
        type="button"
        onClick={() => navigate(getDashboardHref())}
        className="group w-full flex items-center justify-between px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-white dark:bg-[#151C28] border-[1.5px] border-primary-dark/30 dark:border-gray-800 hover:border-primary dark:hover:border-primary shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] hover:shadow-[2.75px_2.75px_0_#59BBAF] transition-all duration-150 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer min-h-[50px] sm:min-h-[56px]"
      >
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center bg-primary/10 text-primary shadow-2xs group-hover:scale-105 transition-transform">
            <LayoutDashboard className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
          <span className="font-black text-sm sm:text-base text-ink-darker dark:text-white group-hover:text-primary dark:group-hover:text-primary transition-colors">
            داشبورد
          </span>
        </div>

        <div className="flex items-center gap-1 text-primary-dark dark:text-primary">
          <span className="text-[11px] sm:text-xs font-bold hidden min-[360px]:inline">
            ورود به پنل
          </span>
          <ChevronLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5 group-hover:-translate-x-0.5 transition-transform" />
        </div>
      </button>

      {/* Academic Cards */}
      <div className="space-y-2.5">
        <h2 className="font-black text-sm sm:text-base text-ink-darker dark:text-white px-1">
          بخش‌های آموزشی
        </h2>

        <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
          {academicCards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => navigate(card.href)}
              className="group relative flex flex-col items-center justify-center text-center p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#151C28] border-[1.5px] border-primary-dark/30 dark:border-gray-800 hover:border-primary dark:hover:border-primary shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] hover:shadow-[2.75px_2.75px_0_#59BBAF] transition-all duration-150 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer min-h-[96px] sm:min-h-[110px]"
            >
              {card.badge && (
                <span className="absolute top-2 left-2 px-1.5 py-0.2 rounded-full bg-girl text-white text-[9px] font-black border border-white dark:border-gray-800 shadow-xs">
                  {card.badge}
                </span>
              )}

              <div
                className={`w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center mb-2 transition-transform group-hover:scale-105 shadow-2xs ${card.iconBg} ${card.iconColor}`}
              >
                <card.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              <span className="font-black text-xs sm:text-[13px] text-ink-darker dark:text-gray-100 group-hover:text-primary dark:group-hover:text-primary transition-colors text-center line-clamp-1">
                {card.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Shared Services Cards */}
      <div className="space-y-2.5 pt-1">
        <h2 className="font-black text-sm sm:text-base text-ink-darker dark:text-white px-1">
          ارتباطات و خدمات
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
          {sharedCards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => navigate(card.href)}
              className="group relative flex flex-col items-center justify-center text-center p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#151C28] border-[1.5px] border-primary-dark/30 dark:border-gray-800 hover:border-primary dark:hover:border-primary shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] hover:shadow-[2.75px_2.75px_0_#59BBAF] transition-all duration-150 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer min-h-[96px] sm:min-h-[110px]"
            >
              {card.badge && (
                <span className="absolute top-2 left-2 px-1.5 py-0.2 rounded-full bg-girl text-white text-[9px] font-black border border-white dark:border-gray-800 shadow-xs">
                  {card.badge}
                </span>
              )}

              <div
                className={`w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center mb-2 transition-transform group-hover:scale-105 shadow-2xs ${card.iconBg} ${card.iconColor}`}
              >
                <card.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              <span className="font-black text-xs sm:text-[13px] text-ink-darker dark:text-gray-100 group-hover:text-primary dark:group-hover:text-primary transition-colors text-center line-clamp-1">
                {card.title}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
