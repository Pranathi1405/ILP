import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth/auth-guard';
import { StudentPerformanceComponent } from './pages/performance/performance';

export const Student: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/student-layout/student-layout').then((m) => m.StudentLayoutComponent),

    canActivate: [authGuard],
    canActivateChild: [authGuard],
    data: { role: 'student' },

    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard').then((m) => m.StudentDashboardComponent),
      },

      {
        path: 'my-courses',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('../courses/pages/my-courses/my-courses').then((m) => m.MyCourses),
          },
          {
            path: 'course-player/:subjectId',
            loadComponent: () =>
              import('../courses/pages/course-player/course-player').then((m) => m.CoursePlayer),
          },
        ],
      },

      {
        path: '',
        loadChildren: () =>
          import('../tests/test-gen-student/test-student.routes').then((m) => m.StudentTest),
      },

      {
        path: 'browse',
        loadComponent: () => import('../courses/pages/explore/explore').then((m) => m.Explore),
      },

      {
        path: 'course-details/:id',
        loadComponent: () =>
          import('../courses/pages/course-details/course-details').then((m) => m.CourseDetails),
      },

      {
        path: 'settings',
        loadComponent: () =>
          import('../../shared/components/settings/settings').then(
            (m) => m.SharedSettingsComponent,
          ),
      },

      {
        path: 'notifications',
        loadComponent: () => import('../notifications/notifications').then((m) => m.Notifications),
      },

      {
        path: 'performance',
        component: StudentPerformanceComponent,
      },
      {
        path: 'performance/test-detail/:attemptId',
        loadComponent: () =>
          import('./pages/performance/test-detail/test-detail').then((m) => m.TestDetailComponent),
      },
      {
        path: 'performance/history',
        loadComponent: () =>
          import('./pages/performance/test-history/test-history').then(
            (m) => m.TestHistoryComponent,
          ),
      },
      {
        path: 'transactions',
        loadComponent: () =>
          import('./pages/transactions/student-transactions').then((m) => m.StudentTransactions),
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/transactions/transactions-history/transactions-history').then(
                (m) => m.TransactionHistory,
              ),
          },
          {
            path: 'mycourses',
            loadComponent: () =>
              import('./pages/transactions/mycourses/student-mycourses').then((m) => m.MyCourses),
          },
        ],
      },

      {
        path: 'doubt-corner',
        loadChildren: () =>
          import('./pages/doubt-corner/doubt-corner.routes').then((m) => m.DOUBT_CORNER_ROUTES),
        data: { removePadding: true },
      },
    ],
  },
  {
    path: 'payments',
    loadChildren: () => import('../payments/payments.routes').then((m) => m.PAYMENT_ROUTES),
    canActivate: [authGuard],
  },
];
