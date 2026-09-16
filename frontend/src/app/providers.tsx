import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../components/theme/ThemeProvider';
import { Toaster } from 'sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {children}
        <Toaster
          position="bottom-left"
          dir="rtl"
          visibleToasts={3}
          closeButton
          toastOptions={{
            duration: 3500,
            className: '!font-vazirmatn text-xs rounded-xl shadow-xl',
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
};
