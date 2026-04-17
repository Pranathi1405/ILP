/**
 * AUTHOR: Umesh Teja Peddi
 *
 * Announcements Service
 * ---------------------
 * Centralized service responsible for managing Admin Announcements.
 * Handles creation, scheduling, broadcasting, editing, and
 * deactivation of announcements through backend API integration.
 *
 * Purpose:
 * Maintains reactive announcement state using Angular Signals
 * and provides reusable methods for announcement operations
 * across admin components.
 *
 * Responsibilities:
 * - Fetch announcements list
 * - Create draft announcements
 * - Schedule announcements
 * - Broadcast notifications
 * - Edit and deactivate announcements
 * - Maintain local UI state updates
 *
 * Usage:
 * Injected into Admin Announcement components to perform
 * announcement-related API operations and state management.
 */

import { Injectable, signal, inject } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';
import { ApiService } from '../../api.service';

export type AnnouncementStatus = 'draft' | 'scheduled' | 'broadcasted' | 'edited' | 'deactivated';

export type TargetAudience =
  | 'all_users'
  | 'all_students'
  | 'course_students'
  | 'teachers'
  | 'parents';

export type Priority = 'low' | 'medium' | 'high';

export interface Announcement {
  announcement_id?: number;
  created_by?: number;
  created_by_name?: string;
  title: string;
  content: string;
  target_audience: TargetAudience;
  course_id?: number | null;
  priority: Priority;
  status: AnnouncementStatus;
  is_active?: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DraftPayload {
  title: string;
  content?: string;
  target_audience: TargetAudience;
  course_id?: number | null;
  priority: 'high';
  end_date?: string | null;
}

export interface SchedulePayload extends DraftPayload {
  start_date: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class AnnouncementsService {
  private readonly api = inject(ApiService);
  private readonly cacheTtlMs = 60 * 1000;
  private listRequest$?: Observable<ApiResponse<{ announcements: Announcement[] }>>;
  private listFetchedAt = 0;

  announcements = signal<Announcement[]>([]);

  init(force = false): void {
    if (!force && this.announcements().length > 0) return;
    this.fetchAll(1, 40, force).subscribe();
  }

  fetchAll(
    page = 1,
    limit = 40,
    force = false,
  ): Observable<ApiResponse<{ announcements: Announcement[] }>> {
    const now = Date.now();
    if (!force && this.listRequest$ && now - this.listFetchedAt < this.cacheTtlMs) {
      return this.listRequest$;
    }

    this.listRequest$ = this.api
      .get<
        ApiResponse<{ announcements: Announcement[] }>
      >(`announcements?page=${page}&limit=${limit}`)
      .pipe(
        tap((res) => {
          if (res.success) {
            this.announcements.set(res.data.announcements);
          }
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    this.listFetchedAt = now;

    return this.listRequest$;
  }

  createDraft(payload: DraftPayload): Observable<ApiResponse<{ announcement_id: number }>> {
    return this.api.post<ApiResponse<{ announcement_id: number }>>('announcements', payload).pipe(
      tap(() => this.invalidateListCache()),
    );
  }

  schedule(
    payload: SchedulePayload,
  ): Observable<ApiResponse<{ announcement_id: number; scheduled_at: string }>> {
    return this.api.post<ApiResponse<{ announcement_id: number; scheduled_at: string }>>(
      'announcements/schedule',
      payload,
    ).pipe(tap(() => this.invalidateListCache()));
  }

  broadcast(announcementId: number): Observable<ApiResponse<{ delivery_stats: object }>> {
    return this.api.post<ApiResponse<{ delivery_stats: object }>>(
      `announcements/broadcast/${announcementId}`,
      {},
    ).pipe(tap(() => this.invalidateListCache()));
  }

  edit(
    announcementId: number,
    data: Partial<
      Pick<Announcement, 'title' | 'content' | 'target_audience' | 'course_id' | 'end_date'>
    >,
  ): Observable<ApiResponse<void>> {
    return this.api.put<ApiResponse<void>>(`announcements/${announcementId}`, data).pipe(
      tap(() => this.invalidateListCache()),
    );
  }

  deactivate(announcementId: number): Observable<ApiResponse<void>> {
    return this.api.patch<ApiResponse<void>>(`announcements/${announcementId}/deactivate`, {}).pipe(
      tap(() => this.invalidateListCache()),
    );
  }

  updateLocalStatus(announcementId: number, status: AnnouncementStatus, isActive = true): void {
    this.announcements.update((list) =>
      list.map((a) =>
        a.announcement_id === announcementId ? { ...a, status, is_active: isActive } : a,
      ),
    );
  }

  removeLocal(announcementId: number): void {
    this.announcements.update((list) => list.filter((a) => a.announcement_id !== announcementId));
  }

  private invalidateListCache(): void {
    this.listRequest$ = undefined;
    this.listFetchedAt = 0;
  }
}
