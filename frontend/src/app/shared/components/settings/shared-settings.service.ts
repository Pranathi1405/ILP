import { Injectable, inject } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

// ── Interfaces ──
export interface ProfileData {
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  stu_id?: string;
}

export interface ChangePasswordForm {
  oldpassword: string;
  newpassword: string;
  confirmPassword: string;
}

export interface NotificationPreference {
  notification_type: string;
  in_app_enabled: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  updated_at?: string | null;
  is_default?: boolean;
}

export interface LinkedChild {
  id: number;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class SharedSettingsService {
  private api = inject(ApiService);

  getProfile(): Observable<ProfileData> {
    return this.api.get<any>('settings/me').pipe(
      map(
        (res: any): ProfileData => ({
          firstname: res.first_name ?? '',
          lastname: res.last_name ?? '',
          email: res.email ?? '',
          phone: res.phone ?? '',
          stu_id: res.student_id ?? '',
        }),
      ),
      catchError((err) => {
        console.error('Profile fetch failed:', err);
        return of({
          firstname: '',
          lastname: '',
          email: '',
          phone: '',
          stu_id: '',
        } as ProfileData);
      }),
    );
  }

  updateProfile(data: ProfileData): Observable<any> {
    return this.api.post<any>('settings/updateprofile', {
      first_name: data.firstname,
      last_name: data.lastname,
      phone: data.phone,
    });
  }

  changePassword(form: ChangePasswordForm): Observable<any> {
    return this.api.post<any>('settings/changepassword', {
      oldpassword: form.oldpassword,
      newpassword: form.newpassword,
    });
  }

  getNotificationPreferences(): Observable<NotificationPreference[]> {
    return this.api.get<any>('notifications/preferences').pipe(
      map((res: any) => (res?.data?.preferences ?? []) as NotificationPreference[]),
      catchError(() => of([])),
    );
  }

updateNotificationPreference(
  notification_type: string,
  in_app_enabled: boolean,
  push_enabled: boolean,
): Observable<any> {
  return this.api.put<any>('notifications/preferences', {
    preferences: [{ notification_type, in_app_enabled, push_enabled }]  // ← array wrapper
  });
}

  getChildren(): Observable<LinkedChild[]> {
    return this.api.get<any>('analytics/parent/students').pipe(
      map((res: any) =>
        (res?.data ?? []).map((c: any) => ({
          id: c.student_id ?? c.id,
          name: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim(),
        })),
      ),
      catchError(() => of([])),
    );
  }

  addNewChild(linkCode: string): Observable<any> {
    return this.api.post<any>('settings/addnewchild', {
      parent_link_code: linkCode,
    });
  }
}
