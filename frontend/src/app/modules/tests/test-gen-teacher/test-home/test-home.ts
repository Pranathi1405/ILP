// Author: E.Kaeith Emmanuel, Nd Matrix (Refactored - Best Practice)

import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { SmeTestService } from '../../../../core/services/tests/sme-tests/sme-test';

export interface StatCard {
  label: string;
  value: string;
  trend: number;
  iconClass: string;
  iconPath: string;
}

export interface TestRecord {
  id: number;
  name: string;
  subject: string;
  questions: number;
  dateDay: string;
  dateMonthYear: string;
  submitted: number;
  total: number;
  status: 'ACTIVE' | 'COMPLETED' | 'UPCOMING';
}

@Component({
  selector: 'app-sme-tests',
  standalone: true,
  imports: [CommonModule, NgClass],
  templateUrl: './test-home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestHome implements OnInit {
  constructor(
    private router: Router,
    private testService: SmeTestService,
    private cdr: ChangeDetectorRef,
  ) {}

  statCards: StatCard[] = [];
  recentTests: TestRecord[] = [];

  // ✅ MASTER DATA SOURCE (IMPORTANT)
  private allTests: any[] = [];

  activeMenu: number | null = null;

  ngOnInit(): void {
    this.fetchTests();
  }

  // ── FETCH DATA ─────────────────────────────────────────────────────
  fetchTests() {
    this.testService.getMyTests(1, 10).subscribe({
      next: (res: any) => {
        this.allTests = res.data || [];

        this.mapTests();
        this.buildStats();

        this.cdr.markForCheck();
      },
    });
  }

  // ── MAP BACKEND → UI ───────────────────────────────────────────────
  private mapTests() {
    this.recentTests = this.allTests.map((t: any) => {
      const start = new Date(t.scheduled_start);

      return {
        id: t.test_id,
        name: t.title,
        subject: t.exam_name,
        questions: t.total_questions,
        dateDay: start.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        dateMonthYear: start.getFullYear().toString(),
        submitted: 0,
        total: 0,
        status: this.getStatus(t),
      };
    });
  }

  // ── STATUS LOGIC ───────────────────────────────────────────────────
  getStatus(test: any): 'ACTIVE' | 'COMPLETED' | 'UPCOMING' {
    const now = new Date();
    const start = new Date(test.scheduled_start);
    const end = new Date(test.scheduled_end);

    if (now < start) return 'UPCOMING';
    if (now >= start && now <= end) return 'ACTIVE';
    return 'COMPLETED';
  }

  // ── BUILD STATS ────────────────────────────────────────────────────
  buildStats() {
    const tests = this.allTests;

    const totalTests = tests.length;

    const totalQuestions = tests.reduce((sum, t) => sum + (t.total_questions || 0), 0);

    const avgMarks = tests.reduce((sum, t) => sum + (t.total_marks || 0), 0) / (tests.length || 1);

    const avgDuration =
      tests.reduce((sum, t) => sum + (t.duration_minutes || 0), 0) / (tests.length || 1);

    this.statCards = [
      {
        label: 'Total Tests',
        value: totalTests.toString(),
        trend: 0,
        iconClass: 'icon-blue',
        iconPath: `<rect x="3" y="3" width="18" height="18" rx="3"/>`,
      },
      {
        label: 'Total Questions',
        value: totalQuestions.toString(),
        trend: 0,
        iconClass: 'icon-orange',
        iconPath: `<circle cx="12" cy="8" r="4"/>`,
      },
      {
        label: 'Avg Marks',
        value: avgMarks.toFixed(0),
        trend: 0,
        iconClass: 'icon-violet',
        iconPath: `<rect x="5" y="3" width="14" height="18" rx="2"/>`,
      },
      {
        label: 'Avg Duration',
        value: avgDuration.toFixed(0) + 'm',
        trend: 0,
        iconClass: 'icon-green',
        iconPath: `<circle cx="12" cy="12" r="9"/>`,
      },
    ];
  }

  // ── ACTIONS ────────────────────────────────────────────────────────
  toggleMenu(testId: number, event: MouseEvent) {
    event.stopPropagation();
    this.activeMenu = this.activeMenu === testId ? null : testId;
    this.cdr.markForCheck();
  }

  editTest(test: TestRecord) {
    this.activeMenu = null;
    this.router.navigate(['/teacher/sme-test/update', test.id]);
  }

  // ✅ DELETE ALLOWED ONLY FOR UPCOMING
  // After
  isDeletable(test: TestRecord): boolean {
    return test.status === 'UPCOMING' || test.status === 'COMPLETED';
  }
  // ── DELETE TEST ────────────────────────────────────────────────────
  deleteTest(test: TestRecord) {
    this.activeMenu = null;

    if (!this.isDeletable(test)) return;

    const confirmDelete = confirm(`Delete "${test.name}"?`);
    if (!confirmDelete) return;

    this.testService.deleteTest(test.id).subscribe({
      next: () => {
        // ✅ REMOVE FROM MASTER DATA
        this.allTests = this.allTests.filter((t) => t.test_id !== test.id);

        // ✅ REBUILD EVERYTHING
        this.mapTests();
        this.buildStats();

        this.cdr.markForCheck();
      },
    });
  }

  // ── PROGRESS ───────────────────────────────────────────────────────
  getProgress(test: TestRecord): number {
    return test.total ? Math.round((test.submitted / test.total) * 100) : 0;
  }

  getProgressClass(test: TestRecord): string {
    const pct = this.getProgress(test);
    if (pct >= 90) return 'prog-green';
    if (pct >= 60) return 'prog-amber';
    return 'prog-red';
  }

  // ── NAVIGATION ─────────────────────────────────────────────────────
  createNewTest(): void {
    this.router.navigate(['/teacher/sme-test/builder']);
  }

  viewAll(): void {
    this.router.navigate(['/tests']);
  }
}
