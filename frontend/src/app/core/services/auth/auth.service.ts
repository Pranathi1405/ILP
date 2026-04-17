import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
@Injectable({
  providedIn: 'root',
})
export class AuthService {

  // private apiurl = 'http://localhost:3000';
  apiurl = environment.apiUrl;

  private isAuthenticated = false;
  private initialized = false;
  private currentUser: any = null;
  private accessTokenExpiry: number | null = null;
  private hasRefreshed = false;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  // ================= AUTH APIs =================

  sendSignupOtp(data: any): Observable<any> {
    return this.http.post(`${this.apiurl}/api/auth/signup/send-otp`, data);
  }

  sendLoginOtp(data: any): Observable<any> {
    return this.http.post(`${this.apiurl}/api/auth/login`, data);
  }

  verifyotp(data: any): Observable<any> {
    return this.http.post(`${this.apiurl}/api/auth/signup/verify-otp`, data)
      .pipe(
        tap((res: any) => {
          if (res?.success) {
            // ❗ DO NOT LOGIN TEACHER HERE (if pending)
            this.setAuthenticated(false);

            if (res?.user) {
              this.setUser(res.user);
            }
          }
        })
      );
  }

  loginverifyotp(data: any): Observable<any> {
    return this.http.post(`${this.apiurl}/api/auth/login/verify-otp`, data)
      .pipe(
        tap((res: any) => {
          if (res?.success) {

            // ✅ Block if teacher not approved
            if (res?.user?.status === 'PENDING') {
              this.setAuthenticated(false);
              return;
            }

            this.setAuthenticated(true);

            if (res?.user) {
              this.setUser(res.user);
              this.navigateByRole(res.user.userType);
            }

            this.hasRefreshed = false;
            this.accessTokenExpiry = null;
          }
        })
      );
  }

  resendotp(data: any): Observable<any> {
    return this.http.post(`${this.apiurl}/api/auth/resend-otp`, data);
  }

  resetlink(data: any): Observable<any> {
    return this.http.post(`${this.apiurl}/api/auth/reset-link`, data);
  }

  resetPassword(data: any): Observable<any> {
    return this.http.post(`${this.apiurl}/api/auth/reset-password`, data);
  }

  // ================= REFRESH TOKEN =================

  refreshtoken(): Observable<any> {
    return this.http.post(
      `${this.apiurl}/api/auth/refresh-token`,
      {},
      { withCredentials: true }

  
    ).pipe(
      tap((res: any) => {

        if (res?.expiresAt || res?.expiresIn) {
          this.accessTokenExpiry = res.expiresAt
            ? new Date(res.expiresAt).getTime()
            : Date.now() + res.expiresIn * 1000;
        }

        if (res?.user) {
          this.setUser(res.user);
          this.setAuthenticated(true);
        }

        this.hasRefreshed = true;
      })
    );
  }

  // ================= INIT =================

  initAuth(): Observable<any> {
  const user = localStorage.getItem('user');

  if (user) {
    this.currentUser = JSON.parse(user);
    this.isAuthenticated = true;
  }

  return this.refreshtoken().pipe(
    tap((res) => {
      this.initialized = true;
    }),
    catchError((err) => {
      this.initialized = true;
      this.isAuthenticated = false;
      return of(null);
    })
  );
}

  // ================= STATE =================

  isAccessTokenExpired(): boolean {
    if (!this.accessTokenExpiry) return false;
    return Date.now() > this.accessTokenExpiry;
  }

  hasAlreadyRefreshed(): boolean {
    return this.hasRefreshed;
  }

  setAuthenticated(value: boolean): void {
    this.isAuthenticated = value;
  }

  setUser(user: any): void {
    this.currentUser = user;
    localStorage.setItem('user', JSON.stringify(user));
  }

  getUser(): any {
    if (!this.currentUser) {
      const user = localStorage.getItem('user');
      this.currentUser = user ? JSON.parse(user) : null;
    }
    return this.currentUser;
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  // ================= LOGOUT =================

  Logout(): Observable<any> {
    return this.http.post(
      `${this.apiurl}/api/auth/logout`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(() => this.clearSession())
    );
  }

  clearSession(): void {
    this.isAuthenticated = false;
    this.currentUser = null;
    this.accessTokenExpiry = null;
    this.hasRefreshed = false;
    localStorage.clear();
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  // ================= NAVIGATION =================

  navigateByRole(role: string): void {
    switch (role) {
      case 'student':
        this.router.navigate(['/student']);
        break;
      case 'teacher':
        this.router.navigate(['/teacher']);
        break;
      case 'parent':
        this.router.navigate(['/parent']);
        break;
      case 'admin':
        this.router.navigate(['/admin']);
        break;
      default:
        this.router.navigate(['/login']);
    }
  }
}