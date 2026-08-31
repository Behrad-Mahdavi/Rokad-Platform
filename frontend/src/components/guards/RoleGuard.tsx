import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { UserRole } from '../../types/auth';

interface RoleGuardProps {
  allowedRoles: UserRole | UserRole[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles }) => {
  const { isAuthenticated, user, hasRole } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasRole(allowedRoles)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
};

export const GuestGuard: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated && user) {
    switch (user.role) {
      case 'SUPER_ADMIN':
        return <Navigate to="/app/super-admin/dashboard" replace />;
      case 'SCHOOL_ADMIN':
      case 'STAFF':
        return <Navigate to="/app/admin/dashboard" replace />;
      case 'TEACHER':
        return <Navigate to="/app/teacher/dashboard" replace />;
      case 'STUDENT':
        return <Navigate to="/app/student/dashboard" replace />;
      case 'PARENT':
        return <Navigate to="/app/parent/dashboard" replace />;
      default:
        return <Navigate to="/app/admin/dashboard" replace />;
    }
  }

  return <Outlet />;
};
