import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const SchoolAdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />
      <div className="flex flex-1">
        <Sidebar role="SCHOOL_ADMIN" />
        <main className="flex-1 p-6 md:p-8 max-w-7xl overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
