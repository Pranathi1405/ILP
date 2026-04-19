// dashboard.ts
// Author: pranathi
// Parent Dashboard — Child Overview page.
// Exported as `Dashboard` to match parent.routes.ts: (m) => m.Dashboard

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, timeout } from 'rxjs/operators';

import { ParentDashboardService } from '../../../../core/services/parent/parent-dashboard.service';
import {
  LinkedStudent,
  DashboardData,
  LatestTest,
  CourseItem,
  ScoreTrendItem,
  mockCoursesData,
} from '../../../../core/services/parent/parent-dashboard.data';

// Auth user shape from APP_INITIALIZER token refresh response
interface AuthUser {
  user_id: number;
  email: string;
  userType: string;
  firstName: string;
  lastName: string;
}

@Component({
  selector: 'app-parent-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterLink],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isLoading = false;
  errorMessage = '';

  linkedStudents: LinkedStudent[] = [];
  selectedStudent!: LinkedStudent;
  selectedStudentGrade = '12';
  dashboardData: DashboardData | null = null;
  latestTest: LatestTest | null = null;
  scoreTrend: ScoreTrendItem[] = [];

  courses: CourseItem[] = mockCoursesData;

  // parentId resolved from the auth token stored by APP_INITIALIZER
  private get parentId(): number {
    try {
      // APP_INITIALIZER stores user in localStorage as 'user' or 'currentUser'
      // From console log: {user_id: 24, email: 'parent100@gmail.com', userType: 'parent'}
      const raw =
        localStorage.getItem('user') ||
        localStorage.getItem('currentUser') ||
        sessionStorage.getItem('user') ||
        '{}';
      const user: AuthUser = JSON.parse(raw);
      return user?.user_id ?? 0;
    } catch {
      return 0;
    }
  }

  constructor(
    private dashboardService: ParentDashboardService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadLinkedStudents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Load Linked Students ────────────────────────────────────────────────

  loadLinkedStudents(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.dashboardService
      .getLinkedStudents()
      .pipe(takeUntil(this.destroy$), timeout(10000))
      .subscribe({
        next: (res) => {
          console.log('[Dashboard] getLinkedStudents:', res);
          if (res?.success && res?.data?.students?.length) {
            this.linkedStudents = res.data.students;
            const primary = this.linkedStudents.find((s) => s.is_primary);
            this.selectedStudent = primary ?? this.linkedStudents[0];
            this.loadDashboard();
          } else {
            this.isLoading = false;
            this.errorMessage = 'No linked students found.';
            this.cdr.markForCheck();
          }
        },
        error: (err) => {
          console.error('[Dashboard] getLinkedStudents error:', err);
          this.isLoading = false;
          this.errorMessage = `Error ${err?.status ?? ''}: ${err?.statusText ?? 'Could not reach server'}`;
          this.cdr.markForCheck();
        },
      });
  }

  // ── Child Selector Change ───────────────────────────────────────────────

  onStudentChange(event: Event): void {
    const studentId = Number((event.target as HTMLSelectElement).value);
    const student = this.linkedStudents.find((s) => s.student_id === studentId);
    if (student) {
      this.selectedStudent = student;
      this.loadDashboard();
    }
  }

  // ── Load Dashboard (analytics + latest test) ────────────────────────────

  loadDashboard(): void {
    if (!this.selectedStudent) return;

    this.isLoading = true;
    this.dashboardData = null;
    this.latestTest = null;
    this.scoreTrend = [];

    Promise.all([
      this.fetchDashboardAnalytics(this.selectedStudent.student_id),
      this.fetchLatestTest(),
    ]).then(() => {
      this.isLoading = false;
      this.cdr.markForCheck(); // fix NG0100 — trigger detection after all data is set
    });
  }

  // ── GET analytics/parent/dashboard?studentId=X ──────────────────────────

  private fetchDashboardAnalytics(studentId: number): Promise<void> {
    return new Promise((resolve) => {
      this.dashboardService
        .getDashboardAnalytics(studentId)
        .pipe(takeUntil(this.destroy$), timeout(10000))
        .subscribe({
          next: (res) => {
            console.log('[Dashboard] getDashboardAnalytics:', res);
            if (res?.success && res?.data) {
              this.dashboardData = res.data;
              this.selectedStudentGrade = this.selectedStudent?.grade ?? '12';
              // Fix: score_trend may be an object keyed by subject — normalise to array
              const raw = res.data.score_trend;
              if (Array.isArray(raw)) {
                this.scoreTrend = raw;
              } else if (raw && typeof raw === 'object') {
                this.scoreTrend = Object.entries(raw).map(([subject, avgScore]) => ({
                  subject,
                  avgScore: Number(avgScore),
                }));
              } else {
                this.scoreTrend = [];
              }
            }
            resolve();
          },
          error: (err) => {
            console.error('[Dashboard] getDashboardAnalytics error:', err);
            resolve();
          },
        });
    });
  }

  // ── GET v1/parent/{parentId}/tests ──────────────────────────────────────

  private fetchLatestTest(): Promise<void> {
    const pid = this.parentId;
    if (!pid) {
      console.warn('[Dashboard] parentId not found in storage — skipping tests API');
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.dashboardService
        .getParentTests(pid, 1, 1)
        .pipe(takeUntil(this.destroy$), timeout(10000))
        .subscribe({
          next: (res) => {
            console.log('[Dashboard] getParentTests:', res);
            if (res?.tests?.length) {
              const t = res.tests[0];
              this.latestTest = {
                testName: t.testName,
                score: t.score,
                totalMarks: t.totalMarks,
                subject: t.subject,
                date: t.date,
              };
            }
            resolve();
          },
          error: (err) => {
            console.error('[Dashboard] getParentTests error:', err);
            resolve(); // non-critical
          },
        });
    });
  }
}