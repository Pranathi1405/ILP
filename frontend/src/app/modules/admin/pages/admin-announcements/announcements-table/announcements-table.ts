/**
 * AUTHOR: Umesh Teja Peddi
 * src/app/modules/admin/pages/admin-announcements/announcements-table/announcements-table.ts – Announcements Table Controller
 * =========================================================================================================================
 * Smart table component responsible for displaying, paginating, and managing
 * actions on announcements within the Admin Announcements module.
 *
 * Responsibilities:
 * 1. Receive filtered announcements from parent via input binding
 * 2. Handle client-side pagination and visible page calculations
 * 3. Reset pagination automatically when active tab changes
 * 4. Navigate to edit screen for selected announcements
 * 5. Trigger announcement actions (broadcast / deactivate) with confirmation flow
 * 6. Maintain UI action states (loading, error, confirmation dialogs)
 * 7. Update local announcement status after successful actions
 * 8. Provide UI style mappings for targets and statuses
 *
 * Pattern:
 * Parent Filter → Input Signal → Pagination Compute → Table Render
 * User Action → Confirmation → Service Call → Local State Update
 *
 * Notes:
 * - Component does NOT fetch data; parent owns data lifecycle
 * - Uses Angular signals + computed values for reactive pagination
 * - resetKey input ensures page resets synchronously on tab change
 * - Styling maps centralize UI state representation
 */

import { Component, computed, effect, input, signal, inject } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { Router } from '@angular/router';
import {
  Announcement,
  AnnouncementsService,
} from '../../../../../core/services/admin/announcements/announcements.service';

@Component({
  selector: 'app-announcements-table',
  standalone: true,
  imports: [DatePipe, NgClass],
  templateUrl: './announcements-table.html',
})
export class AnnouncementsTable {
  private router = inject(Router);
  private announcementsService = inject(AnnouncementsService);

  filteredAnnouncements = input.required<Announcement[]>();
  resetKey = input<string>();
  private _resetEffect = effect(() => {
    this.resetKey();
    this.currentPage.set(1);
  });

  columnHeaders = ['TARGET', 'ANNOUNCEMENT', 'STATUS', 'DURATION', 'CREATED BY', 'ACTIONS'];
  pageSize = 10;
  currentPage = signal(1);

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredAnnouncements().length / this.pageSize)),
  );
  startIndex = computed(() => (this.currentPage() - 1) * this.pageSize);
  endIndex = computed(() =>
    Math.min(this.startIndex() + this.pageSize, this.filteredAnnouncements().length),
  );
  paginatedAnnouncements = computed(() =>
    this.filteredAnnouncements().slice(this.startIndex(), this.endIndex()),
  );
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

  goToPage(page: number | '...'): void {
    if (typeof page === 'number') this.currentPage.set(page);
  }
  nextPage(): void {
    if (this.currentPage() < this.totalPages()) this.currentPage.update((p) => p + 1);
  }
  prevPage(): void {
    if (this.currentPage() > 1) this.currentPage.update((p) => p - 1);
  }

  showBroadcastConfirm = signal(false);
  pendingBroadcastAnnouncement = signal<Announcement | null>(null);

  showDeactivateConfirm = signal(false);
  pendingDeactivateAnnouncement = signal<Announcement | null>(null);

  actionLoading = signal<number | null>(null);
  actionError = signal<string | null>(null);

  navigateToEdit(announcement: Announcement): void {
    this.router.navigate(['/admin/announcements/edit', announcement.announcement_id]);
  }
  viewAnalytics(announcement: Announcement): void {
    void announcement;
  }
  openBroadcastConfirm(announcement: Announcement): void {
    this.pendingBroadcastAnnouncement.set(announcement);
    this.showBroadcastConfirm.set(true);
  }

  cancelBroadcast(): void {
    this.showBroadcastConfirm.set(false);
    this.pendingBroadcastAnnouncement.set(null);
  }

  confirmBroadcast(): void {
    const a = this.pendingBroadcastAnnouncement();
    if (!a?.announcement_id) return;

    this.showBroadcastConfirm.set(false);
    this.actionLoading.set(a.announcement_id);
    this.actionError.set(null);

    this.announcementsService.broadcast(a.announcement_id).subscribe({
      next: () => {
        this.actionLoading.set(null);
        this.announcementsService.updateLocalStatus(a.announcement_id!, 'broadcasted');
        this.pendingBroadcastAnnouncement.set(null);
      },
      error: (err) => {
        this.actionLoading.set(null);
        this.actionError.set(err?.error?.message ?? 'Broadcast failed.');
      },
    });
  }

  openDeactivateConfirm(announcement: Announcement): void {
    this.pendingDeactivateAnnouncement.set(announcement);
    this.showDeactivateConfirm.set(true);
  }

  cancelDeactivate(): void {
    this.showDeactivateConfirm.set(false);
    this.pendingDeactivateAnnouncement.set(null);
  }

  confirmDeactivate(): void {
    const a = this.pendingDeactivateAnnouncement();
    if (!a?.announcement_id) return;

    this.showDeactivateConfirm.set(false);
    this.actionLoading.set(a.announcement_id);
    this.actionError.set(null);

    this.announcementsService.deactivate(a.announcement_id).subscribe({
      next: () => {
        this.actionLoading.set(null);
        this.announcementsService.updateLocalStatus(a.announcement_id!, 'deactivated', false);
        this.pendingDeactivateAnnouncement.set(null);
      },
      error: (err) => {
        this.actionLoading.set(null);
        this.actionError.set(err?.error?.message ?? 'Deactivation failed.');
      },
    });
  }

  targetStyles: Record<string, string> = {
    all_users: 'bg-[#F1F5F9] text-[#1E293B] border-slate-200',
    all_students: 'bg-[#DBEAFE] text-[#1E40AF] border-blue-200',
    course_students: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    teachers: 'bg-[#F3E8FF] text-[#6B21A8] border-purple-200',
    parents: 'bg-amber-50 text-amber-600 border-amber-200',
  };

  targetLabels: Record<string, string> = {
    all_users: 'All Users',
    all_students: 'Students',
    course_students: 'Course',
    teachers: 'Teachers',
    parents: 'Parents',
  };

  statusStyles: Record<string, string> = {
    broadcasted: 'text-[#059669]',
    scheduled: 'text-[#D97706]',
    draft: 'text-slate-500',
    edited: 'text-blue-600',
    deactivated: 'text-red-400',
  };

  statusDotStyles: Record<string, string> = {
    broadcasted: 'bg-[#10B981]',
    scheduled: 'bg-[#F59E0B]',
    draft: 'bg-[#94A3B8]',
    edited: 'bg-blue-500',
    deactivated: 'bg-[#F87171]',
  };
}
