import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  SharedSettingsService,
  ProfileData,
  ChangePasswordForm,
  NotificationPreference,
  LinkedChild,
} from './shared-settings.service';

const ROLE_NOTIFICATION_ORDER: Record<string, string[]> = {
  student: ['live_class', 'test', 'announcement', 'course'],
  teacher: ['doubt', 'announcement'],
  parent: ['test_score', 'attendance', 'performance', 'parent_announcement'],
};

//  DECORATOR (JUST ABOVE CLASS)
@Component({
  selector: 'app-shared-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.css'],
})

// CLASS
export class SharedSettingsComponent implements OnInit {
  private service = inject(SharedSettingsService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  // ROLE
  role: 'student' | 'teacher' | 'parent' = 'student';

  get isParent() {
    return this.role === 'parent';
  }
  get isStudent() {
    return this.role === 'student';
  }

  prefLabels: Record<string, { title: string; subtitle: string }> = {
    // ===== STUDENT =====
    live_class: {
      title: 'Live Class Reminders',
      subtitle: 'Get notified 15 minutes before your live classes start.',
    },
    test: {
      title: 'Test/Quiz Reminders',
      subtitle: 'Receive alerts for upcoming quizzes and assignments.',
    },
    announcement: {
      title: 'Course Announcements',
      subtitle: 'Important updates from your course instructors.',
    },
    course: {
      title: 'Result Notifications',
      subtitle: 'Instant notification when your test results are published.',
    },

    // ===== TEACHER =====
    doubt: {
      title: 'Doubt/Question Notifications',
      subtitle: 'Immediate alerts for student queries in the forums.',
    },

    // ===== PARENT  =====
    test_score: {
      title: 'Test Score Notifications',
      subtitle: 'Get notified as soon as a test result is published.',
    },
    attendance: {
      title: 'Attendance Alerts',
      subtitle: 'Real-time alerts if your child is marked absent or late.',
    },
    performance: {
      title: 'Low Performance Alerts',
      subtitle: "Get warnings if child's performance drops below 60%.",
    },
    parent_announcement: {
      title: 'Announcement Notifications',
      subtitle: 'School-wide news and event announcements.',
    },
  };

  // PROFILE
  profile: ProfileData = {
    firstname: '',
    lastname: '',
    email: '',
    phone: '',
    stu_id: '',
  };
  profileLoading = false;
  profileSaving = false;
  profileSuccess = '';
  profileError = '';

  // PASSWORD
  passwordForm: ChangePasswordForm = {
    oldpassword: '',
    newpassword: '',
    confirmPassword: '',
  };
  showChangePassword = false;
  passwordSaving = false;
  passwordSuccess = '';
  passwordError = '';

  // NOTIFICATIONS
  preferences: NotificationPreference[] = [];
  prefsLoading = false;
  prefsError = '';
  prefsSavingIndex: number | null = null;

  // CHILDREN
  children: LinkedChild[] = [];
  childrenLoading = false;
  linkCode = '';
  childSaving = false;
  childSuccess = '';
  childError = '';

  // ================= INIT =================
  ngOnInit(): void {
    const url = this.router.url;

    if (url.includes('teacher')) this.role = 'teacher';
    else if (url.includes('parent')) this.role = 'parent';

    this.loadProfile();
    this.loadPreferences();

    if (this.isParent) {
      this.loadChildren();
    }
  }

  // ================= PROFILE =================
  loadProfile() {
    this.profileLoading = true;

    this.service.getProfile().subscribe({
      next: (res) => {
        this.profile = res;
        this.profileLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.profileError = 'Failed to load profile';
        this.profileLoading = false;
      },
    });
  }

  saveProfile() {
    this.profileSaving = true;

    this.service.updateProfile(this.profile).subscribe({
      next: () => {
        this.profileSuccess = 'Saved successfully';
        this.profileSaving = false;
      },
      error: () => {
        this.profileError = 'Save failed';
        this.profileSaving = false;
      },
    });
  }

  // ================= PASSWORD =================
  toggleChangePassword() {
    this.showChangePassword = !this.showChangePassword;
  }

  updatePassword() {
    this.passwordSaving = true;

    this.service.changePassword(this.passwordForm).subscribe({
      next: () => {
        this.passwordSuccess = 'Password updated';
        this.passwordSaving = false;
      },
      error: () => {
        this.passwordError = 'Update failed';
        this.passwordSaving = false;
      },
    });
  }

  // ================= NOTIFICATIONS =================
  loadPreferences() {
    this.prefsLoading = true;

    this.service.getNotificationPreferences().subscribe({
      next: (res) => {
        let mapped = res;

        // ✅ Parent mapping (keep as it is)
        if (this.role === 'parent') {
          mapped = res.map((p) => {
            switch (p.notification_type) {
              case 'test':
                return { ...p, notification_type: 'test_score' };
              case 'achievement':
                return { ...p, notification_type: 'performance' };
              case 'live_class':
                return { ...p, notification_type: 'attendance' };
              case 'announcement':
                return { ...p, notification_type: 'parent_announcement' };
              default:
                return p;
            }
          });
        }

        const allowedTypes = ROLE_NOTIFICATION_ORDER[this.role] || [];
        const order = ROLE_NOTIFICATION_ORDER[this.role] || [];

        // ✅ FILTER
        let filtered = mapped.filter((p) => allowedTypes.includes(p.notification_type));

        // ✅ SORT (THIS FIXES YOUR ISSUE)
        filtered.sort(
          (a, b) => order.indexOf(a.notification_type) - order.indexOf(b.notification_type),
        );

        this.preferences = filtered;

        this.prefsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.prefsError = 'Failed to load';
        this.prefsLoading = false;
      },
    });
  }
  togglePreference(index: number, field: 'in_app_enabled' | 'push_enabled') {
    const pref = this.preferences[index];
    (pref as any)[field] = !(pref as any)[field];

    this.prefsSavingIndex = index;

    this.service
      .updateNotificationPreference(pref.notification_type, pref.in_app_enabled, pref.push_enabled)
      .subscribe({
        next: () => (this.prefsSavingIndex = null),
        error: () => (this.prefsSavingIndex = null),
      });
  }

  // ================= CHILD =================
  loadChildren() {
    this.childrenLoading = true;

    this.service.getChildren().subscribe({
      next: (res) => {
        this.children = res;
        this.childrenLoading = false;
      },
      error: () => {
        this.childrenLoading = false;
      },
    });
  }

  addChild() {
    if (!this.linkCode.trim()) return;

    this.childSaving = true;

    this.service.addNewChild(this.linkCode).subscribe({
      next: () => {
        this.childSuccess = 'Child added';
        this.linkCode = '';
        this.childSaving = false;
        this.loadChildren();
      },
      error: () => {
        this.childError = 'Failed';
        this.childSaving = false;
      },
    });
  }
}
