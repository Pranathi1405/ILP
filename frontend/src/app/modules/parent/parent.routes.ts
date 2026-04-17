import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth/auth-guard';

export const PARENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import(/* webpackChunkName: "parent-layout" */ './layout/parent-layout').then(
        (m) => m.ParentLayout,
      ),
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    data: { userType: 'parent' },
    children: [
      {
        path: '',
        loadComponent: () =>
          import(/* webpackChunkName: "parent-dashboard" */ './pages/dashboard/dashboard').then(
            (m) => m.Dashboard,
          ),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import(
            /* webpackChunkName: "parent-notifications" */ '../notifications/notifications'
          ).then((m) => m.Notifications),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('../../shared/components/settings/settings').then(
            (m) => m.SharedSettingsComponent,
          ),
      },
      {
        path: 'performance',
        loadComponent: () =>
          import('./pages/performance/performance').then((m) => m.ParentPerformanceComponent),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
];
