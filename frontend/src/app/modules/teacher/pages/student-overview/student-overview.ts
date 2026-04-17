/*
  Author: Pranathi 
  Description: Student Overview page — shows total students, leaderboard,
               and paginated student roster with course filter and CSV export.
  APIs used:
    GET /analytics/teacher/dashboard        → total_students
    GET /analytics/teacher/courses          → course dropdown
    GET /analytics/teacher/courses/{id}/students   → roster table
    GET /analytics/teacher/courses/{id}/leaderboard → top 3
    GET /analytics/teacher/student/{id}    → detail view (navigation)
*/
import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TeacherStudentsService } from '../../../../core/services/teacher/teacher-students.service';
import {
  StudentRosterItem,
  LeaderboardEntry,
  CourseAnalyticsItem,
} from '../../../../core/services/teacher/teacher-students.data';

@Component({
  selector: 'app-student-overview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-overview.html',
  styleUrl: './student-overview.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentOverviewComponent implements OnInit {
  private service = inject(TeacherStudentsService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  // ── Stats ─────────────────
  totalStudents = 0;
  growthLabel = '12% increase from last semester'; // static label as per design

  // ── Leaderboard ──────
  leaderboard: LeaderboardEntry[] = [];
  leaderboardLoading = true;

  // ── Course Filter Dropdown ────────────
  courses: CourseAnalyticsItem[] = [];
  selectedCourseId: number | null = null; // null = "All Active Courses"
  courseDropdownOpen = false;

  // ── Student Roster ───────────────
  allStudents: StudentRosterItem[] = []; // raw data from API
  rosterLoading = true;

  // ── Pagination ──────────────────────────
  currentPage = 1;
  pageSize = 6;

  get totalPages(): number {
    return Math.ceil(this.allStudents.length / this.pageSize) || 1;
  }

  get pagedStudents(): StudentRosterItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.allStudents.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  ngOnInit(): void {
    this.loadDashboardStats();
    this.loadCourses();
     
  }

  // ── Load total students from teacher dashboard API ─────────
  loadDashboardStats(): void {
    this.service.getDashboardStats().subscribe({
      next: (res) => {
        this.totalStudents = res.data.total_students;
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Dashboard stats error:', err),
    });
  }

  // ── Load course list → populate dropdown ──────────────────
  loadCourses(): void {
    this.service.getCourseAnalytics().subscribe({
      next: (res) => {
        this.courses = res.data;
        // Auto-select first course for leaderboard and roster
        if (this.courses.length > 0) {
          this.selectedCourseId = this.courses[0].course_id;
          this.loadLeaderboard(this.selectedCourseId);
          this.loadRoster(this.selectedCourseId);
        }
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Courses error:', err),
    });
  }

  // ── Load leaderboard top 3 for selected course ────────────
  loadLeaderboard(courseId: number): void {
    this.leaderboardLoading = true;
    this.service.getLeaderboard(courseId, 3).subscribe({
      next: (res) => {
        this.leaderboard = res.data.slice(0, 3);
        this.leaderboardLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Leaderboard error:', err);
        this.leaderboardLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Load student roster for selected course ────────
  loadRoster(courseId: number): void {
    this.rosterLoading = true;
    this.currentPage = 1;

    this.service.getStudentsByCourse(courseId).subscribe({
      next: (res) => {
        this.allStudents = (res.data?.students || []).map((student) => ({
          ...student,
          course_name: res.data.course_name,
        }));

        this.rosterLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Roster error:', err);
        this.rosterLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Course dropdown selection ─────────────
  onCourseSelect(courseId: number): void {
    this.selectedCourseId = courseId;
    this.courseDropdownOpen = false;
    this.loadLeaderboard(courseId);
    this.loadRoster(courseId);
  }

  get selectedCourseName(): string {
    if (!this.selectedCourseId) return 'All Active Courses';
    const c = this.courses.find((c) => c.course_id === this.selectedCourseId);
    return c ? c.course_title : 'All Active Courses';
  }

  // ── Pagination ──────────────────────────
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.cdr.markForCheck();
  }

  // ── View student detail ────────────
  viewStudent(student: StudentRosterItem): void {
    this.router.navigate(['/teacher/student-overview', student.student_id]);
  }

  // ── Export CSV ─────────────────
  exportCSV(): void {
    this.service.exportStudentsToCSV(this.allStudents, 'students-roster.csv');
  }

  // ── Helper: Student initials  ─────────────
  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  // ── Helper: Avatar background color per initials ──────────
  getAvatarColor(name: string): string {
    const colors = [
      'bg-purple-100 text-purple-700',
      'bg-blue-100 text-blue-700',
      'bg-green-100 text-green-700',
      'bg-orange-100 text-orange-700',
      'bg-pink-100 text-pink-700',
      'bg-teal-100 text-teal-700',
    ];
    const idx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
    return colors[idx];
  }

  // ── Helper: Progress bar width capped at 100 ──────────────
  getProgressWidth(score: string): number {
    return Math.min(parseFloat(score) || 0, 100);
  }

  // ── Helper: Format student ID display ─────────────────────
  formatStudentId(id: number): string {
    return `STU${String(id).padStart(3, '0')}`;
  }

  // ── Helper: Rank badge medal color ──────────
  getRankColor(rank: number): string {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-amber-600';
    return 'text-gray-500';
  }

  // ── Helper: Format rank with leading zero ─────
  formatRank(rank: number): string {
    return String(rank).padStart(2, '0');
  }
}
