import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const toastr = inject(ToastrService);

  const expectedRole = route.data?.['userType'];
  const user = authService.getUser();
  const isExpired = authService.isAccessTokenExpired();

  console.log('Guard hit:', {
    user,
    isExpired,
    expectedRole
  });

  // Case 1: No user → redirect to login
  if (!user) {
    console.log('→ No user → redirect to login');
    router.navigate(['/login']);
    return false;
  }

  // Case 2: Token expired → logout
  if (isExpired) {
    console.log('→ Token expired → logout');
    toastr.warning('Session expired. Please login again.');
    authService.clearSession();
    router.navigate(['/login']);
    return false;
  }

  // Case 3: Role mismatch
  if (expectedRole && user.userType !== expectedRole) {
    console.log('→ Role mismatch → redirect');
    toastr.error('Unauthorized access');
    router.navigate(['/login'])
    return false;
  }

  // Case 4: All good
  console.log('→ Access granted');
  return true;
};