/**
 * AUTHOR: Umesh Teja Peddi
 * teacher-announcements.ts
 * ==========================================================================================
 * Teacher Announcements Module
 *
 * Purpose:
 * Provides teachers with a dashboard to view, filter, and manage all sent,
 * scheduled, and failed announcements/notifications. Supports pagination,
 * status filtering, course filtering, and navigation to the send announcement page.
 *
 * Responsibilities:
 * - Fetch sent notifications from TeacherAnnouncementsService
 * - Handle status and course-based filtering
 * - Manage pagination state and navigation
 * - Detect child routes (send announcement page)
 * - Refresh data automatically after sending announcements
 *
 * Key Features:
 * - Reactive state management using Angular Signals
 * - Query parameter–based refresh handling (?refresh)
 * - Dynamic pagination controls
 * - Status and type UI styling helpers
 *
 * Lifecycle:
 * - OnInit:
 *    • Loads notifications
 *    • Subscribes to router navigation events
 *    • Watches query params for refresh triggers
 *
 * Dependencies:
 * - TeacherAnnouncementsService → API communication & state
 * - Angular Router → navigation and route tracking
 * - DatePipe → date formatting in template
 *
 * Notes:
 * - Course list currently mocked (TODO: integrate Courses Service)
 * - Pagination handled server-side with client navigation controls
 */

import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import {
  TeacherAnnouncementsService,
  SentNotificationStatus,
  SentNotificationFilters,
} from '../../../../core/services/teacher/teacher-announcement.service';

type StatusFilter = 'all' | SentNotificationStatus;

interface StatusTab {
  label: string;
  key: StatusFilter;
}

@Component({
  selector: 'app-teacher-announcements',
  imports: [DatePipe, RouterOutlet],
  templateUrl: './teacher-announcements.html',
})
export class TeacherAnnouncements implements OnInit {
  service = inject(TeacherAnnouncementsService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  isChildRoute = false;

  // ── Filters ────────────────────────────────────────────────────────────────
  activeStatus = signal<StatusFilter>('all');
  selectedCourseId = signal<number | null>(null);

  // TODO: Replace with real data from your courses service.
  // Shape: { course_id: number; course_name: string }[]
  courses = signal<{ course_id: number; course_name: string }[]>([]);

  // ── Pagination ─────────────────────────────────────────────────────────────
  readonly pageSize = 20;
  currentPage = signal(1);

  // ── Tabs ───────────────────────────────────────────────────────────────────
  statusTabs: StatusTab[] = [
    { label: 'All', key: 'all' },
    { label: 'Sent', key: 'sent' },
    { label: 'Scheduled', key: 'scheduled' },
    { label: 'Failed', key: 'failed' },
  ];

  columnHeaders = ['NOTIFICATION', 'TYPE', 'COURSE', 'DELIVERY', 'TIME', 'STATUS'];

  // ── Computed ───────────────────────────────────────────────────────────────
  pagination = computed(() => this.service.pagination());
  notifications = computed(() => this.service.sentNotifications());
  totalPages = computed(() => Math.max(1, this.pagination().total_pages));

  visiblePages = computed((): (number | '...')[] => {
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

  startIndex = computed(() =>
    Math.min((this.currentPage() - 1) * this.pageSize + 1, this.pagination().total),
  );
  endIndex = computed(() => Math.min(this.currentPage() * this.pageSize, this.pagination().total));

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.load();

    // Listen to NavigationEnd and also to query param changes (refresh trigger from send page)
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.checkRoute(event.urlAfterRedirects);

        // If we came back from send page with ?refresh=... → reload data
        if (
          event.urlAfterRedirects.includes('/announcements') &&
          this.route.snapshot.queryParamMap.has('refresh')
        ) {
          this.load();
          // Optional: clean the query param so it doesn't trigger again on manual refresh
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { refresh: null },
            queryParamsHandling: 'merge',
          });
        }
      });

    // Also react to query param changes directly (in case of direct navigation)
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      if (params['refresh']) {
        this.load();
      }
    });
  }

  private checkRoute(url: string): void {
    this.isChildRoute = url.includes('/announcements/send');
  }

  // ── Filter actions ─────────────────────────────────────────────────────────
  selectStatus(key: StatusFilter): void {
    this.activeStatus.set(key);
    this.currentPage.set(1);
    this.load();
  }

  onCourseChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedCourseId.set(val ? Number(val) : null);
    this.currentPage.set(1);
    this.load();
  }

  // ── Pagination actions ─────────────────────────────────────────────────────
  goToPage(page: number | '...'): void {
    if (typeof page === 'number') {
      this.currentPage.set(page);
      this.load();
    }
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

  // ── Navigation ─────────────────────────────────────────────────────────────
  navigateToSend(): void {
    this.router.navigate(['/teacher/announcements/send']);
  }

  // ── Core fetch ─────────────────────────────────────────────────────────────
  private load(): void {
    const filters: SentNotificationFilters = { page: this.currentPage(), limit: this.pageSize };
    const status = this.activeStatus();
    const courseId = this.selectedCourseId();
    if (status !== 'all') filters.status = status;
    if (courseId != null) filters.course_id = courseId;
    this.service.fetchSent(filters).subscribe();
  }

  // ── Style helpers ──────────────────────────────────────────────────────────
  typeLabel(type: string): string {
    return type.replace(/_/g, ' ');
  }

  typeStyle(type: string): string {
    const map: Record<string, string> = {
      teacher_notification: 'bg-cyan-50 text-cyan-600 border-cyan-200',
      announcement: 'bg-blue-50 text-blue-600 border-blue-200',
      course: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      assignment: 'bg-violet-50 text-violet-600 border-violet-200',
      system: 'bg-slate-100 text-slate-500 border-slate-200',
    };
    return map[type] ?? 'bg-slate-100 text-slate-500 border-slate-200';
  }

  statusStyle(status: string): string {
    const map: Record<string, string> = {
      sent: 'bg-emerald-50 text-emerald-700',
      scheduled: 'bg-amber-50 text-amber-600',
      failed: 'bg-red-50 text-red-500',
    };
    return map[status] ?? 'bg-slate-100 text-slate-500';
  }

  statusDotStyle(status: string): string {
    const map: Record<string, string> = {
      sent: 'bg-emerald-500',
      scheduled: 'bg-amber-400',
      failed: 'bg-red-400',
    };
    return map[status] ?? 'bg-slate-400';
  }
}
