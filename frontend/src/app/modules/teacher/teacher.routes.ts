import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth/auth-guard';

export const Teacher: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/teacher-layout/teacher-layout').then((m) => m.TeacherLayoutComponent),
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    data: { userType: 'teacher' },

    children: [
      // DEFAULT REDIRECT
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },

      // FIXED DASHBOARD ROUTE
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard').then((m) => m.TeacherDashboardComponent),
      },

      {
        path: 'course-management',
        loadComponent: () =>
          import('./pages/course-management/course-management').then(
            (m) => m.CourseManagementComponent,
          ),
      },

      {
        path: 'module-management',
        loadComponent: () =>
          import('./pages/module-management/module-management').then(
            (m) => m.ModuleManagementComponent,
          ),
      },

      {
        path: 'module-editor',
        loadComponent: () =>
          import('./pages/module-editor/module-editor').then((m) => m.ModuleEditorComponent),
      },

      {
        path: 'video-upload',
        loadComponent: () =>
          import('./pages/video-upload/video-upload').then((m) => m.VideoUploadComponent),
      },

      // ✅ my-courses now redirects directly to course-management
      {
        path: 'my-courses',
        redirectTo: 'course-management',
        pathMatch: 'full',
      },

      {
        path: 'sme-test',
        loadChildren: () =>
          import('../tests/test-gen-teacher/test-teacher-routes').then((m) => m.TeacherTest),
        data: { removePadding: true },
      },

      {
        path: 'settings',
        loadComponent: () =>
          import('../../shared/components/settings/settings').then(
            (m) => m.SharedSettingsComponent,
          ),
      },

      {
        path: 'questions',
        loadComponent: () =>
          import('./pages/QuestionsPages/questions/questions').then((m) => m.Questions),
        data: { removePadding: true },
        children:[
          {
            path:'question-bank',
            loadComponent:()=>import('./pages/QuestionsPages/questionbank/questionbank').then((m)=>m.QuestionBank)
          }
        ]
      },

      {
        path: 'notifications',
        loadComponent: () => import('../notifications/notifications').then((m) => m.Notifications),
      },

      {
        path: 'doubt-corner',
        loadChildren: () =>
          import('./pages/doubt-corner/doubt-corner.routes').then((m) => m.DOUBT_CORNER_ROUTES),
        data: { removePadding: true },
      },

      {
        path: 'pdf-upload',
        loadComponent: () => import('./pages/pdf-upload/pdf-upload').then((m) => m.PdfUpload),
      },

      {
        path: 'live-studio',
        loadChildren: () =>
          import('./pages/live-classes/live-classes.routes').then((m) => m.LIVE_CLASSES_ROUTES),
      },

      {
        path: 'study-materials',
        loadChildren: () =>
          import('../study-materials/study-materials.routes').then((m) => m.STUDY_MATERIALS_ROUTES),
      },

      {
        path: 'students',
        loadComponent: () =>
          import('./pages/student-overview/student-overview').then(
            (m) => m.StudentOverviewComponent,
          ),
      },

      {
        path: 'announcements',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/teacher-announcements/teacher-announcements').then(
                (m) => m.TeacherAnnouncements,
              ),
          },
          {
            path: 'send',
            loadComponent: () =>
              import('./pages/teacher-announcements/send-notification/send-notification').then(
                (m) => m.SendNotification,
              ),
          },
        ],
        data: { removePadding: true },
      },
    ],
  },
];