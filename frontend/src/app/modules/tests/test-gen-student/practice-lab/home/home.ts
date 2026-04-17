// Author: E.Kaeith Emmanuel
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { PracticeService } from '../../../../../core/services/tests/practice-tests/practiceservice';
import { PracticeTestListItem } from '../../../../../core/models/practice-test.model';

@Component({
  selector: 'app-practice-lab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
})
export class Home implements OnInit, OnDestroy {
  topTests: PracticeTestListItem[] = [];
  isLoading = false;
  errorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private practiceTestService: PracticeService,
    private cdr: ChangeDetectorRef, // ✅ added
  ) {}

  ngOnInit(): void {
    this.loadTopTests();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTopTests(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck(); // ✅ trigger UI update immediately

    this.practiceTestService
      .getAllTests(1, 3)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges(); // ✅ ensure UI refresh after API
        }),
      )
      .subscribe({
        next: (response) => {
          //console.log('API response:', response);

          if (!response || !Array.isArray(response.data)) {
            this.topTests = [];
          } else {
            this.topTests = response.data;
          }

          this.cdr.detectChanges(); // ✅ update UI instantly with data
        },
        error: (err) => {
          console.error('API error:', err);
          this.errorMessage = 'Failed to load test history. Please try again.';

          this.cdr.detectChanges(); // ✅ update UI instantly on error
        },
      });
  }

  buildNow(): void {
    this.router.navigate(['/student/practice-builder']);
  }
  viewAllTests(): void {
    this.router.navigate(['/student/previous-practice-tests']);
  }

  viewAnalysis(attemptId: number): void {
    console.log('Navigating with attemptId:', attemptId); // 👈 debug
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
