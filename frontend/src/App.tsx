import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { AppProviders } from './app/providers';
import { PwaInstallPrompt } from './components/pwa/PwaInstallPrompt';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { PwaUpdatePrompt } from './components/pwa/PwaUpdatePrompt';
import { useAuthStore } from './lib/auth/auth-store';
import { CuriosityEasterEggModal } from './components/ui/CuriosityEasterEggModal';

const cleanupStaleServiceWorkers = () => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  // Dev: unregister any SW left from earlier builds so Workbox can't serve stale JS.
  if (import.meta.env.DEV) {
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => {
        void r.unregister();
      });
    });
    if (typeof caches !== 'undefined') {
      void caches.keys().then((keys) => {
        keys.forEach((k) => {
          if (k.includes('workbox') || k.includes('precache') || k.includes('runtime')) {
            void caches.delete(k);
          }
        });
      });
    }
  }
};

export const App: React.FC = () => {
  useEffect(() => {
    cleanupStaleServiceWorkers();
    // If rehydrated session is unusable, drop it before guards run long.
    const s = useAuthStore.getState();
    const bad =
      s.isAuthenticated &&
      (!s.user || !s.accessToken || !s.refreshToken);
    if (bad) s.logout();
  }, []);

  return (
    <AppProviders>
      <RouterProvider router={router} />
      <PwaInstallPrompt />
      <OfflineIndicator />
      <PwaUpdatePrompt />
      <CuriosityEasterEggModal />
    </AppProviders>
  );
};
