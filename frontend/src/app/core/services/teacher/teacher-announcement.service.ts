import { Injectable, signal, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from '../api.service';

/* ───────── Types ───────── */

export type SentNotificationStatus = 'sent' | 'scheduled' | 'failed';
export type NotificationTarget = 'course' | 'student' | 'schedule';

export interface SentNotification {
  title: string;
  message: string;
  notification_type: string;
  course_id: number | null;
  related_type: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  recipient_count: number;
  delivered_count: number;
  pending_count: number;
  failed_count: number;
  status?: SentNotificationStatus;
}

export interface SentPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
}

export interface SentNotificationFilters {
  course_id?: number | null;
  status?: SentNotificationStatus | null;
  page?: number;
  limit?: number;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/* ───────── Service ───────── */

@Injectable({ providedIn: 'root' })
export class TeacherAnnouncementsService {
  private api = inject(ApiService);

  sentNotifications = signal<SentNotification[]>([]);
  pagination = signal<SentPagination>({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
    has_next: false,
  });

  isLoading = signal(false);
  error = signal<string | null>(null);

  /* ---------- API → UI mapper ---------- */

  // In mapNotification – already good, but make course_id handling more robust
  private mapNotification(api: any): SentNotification {
    return {
      title: api.title,
      message: api.message,
      notification_type: api.notification_type,

      course_id:
        api.related_type === 'course' && api.related_id != null ? Number(api.related_id) : null,

      related_type: api.related_type ?? null,

      scheduled_at: api.scheduled_at,
      sent_at: api.sent_at,

      recipient_count: Number(api.recipient_count ?? 0),
      delivered_count: Number(api.delivered_count ?? 0),
      pending_count: Number(api.scheduled_count ?? 0), // backend uses scheduled_count for pending
      failed_count: Number(api.failed_count ?? 0),
    };
  }

  /* ---------- Fetch Sent ---------- */

  fetchSent(filters: SentNotificationFilters = {}): Observable<ApiResponse<any>> {
    const p = new URLSearchParams();

    if (filters.course_id != null) p.set('course_id', String(filters.course_id));
    if (filters.status) p.set('status', filters.status);
    if (filters.page) p.set('page', String(filters.page));
    if (filters.limit) p.set('limit', String(filters.limit));

    this.isLoading.set(true);
    this.error.set(null);

    return this.api
      .get<ApiResponse<any>>(`notifications/sent${p.toString() ? '?' + p.toString() : ''}`)
      .pipe(
        tap({
          next: (res) => {
            this.isLoading.set(false);

            if (res.success) {
              this.sentNotifications.set(
                res.data.notifications.map((n: any) => {
                  const mapped = this.mapNotification(n);
                  return {
                    ...mapped,
                    status: this.deriveStatus(mapped),
                  };
                }),
              );

              this.pagination.set(res.data.pagination);
            }
          },
          error: () => {
            this.isLoading.set(false);
            this.error.set('Failed to load sent notifications.');
          },
        }),
      );
  }

  /* ---------- Send APIs ---------- */

  sendToCourse(payload: any) {
    return this.api.post('notifications/course', payload);
  }

  sendToStudent(payload: any) {
    return this.api.post('notifications/student', payload);
  }

  scheduleNotification(payload: any) {
    return this.api.post('notifications/schedule', payload);
  }

  /* ---------- Status ---------- */

  private deriveStatus(n: SentNotification): SentNotificationStatus {
    const totalProcessed = n.delivered_count + n.failed_count;

    // Failed completely
    if (n.failed_count > 0 && n.delivered_count === 0) {
      return 'failed';
    }

    // Not fully processed yet
    if (totalProcessed < n.recipient_count) {
      return 'scheduled';
    }

    return 'sent';
  }
}
