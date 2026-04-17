/**
 * AUTHOR: Umesh Teja Peddi
 *
 * Admin Routes Configuration
 * --------------------------
 * Defines the lazy-loaded route tree for the Admin module.
 * Applies admin access control and maps child pages such as
 * command center, user management, financials, announcements,
 * and settings.
 *
 * Purpose:
 * Keeps admin routing centralized and consistent while
 * protecting the module behind role-based authentication.
 *
 * Usage:
 * Mounted from the app-level router for `/admin` navigation.
 */

import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth/auth-guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin.page').then((m) => m.AdminPage),
    canActivate: [authGuard],
    data: { role: 'admin' },
    children: [
      {
        path: '',
        redirectTo: 'command-center',
        pathMatch: 'full',
      },

      {
        path: 'command-center',
        loadComponent: () =>
          import('./pages/admin-command-center/admin-command-center').then(
            (m) => m.AdminCommandCenter,
          ),
      },

      {
        path: 'user-management',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/admin-user-management/admin-user-management').then(
                (m) => m.AdminUserManagement,
              ),
          },
          {
            path: 'add-user',
            loadComponent: () =>
              import('./pages/admin-user-management/add-user/add-user').then((m) => m.AddUser),
          },
        ],
      },

      {
        path: 'course-management',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/admin-course-management/admin-course-management').then(
                (m) => m.AdminCourseManagement,
              ),
          },
          {
            path: 'create',
            loadComponent: () =>
              import('./pages/admin-create-course/admin-create-course').then(
                (m) => m.AdminCreateCourse,
              ),
          },
        ],
      },

      {
        path: 'financials',
        loadComponent: () =>
          import('./pages/admin-financials/admin-financials').then((m) => m.AdminFinanceDashboard),
      },

      {
        path: 'announcements',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/admin-announcements/admin-announcements').then(
                (m) => m.AdminAnnouncements,
              ),
          },
          {
            path: 'create',
            loadComponent: () =>
              import('./pages/admin-announcements/create-announcement/create-announcement').then(
                (m) => m.CreateAnnouncement,
              ),
          },
          {
            path: 'edit/:id',
            loadComponent: () =>
              import('./pages/admin-announcements/create-announcement/create-announcement').then(
                (m) => m.CreateAnnouncement,
              ),
          },
        ],
      },

      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/admin-settings/admin-settings').then((m) => m.AdminSettings),
      },

      {
        path: 'notifications',
        loadComponent: () => import('../notifications/notifications').then((m) => m.Notifications),
      },
    ],
  },
];
