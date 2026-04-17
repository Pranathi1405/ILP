// Author: Mukka Shri Mownika
// Module: Course Management
// Page: Explore Courses
// Description: Dynamic course data with pagination

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CourseService } from '../../services/course';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './explore.html',
})
export class Explore implements OnInit, OnDestroy {
  courses: any[] = [];
  categories: any[] = [];

  selectedCategoryId: number | null = null;
  selectedCategoryName = 'All Categories';

  searchQuery = '';
  private searchSubject = new Subject<string>();

  isDropdownOpen = false;
  isLoading = true;
  errorMessage = '';

  // 🔥 PAGINATION VARIABLES
  currentPage = 1;
  totalPages = 1;
  limit = 6;

  private coursesSub: Subscription | null = null;
  private searchSub: Subscription | null = null;

  constructor(
    private courseService: CourseService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit() {
    this.initSearch();
    this.loadCategories();
    this.loadCourses();
  }

  ngOnDestroy() {
    this.coursesSub?.unsubscribe();
    this.searchSub?.unsubscribe();
  }

  initSearch() {
    this.searchSub = this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value: string) => {
        this.searchQuery = value.trim();
        this.currentPage = 1;
        this.loadCourses();
      });
  }

  onSearch(value: string) {
    this.searchSubject.next(value);
  }

  // ---------------- CATEGORY ----------------
  loadCategories() {
    this.courseService.getCategories().subscribe({
      next: (res: any) => {
        console.log('Categories:', res);
        this.categories = res?.data || res?.categories || res || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Categories error:', err);
      },
    });
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  selectCategory(category: any) {
    this.selectedCategoryId = category ? category.category_id || category.id : null;
    this.selectedCategoryName = category
      ? category.category_name || category.name
      : 'All Categories';
    this.isDropdownOpen = false;

    // 🔥 RESET PAGE WHEN FILTER CHANGES
    this.currentPage = 1;

    this.loadCourses();
  }

  // ---------------- COURSES ----------------
  loadCourses() {
    this.coursesSub?.unsubscribe();
    this.isLoading = true;
    this.errorMessage = '';

    const params: any = {
      page: this.currentPage,
      limit: this.limit,
    };

    if (this.selectedCategoryId) {
      params.categoryId = this.selectedCategoryId;
    }

    if (this.searchQuery) {
      params.search = this.searchQuery;
    }

    this.coursesSub = this.courseService.getCourses(params).subscribe({
      next: (res: any) => {
        console.log('API Response:', res);

        const rawCourses = res?.data?.courses || res?.courses || [];

        this.courses = rawCourses.map((course: any) => ({
          id: course.id || course.course_id,
          title: course.title || course.course_name,
          price: course.price,
          rating: course.rating || 4.5,
          image: course.thumbnail_url || 'https://via.placeholder.com/350x170',
          tag: course.category_name || course.category || '',
        }));

        // 🔥 SET TOTAL PAGES FROM BACKEND
        this.totalPages = res?.data?.pagination?.totalPages || 1;

        console.log('Courses loaded:', this.courses.length);
        console.log('Total Pages:', this.totalPages);

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error:', err);
        this.errorMessage = 'Failed to load courses. Please try again.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ---------------- PAGINATION ----------------
  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;

    this.currentPage = page;
    this.loadCourses();
  }

  buyNow(courseId: string | number): void {
    if (!courseId) return;
    this.router.navigate(['/student/payments/checkout', courseId]);
  }
}
