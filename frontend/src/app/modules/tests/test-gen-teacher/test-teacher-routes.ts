import { Routes } from '@angular/router';

export const TeacherTest: Routes = [
  {
    path: '',
    loadComponent: () => import('./test-home/test-home').then((m) => m.TestHome),
  },
  {
    path: 'builder',
    loadComponent: () => import('./sme-tests/builder/builder').then((m) => m.Builder),
  },
  {
    path: 'update/:id',
    loadComponent: () => import('./sme-tests/view-test/view-test').then((m) => m.UpdateTest),
  },
];
