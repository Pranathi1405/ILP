// parent-dashboard.service.ts
// Author: Pranathi
// API calls for Parent Dashboard (Child Overview page only).

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';
import {
  LinkedStudentsResponse,
  DashboardResponse,
  ParentTestsResponse,
} from './parent-dashboard.data';

@Injectable({
  providedIn: 'root',
})
export class ParentDashboardService {
  constructor(private apiService: ApiService) {}

  getLinkedStudents(): Observable<LinkedStudentsResponse> {
    return this.apiService.get<LinkedStudentsResponse>(
      'analytics/parent/students'
    );
  }

  getDashboardAnalytics(studentId?: number): Observable<DashboardResponse> {
    const url = studentId
      ? `analytics/parent/dashboard?studentId=${studentId}`
      : 'analytics/parent/dashboard';
    return this.apiService.get<DashboardResponse>(url);
  }

  // parentId is passed from the auth user object (user_id from token)
  getParentTests(
    parentId: number,
    page: number = 1,
    limit: number = 1
  ): Observable<ParentTestsResponse> {
    return this.apiService.get<ParentTestsResponse>(
      `v1/parent/${parentId}/tests?page=${page}&limit=${limit}`
    );
  }
}