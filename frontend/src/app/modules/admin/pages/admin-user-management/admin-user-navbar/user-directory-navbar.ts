/**
 * AUTHOR: Umesh Teja Peddi
 * src/app/modules/admin/pages/admin-user-management/admin-user-navbar/user-directory-navbar.ts
 * ==========================================================================================
 * User Directory Navbar component used in the Admin User Management module.
 *
 * Responsibilities:
 * 1. Display page title and contextual subtitle for User Directory
 * 2. Provide a reusable search input for filtering users
 * 3. Emit search input changes to parent component
 * 4. Trigger navigation flow for adding a new user
 *
 * Communication Pattern:
 * - Receives placeholder text via input()
 * - Emits searchChange event when search value updates
 * - Emits addNewUser event when admin clicks add user action
 *
 * State Handling:
 * - Uses model() for two-way search value binding
 * - Parent component handles filtering and routing logic
 *
 * Notes:
 * - Pure presentation + event emission component
 * - Contains no business logic or API interaction
 */

import { Component, input, model, output } from '@angular/core';
import { SearchComponent } from '../../../search-component/search-component';

@Component({
  selector: 'app-user-directory-navbar',
  standalone: true,
  imports: [SearchComponent],
  templateUrl: './user-directory-navbar.html',
})
export class UserDirectoryNavbar {
  title = 'User Directory';
  subtitle = 'GLOBAL ACCOUNT MANAGEMENT & PERMISSIONS';
  placeholder = input<string>('');

  addNewUser = output<void>();
  searchChange = output<string>();

  searchValue = model<string>('');

  onSearch(value: string): void {
    this.searchValue.set(value);
    this.searchChange.emit(value);
  }

  onAddNewUser(): void {
    this.addNewUser.emit();
  }
}
