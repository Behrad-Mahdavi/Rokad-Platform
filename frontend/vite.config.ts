import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import fs from 'fs';

// Read version from root package.json for synchronized build-time injection
let appVersion = '0.7.14';
try {
  const rootPkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'));
  if (rootPkg.version) {
    appVersion = rootPkg.version;
  }
} catch (e) {
  console.warn('[Vite Config] Could not read root package.json, using fallback version');
}

const buildTime = new Date().toISOString();

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  plugins: [
    react(),
    // Always load so `virtual:pwa-register/*` resolves in dev.
    // SW stays off in dev (devOptions.enabled=false); App.tsx unregisters stale SWs.
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      devOptions: {
        enabled: false,
        type: 'classic',
      },
      includeAssets: [
        'favicon.svg',
        'logo.svg',
        'logo.png',
        'Sign-01.svg',
        'icons/*.png',
        'IRANSansXFaNum-*.ttf',
      ],
      manifest: {
        id: '/?source=pwa',
        name: 'سامانه مدیریت هوشمند مدارس و هنرستان‌های رُکاد',
        short_name: 'رُکاد',
        description: 'پلتفرم جامع آموزشی، مدیریت هنرستان‌های فنی و حرفه‌ای، ارزشیابی پودمانی، کارنامه، برنامه‌ریزی کلاسی و ارتباطات اولیاء',
        theme_color: '#2FAA9E',
        background_color: '#FFFFFF',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        orientation: 'any',
        dir: 'rtl',
        lang: 'fa-IR',
        start_url: '/?source=pwa',
        scope: '/',
        categories: ['education', 'productivity', 'management'],
        icons: [
          {
            src: '/icons/favicon-16x16.png',
            sizes: '16x16',
            type: 'image/png',
          },
          {
            src: '/icons/favicon-32x32.png',
            sizes: '32x32',
            type: 'image/png',
          },
          {
            src: '/icons/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'دفتر نمرات و پودمان‌ها',
            short_name: 'کارنامه',
            description: 'مشاهده و ثبت نمرات مستمر و پودمانی دانش‌آموزان',
            url: '/app/teacher/gradebook',
            icons: [{ src: '/icons/shortcut-gradebook.png', sizes: '96x96', type: 'image/png' }],
          },
          {
            name: 'برنامه هفتگی کلاس‌ها',
            short_name: 'برنامه هفتگی',
            description: 'جدول زمان‌بندی زنگ‌های درسی و کارگاهی',
            url: '/app/schedule',
            icons: [{ src: '/icons/shortcut-schedule.png', sizes: '96x96', type: 'image/png' }],
          },
          {
            name: 'تقویم و رویدادهای آموزشی',
            short_name: 'تقویم',
            description: 'تقویم رسمی و مناسبت‌های هنرستان رکاد',
            url: '/app/calendar',
            icons: [{ src: '/icons/shortcut-calendar.png', sizes: '96x96', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        importScripts: ['/push-worker.js'],
        globPatterns: ['**/*.{js,css,html,svg,png,ttf,woff,woff2,webmanifest}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:ttf|woff|woff2)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'local-fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/api\/v1\/(auth\/me|profiles\/school|academic-years)/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-metadata-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
