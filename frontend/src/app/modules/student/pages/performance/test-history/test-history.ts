import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StudentPerformanceService } from '../../../../../core/services/student/student-performance.services';
import { RecentTestRow } from '../../../../../core/services/student/student-performance.data';

@Component({
  selector: 'app-test-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './test-history.html',
})
export class TestHistoryComponent implements OnInit {
  private performanceService = inject(StudentPerformanceService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  allTests: RecentTestRow[] = [];
  total = 0;
  isLoading = true;

  // Pagination
  currentPage = 1;
  pageSize = 10;

  // Filters
  selectedSubject = 'all';
  selectedMonth = '';
  showSubjectDropdown = false;

  subjectOptions = [
    { value: 'all', label: 'All Subjects' },
    { value: 'physics', label: 'Physics' },
    { value: 'chemistry', label: 'Chemistry' },
    { value: 'mathematics', label: 'Mathematics' },
  ];

  monthOptions = [
    { value: '', label: 'All Months' },
    { value: '2023-10', label: 'October 2023' },
    { value: '2023-09', label: 'September 2023' },
    { value: '2023-08', label: 'August 2023' },
  ];

  showMonthDropdown = false;

  private clickListener!: (event: Event) => void;

  ngOnInit(): void {
    this.loadTests();

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

  loadTests(): void {
    this.isLoading = true;
    const month = this.selectedMonth || undefined;
    this.performanceService
      .getTests(this.currentPage, this.pageSize, this.selectedSubject, month)
      .subscribe({
        next: ({ tests, total }) => {
          this.allTests = tests;
          this.total = total;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  get selectedSubjectLabel(): string {
    return this.subjectOptions.find((s) => s.value === this.selectedSubject)?.label ?? 'All Subjects';
  }

  get selectedMonthLabel(): string {
    return this.monthOptions.find((m) => m.value === this.selectedMonth)?.label ?? 'All Months';
  }

  get totalPages(): number {
    return Math.ceil(this.total / this.pageSize);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  selectSubject(value: string): void {
    this.selectedSubject = value;
    this.showSubjectDropdown = false;
    this.currentPage = 1;
    this.loadTests();
  }

  selectMonth(value: string): void {
    this.selectedMonth = value;
    this.showMonthDropdown = false;
    this.currentPage = 1;
    this.loadTests();
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadTests();
  }

  viewTestDetail(test: RecentTestRow): void {
    if (test?.attempt_id) {
      this.router.navigate(['/student/performance/test-detail', test.attempt_id]);
    }
  }

  goBack(): void {
    this.router.navigate(['/student/performance']);
  }
  get displayedUpTo(): number {
  return Math.min(this.currentPage * this.pageSize, this.total);
}
}