/*
  Author: Pranathi
  Description: Student dashboard service.
  Fetches real data from /analytics/student/overview API.
  Mock data used for sections without API support.
*/
import { Injectable, inject } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { ApiService } from '../api.service';
import { studentDashboardMock } from './student-dashboard.data';

@Injectable({ providedIn: 'root' })
export class StudentDashboardService {
  private api = inject(ApiService);

  // ── Real API call ─────────────────────────────────────────────
  getOverview(): Observable<any> {
    return this.api.get<any>('analytics/student/overview').pipe(
      catchError((err) => {
        console.error('Dashboard overview failed:', err);
        return of(null);
      }),
    );
  }

  // ── Maps API response to dashboard stats ──────────────────────
  getDashboardStats(): Observable<{
    test_scores: number;
    courses_done: number;
    daily_streak: number;
    attendance: number;
  }> {
    return this.getOverview().pipe(
      map((res) => {
        const d = res?.data;
        return {
          test_scores: d ? parseFloat(d.average_test_score) : 0,
          courses_done: d ? d.completed_courses : 0,
          daily_streak: d ? d.current_streak_days : 0,
          attendance: 0, // Temporary 0 — overwritten by loadAttendance() in component
        };
      }),
    );
  }

  // Fix: map the correct field from the API response
  getStudentAttendance(): Observable<{ attendance_percentage: number }> {
    return this.api.get<any>('live-classes/student/dashboard').pipe(
      map((res) => ({
        attendance_percentage: res?.data?.attendance_percentage ?? 0,
      })),
      catchError((err) => {
        console.error('Attendance fetch failed:', err);
        return of({ attendance_percentage: 0 });
      }),
    );
  }

  // ── REAL API:  live classes ──────────────────────────
  getLiveNowClass(): Observable<any> {
    return this.api.get<any>('live-classes/student/live-now').pipe(
      map((res) => res?.data || null),
      catchError((err) => {
        console.error('Live now fetch failed:', err);
        return of(null);
      }),
    );
  }

  // ── Mock data getters (no API available yet) ──────────────────
  // MOCK: Returns resume video data — no API yet
  getResumeVideo() {
    return {
      chapter: studentDashboardMock.video_chapter,
      title: studentDashboardMock.video_title,
      completion: studentDashboardMock.completion_percentage,
    };
  }

 // ── REAL API: Upcoming Scheduled Test ─────────────────────
getUpcomingTest(): Observable<any> {
  return this.api.get<any>('sme-tests/full').pipe(
    map((res) => {
      const tests = res?.data || [];

      if (!tests.length) return null;

      // Find first upcoming/active test
      const upcoming =
        tests.find((t: any) => t.timing_status === 'upcoming') ||
        tests.find((t: any) => t.timing_status === 'active') ||
        tests[0];

      return upcoming;
    }),
    catchError((err) => {
      console.error('Upcoming test fetch failed:', err);
      return of(null);
    }),
  );
}

  // MOCK: Returns recent activity — no API yet
  getRecentActivity() {
    return studentDashboardMock.recent_activity;
  }
  getGlobalLeaderboard(): Observable<any> {
    return this.api.get<any>('analytics/student/leaderboard').pipe(
      map((res) => res?.data),
      catchError((err) => {
        console.error('Leaderboard fetch failed:', err);
        return of(null);
      }),
    );
  }
}
