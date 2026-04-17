/**
 * AUTHOR: Umesh Teja Peddi
 *
 * Settings Service
 * ----------------
 * Handles admin account settings including profile management,
 * password updates, and notification preference configuration.
 *
 * Purpose:
 * Provides centralized API communication for settings flows
 * and caches read-heavy settings endpoints for reuse.
 *
 * Responsibilities:
 * - Fetch and cache profile information
 * - Update profile details
 * - Change account password
 * - Fetch and cache notification preferences
 * - Update notification preferences
 * - Reset cached state after successful mutations
 *
 * Usage:
 * Injected into settings-related components to load and update
 * administrator account settings.
 */

import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';
import { ApiService } from '../../api.service';

// ─── Request / Response Types ─────────────────────────────────

export interface UpdateProfilePayload {
  first_name: string;
  last_name: string;
  phone: string;
}

export interface ChangePasswordPayload {
  oldpassword: string;
  newpassword: string;
}

export interface ProfileInfo {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
}

export interface NotificationPreference {
  preference_id?: number;
  notification_type: string;
  in_app_enabled: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  updated_at: string | null;
  is_default?: boolean;
}

export interface GetPreferencesResponse {
  success: boolean;
  message: string;
  data: {
    preferences: NotificationPreference[];
  };
}

export interface UpdatePreferencesPayload {
  preferences: Pick<
    NotificationPreference,
    'notification_type' | 'in_app_enabled' | 'push_enabled'
  >[];
}

export interface ApiResponse<T = boolean> {
  success: boolean;
  message: string;
  data?: T;
}

// ─── Service ──────────────────────────────────────────────────

@Injectable({
  providedIn: 'root',
})
export class Settings {
  private readonly api = inject(ApiService);
  private readonly cacheTtlMs = 5 * 60 * 1000;

  private profile$?: Observable<ProfileInfo>;
  private profileFetchedAt = 0;
  private preferences$?: Observable<GetPreferencesResponse>;
  private preferencesFetchedAt = 0;

  // ── Profile ────────────────────────────────────────────────

  getProfile(): Observable<ProfileInfo> {
    const now = Date.now();
    if (this.profile$ && now - this.profileFetchedAt < this.cacheTtlMs) {
      return this.profile$;
    }

    this.profile$ = this.api
      .get<ProfileInfo>('settings/me')
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    this.profileFetchedAt = now;

    return this.profile$;
  }

  updateProfile(payload: UpdateProfilePayload): Observable<ApiResponse> {
    return this.api.post<ApiResponse>('settings/updateprofile', payload).pipe(
      tap(() => {
        this.profile$ = undefined;
        this.profileFetchedAt = 0;
      }),
    );
  }

  changePassword(payload: ChangePasswordPayload): Observable<ApiResponse> {
    return this.api.post<ApiResponse>('settings/changepassword', payload);
  }

  // ── Notification Preferences ───────────────────────────────

  getPreferences(): Observable<GetPreferencesResponse> {
    const now = Date.now();
    if (this.preferences$ && now - this.preferencesFetchedAt < this.cacheTtlMs) {
      return this.preferences$;
    }

    this.preferences$ = this.api
      .get<GetPreferencesResponse>('notifications/preferences')
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    this.preferencesFetchedAt = now;

    return this.preferences$;
  }

  updatePreferences(payload: UpdatePreferencesPayload): Observable<ApiResponse> {
    return this.api.put<ApiResponse>('notifications/preferences', payload).pipe(
      tap(() => {
        this.preferences$ = undefined;
        this.preferencesFetchedAt = 0;
      }),
    );
  }

  disableAllNotifications(): Observable<ApiResponse> {
    return this.api.patch<ApiResponse>('notifications/preferences/disable-all', {}).pipe(
      tap(() => {
        this.preferences$ = undefined;
        this.preferencesFetchedAt = 0;
      }),
    );
  }
}
