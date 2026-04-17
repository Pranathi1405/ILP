import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth/auth-guard';

export const routes: Routes = [
  // {
  //   path: 'tests',
  //   canActivate: [authGuard],
  //   data: { userType: 'student' },
  //   loadChildren: () => import('./modules/tests/test.routes').then((m) => m.Test),
  // },

  {
    path: 'student',
    canActivate: [authGuard],
    data: { userType: 'student' },
    loadChildren: () => import('./modules/student/student.routes').then((m) => m.Student),
  },

  // ✅ NEW: Fullscreen test routes (NO layout)
  {
    path: 'student-test',
    canActivate: [authGuard],
    data: { userType: 'student' },
    loadChildren: () =>
      import('./modules/tests/test-gen-student/test-student.routes').then((m) => m.StudentTest),
  },

  {
    path: 'admin',
    canActivate: [authGuard],
    data: { userType: 'admin' },
    loadChildren: () => import('./modules/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },

  {
    path: 'teacher',
    canActivate: [authGuard],
    data: { userType: 'teacher' },
    loadChildren: () => import('./modules/teacher/teacher.routes').then((m) => m.Teacher),
  },

  {
    path: 'parent',
    canActivate: [authGuard],
    data: { userType: 'parent' },
    loadChildren: () => import('./modules/parent/parent.routes').then((m) => m.PARENT_ROUTES),
  },

  {
    path: 'explore',
    loadComponent: () => import('./modules/courses/pages/explore/explore').then((m) => m.Explore),
  },

  {
    path: '',
    loadChildren: () => import('./modules/auth/auth.routes').then((m) => m.AuthRoutes),
  },
   //live session route for teacher side
{
  path: 'live-session/:id',
  loadComponent: () =>
    import('./modules/teacher/pages/live-classes/pages/live-session/live-session')
      .then((m) => m.LiveSession)
},
// live-session route for student side
{
  path: 'student/live-class/:id',
  loadComponent: () =>
    import('./modules/student/pages/student-live-class/student-live-class')
      .then(m => m.StudentLiveClass),
},

  {
    path: 'admin-invitation',
    loadComponent: () =>
      import('./modules/admin/invitation/admin-invitation').then((m) => m.AdminInvitation),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
