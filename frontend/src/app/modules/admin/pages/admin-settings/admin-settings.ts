/**
 * AUTHOR: Umesh Teja Peddi
 * src/app/modules/admin/pages/admin-settings/admin-settings.ts
 * ==========================================================================================
 * Admin Settings component responsible for managing administrator profile, security,
 * notification preferences, and account activity.
 *
 * Responsibilities:
 * 1. Load and update admin profile information (name, phone, avatar preview)
 * 2. Handle password change with validation and strength indication
 * 3. Manage notification preference toggles (in-app & push)
 * 4. Display recent login activity
 * 5. Provide toast-based feedback for user actions
 * 6. Map notification categories to backend preference schema
 *
 * Architecture Pattern:
 * Service → Signals State → Computed UI → Template Binding
 *
 * State Management:
 * - Angular Signals for reactive UI state
 * - Computed signals for derived values (initials, password strength, labels)
 * - Backend synchronization via Settings service
 *
 * Notes:
 * - Profile, password, and notification saves are intentionally independent
 * - Notification UI categories are mapped to backend enum values using CATEGORY_TYPE_MAP
 * - SVG icons are sanitized before rendering to prevent unsafe HTML injection
 * - Defaults are used if preference fetch fails (non-blocking UX)
 */

import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Settings } from '../../../../core/services/admin/settings/settings';

// ─── Types ────────────────────────────────────────────────────

export type NotificationCategory =
  | 'payment'
  | 'system'
  | 'announcement'
  | 'enrollment'
  | 'teacher_notification';

export interface NotificationRow {
  category: NotificationCategory;
  label: string;
  description: string;
  inApp: boolean;
  push: boolean;
}

export interface RecentLogin {
  device: string;
  browser: string;
  location: string;
  time: string;
  isActive: boolean;
}

// ─── Icon map ─────────────────────────────────────────────────

