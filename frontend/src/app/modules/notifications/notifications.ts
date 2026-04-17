/**
 * AUTHOR: Umesh Teja Peddi
 * src/app/modules/notifications/notifications.ts
 * =================================================
 * Shared notifications page — used by all user roles.
 *
 * Features:
 *  - Filter by notification type (role-aware tab list)
 *  - Unread-only toggle
 *  - Server-side pagination (matches backend limit/page params)
 *  - Mark single / mark all as read
 *  - Optimistic UI updates via service signals
 */

import { Component, computed, signal, inject, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgClass, DatePipe } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import {
  NotificationsService,
  NotificationType,
  Notification,
} from '../../core/services/notifications/notifications.service';

// ── Role-aware filter tabs ────────────────────────────────────────────────────

export type UserRole = 'admin' | 'teacher' | 'student' | 'parent';

interface TypeTab {
  label: string;
  value: NotificationType | 'all';
}

const ALL_TABS: TypeTab[] = [
  { label: 'All', value: 'all' },
  { label: 'Course', value: 'course' },
  { label: 'Quiz', value: 'quiz' },
  { label: 'Test', value: 'test' },
  { label: 'Assignment', value: 'assignment' },
  { label: 'Live Class', value: 'live_class' },
  { label: 'Chat', value: 'chat' },
  { label: 'Doubt', value: 'doubt' },
  { label: 'Achievement', value: 'achievement' },
  { label: 'Payment', value: 'payment' },
  { label: 'System', value: 'system' },
  { label: 'Announcement', value: 'announcement' },
  { label: 'Enrollment', value: 'enrollment' },
  { label: 'Teacher', value: 'teacher_notification' },
];

// Which tabs to show per role
const ROLE_TABS: Record<UserRole, Array<NotificationType | 'all'>> = {
  student: [
    'all',
    'course',
    'quiz',
    'test',
    'assignment',
    'live_class',
    'doubt',
    'achievement',
    'payment',
    'announcement',
  ],
  teacher: ['all', 'course', 'live_class', 'doubt', 'assignment', 'announcement', 'system'],
  parent: ['all', 'course', 'assignment', 'payment', 'achievement', 'announcement', 'system'],
  admin: ['all', 'announcement', 'system', 'payment', 'enrollment', 'teacher_notification'],
};

// ── Icon map per notification type ───────────────────────────────────────────

