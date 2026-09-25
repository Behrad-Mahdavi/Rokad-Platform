import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Construction } from 'lucide-react';
import { Button } from './Button';

interface UnderDevelopmentOverlayProps {
  title: string;
  subtitle?: string;
  description?: string;
  badgeText?: string;
  icon?: React.ComponentType<{ className?: string }>;
  accentColor?: 'primary' | 'amber' | 'purple' | 'emerald';
  children: React.ReactNode;
}

export const UnderDevelopmentOverlay: React.FC<UnderDevelopmentOverlayProps> = ({
  title,
  subtitle = 'در حال توسعه و آماده‌سازی نهایی',
  description = 'این بخش با امکانات جذاب و قابلیت‌های ویژه در حال توسعه است و به زودی رونمایی خواهد شد.',
  badgeText = 'نسخه آزمایشی / در حال توسعه',
  icon: Icon = Construction,
  accentColor = 'amber',
  children,
}) => {
  const navigate = useNavigate();

  const getAccentStyles = () => {
    switch (accentColor) {
      case 'primary':
        return {
          glow: 'from-primary/20 via-primary/5 to-transparent',
          badge: 'bg-primary/10 text-primary border-primary/25',
          iconBg: 'bg-primary/10 text-primary border-primary/30',
          dot: 'bg-primary',
        };
      case 'purple':
        return {
          glow: 'from-purple-500/20 via-purple-500/5 to-transparent',
          badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25',
          iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
          dot: 'bg-purple-500',
        };
      case 'emerald':
        return {
          glow: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
          badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
          iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-500',
        };
      case 'amber':
      default:
        return {
          glow: 'from-amber-500/20 via-amber-500/5 to-transparent',
          badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
          iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
          dot: 'bg-amber-500',
        };
    }
  };

  const accents = getAccentStyles();

  return (
    <div className="relative min-h-[calc(100vh-6rem)] w-full overflow-hidden">
      {/* Blurred background preview */}
      <div
        className="filter blur-[8px] md:blur-[12px] pointer-events-none select-none opacity-40 dark:opacity-20 transition-all duration-300"
        aria-hidden="true"
        tabIndex={-1}
      >
        {children}
      </div>

      {/* Clean Blur Overlay Layer */}
      <div className="absolute inset-0 z-30 flex items-center justify-center p-4 sm:p-6 bg-slate-900/15 dark:bg-black/45 backdrop-blur-[5px]">
        {/* Glassmorphism Card */}
        <div className="w-full max-w-lg relative rounded-3xl p-6 sm:p-9 text-center bg-white/85 dark:bg-[#111827]/85 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Subtle Ambient Top Glow */}
          <div
            className={`absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-40 bg-gradient-to-b ${accents.glow} rounded-full blur-2xl pointer-events-none`}
          />

          {/* Badge */}
          <div className="flex justify-center mb-5 relative">
            <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border ${accents.badge}`}>
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${accents.dot} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${accents.dot}`} />
              </span>
              <span>{badgeText}</span>
            </span>
          </div>

          {/* Icon Box */}
          <div className="flex justify-center mb-5 relative">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-xs ${accents.iconBg}`}>
              <Icon className="w-8 h-8" />
            </div>
          </div>

          {/* Title and Subtitle */}
          <h2 className="text-xl sm:text-2xl font-black text-ink-darker dark:text-white tracking-tight mb-2 relative">
            {title}
          </h2>
          <p className="text-xs sm:text-sm font-bold text-primary dark:text-teal-400 mb-3 relative">
            {subtitle}
          </p>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-md mx-auto mb-7 relative">
            {description}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-center relative">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/app')}
              className="w-full sm:w-auto h-10 px-6 text-xs sm:text-sm font-bold gap-2 rounded-xl shadow-[2px_2px_0_#438C83]"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span>بازگشت به پیشخوان</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
