import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layouts
import { AuthLayout } from './layouts/AuthLayout';
import { SuperAdminLayout } from './layouts/SuperAdminLayout';
import { SchoolAdminLayout } from './layouts/SchoolAdminLayout';
import { TeacherLayout } from './layouts/TeacherLayout';
import { StudentParentLayout } from './layouts/StudentParentLayout';

// Guards
import { RoleGuard, GuestGuard } from '../components/guards/RoleGuard';

// Pages
import { LoginPage } from '../modules/auth/LoginPage';
import { SuperAdminDashboard } from '../modules/super-admin/SuperAdminDashboard';
import { TenantsPage } from '../modules/super-admin/tenants/TenantsPage';
import { SubscriptionsPage } from '../modules/super-admin/subscriptions/SubscriptionsPage';
import { RoleTemplatesPage } from '../modules/super-admin/roles/RoleTemplatesPage';
import { PlatformOpsPage } from '../modules/super-admin/ops/PlatformOpsPage';
import { SchoolAdminDashboard } from '../modules/school-admin/SchoolAdminDashboard';
import { AcademicStructurePage } from '../modules/school-admin/academic/AcademicStructurePage';
import { MembersPage } from '../modules/school-admin/members/MembersPage';
import { FeesPage } from '../modules/school-admin/finance/FeesPage';
import { PayrollPage } from '../modules/school-admin/finance/PayrollPage';
import { ReportsPage } from '../modules/school-admin/reports/ReportsPage';
import { TeacherDashboard } from '../modules/teacher/TeacherDashboard';
import { StudentDashboard } from '../modules/student-parent/StudentDashboard';
import { ParentDashboard } from '../modules/student-parent/ParentDashboard';
import { ForbiddenPage } from '../modules/errors/ForbiddenPage';
import { NotFoundPage } from '../modules/errors/NotFoundPage';

export const router = createBrowserRouter([
  // 1. Guest / Auth Routes
  {
    path: '/',
    element: <GuestGuard />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { index: true, element: <Navigate to="/login" replace /> },
          { path: 'login', element: <LoginPage /> },
        ],
      },
    ],
  },

  // 2. Protected App Routes per Persona
  {
    path: '/app',
    children: [
      // 2.1 Persona 1: Super Admin
      {
        path: 'super-admin',
        element: <RoleGuard allowedRoles={['SUPER_ADMIN']} />,
        children: [
          {
            element: <SuperAdminLayout />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard', element: <SuperAdminDashboard /> },
              { path: 'tenants', element: <TenantsPage /> },
              { path: 'subscriptions', element: <SubscriptionsPage /> },
              { path: 'role-templates', element: <RoleTemplatesPage /> },
              { path: 'ops', element: <PlatformOpsPage /> },
            ],
          },
        ],
      },

      // 2.2 Persona 2: School Admin & Staff
      {
        path: 'admin',
        element: <RoleGuard allowedRoles={['SCHOOL_ADMIN', 'STAFF', 'SUPER_ADMIN']} />,
        children: [
          {
            element: <SchoolAdminLayout />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard', element: <SchoolAdminDashboard /> },
              { path: 'academic', element: <AcademicStructurePage /> },
              { path: 'members', element: <MembersPage /> },
              { path: 'finance/fees', element: <FeesPage /> },
              { path: 'finance/payroll', element: <PayrollPage /> },
              { path: 'reports', element: <ReportsPage /> },
            ],
          },
        ],
      },

      // 2.3 Persona 3: Teacher
      {
        path: 'teacher',
        element: <RoleGuard allowedRoles={['TEACHER', 'SUPER_ADMIN']} />,
        children: [
          {
            element: <TeacherLayout />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard', element: <TeacherDashboard /> },
              { path: 'attendance', element: <TeacherDashboard /> },
              { path: 'homework', element: <TeacherDashboard /> },
              { path: 'exams', element: <TeacherDashboard /> },
              { path: 'gradebook', element: <TeacherDashboard /> },
              { path: 'lessons', element: <TeacherDashboard /> },
            ],
          },
        ],
      },

      // 2.4 Persona 4: Student
      {
        path: 'student',
        element: <RoleGuard allowedRoles={['STUDENT', 'SUPER_ADMIN']} />,
        children: [
          {
            element: <StudentParentLayout />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard', element: <StudentDashboard /> },
              { path: 'homework', element: <StudentDashboard /> },
              { path: 'exams', element: <StudentDashboard /> },
              { path: 'grades', element: <StudentDashboard /> },
              { path: 'materials', element: <StudentDashboard /> },
            ],
          },
        ],
      },

      // 2.5 Persona 4: Parent
      {
        path: 'parent',
        element: <RoleGuard allowedRoles={['PARENT', 'SUPER_ADMIN']} />,
        children: [
          {
            element: <StudentParentLayout />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard', element: <ParentDashboard /> },
              { path: 'fees', element: <ParentDashboard /> },
              { path: 'reports', element: <ParentDashboard /> },
              { path: 'visits', element: <ParentDashboard /> },
            ],
          },
        ],
      },
    ],
  },

  // 3. Error Pages
  {
    path: '/403',
    element: <ForbiddenPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
