import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

interface VersionResponse {
  version: string;
  buildTime?: string;
  environment?: string;
}

export const CURRENT_APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
export const CURRENT_BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // هر ۵ دقیقه یک‌بار
const MIN_FOCUS_CHECK_GAP_MS = 60 * 1000; // حداقل ۶۰ ثانیه فاصله بین چک‌های فوکوس تب

export function useAppVersionCheck() {
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [serverBuildTime, setServerBuildTime] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const lastCheckTimeRef = useRef<number>(0);

  const checkForUpdate = useCallback(async () => {
    try {
      setIsChecking(true);
      lastCheckTimeRef.current = Date.now();

      // استفاده از پارامتر زمان تصادفی برای جلوگیری کامل از کش شدن توسط مرورگر یا پروکسی
      const res = await axios.get<VersionResponse>(`/api/v1/version?_t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
        timeout: 10000,
      });

      if (res.data && res.data.version) {
        const remoteVersion = res.data.version.trim();
        setServerVersion(remoteVersion);
        setServerBuildTime(res.data.buildTime || null);

        if (remoteVersion !== CURRENT_APP_VERSION) {
          console.info(
            `[Version Check] New version detected: ${remoteVersion} (Current: ${CURRENT_APP_VERSION})`,
          );
          setHasUpdate(true);
        } else {
          setHasUpdate(false);
        }
      }
    } catch (err) {
      // در صورت قطعی شبکه یا خطای موقت، تجربه کاربر قطع نمی‌شود
      console.warn('[Version Check] Failed to query version from server:', err);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // ۱. بررسی هنگام بارگذاری اولیه و پولینگ منظم هر ۵ دقیقه
  useEffect(() => {
    checkForUpdate();

    const intervalId = setInterval(() => {
      checkForUpdate();
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [checkForUpdate]);

  // ۲. بررسی هنگام فوکوس روی تب مرورگر یا فعال شدن مجدد پنجره (Tab Visibility / Focus)
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastCheckTimeRef.current > MIN_FOCUS_CHECK_GAP_MS) {
          checkForUpdate();
        }
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [checkForUpdate]);

  // ۳. متد فورس‌آپدیت: به‌روزرسانی Service Worker و ریفرش اجباری برنامه
  const updateApp = useCallback(async () => {
    try {
      // ارسال پیام SKIP_WAITING به سرویس ورکر فعال
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          await registration.update();
        }
      }

      // پاکسازی کامل کش‌های مرورگر
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
    } catch (e) {
      console.error('[Version Check] Error during cache cleanup:', e);
    } finally {
      // رفرش بدون کش برای دریافت آخرین فایل‌های HTML و JS
      window.location.reload();
    }
  }, []);

  return {
    hasUpdate,
    serverVersion,
    serverBuildTime,
    currentVersion: CURRENT_APP_VERSION,
    currentBuildTime: CURRENT_BUILD_TIME,
    isChecking,
    checkForUpdate,
    updateApp,
  };
}
