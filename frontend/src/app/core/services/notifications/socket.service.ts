/**
 * AUTHOR: Umesh Teja Peddi
 *
 * Socket Service
 * --------------
 * Manages the Socket.IO connection for real-time application events,
 * primarily handling live notification delivery.
 *
 * Purpose:
 * Establishes a single persistent websocket connection, listens for
 * incoming notification events, updates notification state, and triggers
 * toast alerts when applicable.
 *
 * Usage:
 * Initialized at the application layout level to enable real-time
 * notifications across the app and automatically cleaned up on destroy.
 */

import { Injectable, inject, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../../environments/environment';
import { NotificationsService, Notification } from './notifications.service';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket | null = null;
  private notificationsService = inject(NotificationsService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  init(): void {
    if (this.socket?.connected) return;

    this.socket = io(environment.apiUrl, {
      withCredentials: true, // sends the httpOnly cookie — no token needed manually
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
    });

    this.socket.on('new_notification', (notification: Notification) => {
      // 1. Bump unread badge
      this.notificationsService.unreadCount.update((c) => c + 1);

      // 2. Prepend to list if it's already loaded (so page refreshes aren't needed)
      this.notificationsService.notifications.update((list) => [notification, ...list]);

      // 3. Show toast — suppress on /notifications page and any /test route
      const url = this.router.url;
      const suppress = url.includes('/notifications') || url.includes('/test');
      if (!suppress) {
        this.toastService.show({
          title: notification.title,
          message: notification.message,
          type: notification.notification_type,
        });
      }
    });

    this.socket.on('disconnect', (reason: any) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err: any) => {
      console.error('[Socket] Connection error:', err.message);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
