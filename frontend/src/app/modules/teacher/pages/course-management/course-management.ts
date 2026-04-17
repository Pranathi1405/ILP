import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeacherCourseService } from '../../../../core/services/teacher/teacher-course.service';

@Component({
  selector: 'app-course-management',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './course-management.html'
})
export class CourseManagementComponent implements OnInit {

  private teacherCourseService = inject(TeacherCourseService);

  categories: any[] = [];
  courses: any[] = [];
  isLoading = false;

  ngOnInit(): void {
    this.loadCategories();
    this.loadTeacherCourses();
  }

  loadCategories(): void {
    this.teacherCourseService.getCategories().subscribe({
      next: (res) => {
        this.categories = res.data || res;
      },
      error: (err) => console.error('Failed to load categories', err)
    });
  }

  loadTeacherCourses(categoryId?: number): void {
    this.isLoading = true;
    this.teacherCourseService.getTeacherCourses(categoryId).subscribe({
      next: (res) => {
        this.courses = res.data || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load teacher courses', err);
        this.isLoading = false;
      }
    });
  }

  onCategoryChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const categoryId = value ? Number(value) : undefined;
    this.loadTeacherCourses(categoryId);
  }
}