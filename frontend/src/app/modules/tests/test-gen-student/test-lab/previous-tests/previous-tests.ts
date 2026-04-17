import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UgTestService } from '../../../../../core/services/tests/custom-tests/custom-test';

@Component({
  selector: 'app-previous-tests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './previous-tests.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviousTests implements OnInit {
  testHistory: any[] = [];
  loading = false;
  error = '';

  constructor(
    private router: Router,
    private ugTestService: UgTestService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadTests();
  }

  loadTests(): void {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();

    this.ugTestService.getMyTests(1, 50).subscribe({
      next: (res) => {
        const allTests = res?.data ?? [];

        if (Array.isArray(allTests)) {
          const filtered = allTests.filter((t: any) => t.exam_type !== null && t.exam_type !== '');
          const sorted = filtered.sort(
            (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );

          this.testHistory = sorted.map((t: any) => ({
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

  goBack(): void {
    this.router.navigate(['/student/test-home']);
  }

  viewAnalysis(test: any): void {
    if (!test?.attempt_id) {
      return;
    }

    this.router.navigate(['/student/test-analysis', test.attempt_id]);
  }

  formatDate(date: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}
