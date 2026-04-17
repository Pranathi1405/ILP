import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth/auth.service';
import { ToastrService } from 'ngx-toastr';
import {
  catchError,
  switchMap,
  throwError,
  BehaviorSubject,
  filter,
  take
} from 'rxjs';

let isRefreshing = false;
let refreshSubject = new BehaviorSubject<boolean | null>(null);

const AUTH_ENDPOINTS = [
  '/api/auth/refresh-token',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/resend-otp',
  '/api/auth/login/verify-otp',
  '/api/auth/signup/verify-otp'
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const toastr = inject(ToastrService);

  const clonedReq = req.clone({ withCredentials: true });

  const isAuthEndpoint = AUTH_ENDPOINTS.some(endpoint =>
    req.url.includes(endpoint)
  );

  // Skip auth APIs
  if (isAuthEndpoint) {
    return next(clonedReq);
  }

  const user = authService.getUser();

  // No user → don't attempt refresh
  if (!user) {
    return next(clonedReq);
  }

  return next(clonedReq).pipe(
    catchError((error) => {

      // Not 401 → pass through
      if (error.status !== 401) {
        return throwError(() => error);
      }

      // Already refreshed once → logout
      if (authService.hasAlreadyRefreshed()) {
        toastr.warning('Session expired. Please login again.');
        authService.logout();
        return throwError(() => error);
      }

      // If refresh already in progress → wait
      if (isRefreshing) {
        return refreshSubject.pipe(
          filter(value => value !== null),
          take(1),
          switchMap(success => {
            if (success) return next(clonedReq);
            return throwError(() => error);
          })
        );
      }

      // Start refresh
      isRefreshing = true;
      refreshSubject = new BehaviorSubject<boolean | null>(null);

      return authService.refreshtoken().pipe(
        switchMap(() => {
          isRefreshing = false;
          refreshSubject.next(true);

          // retry original request
          return next(clonedReq);
        }),
        catchError((err) => {
          isRefreshing = false;
          refreshSubject.next(false);

          toastr.error('Session expired. Please login again.');
          authService.logout();

          return throwError(() => err);
        })
      );
    })
  );
};