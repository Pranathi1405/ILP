import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { PracticeService } from '../../../../../core/services/tests/practice-tests/practiceservice';
import { PracticeTestListItem } from '../../../../../core/models/practice-test.model';

@Component({
  selector: 'app-previous-practice-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './previous-practice-list.html',
})
export class PreviousPracticeList implements OnInit, OnDestroy {
  tests: PracticeTestListItem[] = [];
  isLoading = false;
  errorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private practiceTestService: PracticeService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadTests();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTests(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.practiceTestService
      .getAllTests(1, 50)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          this.tests = Array.isArray(response?.data) ? response.data : [];
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage =
            err.error?.message || 'Failed to load test history. Please try again.';
          this.cdr.detectChanges();
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/student/practice-home']);
  }

  viewAnalysis(attemptId: number): void {
    this.router.navigate(['/student/practice-analysis', attemptId]);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  }

  getScore(test: PracticeTestListItem): string {
    return `${test.total_score ?? 0}/${test.total_marks ?? 0}`;
  }
}