export const TYPE_ICONS: Record<string, string> = {
  course: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  quiz: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>`,
  test: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,
  assignment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  system: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M19.07 19.07l-1.41-1.41M5.34 5.34L3.93 3.93M21 12h-3M6 12H3M12 3V0M12 24v-3"/></svg>`,
  achievement: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`,
  payment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
  live_class: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
  doubt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="13" y2="14"/></svg>`,
  teacher_notification: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  announcement: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 2 11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  enrollment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>`,
};

// Icon background colour per type
export const TYPE_ICON_STYLES: Record<string, string> = {
  course: 'bg-blue-50 text-blue-500',
  quiz: 'bg-violet-50 text-violet-500',
  test: 'bg-indigo-50 text-indigo-500',
  assignment: 'bg-emerald-50 text-emerald-500',
  chat: 'bg-purple-50 text-purple-500',
  system: 'bg-slate-100 text-slate-500',
  achievement: 'bg-amber-50 text-amber-500',
  payment: 'bg-orange-50 text-orange-500',
  live_class: 'bg-red-50 text-red-500',
  doubt: 'bg-teal-50 text-teal-500',
  teacher_notification: 'bg-cyan-50 text-cyan-500',
  announcement: 'bg-blue-50 text-blue-600',
  enrollment: 'bg-green-50 text-green-500',
};

// ── Component ─────────────────────────────────────────────────────────────────

const PAGE_LIMIT = 10;

@Component({
  selector: 'app-notifications',
  imports: [NgClass],
  templateUrl: './notifications.html',
})
export class Notifications implements OnInit {
  private destroyRef = inject(DestroyRef);
  private sanitizer = inject(DomSanitizer);
  private activatedRoute = inject(ActivatedRoute);
  notificationsService = inject(NotificationsService);

  private get role(): UserRole {
    // First segment of the URL is the role: /admin/... → 'admin', /student/... → 'student'
    const segment = this.activatedRoute.snapshot.pathFromRoot
      .flatMap((s) => s.url)
      .map((s) => s.path)[0];
    return (segment as UserRole) ?? 'student';
  }

  activeTab = signal<NotificationType | 'all'>('all');
  unreadOnly = signal<boolean>(false);
  currentPage = signal<number>(1);
  markAllLoading = signal<boolean>(false);
  actionLoading = signal<number | null>(null);

  // Modal state
  selectedNotification = signal<Notification | null>(null);
  showDeleteConfirm = signal<boolean>(false);
  deleteLoading = signal<boolean>(false);

  // Tabs filtered by role
  visibleTabs = computed(() => ALL_TABS.filter((t) => ROLE_TABS[this.role].includes(t.value)));

  // Derived from service pagination signal
  totalPages = computed(() => this.notificationsService.pagination()?.total_pages ?? 1);
  totalCount = computed(() => this.notificationsService.pagination()?.total ?? 0);

  visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: (number | '...')[] = [];
    if (total <= 5) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++)
        pages.push(i);
      if (current < total - 2) pages.push('...');
      pages.push(total);
    }
    return pages;
  });

  startIndex = computed(() => (this.currentPage() - 1) * PAGE_LIMIT);
  endIndex = computed(() => Math.min(this.startIndex() + PAGE_LIMIT, this.totalCount()));

  ngOnInit(): void {
    this.notificationsService
      .fetchUnreadCount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
    this.load();
  }

  private load(): void {
    const tab = this.activeTab();
    this.notificationsService
      .fetchNotifications({
        type: tab === 'all' ? undefined : tab,
        unread_only: this.unreadOnly(),
        page: this.currentPage(),
        limit: PAGE_LIMIT,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  selectTab(value: NotificationType | 'all'): void {
    this.activeTab.set(value);
    this.currentPage.set(1);
    this.load();
  }

  toggleUnreadOnly(): void {
    this.unreadOnly.update((v) => !v);
    this.currentPage.set(1);
    this.load();
  }

  goToPage(page: number | '...'): void {
    if (typeof page !== 'number') return;
    this.currentPage.set(page);
    this.load();
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.load();
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.load();
    }
  }

  onMarkAsRead(notificationId: number): void {
    this.actionLoading.set(notificationId);
    this.notificationsService
      .markAsRead(notificationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.actionLoading.set(null),
        error: () => this.actionLoading.set(null),
      });
  }

  onMarkAllAsRead(): void {
    this.markAllLoading.set(true);
    this.notificationsService
      .markAllAsRead()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.markAllLoading.set(false),
        error: () => this.markAllLoading.set(false),
      });
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  openModal(n: Notification): void {
    this.selectedNotification.set(n);
    this.showDeleteConfirm.set(false);
    // Mark as read when opened if unread
    if (!n.is_read) this.onMarkAsRead(n.notification_id);
  }

  closeModal(): void {
    this.selectedNotification.set(null);
    this.showDeleteConfirm.set(false);
  }

  openDeleteConfirm(): void {
    this.showDeleteConfirm.set(true);
  }
  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
  }

  confirmDelete(): void {
    const n = this.selectedNotification();
    if (!n) return;
    this.deleteLoading.set(true);
    this.notificationsService
      .deleteNotification(n.notification_id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleteLoading.set(false);
          this.closeModal();
        },
        error: () => this.deleteLoading.set(false),
      });
  }

  // ── Template helpers ──────────────────────────────────────────────────────

  getIcon(type: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(TYPE_ICONS[type] ?? TYPE_ICONS['system']);
  }
  getIconStyle(type: string): string {
    return TYPE_ICON_STYLES[type] ?? 'bg-slate-100 text-slate-500';
  }

  formatTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days === 1) return 'Yesterday';
    return new DatePipe('en-US').transform(dateStr, 'MMM dd') ?? dateStr;
  }
}
