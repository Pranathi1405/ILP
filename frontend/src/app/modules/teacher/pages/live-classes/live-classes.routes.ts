import { Routes } from '@angular/router';

export const LIVE_CLASSES_ROUTES: Routes = [
  
  {
    path: '',
    loadComponent: () => import('./pages/live-studio/live-studio').then((m) => m.LiveStudio),
  },
  //schedule a new class route
  {
    path: 'schedule-class',
    loadComponent: () =>
      import('./pages/schedule-class/schedule-class').then((m) => m.ScheduleClass),
  },
  //edit route to include session id for editing existing session
  {
    path: 'schedule-class/:id',
    loadComponent: () =>
      import('./pages/schedule-class/schedule-class').then((m) => m.ScheduleClass),
  },
//   //live session route
// {
//   path: 'live-session/:id',
//   loadComponent: () =>
//     import('./pages/live-session/live-session')
//       .then((m) => m.LiveSession),
// }

];
