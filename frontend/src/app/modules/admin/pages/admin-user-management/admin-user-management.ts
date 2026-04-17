/**
 * AUTHOR: Umesh Teja Peddi
 * src/app/modules/admin/pages/admin-user-management/admin-user-management.ts
 * ==========================================================================================
 * Admin User Management container component responsible for handling user directory
 * operations including filtering, searching, pagination, and navigation.
 *
 * Responsibilities:
 * 1. Load users from backend using role, status, search, and pagination filters
 * 2. Manage user role tabs (Students, Teachers, Parents, etc.)
 * 3. Provide debounced search input handling
 * 4. Control status filter dropdown and mapping to backend filters
 * 5. Detect child routes (e.g., Add User page) for layout adjustments
 * 6. Coordinate data flow between navbar, selector, and table components
 *
 * Architecture Pattern:
 * UI Events → Filter Builder → UserManagement Service → Signals → Template Rendering
 *
 * State Handling:
 * - Signals for UI state (status, dropdown, placeholder)
 * - model() bindings for tab and search synchronization
 * - RxJS Subjects for debounced search input
 *
 * Notes:
 * - 'Pending' status is forwarded directly to backend for teacher approval handling
 * - Search requests are debounced (350ms) to reduce API calls
 * - Component automatically reloads users when filters change
 * - Child route detection allows reuse of layout for nested pages
 */

import { Component, DestroyRef, OnInit, inject, model, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { Subject, debounceTime, filter } from 'rxjs';
import { UserDirectoryNavbar } from './admin-user-navbar/user-directory-navbar';
import { UserRole, UsersSelector } from './users-selector/users-selector';
import { UserTable } from './user-table/user-table';
import { statusStyles, statusSelectorStyles } from '../../admin-styles/admin-styles';
import {
  UserManagement,
  UserFilters,
} from '../../../../core/services/admin/user-management/user-management';

@Component({
  selector: 'app-admin-user-management',
  standalone: true,
  imports: [RouterOutlet, UserDirectoryNavbar, UsersSelector, UserTable],
  templateUrl: './admin-user-management.html',
})
export class AdminUserManagement implements OnInit {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly userManagement = inject(UserManagement);

  private searchInput$ = new Subject<string>();

  placeholder = signal<string>('Search by Name, Email, or ID');
  status = signal('All');
  activeTab = model<UserRole>('all');
  searchValue = model<string>('');

  isChildRoute = false;

  statusStyles = statusStyles;
  statusSelectorStyles = statusSelectorStyles;
  dropdownOpen = signal(false);

  // 'Pending' added — maps to approval=0 teachers on the backend
  statusOptions = ['All', 'Active', 'Suspended', 'Pending'];

  users = this.userManagement.users;
  pagination = this.userManagement.pagination;

  ngOnInit(): void {
    this.checkRoute();
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.checkRoute());

    this.searchInput$
      .pipe(debounceTime(350), takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => {
        this.searchValue.set(val);
        this.loadUsers(1);
      });
    if (this.userManagement.users().length === 0) {
      this.loadUsers(1);
    }
  }

  private checkRoute(): void {
    let route = this.activatedRoute;
    while (route.firstChild) route = route.firstChild;
    this.isChildRoute = route !== this.activatedRoute;
  }

  private buildFilters(page: number): UserFilters {
    const role = this.activeTab() !== 'all' ? this.activeTab().toLowerCase() : undefined;
    const rawStatus = this.status().toLowerCase();
    // 'pending' is a special filter — pass it through; the backend handles it
    const status = rawStatus === 'all' ? undefined : rawStatus; // 'active' | 'suspended' | 'pending' | undefined
    const search = this.searchValue().trim() || undefined;
    return { role, status, search, page, limit: 10 };
  }

  loadUsers(page: number): void {
    this.userManagement.fetchUsers(this.buildFilters(page)).subscribe();
  }

  onTabChange(tab: UserRole): void {
    this.activeTab.set(tab);
    this.loadUsers(1);
  }

  onStatusChange(option: string): void {
    this.status.set(option);
    this.dropdownOpen.set(false);
    this.loadUsers(1);
  }

  onSearch(val: string): void {
    this.searchInput$.next(val);
  }

  onPageChange(page: number): void {
    this.loadUsers(page);
  }

  updateDropDown(): void {
    this.dropdownOpen.update((v) => !v);
  }
  closeDropdown(): void {
    setTimeout(() => this.dropdownOpen.set(false), 150);
  }

  navigateToAddUser(): void {
    this.router.navigate(['/admin/user-management/add-user']);
  }

  exportData(): void {}
}