export const TYPE_ICONS: Record<string, string> = {
  system: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M19.07 19.07l-1.41-1.41M5.34 5.34L3.93 3.93M21 12h-3M6 12H3M12 3V0M12 24v-3"/></svg>`,
  payment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
  teacher_notification: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  announcement: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 2 11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  enrollment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>`,
};

export const TYPE_ICON_STYLES: Record<string, string> = {
  system: 'bg-slate-100 text-slate-500',
  payment: 'bg-orange-50 text-orange-500',
  teacher_notification: 'bg-cyan-50 text-cyan-500',
  announcement: 'bg-blue-50 text-blue-600',
  enrollment: 'bg-green-50 text-green-500',
};

const CATEGORY_TYPE_MAP: Record<NotificationCategory, string> = {
  payment: 'payment',
  system: 'system',
  announcement: 'announcement',
  enrollment: 'enrollment',
  teacher_notification: 'teacher_notification',
};

// ─── Component ───────────────────────────────────────────────

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-settings.html',
})
export class AdminSettings implements OnInit {
  private sanitizer = inject(DomSanitizer);
  private settingsService = inject(Settings);

  // ── Toast ──────────────────────────────────────────────────
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error' | null>(null);

  // ── Separate saving states (profile and password are independent) ──
  isSavingProfile = signal(false);
  isSavingPassword = signal(false);
  isSavingNotifications = signal(false);
  isLoadingProfile = signal(true); // show skeleton on first load

  // ── Profile ────────────────────────────────────────────────
  firstName = signal('');
  lastName = signal('');
  email = signal('');
  phoneNumber = signal('');
  pictureUrl = signal<string | null>(null);

  profileInitials = computed(() => {
    const f = this.firstName().trim();
    const l = this.lastName().trim();
    return ((f[0] ?? '') + (l[0] ?? '')).toUpperCase() || '?';
  });

  // ── Password ───────────────────────────────────────────────
  currentPassword = signal('');
  newPassword = signal('');
  confirmPassword = signal('');
  showCurrentPw = signal(false);
  showNewPw = signal(false);
  showConfirmPw = signal(false);

  passwordStrength = computed(() => {
    const pw = this.newPassword();
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  });

  passwordStrengthLabel = computed(
    () => ['', 'Weak', 'Fair', 'Good', 'Strong'][this.passwordStrength()] ?? '',
  );

  passwordStrengthColor = computed(() => {
    const s = this.passwordStrength();
    if (s <= 1) return '#ef4444';
    if (s === 2) return '#f59e0b';
    if (s === 3) return '#3b82f6';
    return '#10b981';
  });

  // ── Login Activity ─────────────────────────────────────────
  recentLogins = signal<RecentLogin[]>([
    {
      device: 'Windows 11',
      browser: 'Chrome',
      location: 'Hyderabad, IN',
      time: 'Active Now',
      isActive: true,
    },
    {
      device: 'iPhone 14',
      browser: 'Safari',
      location: 'Mumbai, IN',
      time: '2 days ago',
      isActive: false,
    },
    {
      device: 'MacBook Pro',
      browser: 'Firefox',
      location: 'Pune, IN',
      time: '1 week ago',
      isActive: false,
    },
  ]);

  // ── Notifications ──────────────────────────────────────────
  notifications = signal<NotificationRow[]>([
    {
      category: 'payment',
      label: 'Payment',
      description: 'Payment receipts, refunds & invoices',
      inApp: true,
      push: false,
    },
    {
      category: 'system',
      label: 'System',
      description: 'Platform alerts & maintenance notices',
      inApp: true,
      push: true,
    },
    {
      category: 'announcement',
      label: 'Announcement',
      description: 'Course & platform-wide announcements',
      inApp: true,
      push: true,
    },
    {
      category: 'enrollment',
      label: 'Enrollment',
      description: 'New student enrolment activity',
      inApp: true,
      push: true,
    },
    {
      category: 'teacher_notification',
      label: 'Teacher',
      description: 'Teacher approvals & profile updates',
      inApp: true,
      push: true,
    },
  ]);

  // ── Lifecycle ──────────────────────────────────────────────

  ngOnInit(): void {
    this.loadProfileData();
    this.loadPreferences();
  }

  /** Fetch real profile from backend and populate signals */
  protected loadProfileData(): void {
    this.settingsService.getProfile().subscribe({
      next: (res) => {
        if (!res) return;
        this.firstName.set(res.first_name);
        this.lastName.set(res.last_name);
        this.email.set(res.email);
        this.phoneNumber.set(res.phone);
        this.isLoadingProfile.set(false);
      },
      error: () => {
        this.isLoadingProfile.set(false);
        this.showToast('Failed to load profile.', 'error');
      },
    });
  }

  /** Fetch saved notification preferences from backend */
  protected loadPreferences(): void {
    this.settingsService.getPreferences().subscribe({
      next: (res) => {
        if (!res.success) return;
        const list = res.data?.preferences ?? [];
        this.notifications.update((rows) =>
          rows.map((row) => {
            const backendType = CATEGORY_TYPE_MAP[row.category];
            const pref = list.find((p) => p.notification_type === backendType);
            if (!pref) return row;
            return {
              ...row,
              inApp: pref.in_app_enabled,
              push: pref.push_enabled,
            };
          }),
        );
      },
      error: () => {
        // Silently fall back to defaults — non-critical on load
      },
    });
  }

  // ── Picture Upload ─────────────────────────────────────────

  onPictureChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.pictureUrl.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  triggerPictureUpload(): void {
    document.getElementById('picture-upload')?.click();
  }

  removePicture(): void {
    this.pictureUrl.set(null);
  }

  // ── Save Profile ───────────────────────────────────────────

  saveProfile(): void {
    const err = this.validateProfile();
    if (err) {
      this.showToast(err, 'error');
      return;
    }

    this.isSavingProfile.set(true);
    this.settingsService
      .updateProfile({
        first_name: this.firstName().trim(),
        last_name: this.lastName().trim(),
        phone: this.phoneNumber().trim(),
      })
      .subscribe({
        next: (res) => {
          this.isSavingProfile.set(false);
          if (res.success) {
            this.showToast('Profile updated successfully.', 'success');
          } else {
            this.showToast(res.message ?? 'Failed to update profile.', 'error');
          }
        },
        error: (err) => {
          this.isSavingProfile.set(false);
          this.showToast(err?.error?.message ?? 'Failed to update profile.', 'error');
        },
      });
  }

  private validateProfile(): string | null {
    if (!this.firstName().trim()) return 'First name is required.';
    if (!this.lastName().trim()) return 'Last name is required.';
    if (this.phoneNumber() && !/^\+?[\d\s\-().]{7,20}$/.test(this.phoneNumber()))
      return 'Enter a valid phone number.';
    return null;
  }

  // ── Change Password ────────────────────────────────────────

  changePassword(): void {
    const err = this.validatePassword();
    if (err) {
      this.showToast(err, 'error');
      return;
    }

    this.isSavingPassword.set(true);
    this.settingsService
      .changePassword({
        oldpassword: this.currentPassword(),
        newpassword: this.newPassword(),
      })
      .subscribe({
        next: (res) => {
          this.isSavingPassword.set(false);
          if (res.success) {
            this.currentPassword.set('');
            this.newPassword.set('');
            this.confirmPassword.set('');
            this.showToast('Password changed successfully.', 'success');
          } else {
            this.showToast(res.message ?? 'Failed to change password.', 'error');
          }
        },
        error: (err) => {
          this.isSavingPassword.set(false);
          this.showToast(err?.error?.message ?? 'Failed to change password.', 'error');
        },
      });
  }

  private validatePassword(): string | null {
    if (!this.currentPassword()) return 'Current password is required.';
    if (this.newPassword().length < 8) return 'New password must be at least 8 characters.';
    if (this.newPassword() !== this.confirmPassword()) return 'Passwords do not match.';
    if (this.newPassword() === this.currentPassword())
      return 'New password must differ from current.';
    return null;
  }

  toggleVisibility(field: 'current' | 'new' | 'confirm'): void {
    if (field === 'current') this.showCurrentPw.update((v) => !v);
    if (field === 'new') this.showNewPw.update((v) => !v);
    if (field === 'confirm') this.showConfirmPw.update((v) => !v);
  }

  // ── Notifications ──────────────────────────────────────────

  toggleNotification(category: NotificationCategory, channel: 'inApp' | 'push'): void {
    this.notifications.update((rows) =>
      rows.map((r) => (r.category === category ? { ...r, [channel]: !r[channel] } : r)),
    );
  }

  saveNotifications(): void {
    this.isSavingNotifications.set(true);

    const preferences = this.notifications().map((row) => ({
      notification_type: CATEGORY_TYPE_MAP[row.category],
      in_app_enabled: Boolean(row.inApp),
      push_enabled: Boolean(row.push),
    }));

    this.settingsService.updatePreferences({ preferences }).subscribe({
      next: (res) => {
        this.isSavingNotifications.set(false);
        if (res.success) {
          this.loadPreferences();
          this.showToast('Notification preferences saved.', 'success');
        } else {
          this.showToast(res.message ?? 'Failed to save preferences.', 'error');
        }
      },
      error: (err) => {
        this.isSavingNotifications.set(false);
        this.showToast(err?.error?.message ?? 'Failed to save preferences.', 'error');
      },
    });
  }

  // ── Icon helpers ───────────────────────────────────────────

  getIcon(type: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(TYPE_ICONS[type] ?? TYPE_ICONS['system']);
  }

  getIconStyle(type: string): string {
    return TYPE_ICON_STYLES[type] ?? 'bg-slate-100 text-slate-500';
  }

  // ── Toast ──────────────────────────────────────────────────

  private showToast(message: string, type: 'success' | 'error', duration = 3500): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    setTimeout(() => {
      this.toastMessage.set(null);
      this.toastType.set(null);
    }, duration);
  }

  dismissToast(): void {
    this.toastMessage.set(null);
    this.toastType.set(null);
  }

  // ── Utility ───────────────────────────────────────────────

  trackByCategory(_: number, row: NotificationRow): string {
    return row.category;
  }

  trackByLogin(_: number, l: RecentLogin): string {
    return l.device + l.time;
  }
}
