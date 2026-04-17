import { Routes } from '@angular/router';

export const DOUBT_CORNER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./doubt-corner').then((m) => m.DoubtCorner),
  },
];
