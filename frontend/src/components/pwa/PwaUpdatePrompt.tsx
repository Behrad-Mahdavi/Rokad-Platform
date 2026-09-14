import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { Button } from '../ui/Button';

export const PwaUpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // Periodically check for updates (every 1 hour)
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  const handleRefresh = () => {
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) {
    return null;
  }

  return (
    <aside
      aria-label="به‌روزرسانی نرم‌افزار رُکاد"
      className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-6 md:right-auto md:w-96 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-ink-darker/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-gray-700/60 ring-1 ring-white/10 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="رُکاد"
              className="w-10 h-10 rounded-xl object-cover shrink-0 border border-white/20 shadow-sm"
            />
            <div>
              <h4 className="text-sm font-bold text-white">نسخه جدید رُکاد آماده است</h4>
              <p className="text-[11px] text-gray-300 mt-0.5">
                به‌روزرسانی‌ها و قابلیت‌های جدید بارگیری شد.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="بستن پیام به‌روزرسانی"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="primary"
            size="sm"
            onClick={handleRefresh}
            className="flex-1 min-h-[44px] text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>به‌روزرسانی و بارگذاری مجدد</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="min-h-[44px] px-3 text-xs text-gray-300 hover:text-white hover:bg-white/10"
          >
            بعداً
          </Button>
        </div>
      </div>
    </aside>
  );
};
