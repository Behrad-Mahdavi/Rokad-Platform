import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';

export const DashboardRedirect: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'SUPER_ADMIN':
      return <Navigate to="/app/super-admin/dashboard" replace />;
    case 'SCHOOL_ADMIN':
    case 'STAFF':
      return <Navigate to="/app/admin/dashboard" replace />;
    case 'TEACHER':
      return <Navigate to="/app/teacher/dashboard" replace />;
    case 'COACH':
      return <Navigate to="/app/coaching" replace />;
    case 'PARENT':
      return <Navigate to="/app/parent/dashboard" replace />;
    case 'STUDENT':
    default:
      return <Navigate to="/app/student/dashboard" replace />;
  }
};
