/**
 * AUTHOR: Umesh Teja Peddi
 * src/app/modules/admin/pages/admin-user-management/users-selector/users-selector.ts
 * ==========================================================================================
 * Users Selector component used to switch between user role categories
 * within the Admin User Management module.
 *
 * Responsibilities:
 * 1. Display role-based tabs (All, Students, Teachers, Parents, Admins)
 * 2. Receive currently active tab from parent via input()
 * 3. Emit activeTabChange event when a tab is selected
 *
 * Data Flow:
 * Parent → activeTab input
 * Child  → activeTabChange output
 *
 * Behavior:
 * - Stateless UI selector (no internal state management)
 * - Parent component controls filtering and data fetching
 *
 * Purpose:
 * Acts as a reusable role filter control separating UI interaction
 * from business logic handled in the parent container.
 */

import { Component, input, output } from '@angular/core';

export type UserRole = 'all' | 'student' | 'teacher' | 'parent' | 'admin';

@Component({
  selector: 'app-users-selector',
  standalone: true,
  imports: [],
  templateUrl: './users-selector.html',
})
export class UsersSelector {
  activeTab = input<UserRole>('all');
  activeTabChange = output<UserRole>();

  tabs: { label: string; key: UserRole }[] = [
    { label: 'ALL', key: 'all' },
    { label: 'STUDENTS', key: 'student' },
    { label: 'TEACHERS', key: 'teacher' },
    { label: 'PARENTS', key: 'parent' },
    { label: 'ADMINS', key: 'admin' },
  ];

  select(key: UserRole): void {
    this.activeTabChange.emit(key);
  }
}
