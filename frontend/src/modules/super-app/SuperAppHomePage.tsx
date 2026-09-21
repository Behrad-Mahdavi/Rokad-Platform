import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { useTenantStore } from '../../lib/auth/tenant-store';
import { apiClient } from '../../lib/api/client';
import { formatToJalali, toPersianDigits } from '../../lib/utils';
import { HomeBannerSlider } from './components/HomeBannerSlider';
import { BannerSettingsModal } from './components/BannerSettingsModal';
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
  LayoutDashboard,
  ChevronLeft,
  Compass,
  CalendarRange,
  Scale,
  Sparkles,
  MessageSquare,
  Briefcase,
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
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const currentTenant = useTenantStore((state) => state.currentTenant);

  // Admin Banner Settings Modal
  const [isBannerSettingsOpen, setIsBannerSettingsOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('manageBanners') === 'true') {
      setIsBannerSettingsOpen(true);
      searchParams.delete('manageBanners');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
          const now = Date.now();
          const pendingCount = list.filter((hw: any) => {
            const hasSub = hw.submissions && hw.submissions.length > 0;
            if (hasSub) return false;
            const isPastDue = hw.dueDate ? new Date(hw.dueDate).getTime() < now : false;
            return !isPastDue;
          }).length;
          setHomeworkCount(pendingCount);
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
            title: 'انضباطی/تشویقی',
            href: '/app/teacher/matters',
            icon: Scale,
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
            id: 'students',
            title: 'دانش‌آموزان',
            href: '/app/admin/members?tab=students',
            icon: GraduationCap,
            iconBg: 'bg-male-light dark:bg-[#182346]',
            iconColor: 'text-sec dark:text-[#8194EE]',
          },
          {
            id: 'staff',
            title: 'کادر آموزشی',
            href: '/app/admin/members?tab=staff',
            icon: Briefcase,
            iconBg: 'bg-club-light dark:bg-[#2A173E]',
            iconColor: 'text-club dark:text-[#C084FC]',
          },
          {
            id: 'academic',
            title: 'کلاس‌ها و رشته‌ها',
            href: '/app/admin/academic',
            icon: BookOpen,
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
            title: 'انضباطی/تشویقی',
            href: '/app/admin/matters',
            icon: Scale,
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
            title: 'انضباطی/تشویقی',
            href: '/app/parent/matters',
            icon: Scale,
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
            title: 'کوچینگ',
            href: '/app/coaching',
            icon: Compass,
            iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
            iconColor: 'text-primary-dark dark:text-primary',
          },
          {
            id: 'roadmap-events',
            title: 'رویدادها',
            href: '/app/events',
            icon: CalendarRange,
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
            title: 'محتوای آموزشی',
            href: '/app/student/materials',
            icon: BookOpen,
            iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
            iconColor: 'text-primary-dark dark:text-primary',
          },
          {
            id: 'matters',
            title: 'انضباطی/تشویقی',
            href: '/app/student/matters',
            icon: Scale,
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
      title: 'رویدادها',
      href: '/app/events',
      icon: CalendarRange,
      iconBg: 'bg-college-light dark:bg-[#38260D]',
      iconColor: 'text-third dark:text-[#FBBF24]',
      badge: eventsCount > 0 ? toPersianDigits(eventsCount) : undefined,
    },
    {
      id: 'coaching',
      title: 'کوچینگ',
      href: '/app/coaching',
      icon: Compass,
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

  // Determine if this is a Girls or Boys account based on tenant theme/slug/name or user profile
  const isGirlsAccount =
    currentTenant?.slug?.includes('girl') ||
    currentTenant?.theme === 'female' ||
    currentTenant?.name?.includes('دخترانه') ||
    (user as any)?.gender === 'FEMALE';

  // Design System Persona Tokens: Blue (Male/Sec) vs Pink (Female/Girl)
  const welcomeTheme = isGirlsAccount
    ? {
        gradient:
          'bg-gradient-to-l from-girl via-[#EA2D6D] to-[#CA1752] dark:from-[#650B29] dark:via-[#520921] dark:to-[#3F0719]',
        btnText:
          'text-girl dark:text-pink-400 hover:text-[#CA1752] dark:hover:text-white',
        btnIcon: 'text-girl dark:text-pink-400',
      }
    : {
        gradient:
          'bg-gradient-to-l from-sec via-[#283570] to-[#1A2248] dark:from-[#182044] dark:via-[#131A38] dark:to-[#0E142C]',
        btnText:
          'text-sec dark:text-[#8194EE] hover:text-[#283570] dark:hover:text-white',
        btnIcon: 'text-sec dark:text-[#8194EE]',
      };

  // 1- پیام ها و برنامه هفتگی
  const studentRow1: SuperAppCard[] = [
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
      id: 'schedule',
      title: 'برنامه هفتگی',
      href: '/app/student/schedule',
      icon: CalendarDays,
      iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
      iconColor: 'text-primary-dark dark:text-primary',
    },
  ];

  // 2- تکالیف، آزمون ها و نمرات و کارنامه
  const studentRow2: SuperAppCard[] = [
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
  ];

  // 3- محتوای آموزشی، کوچینگ، انضباطی/تشویقی
  const studentRow3: SuperAppCard[] = [
    {
      id: 'materials',
      title: 'محتوای آموزشی',
      href: '/app/student/materials',
      icon: BookOpen,
      iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
      iconColor: 'text-primary-dark dark:text-primary',
    },
    {
      id: 'coaching',
      title: 'کوچینگ',
      href: '/app/coaching',
      icon: Compass,
      iconBg: 'bg-club-light dark:bg-[#2A173E]',
      iconColor: 'text-club dark:text-[#C084FC]',
    },
    {
      id: 'matters',
      title: 'انضباطی/تشویقی',
      href: '/app/student/matters',
      icon: Scale,
      iconBg: 'bg-female-light dark:bg-[#3D1426]',
      iconColor: 'text-girl dark:text-[#F472B6]',
    },
  ];

  // 4- رویدادها و نظرسنجی
  const studentRow4: SuperAppCard[] = [
    {
      id: 'events',
      title: 'رویدادها',
      href: '/app/events',
      icon: CalendarRange,
      iconBg: 'bg-college-light dark:bg-[#38260D]',
      iconColor: 'text-third dark:text-[#FBBF24]',
      badge: eventsCount > 0 ? toPersianDigits(eventsCount) : undefined,
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

  const renderCard = (card: SuperAppCard) => (
    <button
      key={card.id}
      type="button"
      onClick={() => navigate(card.href)}
      className="group relative flex flex-col items-center justify-center text-center p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#151C28] border-[1.5px] border-primary-dark/30 dark:border-gray-800 hover:border-primary dark:hover:border-primary shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] hover:shadow-[2.75px_2.75px_0_#59BBAF] transition-all duration-150 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer min-h-[96px] sm:min-h-[110px]"
    >
      {card.badge && (
        <span className="absolute top-2.5 left-2.5 z-10 min-w-[20px] h-[20px] px-1.5 rounded-full bg-girl text-white text-[10px] font-black flex items-center justify-center leading-none border border-white dark:border-gray-800 shadow-xs select-none">
          <span className="inline-block transform -translate-y-[0.5px]">{card.badge}</span>
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
  );

  return (
    <div className="space-y-5 pb-8 animate-in fade-in duration-300">
      {/* 1. Home Top Banner Slider (Max 3 Slides: Events, Announcements, Custom) */}
      <HomeBannerSlider onOpenSettings={() => setIsBannerSettingsOpen(true)} />

      {/* 2. Super-App Welcome Box: Dynamic Design System Theme (Blue for Boys, Pink for Girls) */}
      <div
        className={`relative overflow-hidden p-4 sm:p-5 rounded-2xl ${welcomeTheme.gradient} text-white transition-all`}
      >
        {/* Subtle decorative glass orbs */}
        <div className="absolute top-0 left-0 -ml-10 -mt-10 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 -mr-10 -mb-10 w-28 h-28 rounded-full bg-black/10 blur-2xl pointer-events-none" />

        {/* Row 1: Greeting + Name on Right, Role Badge on Left */}
        <div className="relative z-10 flex items-center justify-between gap-3 min-w-0">
          {/* Right: Dot + User Name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white shrink-0 shadow-xs ring-2 ring-white/30 animate-pulse" />
            <span className="font-black text-base sm:text-lg lg:text-xl text-white tracking-tight truncate">
              درود، {user?.firstName} {user?.lastName}
            </span>
          </div>

          {/* Left: Role Badge */}
          <span className="inline-flex items-center rounded-full bg-white/20 hover:bg-white/25 text-white border border-white/35 text-xs sm:text-[13px] py-1 px-3 sm:px-3.5 font-extrabold backdrop-blur-md shadow-2xs shrink-0 transition-colors">
            {getRoleTitle()}
          </span>
        </div>

        {/* Row 2: Date on Right, Dashboard Button on Left */}
        <div className="relative z-10 mt-3.5 sm:mt-4 flex items-center justify-between gap-3 flex-wrap">
          {/* Bottom Right: Persian Date */}
          <div className="flex items-center gap-2 text-xs sm:text-[13px] font-bold text-white/95">
            <CalendarDays className="w-4 h-4 text-white/85 shrink-0" />
            <span>{liveDate}</span>
          </div>

          {/* Bottom Left: Dashboard Button */}
          <button
            type="button"
            onClick={() => navigate(getDashboardHref())}
            className={`group inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-white dark:bg-[#151C28] ${welcomeTheme.btnText} font-black text-xs sm:text-[13px] shadow-[2px_2px_0_rgba(0,0,0,0.12)] dark:shadow-[2px_2px_0_rgba(255,255,255,0.15)] hover:shadow-[2.5px_2.5px_0_rgba(0,0,0,0.18)] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer shrink-0 mr-auto`}
          >
            <LayoutDashboard
              className={`w-4 h-4 ${welcomeTheme.btnIcon} group-hover:scale-110 transition-transform`}
            />
            <span>ورود به داشبورد</span>
            <ChevronLeft
              className={`w-3.5 h-3.5 ${welcomeTheme.btnIcon} group-hover:-translate-x-0.5 transition-transform`}
            />
          </button>
        </div>
      </div>

      {/* Student Cards (4 Custom Rows) vs Other Roles */}
      {user?.role === 'STUDENT' || !user?.role ? (
        <div className="space-y-2.5 sm:space-y-3.5">
          {/* 1- پیام ها و برنامه هفتگی */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {studentRow1.map(renderCard)}
          </div>

          {/* 2- تکالیف، آزمون ها و نمرات و کارنامه */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
            {studentRow2.map(renderCard)}
          </div>

          {/* 3- محتوای آموزشی، کوچینگ، انضباطی/تشویقی */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
            {studentRow3.map(renderCard)}
          </div>

          {/* 4- رویدادها و نظرسنجی */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {studentRow4.map(renderCard)}
          </div>
        </div>
      ) : (
        <div className="space-y-2.5 sm:space-y-3.5">
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
            {academicCards.map(renderCard)}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
            {sharedCards.map(renderCard)}
          </div>
        </div>
      )}
      {/* Admin Banner Settings Modal */}
      <BannerSettingsModal
        isOpen={isBannerSettingsOpen}
        onClose={() => setIsBannerSettingsOpen(false)}
      />
    </div>
  );
};
