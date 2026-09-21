import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BannerTheme = 'ecosystem' | 'college' | 'club' | 'male';

export interface BannerTypeConfig {
  id: string;
  name: string;
  badgeText: string;
  badgeVariant: 'default' | 'college' | 'club' | 'girl' | 'sec' | 'warning' | 'success';
  defaultTheme: BannerTheme;
  icon: 'Flame' | 'Bell' | 'Sparkles' | 'HelpCircle' | 'Trophy' | 'GraduationCap';
}

export interface HomeBannerSlide {
  id: string;
  type: string; // BannerTypeConfig id (e.g. 'EVENT', 'ANNOUNCEMENT', 'COACHING', or custom)
  title: string;
  subtitle: string;
  badgeText: string;
  badgeVariant?: 'default' | 'college' | 'club' | 'girl' | 'sec' | 'warning' | 'success';
  actionText: string;
  actionUrl: string;
  theme: BannerTheme;
  imageUrl?: string;
  active: boolean;
  eventId?: string;
  metaText?: string;
}

interface HomeBannerState {
  slides: HomeBannerSlide[];
  bannerTypes: BannerTypeConfig[];
  addSlide: (slide: Omit<HomeBannerSlide, 'id'>) => boolean;
  updateSlide: (id: string, updates: Partial<HomeBannerSlide>) => void;
  deleteSlide: (id: string) => void;
  reorderSlides: (slides: HomeBannerSlide[]) => void;
  toggleSlideActive: (id: string) => void;
  resetToDefaults: () => void;

  // Banner Types Management
  addBannerType: (type: Omit<BannerTypeConfig, 'id'>) => BannerTypeConfig;
  updateBannerType: (id: string, updates: Partial<BannerTypeConfig>) => void;
  deleteBannerType: (id: string) => void;
  resetBannerTypes: () => void;
}

export const DEFAULT_BANNER_TYPES: BannerTypeConfig[] = [
  {
    id: 'EVENT',
    name: 'رویداد',
    badgeText: 'رویداد زنده',
    badgeVariant: 'default',
    defaultTheme: 'ecosystem',
    icon: 'Flame',
  },
  {
    id: 'ANNOUNCEMENT',
    name: 'اطلاعیه',
    badgeText: 'اطلاعیه مهم',
    badgeVariant: 'college',
    defaultTheme: 'college',
    icon: 'Bell',
  },
  {
    id: 'COACHING',
    name: 'کوچینگ و مشاوره',
    badgeText: 'خدمات ویژه',
    badgeVariant: 'club',
    defaultTheme: 'club',
    icon: 'Sparkles',
  },
  {
    id: 'EXAM',
    name: 'آزمون و سنجش',
    badgeText: 'آزمون جامع',
    badgeVariant: 'sec',
    defaultTheme: 'male',
    icon: 'HelpCircle',
  },
  {
    id: 'CULTURAL',
    name: 'فرهنگی و مسابقات',
    badgeText: 'برنامه فرهنگی',
    badgeVariant: 'girl',
    defaultTheme: 'club',
    icon: 'Trophy',
  },
];

export const DEFAULT_HOME_BANNER_SLIDES: HomeBannerSlide[] = [
  {
    id: 'banner-slide-1',
    type: 'EVENT',
    title: 'همایش ملی نوآوری و فناوری‌های نوین آموزشی رکاد',
    subtitle: 'نشست تخصصی مربیان، مشاوران و دانش‌آموزان با ابزارهای نسل جدید',
    badgeText: 'رویداد زنده',
    badgeVariant: 'default',
    actionText: 'مشاهده رویداد',
    actionUrl: '/app/events',
    theme: 'ecosystem',
    active: true,
    metaText: 'سالن رازی • ۲۵ اسفند',
  },
  {
    id: 'banner-slide-2',
    type: 'ANNOUNCEMENT',
    title: 'آغاز ثبت‌نام آزمون‌های جامع مهارتی و پروژه‌محور',
    subtitle: 'ثبت سرفصل پروژه‌ها و شرکت در سنجش‌های دوره‌ای فعال شد.',
    badgeText: 'اطلاعیه مهم',
    badgeVariant: 'college',
    actionText: 'مشاهده اطلاعیه',
    actionUrl: '/app/messages',
    theme: 'college',
    active: true,
    metaText: 'مهلت تا پنج‌شنبه',
  },
  {
    id: 'banner-slide-3',
    type: 'COACHING',
    title: 'میز کار اختصاصی کوچینگ و هدایت تحصیلی',
    subtitle: 'رزرو آنلاین جلسات خصوصی هدایت شغلی با مشاوران مدرسه',
    badgeText: 'خدمات ویژه',
    badgeVariant: 'club',
    actionText: 'رزرو نوبت',
    actionUrl: '/app/coaching',
    theme: 'club',
    active: true,
    metaText: 'ظرفیت محدود',
  },
];

export const useHomeBannerStore = create<HomeBannerState>()(
  persist(
    (set, get) => ({
      slides: DEFAULT_HOME_BANNER_SLIDES,
      bannerTypes: DEFAULT_BANNER_TYPES,

      addSlide: (slideData) => {
        const { slides } = get();
        if (slides.length >= 3) {
          return false;
        }

        const newSlide: HomeBannerSlide = {
          ...slideData,
          id: `banner-slide-${Date.now()}`,
          active: slideData.active !== undefined ? slideData.active : true,
        };

        set({ slides: [...slides, newSlide] });
        return true;
      },

      updateSlide: (id, updates) => {
        set({
          slides: get().slides.map((slide) =>
            slide.id === id ? { ...slide, ...updates } : slide
          ),
        });
      },

      deleteSlide: (id) => {
        set({
          slides: get().slides.filter((slide) => slide.id !== id),
        });
      },

      reorderSlides: (slides) => {
        set({ slides: slides.slice(0, 3) });
      },

      toggleSlideActive: (id) => {
        set({
          slides: get().slides.map((slide) =>
            slide.id === id ? { ...slide, active: !slide.active } : slide
          ),
        });
      },

      resetToDefaults: () => {
        set({
          slides: DEFAULT_HOME_BANNER_SLIDES,
          bannerTypes: DEFAULT_BANNER_TYPES,
        });
      },

      // Types Management
      addBannerType: (typeData) => {
        const newType: BannerTypeConfig = {
          ...typeData,
          id: `TYPE_${Date.now()}`,
        };
        set({ bannerTypes: [...get().bannerTypes, newType] });
        return newType;
      },

      updateBannerType: (id, updates) => {
        set({
          bannerTypes: get().bannerTypes.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        });
      },

      deleteBannerType: (id) => {
        set({
          bannerTypes: get().bannerTypes.filter((t) => t.id !== id),
        });
      },

      resetBannerTypes: () => {
        set({ bannerTypes: DEFAULT_BANNER_TYPES });
      },
    }),
    {
      name: 'rokad_home_banners_v2',
    }
  )
);
