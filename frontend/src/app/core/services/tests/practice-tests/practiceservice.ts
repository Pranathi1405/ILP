import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../../api.service';
import {
  CreatePracticeTestPayload,
  PracticeTest,
  PracticeTestListItem,
  Attempt,
  AnswerPayload,
  AnswerFeedback,
  TestResults,
  PracticeResultsSummary,
} from '../../../models/practice-test.model';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

@Injectable({ providedIn: 'root' })
export class PracticeService {
  private api = inject(ApiService);
  private base = 'practice-tests';

  constructor() {}

  // ── Test lifecycle ──────────────────────────────────────────────────────────

  createTest(payload: CreatePracticeTestPayload): Observable<PracticeTest> {
    return this.api
      .post<ApiResponse<PracticeTest>>(`${this.base}/create`, payload)
      .pipe(map((r) => r.data));
  }

  getAllTests(page = 1, limit = 10): Observable<{ data: PracticeTestListItem[]; pagination: any }> {
    return this.api
      .get<PaginatedResponse<PracticeTestListItem>>(`${this.base}?page=${page}&limit=${limit}`)
      .pipe(map((r) => ({ data: r.data, pagination: r.pagination })));
  }

  getTest(testId: number): Observable<PracticeTest> {
    return this.api
      .get<ApiResponse<PracticeTest>>(`${this.base}/${testId}`)
      .pipe(map((r) => r.data));
  }

  startTest(testId: number): Observable<Attempt> {
    return this.api
      .post<ApiResponse<Attempt>>(`${this.base}/${testId}/start`, {})
      .pipe(map((r) => r.data));
  }

  // ── Per-question answer ─────────────────────────────────────────────────────

  submitAnswer(testId: number, payload: AnswerPayload): Observable<AnswerFeedback> {
    return this.api
      .post<ApiResponse<AnswerFeedback>>(`${this.base}/${testId}/answer`, payload)
      .pipe(map((r) => r.data));
  }

  getHint(testId: number, questionId: number): Observable<{ hint: string | null }> {
    return this.api
      .get<ApiResponse<{ hint: string | null }>>(`${this.base}/${testId}/hint/${questionId}`)
      .pipe(map((r) => r.data));
  }

  // ── Full submit ─────────────────────────────────────────────────────────────

  submitTest(testId: number, answers: AnswerPayload[]): Observable<any> {
    return this.api
      .post<ApiResponse<any>>(`${this.base}/${testId}/submit`, { answers })
      .pipe(map((r) => r.data));
  }

  // ── Results ─────────────────────────────────────────────────────────────────

  getResults(attemptId: number): Observable<TestResults> {
    return this.api
      .get<ApiResponse<TestResults>>(`${this.base}/attempts/${attemptId}/results`)
      .pipe(map((r) => r.data));
  }

  getSummary(): Observable<PracticeResultsSummary> {
    return this.api
      .get<ApiResponse<PracticeResultsSummary>>(`${this.base}/summary`)
      .pipe(map((r) => r.data));
  }
}
