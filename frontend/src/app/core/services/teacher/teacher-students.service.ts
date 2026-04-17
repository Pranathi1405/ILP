import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  DashboardStatsResponse,
  StudentsResponse,
  LeaderboardResponse,
  CourseAnalyticsResponse,
  StudentRosterItem,
} from './teacher-students.data';

@Injectable({
  providedIn: 'root',
})
export class TeacherStudentsService {
  constructor(private http: HttpClient) {}

  // total students count
  getDashboardStats(): Observable<DashboardStatsResponse> {
    return this.http.get<DashboardStatsResponse>('/analytics/teacher/dashboard');
  }

  // course dropdown
  getCourseAnalytics(): Observable<CourseAnalyticsResponse> {
    return this.http.get<CourseAnalyticsResponse>('/analytics/teacher/courses');
  }

  // student roster
  getStudentsByCourse(courseId: number): Observable<StudentsResponse> {
    return this.http.get<StudentsResponse>(`/analytics/teacher/courses/${courseId}/students`);
  }

  // leaderboard top students
  getLeaderboard(courseId: number, limit = 3): Observable<LeaderboardResponse> {
    return this.http.get<LeaderboardResponse>(
      `/analytics/teacher/courses/${courseId}/leaderboard?limit=${limit}`,
    );
  }

  // csv export
  exportStudentsToCSV(students: StudentRosterItem[], fileName: string): void {
    if (!students.length) return;

    const headers = ['Student ID', 'Name', 'Average Test Score', 'Progress Percentage', 'Status'];

    const rows = students.map((student) => [
      student.student_id,
      student.name,
      student.average_test_score,
      student.progress_percentage,
      student.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.click();
  }
}
