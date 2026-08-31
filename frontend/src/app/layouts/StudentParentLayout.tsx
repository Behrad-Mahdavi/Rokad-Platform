import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '../../lib/auth/auth-store';

export const StudentParentLayout: React.FC = () => {
  const role = useAuthStore((state) => state.user?.role) || 'STUDENT';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />
      <div className="flex flex-1">
        <Sidebar role={role === 'PARENT' ? 'PARENT' : 'STUDENT'} />
        <main className="flex-1 p-6 md:p-8 max-w-7xl overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
