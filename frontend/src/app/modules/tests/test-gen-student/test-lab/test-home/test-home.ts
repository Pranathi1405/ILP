import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UgTestService } from '../../../../../core/services/tests/custom-tests/custom-test';
import { SmeTestService } from '../../../../../core/services/tests/sme-tests/sme-test';

@Component({
  selector: 'app-test-lab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './test-home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestHome implements OnInit {
  upcomingSmeTests: any[] = [];
  testHistory: any[] = [];

  loading = false;
  smeLoading = false;
  error = '';
  smeError = '';

  constructor(
    private router: Router,
    private ugTestService: UgTestService,
    private smeTestService: SmeTestService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadTests();
    this.loadSmeTests();
  }

  // ── Custom test history ────────────────────────────────────────
  loadTests() {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();

    this.ugTestService.getMyTests(1, 10).subscribe({
      next: (res) => {
        const allTests = res?.data ?? [];

        if (Array.isArray(allTests)) {
          const filtered = allTests.filter((t: any) => t.exam_type !== null && t.exam_type !== '');
          const sorted = filtered.sort(
            (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );
          this.testHistory = sorted.slice(0, 3).map((t: any) => ({
            ...t,
            attempt_id: t.attempt_id || t.id,
            total_score: Number(t.total_score ?? 0),
            total_marks: Number(t.total_marks ?? 0),
            accuracy_percent: Number(t.accuracy_percent ?? 0),
          }));
        } else {
          this.testHistory = [];
        }

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Failed to load tests';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── SME scheduled tests ────────────────────────────────────────
  loadSmeTests() {
    this.smeLoading = true;
    this.smeError = '';
    this.cdr.markForCheck();

    this.smeTestService.getPublishedTests(1, 20).subscribe({
      next: (res) => {
        const allTests: any[] = res?.data ?? [];
        const now = new Date();

        // Keep only tests within the scheduled window, sorted soonest first
        this.upcomingSmeTests = allTests
          .filter((t: any) => {
            const end = new Date(t.scheduled_end);
            return end >= now; // include ongoing + future
          })
          .sort(
            (a: any, b: any) =>
              new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime(),
          )
          .slice(0, 5)
          .map((t: any) => ({
            ...t,
            _status: this.resolveTestStatus(t),
          }));

        this.smeLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.smeError = 'Failed to load scheduled tests';
        this.smeLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Status resolution ──────────────────────────────────────────
  resolveTestStatus(test: any): 'ready' | 'locked' | 'ongoing' | 'submitted' {
    if (test.attempt_status === 'submitted') return 'submitted';
    const now = new Date();
    const start = new Date(test.scheduled_start);
    const end = new Date(test.scheduled_end);
    if (now >= start && now <= end) return 'ready';
    if (now > end) return 'submitted'; // expired
    return 'locked'; // not started yet
  }

  canStart(test: any): boolean {
    return test._status === 'ready';
  }

  // ── Navigation ─────────────────────────────────────────────────
  buildNow() {
    this.router.navigate(['/student/test-builder']);
  }

  viewAllTests() {
    this.router.navigate(['/student/previous-tests']);
  }

  startSmeTest(test: any) {
    if (this.canStart(test)) {
      this.router.navigate(['/student-test/sme-test-instructions', test.test_id]);
    }
  }

  viewAnalysis(test: any) {
    if (!test?.attempt_id) {
      console.error('Missing attempt_id', test);
      return;
    }

    this.router.navigate(['/student/test-analysis', test.attempt_id]);
  }

  // ── Formatters ─────────────────────────────────────────────────
  formatDate(date: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  formatSchedule(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' • ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    );
  }

  formatDuration(minutes: number): string {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
}
