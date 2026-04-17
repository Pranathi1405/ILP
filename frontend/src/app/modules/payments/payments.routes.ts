import { Routes } from '@angular/router';

export const PAYMENT_ROUTES: Routes = [
  {
    path: 'checkout/:courseId',
    loadComponent: () => import('./checkout/checkout').then((m) => m.CheckoutComponent),
  },
  {
    path: 'processing/:orderId',
    loadComponent: () => import('./processing/processing').then((m) => m.ProcessingComponent),
  },
  {
    path: 'result',
    loadComponent: () => import('./result/result').then((m) => m.ResultComponent),
  },
  {
    path: 'result/:orderId',
    loadComponent: () => import('./result/result').then((m) => m.ResultComponent),
  },
];
