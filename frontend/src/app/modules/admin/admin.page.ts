/**
 * AUTHOR: Umesh Teja Peddi
 *
 * Admin Page Component
 * --------------------
 * Acts as the main layout container for all Admin module pages.
 * Initializes notifications, manages socket connection, and
 * renders child admin routes with the side panel layout.
 *
 * Purpose:
 * Provides a common wrapper for admin features and handles
 * global admin-level initialization such as real-time
 * notifications and unread count tracking.
 *
 * Usage:
 * Loaded as the parent component for all admin routes.
 */

import { Component, DestroyRef, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet, Router } from '@angular/router';
import { AdminSidePanel } from './admin-side-panel/admin-side-panel';
import { NotificationsService } from '../../core/services/notifications/notifications.service';
import { SocketService } from '../../core/services/notifications/socket.service';
import { ToastComponent } from '../../shared/components/toast/toast.component';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [RouterOutlet, AdminSidePanel, ToastComponent],
  templateUrl: './admin.page.html',
})
export class AdminPage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly socketService = inject(SocketService);
  private readonly destroyRef = inject(DestroyRef);
  readonly notificationsService = inject(NotificationsService);

  ngOnInit(): void {
    this.notificationsService
      .fetchUnreadCount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
    this.socketService.init();
  }

  ngOnDestroy(): void {
    this.socketService.disconnect();
  }

  goToNotifications(): void {
    this.router.navigate(['/admin/notifications']);
  }

  greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 21) return 'Good Evening';
    return 'Good Night';
  });
}
