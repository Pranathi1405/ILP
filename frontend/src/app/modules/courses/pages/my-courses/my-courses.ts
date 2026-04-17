import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { LiveClassService } from '../../../../core/services/liveClasses/live-class.service';
import { UserCourseService } from '../../../../core/services/user-course.service';

@Component({
  selector: 'app-my-courses',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './my-courses.html',
})
export class MyCourses implements OnInit {
  private liveClassService = inject(LiveClassService);
  private userCourseService = inject(UserCourseService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  enrolledCourses: any[] = [];
  upcomingClasses: any[] = [];
  pastClasses: any[] = [];

  isLoadingCourses = true;
  isLoadingUpcoming = false;
  isLoadingPast = false;

  coursesError = '';

  activeTab: 'courses' | 'upcoming' | 'completed' = 'courses';

  ngOnInit() {
    this.fetchEnrolledCourses();
  }

  setTab(tab: 'courses' | 'upcoming' | 'completed') {
    this.activeTab = tab;

    if (tab === 'upcoming') {
      this.getStudentClasses('upcoming');
    }

    if (tab === 'completed') {
      this.getStudentClasses('past');
    }
  }

  continueLearning(course: any) {
    if (!course?.course_id) {
      this.coursesError = 'Invalid course data.';
      return;
    }

    this.userCourseService.getCourseSubjects(course.course_id).subscribe({
      next: (res) => {
        const subjects = Array.isArray(res.data) ? res.data : [];
        const firstSubject = subjects[0];

        if (firstSubject?.subject_id) {
          this.router.navigate(['/student/my-courses/course-player', firstSubject.subject_id]);
        } else {
          this.coursesError = 'No subjects available.';
        }
      },
      error: () => {
        this.coursesError = 'Failed to open course.';
      },
    });
  }

  private fetchEnrolledCourses(): void {
    this.isLoadingCourses = true;
    this.coursesError = '';

    this.userCourseService
      .getEnrolledCourses()
      .pipe(
        finalize(() => {
          this.isLoadingCourses = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          const courses = Array.isArray(response.data) ? response.data : [];

          this.enrolledCourses = courses.map((course: any) => {
            const teacherNames = Array.isArray(course.teacher_names)
              ? [...new Set(course.teacher_names.filter(Boolean))].join(', ')
              : '';

            const subjects =
              typeof course.subjects === 'string'
                ? JSON.parse(course.subjects)
                : course.subjects || [];

            const fallbackTeacherNames = [
              ...new Set((subjects || []).map((s: any) => s.teacher_name).filter(Boolean)),
            ].join(', ');

            return {
              ...course,
              teacherNames: teacherNames || fallbackTeacherNames || 'Unknown Teacher',
            };
          });

          this.cdr.detectChanges();
        },
        error: () => {
          this.coursesError = 'Failed to load courses.';
          this.cdr.detectChanges();
        },
      });
  }

  getStudentClasses(type: 'upcoming' | 'past') {
    if (type === 'upcoming') this.isLoadingUpcoming = true;
    else this.isLoadingPast = true;

    this.liveClassService.getStudentClasses(type).subscribe({
      next: (data) => {
        if (type === 'upcoming') {
          this.upcomingClasses = data || [];
          this.isLoadingUpcoming = false;
        } else {
          this.pastClasses = data || [];
          this.isLoadingPast = false;
        }

        this.cdr.detectChanges();
      },
      error: () => {
        if (type === 'upcoming') this.isLoadingUpcoming = false;
        else this.isLoadingPast = false;

        this.cdr.detectChanges();
      },
    });
  }
}
