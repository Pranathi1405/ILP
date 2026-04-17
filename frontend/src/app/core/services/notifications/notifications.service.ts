/**
 * AUTHOR: Umesh Teja Peddi
 *
 * Notifications Service
 * ---------------------
 * Handles retrieval and management of user notifications including
 * listing, filtering, unread count tracking, read status updates,
 * and deletion operations.
 *
 * Purpose:
 * Acts as the centralized state and API communication layer for
 * in-app notifications across the application.
 *
 * Usage:
 * Injected into notification-related components to fetch notifications,
 * manage pagination, mark notifications as read, and maintain reactive
 * notification state using Angular signals.
 */

import { Injectable, signal, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from '../api.service';

export type NotificationType =
  | 'course'
  | 'quiz'
  | 'test'
  | 'assignment'
  | 'chat'
  | 'system'
  | 'achievement'
  | 'payment'
  | 'live_class'
  | 'doubt'
  | 'teacher_notification'
  | 'announcement'
  | 'enrollment';

export interface Notification {
  notification_id: number;
  title: string;
  message: string;
  notification_type: NotificationType;
  related_id: number | null;
  related_type: string | null;
  is_read: boolean;
  read_at: string | null;
  delivery_method: string;
  status: string;
  created_at: string;
}

export interface NotificationFilters {
  type?: NotificationType;
  unread_only?: boolean;
  page?: number;
  limit?: number;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface NotificationsResponse {
  notifications: Notification[];
  pagination: PaginationMeta;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private api = inject(ApiService);

  notifications = signal<Notification[]>([]);
  unreadCount = signal<number>(0);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);
  pagination = signal<PaginationMeta | null>(null);

  init(): void {
    this.fetchNotifications().subscribe();
    this.fetchUnreadCount().subscribe();
  }

  fetchNotifications(
    filters: NotificationFilters = {},
  ): Observable<ApiResponse<NotificationsResponse>> {
    this.isLoading.set(true);
    this.error.set(null);

    const params = new URLSearchParams();
    if (filters.type) params.set('type', filters.type);
    if (filters.unread_only) params.set('unread_only', 'true');
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit ?? 20));

    const query = params.toString() ? `?${params.toString()}` : '';

    return this.api.get<ApiResponse<NotificationsResponse>>(`notifications${query}`).pipe(
      tap({
        next: (res) => {
          if (res.success) {
            this.notifications.set(res.data.notifications);
            this.pagination.set(res.data.pagination);
          }
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.message ?? 'Failed to load notifications.');
          this.isLoading.set(false);
        },
      }),
    );
  }

  fetchUnreadCount(): Observable<ApiResponse<{ unread_count: number }>> {
    return this.api.get<ApiResponse<{ unread_count: number }>>('notifications/unread-count').pipe(
      tap((res) => {
        if (res.success) this.unreadCount.set(res.data.unread_count);
      }),
    );
  }

  markAsRead(notificationId: number): Observable<ApiResponse<void>> {
    return this.api.patch<ApiResponse<void>>(`notifications/${notificationId}/read`, {}).pipe(
      tap({
        next: () => {
          this.notifications.update((list) =>
            list.map((n) => (n.notification_id === notificationId ? { ...n, is_read: true } : n)),
          );
          this.unreadCount.update((c) => Math.max(0, c - 1));
        },
      }),
    );
  }

  markAllAsRead(): Observable<ApiResponse<{ updated_count: number }>> {
    return this.api
      .patch<ApiResponse<{ updated_count: number }>>('notifications/read-all', {})
      .pipe(
        tap({
          next: () => {
            this.notifications.update((list) => list.map((n) => ({ ...n, is_read: true })));
            this.unreadCount.set(0);
          },
        }),
      );
  }

  deleteNotification(notificationId: number): Observable<ApiResponse<void>> {
    return this.api.delete<ApiResponse<void>>(`notifications/${notificationId}`).pipe(
      tap({
        next: () => {
          const n = this.notifications().find((x) => x.notification_id === notificationId);
          if (n && !n.is_read) this.unreadCount.update((c) => Math.max(0, c - 1));
          this.notifications.update((list) =>
            list.filter((x) => x.notification_id !== notificationId),
          );
        },
      }),
    );
  }
}
