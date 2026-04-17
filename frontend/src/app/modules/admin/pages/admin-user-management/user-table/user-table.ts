/**
 * AUTHOR: Umesh Teja Peddi
 * src/app/modules/admin/pages/admin-user-management/user-table/user-table.ts
 * ==========================================================================================
 * User Table component responsible for displaying paginated users and handling
 * administrative user actions within the Admin User Management module.
 *
 * Responsibilities:
 * 1. Render users list received from parent via input()
 * 2. Display server-driven pagination controls
 * 3. Emit pageChange events for pagination navigation
 * 4. Provide contextual action menu per user (approve, suspend, reinstate, reject)
 * 5. Handle teacher approval workflow states
 * 6. Dynamically position action dropdown based on viewport space
 *
 * Data Flow:
 * Parent → users, pagination, isLoading inputs
 * Child  → pageChange output (pagination requests)
 *
 * UI Behavior:
 * - Pagination derived directly from backend pagination metadata
 * - Dropdown auto-closes on outside click using HostListener
 * - Action menu intelligently flips upward when space is limited
 *
 * Action Handling:
 * - suspendUser()
 * - reinstateUser()
 * - approveTeacher()
 * - rejectTeacher()
 * All actions delegate API calls to UserManagement service.
 *
 * State Management:
 * - signal() used for dropdown visibility and loading states
 * - computed() used for pagination calculations
 *
 * Notes:
 * - Component is presentation-focused; business logic remains in service layer
 * - Designed for scalable admin actions without modifying parent logic
 */

import { Component, input, output, signal, computed, HostListener, inject } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import {
  User,
  UserManagement,
  Pagination,
} from '../../../../../core/services/admin/user-management/user-management';
import { statusStyles } from '../../../admin-styles/admin-styles';

@Component({
  selector: 'app-user-table',
  standalone: true,
  imports: [DatePipe, NgClass],
  templateUrl: './user-table.html',
})
export class UserTable {
  private userManagement = inject(UserManagement);

  users = input.required<User[]>();
  pagination = input.required<Pagination>();
  isLoading = input<boolean>(false);
  pageChange = output<number>();

  userOptions = ['USER ID', 'USER NAME & EMAIL', 'ROLE', 'JOINED DATE', 'STATUS', 'ACTIONS'];
  statusStyles = statusStyles;

  // Derived from server pagination
  currentPage = computed(() => this.pagination().page);
  totalPages = computed(() => this.pagination().totalPages);

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
    if (typeof page === 'number') this.pageChange.emit(page);
  }
  nextPage(): void {
    if (this.currentPage() < this.totalPages()) this.pageChange.emit(this.currentPage() + 1);
  }
  prevPage(): void {
    if (this.currentPage() > 1) this.pageChange.emit(this.currentPage() - 1);
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  activeActionsUserId = signal<number | null>(null);
  dropdownPosition = signal<'up' | 'down'>('down');
  dropdownTop = signal(0);
  dropdownRight = signal(0);
  actionLoadingUserId = signal<number | null>(null);

  /** Returns true when this teacher is awaiting approval (approval === 0) */
  isPendingTeacher(user: User): boolean {
    return user.user_type === 'TEACHER' && user.approval === 0;
  }

  /** Returns true when this teacher is already approved (approval === 1) */
  isApprovedTeacher(user: User): boolean {
    return user.user_type === 'TEACHER' && user.approval === 1;
  }

  toggleActions(userId: number, event: MouseEvent): void {
    event.stopPropagation();
    if (this.activeActionsUserId() === userId) {
      this.activeActionsUserId.set(null);
      return;
    }
    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const isUp = spaceBelow < 160;
    this.dropdownPosition.set(isUp ? 'up' : 'down');
    this.dropdownTop.set(isUp ? rect.top - 80 : rect.bottom + 4);
    this.dropdownRight.set(window.innerWidth - rect.right);
    this.activeActionsUserId.set(userId);
  }

  suspendUser(userId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.activeActionsUserId.set(null);
    this.actionLoadingUserId.set(userId);
    this.userManagement.suspendUser(userId).subscribe({
      complete: () => this.actionLoadingUserId.set(null),
      error: () => this.actionLoadingUserId.set(null),
    });
  }

  reinstateUser(userId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.activeActionsUserId.set(null);
    this.actionLoadingUserId.set(userId);
    this.userManagement.reinstateUser(userId).subscribe({
      complete: () => this.actionLoadingUserId.set(null),
      error: () => this.actionLoadingUserId.set(null),
    });
  }

  approveTeacher(userId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.activeActionsUserId.set(null);
    this.actionLoadingUserId.set(userId);
    this.userManagement.approveTeacher(userId).subscribe({
      complete: () => this.actionLoadingUserId.set(null),
      error: () => this.actionLoadingUserId.set(null),
    });
  }

  rejectTeacher(userId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.activeActionsUserId.set(null);
    this.actionLoadingUserId.set(userId);
    this.userManagement.rejectTeacher(userId).subscribe({
      complete: () => this.actionLoadingUserId.set(null),
      error: () => this.actionLoadingUserId.set(null),
    });
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.activeActionsUserId.set(null);
  }
}
