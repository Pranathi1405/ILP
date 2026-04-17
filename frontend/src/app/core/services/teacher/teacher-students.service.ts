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
  private baseUrl = 'http://localhost:3000'; // ← ADD THIS
  constructor(private http: HttpClient) {}
  getDashboardStats() {
    return this.http.get<DashboardStatsResponse>(`${this.baseUrl}/analytics/teacher/dashboard`);
  }
  getCourseAnalytics() {
    return this.http.get<CourseAnalyticsResponse>(`${this.baseUrl}/analytics/teacher/courses`);
  }
  getStudentsByCourse(courseId: number) {
    return this.http.get<StudentsResponse>(
      `${this.baseUrl}/analytics/teacher/courses/${courseId}/students`,
    );
  }
  getLeaderboard(courseId: number, limit = 3) {
    return this.http.get<LeaderboardResponse>(
      `${this.baseUrl}/analytics/teacher/courses/${courseId}/leaderboard?limit=${limit}`,
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
