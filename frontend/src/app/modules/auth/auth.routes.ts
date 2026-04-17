import { Routes } from '@angular/router';

export const AuthRoutes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () =>
      import(
        /* webpackChunkName: "landing-page" */ './total-landing-pages/landingpage/landingpage'
      ).then((m) => m.LandingpageComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import(/* webpackChunkName: "login" */ './login/login-page/login-page').then(
        (m) => m.LoginPageComponent,
      ),
  },
  {
    path: 'signup/student',
    loadComponent: () =>
      import(
        /* webpackChunkName: "signup-student" */ './signup/student-registration/student-registration'
      ).then((m) => m.StudentRegistrationComponent),
  },
  {
    path: 'signup/teacher',
    loadComponent: () =>
      import(
        /* webpackChunkName: "signup-teacher" */ './signup/teacher-registration/teacher-registration'
      ).then((m) => m.TeacherRegistrationComponent),
  },
  {
    path: 'signup/parent',
    loadComponent: () =>
      import(
        /* webpackChunkName: "signup-parent" */ './signup/parent-registration/parent-registration'
      ).then((m) => m.ParentRegistrationComponent),
  },
  {
    path: 'otp-verify',
    loadComponent: () =>
      import(/* webpackChunkName: "otp-verify" */ './opt-verify/otp-verify').then(
        (m) => m.OtpVerifyComponent,
      ),
  },
  {
    path: 'landingpage',
    loadComponent: () =>
      import(
        /* webpackChunkName: "landing-page" */ './total-landing-pages/landingpage/landingpage'
      ).then((m) => m.LandingpageComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import(/* webpackChunkName: "forgot-password" */ './forgot-password/forgot-password').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'reset-password/:token',
    loadComponent: () =>
      import(/* webpackChunkName: "reset-password" */ './reset-password/reset-password').then(
        (m) => m.ResetPasswordComponent,
      ),
  },
  {
    path: 'signup-selection',
    loadComponent: () =>
      import(
        /* webpackChunkName: "signup-selection" */ './signup/signup-selection/signup-selection'
      ).then((m) => m.SignupSelection),
  },
  {
    path: 'check-email',
    loadComponent: () =>
      import(/* webpackChunkName: "check-email" */ './check-email/check-email').then(
        (m) => m.CheckEmail,
      ),
  },
  {
    path: 'terms',
    loadComponent: () =>
      import(/* webpackChunkName: "terms" */ './signup/termsandconditions/termsandconditions').then(
        (m) => m.Termsandconditions,
      ),
  },
  {
    path: 'termsofservice',
    loadComponent: () =>
      import(
        /* webpackChunkName: "terms-of-service" */ './total-landing-pages/Policies/termsofservice/termsofservice'
      ).then((m) => m.Termsofservice),
  },
];
