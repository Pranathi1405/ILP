/* 
  Author: Pranathi
  Description: Fetches teacher dashboard stats, courses, and upcoming live class from real APIs.
               Falls back to mock data on error.
*/

import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { timeout, catchError, map } from 'rxjs/operators';
import { ApiService } from '../api.service';
import {
  TeacherDashboardStats,
  TeacherCourse,
  UpcomingLiveClass,
  teacherStatsMock,
  teacherCoursesMock,
  upcomingClassMock,
} from './teacher-dashboard.data';

// Combined shape returned to the component
export interface TeacherDashboardViewModel {
  stats: TeacherDashboardStats;
  courses: TeacherCourse[];
  nextClass: UpcomingLiveClass | null;
}

@Injectable({
  providedIn: 'root',
})
export class TeacherDashboardService {
  //Using inject() — no constructor injection per project rules
  private api = inject(ApiService);

  /**
   * Fires all 3 API calls in parallel using forkJoin.
   * Each call has timeout(8000) + catchError fallback independently
   * so one failure doesn't break the whole dashboard.
   */
  getDashboardViewModel(): Observable<TeacherDashboardViewModel> {
    // --- API 1: Dashboard stats (doubts, assignments, rating) ---
    const stats$ = forkJoin({
  dashboard: this.api
    .get<{ success: boolean; data: any }>('analytics/teacher/dashboard')
    .pipe(
      timeout(8000),
      catchError(() => of({ data: teacherStatsMock }))
    ),

  pending: this.api
    .get<{ success: boolean; count: number }>('doubts/pending-count')
    .pipe(
      timeout(8000),
      catchError(() => of({ count: teacherStatsMock.doubts_pending }))
    ),
}).pipe(
  map((res) => ({
    doubts_pending: res.pending?.count ?? 0,
    assignments_to_grade: res.dashboard?.data?.assignments_to_grade ?? 0,
    average_class_rating: res.dashboard?.data?.average_class_rating ?? 0,
  }))
);

    // --- API 2: Teacher's course list ---
    const courses$ = this.api
      .get<{ success: boolean; data: any[] }>('analytics/teacher/courses')
      .pipe(
        timeout(8000),

        map((res) =>
          (res.data || []).map((course: any) => ({
            course_id: course.course_id,

            // backend may send course_title or course_name
            course_name: course.course_title || course.course_name || 'Untitled Course',

            // analytics API usually doesn't give category directly
            category: course.category || course.difficulty_level || 'General',

            // backend sends total_enrollments
            enrolled_students: course.total_enrollments || course.enrolled_students || 0,

            // set active fallback
            status: course.status || (course.is_published ? 'active' : 'inactive') || 'active',
          })),
        ),

        catchError(() => {
          console.warn('Teacher courses API failed — using mock');
          return of(teacherCoursesMock);
        }),
      );

    // --- API 3: Next upcoming live class for the "Incoming stream" banner ---
    const nextClass$ = this.api
      .get<{
        success: boolean;
        type: string;
        data: UpcomingLiveClass[];
      }>('live-classes?type=upcoming')
      .pipe(
        timeout(8000),
        // Take only the first class (nearest upcoming)
        map((res) => (res.data && res.data.length > 0 ? res.data[0] : null)),
        catchError(() => {
          // MOCK: fallback on timeout or server error
          console.warn('Upcoming live classes API failed — using mock');
          return of(upcomingClassMock);
        }),
      );

    // forkJoin waits for all 3 to complete, then combines into one object
    return forkJoin({
      stats: stats$,
      courses: courses$,
      nextClass: nextClass$,
    });
  }

  /**
   * Formats scheduled_start_time into a readable string.
   * e.g. "Today, 10:00 AM (Starts in 15 mins)"
   */
  formatClassTime(isoString: string): string {
    const classTime = new Date(isoString);
    const now = new Date();

    // Calculate minutes until class starts
    const diffMs = classTime.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);

    // Format time as "10:00 AM"
    const timeStr = classTime.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    if (diffMins > 0) {
      return `Scheduled for Today, ${timeStr} (Starts in ${diffMins} mins)`;
    } else if (diffMins < 0) {
      return `Started at ${timeStr} (${Math.abs(diffMins)} mins ago)`;
    } else {
      return `Starting Now at ${timeStr}`;
    }
  }
}
