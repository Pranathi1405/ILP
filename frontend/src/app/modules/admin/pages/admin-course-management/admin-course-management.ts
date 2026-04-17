import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import {
  CourseManagementService,
  Course,
  CourseFilters,
} from '../../../../core/services/admin/course-management/course-management';

@Component({
  selector: 'app-admin-course-management',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './admin-course-management.html',
})
export class AdminCourseManagement implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // Stats
  totalCourses = 0;
  singleCourses = 0;
  activeStudents = 0;

  // Table
  courses: Course[] = [];
  isLoading = false;
  errorMsg = '';

  // Filters
  searchQuery = '';
  selectedCategory = '';
  categories: any[] = [];

  // Pagination
  currentPage = 1;
  pageSize = 5;
  totalItems = 0;
  totalPages = 0;

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get showingText(): string {
    if (this.totalItems === 0) return 'No courses to show';
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.totalItems);
    return `Showing ${start}–${end} of ${this.totalItems} courses`;
  }

  constructor(
    private courseService: CourseManagementService,
    private router: Router,
    private cdr: ChangeDetectorRef  // ✅ added
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadCourses();

    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage = 1;
        this.loadCourses();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCourses(): void {
    this.isLoading = true;
    this.errorMsg = '';

    const filters: CourseFilters = {
      search: this.searchQuery || undefined,
      category: this.selectedCategory || undefined,
      page: this.currentPage,
      limit: this.pageSize,
    };

    this.courseService
      .getCourses(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.courses = res.data.courses ?? [];
          this.totalItems = res.data.pagination.total ?? 0;
          this.totalPages = res.data.pagination.totalPages ?? 0;
          this.totalCourses = this.totalItems;
          this.activeStudents = this.courses.reduce(
            (sum: number, c: Course) => sum + (c.enrolled_students ?? 0), 0
          );
          this.isLoading = false;
          this.cdr.detectChanges(); // ✅ force view update
        },
        error: (err: any) => {
          console.error('Failed to load courses:', err);
          this.errorMsg = 'Failed to load courses. Please try again.';
          this.isLoading = false;
          this.cdr.detectChanges(); // ✅ force view update on error too
        },
      });
  }

  loadCategories(): void {
    this.courseService
      .getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.categories = Array.isArray(res) ? res : res.data ?? [];
          this.cdr.detectChanges(); // ✅ force view update
        },
        error: (err: any) => console.error('Failed to load categories:', err),
      });
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchQuery);
  }

  onCategoryChange(): void {
    this.currentPage = 1;
    this.loadCourses();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadCourses();
  }

  editCourse(course: Course): void {
    this.router.navigate(['/admin/course-management/edit', course.course_id]);
  }

  deleteCourse(course: Course): void {
    if (!confirm(`Delete "${course.course_name}"? This cannot be undone.`)) return;

    this.courseService
      .deleteCourse(course.course_id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.loadCourses(),
        error: (err: any) => {
          console.error('Delete failed:', err);
          alert('Failed to delete course.');
        },
      });
  }
}