import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { StudentPerformanceService } from '../../../../../core/services/student/student-performance.services';
import {
  TestDetailResponse,
  QuestionItem,
} from '../../../../../core/services/student/student-performance.data';

@Component({
  selector: 'app-test-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './test-detail.html',
})
export class TestDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private performanceService = inject(StudentPerformanceService);
  private cdr = inject(ChangeDetectorRef);

  // The route param is :id which maps to testId (from /v1/student/{studentId}/tests/{testId})
  testId: number | null = null;

  testDetail: TestDetailResponse | null = null;
  loading = true;
  error: string | null = null;

  currentPage = 1;
  pageSize = 2;
  showAll = false;

  scorePercent = 0;

  // SVG donut chart — circumference of circle r=45: 2π×45 ≈ 283
  readonly totalCircumference = 283;
  correctDash = 0;
  wrongDash = 0;
  notAttemptedDash = 0;
  correctOffset = 0;
  wrongOffset = 0;
  notAttemptedOffset = 0;

  // Comparison analytics (static per Figma — wire up if API provides these)
  classAvg = '68';
  topperScore = '95';
  studentVsClassPercent = 81;
  studentVsTopperPercent = 81;
  classAvgPercent = 68;
  topperAvgPercent = 95;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    console.log('TestDetailComponent — route param id:', idParam);

    this.testId = idParam ? Number(idParam) : null;

    if (this.testId && !isNaN(this.testId)) {
      this.loadTestDetail();
    } else {
      console.error('Invalid test id in route');
      this.loading = false;
      this.error = 'Invalid attempt ID';
      this.cdr.detectChanges();
    }
  }

  loadTestDetail(): void {
    this.loading = true;
    this.error = null;
    console.log('Calling getTestDetail with testId:', this.testId);

    this.performanceService.getTestDetail(this.testId!).subscribe({
      next: (data) => {
        if (!data) {
          this.error = 'Failed to load test details. Please try again.';
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }
        this.testDetail = data;
        this.computeDerivedValues();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Test detail error:', err);
        this.error = 'Failed to load test details. Please try again.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  computeDerivedValues(): void {
    if (!this.testDetail) return;

    const total = this.testDetail.totalQuestions || 1;
    this.scorePercent = Math.round((this.testDetail.score / this.testDetail.totalMarks) * 100);

    const c = this.totalCircumference;
    this.correctDash = (this.testDetail.pieChart.correct / total) * c;
    this.wrongDash = (this.testDetail.pieChart.wrong / total) * c;
    this.notAttemptedDash = (this.testDetail.pieChart.notAttempted / total) * c;

    // Offsets: each segment starts where the previous ends (SVG stroke-dashoffset = negative start)
    this.correctOffset = 0;
    this.wrongOffset = -this.correctDash;
    this.notAttemptedOffset = -(this.correctDash + this.wrongDash);

    // Comparison analytics — use scorePercent as student score
    this.studentVsClassPercent = this.scorePercent;
    this.studentVsTopperPercent = this.scorePercent;
  }

  get paginatedQuestions(): QuestionItem[] {
    if (!this.testDetail) return [];
    if (this.showAll) return this.testDetail.questions;
    const start = (this.currentPage - 1) * this.pageSize;
    return this.testDetail.questions.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    if (!this.testDetail) return [];
    const total = Math.ceil(this.testDetail.questions.length / this.pageSize);
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.showAll = false;
  }

  toggleShowAll(): void {
    this.showAll = !this.showAll;
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  formatSeconds(seconds: number): string {
    if (!seconds) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  goBack(): void {
    this.router.navigate(['/student/performance']);
  }
}
