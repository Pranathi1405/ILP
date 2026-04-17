/**
 * AUTHOR: Umesh Teja Peddi
 * src/app/modules/admin/pages/admin-user-management/add-user/add-user.ts
 * ==========================================================================================
 * Add User component responsible for creating new Teacher or Admin accounts
 * from the Admin panel through a multi-step workflow.
 *
 * Responsibilities:
 * 1. Allow admin to select user type (Teacher or Admin)
 * 2. Handle separate reactive forms for Teacher and Admin creation
 * 3. Validate inputs before submission
 * 4. Send user creation requests via UserManagement service
 * 5. Display success or error results after submission
 * 6. Manage navigation back to user directory
 *
 * Workflow:
 * Select Type → Fill Form → Submit → API Call → Result State → Navigate Back
 *
 * Form Handling:
 * - Teacher form collects personal and department details
 * - Admin form collects role and permission configuration
 * - Validation handled using Angular Reactive Forms
 *
 * State Management:
 * - Signals control step navigation, loading state, and result feedback
 * - Result screen reused for both success and error outcomes
 *
 * Notes:
 * - Teacher creation directly creates an account
 * - Admin creation sends an invitation with assigned permissions
 * - Component does not manage user list refresh (handled by parent page)
 */

import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  UserManagement,
  AddTeacherPayload,
  AddAdminPayload,
} from '../../../../../core/services/admin/user-management/user-management';

export type AddUserStep = 'select-type' | 'teacher' | 'admin';

@Component({
  selector: 'app-add-user',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './add-user.html',
})
export class AddUser {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private userManagement = inject(UserManagement);

  step = signal<AddUserStep>('select-type');
  isLoading = signal(false);
  resultStatus = signal<'success' | 'error' | null>(null);
  resultMessage = signal('');

  // ── Teacher form ──────────────────────────────────────────────────────────
  teacherForm = this.fb.group({
    first_name: ['', [Validators.required, Validators.maxLength(50)]],
    last_name: ['', [Validators.required, Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    department: ['', Validators.required],
  });

  // ── Admin form ────────────────────────────────────────────────────────────
  adminForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['', Validators.required],
    permissions: this.fb.group({
      financial_management: [false],
      user_management: [false],
      course_management: [false],
      announcement_management: [false],
    }),
  });

  departments = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology'];

  permissionLabels: { key: string; label: string }[] = [
    { key: 'financial_management', label: 'Financial Management' },
    { key: 'user_management', label: 'User Management' },
    { key: 'course_management', label: 'Course Management' },
    { key: 'announcement_management', label: 'Announcement Management' },
  ];

  // ── Navigation ────────────────────────────────────────────────────────────
  selectType(type: 'teacher' | 'admin'): void {
    this.step.set(type);
  }

  goBack(): void {
    if (this.resultStatus() !== null) {
      this.resultStatus.set(null);
      this.resultMessage.set('');
      return;
    }
    if (this.step() !== 'select-type') {
      this.step.set('select-type');
    } else {
      this.router.navigate(['/admin/user-management']);
    }
  }

  onCancel(): void {
    this.router.navigate(['/admin/user-management']);
  }

  // ── Error helpers ─────────────────────────────────────────────────────────
  hasT(field: string, error: string): boolean {
    const c = this.teacherForm.get(field);
    return !!(c?.hasError(error) && c?.touched);
  }

  hasA(field: string, error: string): boolean {
    const c = this.adminForm.get(field);
    return !!(c?.hasError(error) && c?.touched);
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  submitTeacher(): void {
    if (!this.teacherForm.valid) {
      this.teacherForm.markAllAsTouched();
      return;
    }

    const v = this.teacherForm.getRawValue();
    const payload: AddTeacherPayload = {
      first_name: v.first_name!,
      last_name: v.last_name!,
      email: v.email!,
      phone: v.phone!,
      department: v.department!,
    };

    this.isLoading.set(true);
    this.userManagement.addTeacher(payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.resultStatus.set('success');
        this.resultMessage.set('Teacher account created successfully.');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.resultStatus.set('error');
        this.resultMessage.set(err?.error?.message ?? 'Failed to create teacher account.');
      },
    });
  }

  submitAdmin(): void {
    if (!this.adminForm.valid) {
      this.adminForm.markAllAsTouched();
      return;
    }

    const v = this.adminForm.getRawValue();
    const payload: AddAdminPayload = {
      email: v.email!,
      role: v.role!,
      permissions: v.permissions as Record<string, boolean>,
    };

    this.isLoading.set(true);
    this.userManagement.addAdmin(payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.resultStatus.set('success');
        this.resultMessage.set('Admin invitation sent successfully.');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.resultStatus.set('error');
        this.resultMessage.set(err?.error?.message ?? 'Failed to send admin invitation.');
      },
    });
  }

  goToUsersList(): void {
    this.router.navigate(['/admin/user-management']);
  }
}
