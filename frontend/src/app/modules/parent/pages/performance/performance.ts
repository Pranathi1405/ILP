import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { takeUntil, finalize, catchError } from 'rxjs/operators';
import { ParentPerformanceService } from '../../../../core/services/parent/parent-performance.service';
import {
  LinkedStudent,
  ParentDashboardData,
  SubjectProficiencyUI,
  SUBJECT_COLORS,
  TestDetailResponse,
  ChildOverviewResponse,
  ParentTestItem,
  DateFilterOption,
  PerformanceGraphResponse,
} from '../../../../core/services/parent/parent-performance.data';

@Component({
  selector: 'app-performance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './performance.html',
})
export class PerformanceComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ── Auth ─────────────────────────────────────────────────────
  parentId!: number;

  // ── Page routing ─────────────────────────────────────────────
  // 'list' = Page 1 (/parent/performance)
  // 'detail' = Page 2 (/parent/performance/123)
  activePage: 'list' | 'detail' = 'list';

  // ── Page 1 state ─────────────────────────────────────────────
  isLoadingPage1 = false;
  page1Error = '';

  students: LinkedStudent[] = [];
  selectedStudent: LinkedStudent | null = null;

  dashboardData: ParentDashboardData | null = null;
  subjectProficiency: SubjectProficiencyUI[] = [];
  strongTopics: string[] = [];
  weakTopics: string[] = [];
  recentTests: ParentTestItem[] = [];

  selectedSubject = 'All';
  selectedDateFilter: DateFilterOption = 'Last 30 Days';
  dateFilterOptions: DateFilterOption[] = ['Last 7 Days', 'Last 30 Days', 'Last 3 Months', 'All Time'];
  subjectOptions: string[] = ['All', 'Physics', 'Chemistry', 'Mathematics', 'Biology'];

  currentPage = 1;
  totalTests = 0;
  pageSize = 10;

  // ── Page 2 state ─────────────────────────────────────────────
  isLoadingPage2 = false;
  page2Error = '';

  selectedTestId: number | null = null;
  testDetail: TestDetailResponse | null = null;
  childOverview: ChildOverviewResponse | null = null;
  chartLabels: string[] = [];
  chartScores: number[] = [];

  constructor(
    private performanceService: ParentPerformanceService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // ── Get parentId ─────────────────────────────────────────
    try {
      const keys = ['user', 'currentUser', 'authUser', 'userData', 'auth'];
      for (const key of keys) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const obj = JSON.parse(raw);
          const u = obj.user || obj;
          const id = u.user_id || u.id || u.parentId || u.userId;
          if (id) { this.parentId = Number(id); break; }
        }
      }
      if (!this.parentId) {
        const direct = localStorage.getItem('user_id') || localStorage.getItem('parentId');
        if (direct) this.parentId = Number(direct);
      }
    } catch { this.parentId = 0; }

    // ── Check if URL has a testId (deep link to Page 2) ──────
    // e.g. /parent/performance/101  → opens Page 2 directly
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const testId = params['testId'] ? Number(params['testId']) : null;
      if (testId) {
        this.activePage = 'detail';
        this.selectedTestId = testId;
        this.loadPage2Data(testId);
      } else {
        this.activePage = 'list';
      }
    });

    if (!this.parentId) {
      this.page1Error = 'Could not determine parent ID. Please log in again.';
      return;
    }

    this.isLoadingPage1 = false;
    this.loadLinkedStudents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Page 1 ───────────────────────────────────────────────────

  loadLinkedStudents(): void {
    this.isLoadingPage1 = false;
    this.page1Error = '';

    this.performanceService
      .getLinkedStudents()
      .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
      .subscribe((res) => {
        this.students = res?.data?.students || [];
        if (this.students.length > 0) {
          const primary = this.students.find((s) => s.is_primary) || this.students[0];
          if (!this.selectedStudent || this.selectedStudent.student_id !== primary.student_id) {
            this.selectStudent(primary);
          }
        }
      });
  }

  selectStudent(student: LinkedStudent): void {
    this.selectedStudent = student;
    this.loadPage1Data(student.student_id);
  }

  onStudentChange(event: Event): void {
    const idx = Number((event.target as HTMLSelectElement).value);
    const student = this.students[idx];
    if (student) this.selectStudent(student);
  }

  loadPage1Data(studentId: number): void {
    // ── 1. Dashboard ─────────────────────────────────────────
    this.performanceService
      .getParentDashboard(studentId)
      .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
      .subscribe((res) => {
        if (res?.data) {
          this.dashboardData = res.data;
          this.buildTopicMastery(res.data);
        }
      });

    // ── 2. Subject proficiency graph ─────────────────────────
    this.performanceService
      .getPerformanceGraph(this.parentId)
      .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
      .subscribe((res) => {
        if (res?.data) this.buildSubjectProficiency(res);
      });

    // ── 3. Tests list ────────────────────────────────────────
    this.performanceService
      .getParentTests(this.parentId)
      .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
      .subscribe((res) => {
        if (res) {
          this.recentTests = res.tests || [];
          this.totalTests = res.total || 0;
        }
      });
  }

  buildSubjectProficiency(graph: PerformanceGraphResponse): void {
    this.subjectProficiency = (graph.data || []).map((item) => ({
      name: item.subject,
      score: Math.round(item.avgScore),
      color: SUBJECT_COLORS[item.subject] || SUBJECT_COLORS['default'],
    }));
  }

  buildTopicMastery(data: ParentDashboardData): void {
    this.strongTopics = (data.topic_mastery?.strong || [])
      .map((t) => t.topic_name || t.subject_title || t.name || '').filter(Boolean);
    this.weakTopics = (data.topic_mastery?.weak || [])
      .map((t) => t.topic_name || t.subject_title || t.name || '').filter(Boolean);
  }

  onSubjectChange(event: Event): void {
    this.selectedSubject = (event.target as HTMLSelectElement).value;
    this.currentPage = 1;
    this.loadFilteredTests();
  }

  onDateChange(event: Event): void {
    this.selectedDateFilter = (event.target as HTMLSelectElement).value as DateFilterOption;
    this.currentPage = 1;
    this.loadFilteredTests();
  }

  loadFilteredTests(): void {
    const subject = this.selectedSubject !== 'All' ? this.selectedSubject : undefined;
    this.performanceService
      .getParentTests(this.parentId, this.currentPage, this.pageSize, subject)
      .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
      .subscribe((res) => {
        if (res) {
          this.recentTests = res.tests || [];
          this.totalTests = res.total || 0;
        }
      });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadFilteredTests();
  }

  // ── Navigation ────────────────────────────────────────────────

  /**
   * Called when eye icon is clicked on a test row.
   * URL changes to /parent/performance/123 — browser back button works.
   */
  viewTestDetail(testId: number): void {
    // URL becomes: /parent/performance/test/101
    this.router.navigate(['test', testId], { relativeTo: this.route });
  }

  previewPage2(): void {
    // DEV HELPER — remove once tests API works
    // URL becomes: /parent/performance/test/101
    this.router.navigate(['test', 101], { relativeTo: this.route });
  }

  goBackToList(): void {
    // URL goes back to: /parent/performance
    this.router.navigate(['../../'], { relativeTo: this.route });
    this.testDetail = null;
    this.selectedTestId = null;
    this.chartLabels = [];
    this.chartScores = [];
  }

  // ── Page 2 ───────────────────────────────────────────────────

  loadPage2Data(testId: number): void {
    this.isLoadingPage2 = true;
    this.page2Error = '';
    this.testDetail = null;

    // ── Test detail ──────────────────────────────────────────
    this.performanceService
      .getTestDetail(this.parentId, testId)
      .pipe(
        catchError(() => of(null)),
        takeUntil(this.destroy$),
        finalize(() => (this.isLoadingPage2 = false))
      )
      .subscribe((detail) => {
        if (detail) {
          this.testDetail = detail;
        } else {
          // API returned 403 or failed — load mock data so UI is visible
          // Remove this mock block once the API is working
          this.testDetail = this.getMockTestDetail(testId);
          this.page2Error = '';
        }
      });

    // ── Score trend (child overview) ─────────────────────────
    this.performanceService
      .getChildOverview(this.parentId, this.selectedStudent?.student_id)
      .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
      .subscribe((overview) => {
        if (overview) {
          const last7 = overview.scoreGraph?.last7Tests || [];
          this.chartLabels = last7.map((t) => t.testName);
          this.chartScores = last7.map((t) => t.score);
        } else {
          // Mock chart data so the trend graph is visible
          // Remove once API is working
          this.chartLabels = ['Test 1', 'Test 2', 'Test 3', 'Test 4', 'Test 5'];
          this.chartScores = [62, 71, 68, 80, 92];
        }
      });
  }

  /**
   * Mock test detail — shown when API returns 403.
   * Matches the exact shape of TestDetailResponse so the UI renders fully.
   * Remove getMockTestDetail() once the real API is working.
   */
  private getMockTestDetail(testId: number): TestDetailResponse {
    return {
      testId,
      testName: 'Advanced Calculus — Mock Preview',
      subject: 'Advanced Calculus',
      totalQuestions: 50,
      attemptedQuestions: 48,
      score: 46,
      totalMarks: 50,
      timeAllotted: 3600,   // 60 mins in seconds
      timeSpent: 2535,      // 42:15 in seconds
      pieChart: {
        correct: 41,
        wrong: 7,
        notAttempted: 2,
      },
      questions: [],
    };
  }

  // ── Helpers ──────────────────────────────────────────────────

  getScorePercent(): number {
    if (!this.testDetail) return 0;
    return Math.round((this.testDetail.score / this.testDetail.totalMarks) * 100);
  }

  formatTime(seconds: number): string {
    return this.performanceService.formatTime(seconds);
  }

  formatMinutes(seconds: number): string {
    return this.performanceService.formatMinutes(seconds);
  }

  getProgressWidth(score: number): string {
    return `${Math.min(Math.max(score, 0), 100)}%`;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  padNumber(n: number): string {
    return n.toString().padStart(2, '0');
  }

  get totalPages(): number {
    return Math.ceil(this.totalTests / this.pageSize);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get correctPercent(): number {
    if (!this.testDetail) return 0;
    return Math.round((this.testDetail.pieChart.correct / this.testDetail.totalQuestions) * 100);
  }

  get wrongPercent(): number {
    if (!this.testDetail) return 0;
    return Math.round((this.testDetail.pieChart.wrong / this.testDetail.totalQuestions) * 100);
  }

  get notAttemptedPercent(): number {
    if (!this.testDetail) return 0;
    return Math.round((this.testDetail.pieChart.notAttempted / this.testDetail.totalQuestions) * 100);
  }

  getDonutDashArray(percent: number): string {
    const c = 2 * Math.PI * 45;
    return `${(percent / 100) * c} ${c}`;
  }

  getDonutDashOffset(prevPercents: number[]): string {
    const c = 2 * Math.PI * 45;
    const total = prevPercents.reduce((a, b) => a + b, 0);
    return `${c - (total / 100) * c}`;
  }

  get studentName(): string {
    return this.selectedStudent
      ? `${this.selectedStudent.first_name} ${this.selectedStudent.last_name}`
      : '';
  }

  // ── SVG Line Chart ────────────────────────────────────────────
  private readonly CX_START = 30;
  private readonly CX_END = 380;
  private readonly CY_BOTTOM = 130;
  private readonly CY_TOP = 20;

  getChartX(index: number): number {
    const n = this.chartScores.length;
    if (n <= 1) return (this.CX_START + this.CX_END) / 2;
    return this.CX_START + (index / (n - 1)) * (this.CX_END - this.CX_START);
  }

  getChartY(score: number): number {
    const clamped = Math.min(Math.max(score, 0), 100);
    return this.CY_BOTTOM - ((clamped - 40) / 60) * (this.CY_BOTTOM - this.CY_TOP);
  }

  buildLinePoints(): string {
    return this.chartScores.map((s, i) => `${this.getChartX(i)},${this.getChartY(s)}`).join(' ');
  }

  buildAreaPath(): string {
    if (!this.chartScores.length) return '';
    const pts = this.chartScores.map((s, i) => `${this.getChartX(i)},${this.getChartY(s)}`);
    return `M ${this.getChartX(0)},${this.CY_BOTTOM} L ${pts.join(' L ')} L ${this.getChartX(this.chartScores.length - 1)},${this.CY_BOTTOM} Z`;
  }
}