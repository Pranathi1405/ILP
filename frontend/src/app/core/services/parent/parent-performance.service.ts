import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from '../api.service';
import {
  LinkedStudentsResponse,
  ParentDashboardResponse,
  PerformanceGraphResponse,
  ParentTestsResponse,
  TestDetailResponse,
  ChildOverviewResponse,
  ParentStatsResponse,
} from './parent-performance.data';

@Injectable({
  providedIn: 'root',
})
export class ParentPerformanceService {
  // ApiService.get() accepts only 1 argument (URL string).
  // Query params are embedded directly in the URL string.
  constructor(private api: ApiService, private http: HttpClient) {}

  // ── Page 1 APIs ──────────────────────────────────────────────

  /** GET /analytics/parent/students */
  getLinkedStudents(): Observable<LinkedStudentsResponse> {
    return this.api.get<LinkedStudentsResponse>('analytics/parent/students');
  }

  /** GET /analytics/parent/dashboard?studentId=X */
  getParentDashboard(studentId?: number): Observable<ParentDashboardResponse> {
    const url = studentId !== undefined
      ? `analytics/parent/dashboard?studentId=${studentId}`
      : 'analytics/parent/dashboard';
    return this.api.get<ParentDashboardResponse>(url);
  }

  /** GET /v1/parent/{parentId}/performance-graph?subject=all */
  getPerformanceGraph(parentId: number, subject: string = 'all'): Observable<PerformanceGraphResponse> {
    return this.api.get<PerformanceGraphResponse>(
      `v1/parent/${parentId}/performance-graph?subject=${subject}`
    );
  }

  /** GET /v1/parent/{parentId}/tests?page=1&limit=10&subject=... */
  getParentTests(
    parentId: number,
    page: number = 1,
    limit: number = 10,
    subject?: string,
    month?: string,
    startDate?: string,
    endDate?: string
  ): Observable<ParentTestsResponse> {
    let query = `page=${page}&limit=${limit}`;
    if (subject) query += `&subject=${encodeURIComponent(subject)}`;
    if (month) query += `&month=${encodeURIComponent(month)}`;
    if (startDate) query += `&startDate=${encodeURIComponent(startDate)}`;
    if (endDate) query += `&endDate=${encodeURIComponent(endDate)}`;
    return this.api.get<ParentTestsResponse>(`v1/parent/${parentId}/tests?${query}`);
  }

  /** GET /v1/parent/{parentId}/stats */
  getParentStats(parentId: number): Observable<ParentStatsResponse> {
    return this.api.get<ParentStatsResponse>(`v1/parent/${parentId}/stats`);
  }

  // ── Page 2 APIs ──────────────────────────────────────────────

  /** GET /v1/parent/{parentId}/tests/{testId} */
  getTestDetail(parentId: number, testId: number): Observable<TestDetailResponse> {
    return this.api.get<TestDetailResponse>(`v1/parent/${parentId}/tests/${testId}`);
  }

  /** GET /v1/parent/{parentId}/child-overview?studentId=X */
  getChildOverview(parentId: number, studentId?: number): Observable<ChildOverviewResponse> {
    const url = studentId !== undefined
      ? `v1/parent/${parentId}/child-overview?studentId=${studentId}`
      : `v1/parent/${parentId}/child-overview`;
    return this.api.get<ChildOverviewResponse>(url);
  }

  // ── Composite loaders ────────────────────────────────────────

  /** Parallel load for Page 1 */
  loadPage1Data(parentId: number, studentId?: number) {
    return forkJoin({
      dashboard: this.getParentDashboard(studentId).pipe(catchError(() => of(null))),
      graph: this.getPerformanceGraph(parentId).pipe(catchError(() => of(null))),
      tests: this.getParentTests(parentId).pipe(catchError(() => of(null))),
    });
  }

  /** Format seconds → "MM:SS" */
  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  /** Format seconds → "X mins" */
  formatMinutes(seconds: number): string {
    return `${Math.round(seconds / 60)} mins`;
  }
}