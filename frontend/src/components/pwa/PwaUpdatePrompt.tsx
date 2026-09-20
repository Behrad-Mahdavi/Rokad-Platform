import React, { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, Sparkles, ArrowUpCircle, Info } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAppVersionCheck } from '../../lib/hooks/useAppVersionCheck';
import { toPersianDigits } from '../../lib/utils';
import { Badge } from '../ui/Badge';

export const PwaUpdatePrompt: React.FC = () => {
  const [snoozedUntil, setSnoozedUntil] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // ۱. بررسی نسخه از طریق هوک ۵ دقیقه‌ای و فوکوس تب
  const {
    hasUpdate: hasApiVersionUpdate,
    serverVersion,
    currentVersion,
    updateApp,
  } = useAppVersionCheck();

  // ۲. بررسی از طریق مرورگر و بایت‌کد سرویس‌ورکر Workbox
  const {
    needRefresh: [needSwRefresh, setNeedSwRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // بررسی دوره‌ای هر ۳۰ دقیقه برای سرویس‌ورکر
      if (r) {
        setInterval(() => {
          r.update();
        }, 30 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('[PWA] SW registration error:', error);
    },
  });

  // آیا آپدیت جدید کشف شده است؟
  const isUpdateDetected = hasApiVersionUpdate || needSwRefresh;

  // آیا کاربر موقتاً به تعویق انداخته است؟
  const isSnoozed = Date.now() < snoozedUntil;

  const handleUpdateNow = async () => {
    setIsUpdating(true);
    try {
      if (updateServiceWorker) {
        await updateServiceWorker(true);
      }
      await updateApp();
    } catch (e) {
      console.error('[PWA Update] Force reload fallback:', e);
      window.location.reload();
    }
  };

  // به تعویق انداختن موقت (۱۰ دقیقه)
  const handleSnooze = () => {
    setSnoozedUntil(Date.now() + 10 * 60 * 1000);
    setNeedSwRefresh(false);
  };

  if (!isUpdateDetected || isSnoozed) {
    return null;
  }

  const targetVersion = serverVersion || currentVersion;

  return (
    <aside
      role="alert"
      aria-live="assertive"
      aria-label="اطلاعیه انتشار نسخه جدید رُکاد"
      className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-6 md:right-auto md:w-[420px] z-[9999] animate-in fade-in slide-in-from-bottom-6 duration-300"
    >
      <div className="rounded-2xl border-2 border-primary/50 bg-[#151C28] text-white p-5 shadow-[4px_4px_0_#59BBAF] ring-1 ring-white/10 flex flex-col gap-3.5">
        
        {/* هدر اعلان نسخه جدید */}
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-primary/20 text-primary border border-primary/40 shrink-0">
            <ArrowUpCircle className="w-6 h-6 animate-pulse text-primary" />
          </div>

          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>نسخه جدیدی از رُکاد آماده است</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              </h4>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              تغییرات، امکانات جدید و بهینه‌سازی‌های فنی منتشر شده است. لطفاً برای عملکرد بی‌نقص سیستم، برنامه را به‌روزرسانی فرمایید.
            </p>

            {/* بج‌های شماره نسخه */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-gray-400">نسخه فعلی:</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-gray-800 text-gray-300 border border-gray-700">
                v{toPersianDigits(currentVersion)}
              </span>
              {serverVersion && serverVersion !== currentVersion && (
                <>
                  <span className="text-[11px] text-primary">⬅️</span>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-primary/20 text-primary border border-primary/40">
                    v{toPersianDigits(serverVersion)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* دکمه‌های اقدام */}
        <div className="flex items-center gap-2 pt-1 border-t border-gray-800/80">
          <Button
            variant="primary"
            size="sm"
            disabled={isUpdating}
            onClick={handleUpdateNow}
            className="flex-1 min-h-[44px] text-xs font-black flex items-center justify-center gap-2 shadow-[2px_2px_0_#202A5A]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? 'در حال دریافت نسخه جدید...' : 'بروزرسانی الان'}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSnooze}
            className="min-h-[44px] px-3.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            یادآوری ۱۰ دقیقه بعد
          </Button>
        </div>

      </div>
    </aside>
  );
};
