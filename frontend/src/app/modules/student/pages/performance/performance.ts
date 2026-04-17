import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { Router } from '@angular/router';

import { StudentPerformanceService } from '../../../../core/services/student/student-performance.services';
import {
  RecentTestRow,
  ChartBarItem,
  recentTestsMock,
} from '../../../../core/services/student/student-performance.data';

@Component({
  selector: 'app-student-performance',
  standalone: true,
  imports: [CommonModule, NgClass],
  templateUrl: './performance.html',
})
export class StudentPerformanceComponent implements OnInit, OnDestroy {
  private performanceService = inject(StudentPerformanceService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  totalTestsAttempted = 0;
  accuracyPercent: number | string = 0;
  strongTopics: string[] = [];
  weakTopics: string[] = [];
  chartData: ChartBarItem[] = [];
  chartMax = 100;

  recentTests: RecentTestRow[] = [];
  totalTests = 0;

  selectedSubject = 'all';
  selectedMonth = '';

  subjectOptions = [
    { value: 'all', label: 'All Subjects' },
    { value: 'physics', label: 'Physics' },
    { value: 'chemistry', label: 'Chemistry' },
    { value: 'mathematics', label: 'Mathematics' },
  ];

  monthOptions = [
    { value: '2023-10', label: 'October 2023' },
    { value: '2023-09', label: 'September 2023' },
    { value: '2023-08', label: 'August 2023' },
  ];

  showSubjectDropdown = false;
  showMonthDropdown = false;
  isLoading = true;

  private clickListener!: (event: Event) => void;

  ngOnInit(): void {
    this.loadOverview();
    this.loadTopicMastery();
    this.loadScoreTrend();
    this.loadRecentTests();

    this.clickListener = (event: Event) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        this.showSubjectDropdown = false;
        this.showMonthDropdown = false;
        this.cdr.detectChanges();
      }
    };
    document.addEventListener('click', this.clickListener);
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.clickListener);
  }

  /** Normalises status regardless of API casing/spacing */
  isAttempted(status: string | undefined): boolean {
    return (status ?? '').trim().toUpperCase() === 'ATTEMPTED';
  }

  loadOverview(): void {
    this.performanceService.getOverview().subscribe({
      next: (data) => {
        this.totalTestsAttempted = data?.tests_attempted ?? 0;
        this.accuracyPercent = data?.average_test_score ?? '0';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadTopicMastery(): void {
    this.performanceService.getTopicMastery().subscribe({
      next: (data) => {
        this.strongTopics = data?.strong ?? [];
        this.weakTopics = data?.weak ?? [];
        this.cdr.detectChanges();
      },
    });
  }

  loadScoreTrend(): void {
    this.performanceService.getScoreTrend().subscribe({
      next: (data) => {
        this.chartData = data ?? [];
        this.chartMax = data?.length ? Math.max(...data.map((d) => d.value), 100) : 100;
        this.cdr.detectChanges();
      },
    });
  }

  loadRecentTests(): void {
    const month = this.selectedMonth || undefined;
    this.performanceService.getTests(1, 3, this.selectedSubject, month).subscribe({
      next: ({ tests, total }) => {
        console.log('[Performance] getTests raw response — total:', total, 'tests:', tests);

        // If API returned no rows, fall back to mock so UI is visible during dev
        if (tests.length === 0) {
          console.warn('[Performance] No tests from API — using mock data for UI preview');
          this.recentTests = recentTestsMock;
          this.totalTests = recentTestsMock.length;
        } else {
          this.recentTests = tests;
          this.totalTests = total;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[Performance] getTests error:', err);
        // Fall back to mock on error too
        this.recentTests = recentTestsMock;
        this.totalTests = recentTestsMock.length;
        this.cdr.detectChanges();
      },
    });
  }

  getBarHeight(value: number): number {
    if (!this.chartMax) return 0;
    return Math.round((value / this.chartMax) * 100);
  }

  get selectedSubjectLabel(): string {
    return (
      this.subjectOptions.find((s) => s.value === this.selectedSubject)?.label ?? 'All Subjects'
    );
  }

  get selectedMonthLabel(): string {
    return this.monthOptions.find((m) => m.value === this.selectedMonth)?.label ?? 'October 2023';
  }

  selectSubject(value: string): void {
    this.selectedSubject = value;
    this.showSubjectDropdown = false;
    this.loadRecentTests();
  }

  selectMonth(value: string): void {
    this.selectedMonth = value;
    this.showMonthDropdown = false;
    this.loadRecentTests();
  }

  viewTestDetail(test: RecentTestRow): void {
    console.log('[Performance] viewTestDetail clicked — test:', test);
    if (test?.attempt_id) {
      this.router.navigate(['/student/performance/test-detail', test.attempt_id]);
    } else {
      console.warn('[Performance] No attempt_id on test — cannot navigate:', test);
    }
  }

  viewAllHistory(): void {
    this.router.navigate(['/student/performance/history']);
  }
}
