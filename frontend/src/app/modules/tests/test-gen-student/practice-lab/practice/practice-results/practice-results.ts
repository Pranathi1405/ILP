import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PracticeService } from '../../../../../../core/services/tests/practice-tests/practiceservice';

interface ResultSummary {
  total: number;
  attempted: number;
  correct: number;
  accuracy: number;
  timeTaken: string;
  testId: number;
  attemptId: number;
}

@Component({
  selector: 'app-practice-results',
  templateUrl: './practice-results.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PracticeResults implements OnInit {
  summary: ResultSummary | null = null;
  testId!: number;
  attemptId!: number;
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Try to get instant summary from router state (passed from practice attempt)
    this.testId = Number(this.route.snapshot.queryParamMap.get('testId'));
    this.attemptId = Number(this.route.snapshot.queryParamMap.get('attemptId'));

    // Read router state via history.state (replaces deprecated getCurrentNavigation)
    const state = history.state?.summary as ResultSummary | undefined;

    if (state) {
      this.summary = state;
      this.cdr.markForCheck();
    } else {
      // Fallback: build a minimal summary from query params
      // In production you could call service.getAttemptResult(attemptId) here
      this.summary = {
        total: 0,
        attempted: 0,
        correct: 0,
        accuracy: 0,
        timeTaken: '--:--',
        testId: this.testId,
        attemptId: this.attemptId,
      };
      this.cdr.markForCheck();
    }
  }

  get wrong(): number {
    return (this.summary?.attempted ?? 0) - (this.summary?.correct ?? 0);
  }

  get unattempted(): number {
    return (this.summary?.total ?? 0) - (this.summary?.attempted ?? 0);
  }

  get scorePercent(): number {
    if (!this.summary?.total) return 0;
    return Math.round((this.summary.correct / this.summary.total) * 100);
  }

  get grade(): { label: string; color: string } {
    const p = this.scorePercent;
    if (p >= 90) return { label: 'Excellent', color: 'text-emerald-600' };
    if (p >= 75) return { label: 'Good', color: 'text-teal-600' };
    if (p >= 50) return { label: 'Average', color: 'text-yellow-600' };
    return { label: 'Needs Work', color: 'text-red-600' };
  }

  retryTest(): void {
    this.router.navigate(['student/practice-builder']);
  }

  goHome(): void {
    this.router.navigate(['student/practice-home']);
  }
}
