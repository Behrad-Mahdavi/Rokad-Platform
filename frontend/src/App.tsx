import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { AppProviders } from './app/providers';
import { PwaInstallPrompt } from './components/pwa/PwaInstallPrompt';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { PwaUpdatePrompt } from './components/pwa/PwaUpdatePrompt';

export const App: React.FC = () => {
  return (
    <AppProviders>
      <RouterProvider router={router} />
      <PwaInstallPrompt />
      <OfflineIndicator />
      <PwaUpdatePrompt />
    </AppProviders>
  );
};
