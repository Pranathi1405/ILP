/*
  Description: Student Performance service.
  REAL APIs (from SME API docs):
    - GET /v1/student/{studentId}/stats           → totalTestsAttempted, accuracy
    - GET /v1/student/{studentId}/performance-graph → bar chart data by subject
    - GET /v1/student/{studentId}/tests           → paginated test list (Page 1 table + history)
    - GET /v1/student/{studentId}/tests/{testId}  → test detail (Page 2)
  LEGACY (kept for backward compat, unused if new APIs work):
    - GET /analytics/student/topic-mastery        → grouped { STRONG, AVERAGE, WEAK }
*/
import { Injectable, inject } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { ApiService } from '../api.service';

import { ChartBarItem, TestDetailResponse, RecentTestRow } from './student-performance.data';

@Injectable({ providedIn: 'root' })
export class StudentPerformanceService {
  private api = inject(ApiService);

  // ── Resolve current student ID from localStorage / auth store ──
  // Adjust this getter to match how your app stores the logged-in user.
  private get studentId(): number {
    const raw = localStorage.getItem('studentId') ?? localStorage.getItem('userId');
    return raw ? Number(raw) : 0;
  }

  // ── REAL: GET /v1/student/{studentId}/stats ───────────────────
  // Returns: { totalTestsAttempted: number, accuracy: number }
  getOverview(): Observable<{ tests_attempted: number; average_test_score: string }> {
    return this.api.get<any>(`v1/student/${this.studentId}/stats`).pipe(
      map((res) => {
        const d = res?.data ?? res;
        return {
          tests_attempted: d?.totalTestsAttempted ?? d?.tests_attempted ?? 0,
          average_test_score: String(d?.accuracy ?? d?.average_test_score ?? '0'),
        };
      }),
      catchError((err) => {
        console.error('Performance overview failed:', err);
        return of({ tests_attempted: 0, average_test_score: '0' });
      }),
    );
  }

  // ── REAL: GET /v1/student/{studentId}/performance-graph ───────
  // subject=all → bar graph: [{ subject, avgScore }]
  getScoreTrend(): Observable<ChartBarItem[]> {
    return this.api.get<any>(`v1/student/${this.studentId}/performance-graph?subject=all`).pipe(
      map((res) => {
        const d = res?.data ?? res;
        const items: any[] = d?.data ?? [];
        return items.map((item: any) => ({
          label: item.subject ?? '',
          value: Math.round(item.avgScore ?? 0),
        }));
      }),
      catchError((err) => {
        console.error('Score trend failed:', err);
        return of([]);
      }),
    );
  }

  // ── REAL: GET /v1/student/{studentId}/tests ───────────────────
  // Returns paginated list of tests.
  // Used for both the Recent Test Results table (Page 1) and Test History page.
  getTests(
    page = 1,
    limit = 10,
    subject = 'all',
    month?: string,
  ): Observable<{ total: number; tests: RecentTestRow[] }> {
    let url = `v1/student/${this.studentId}/tests?page=${page}&limit=${limit}&subject=${subject}`;
    if (month) url += `&month=${month}`;

    return this.api.get<any>(url).pipe(
      map((res) => {
        const d = res?.data ?? res;
        const raw: any[] = d?.tests ?? [];
        const tests: RecentTestRow[] = raw.map((t: any, i: number) => ({
          sno: String(t.sNo ?? i + 1).padStart(2, '0'),
          test_name: t.testName ?? t.test_name ?? '',
          status: (t.status ?? '').toUpperCase() === 'ATTEMPTED' ? 'ATTEMPTED' : 'NOT ATTEMPTED',
          subject: t.subject ?? '',
          score: t.score != null && t.totalMarks != null ? `${t.score}/${t.totalMarks}` : '–',
          date: t.date ? this.formatDate(t.date) : '',
          // Use testId as the identifier — Page 2 API is /v1/student/{id}/tests/{testId}
          attempt_id: t.testId ?? t.attempt_id ?? null,
        }));
        return { total: d?.total ?? tests.length, tests };
      }),
      catchError((err) => {
        console.error('Tests fetch failed:', err);
        return of({ total: 0, tests: [] });
      }),
    );
  }

  // ── REAL: GET /v1/student/{studentId}/tests/{testId} ─────────
  // Returns full test detail for Page 2.
  getTestDetail(testId: number): Observable<TestDetailResponse | null> {
    console.log('Fetching test detail for testId:', testId);
    return this.api.get<any>(`v1/student/${this.studentId}/tests/${testId}`).pipe(
      map((res) => {
        const d = res?.data ?? res;
        if (!d) return null;

        const questions = (d.questions ?? []).map((q: any, index: number) => ({
          sNo: q.sNo ?? index + 1,
          questionId: q.questionId ?? index + 1,
          topic: q.topic ?? 'General',
          questionText: q.questionText ?? q.question_text ?? 'Question not available',
          markedAnswer: q.markedAnswer ?? q.marked_answer ?? '',
          correctAnswer: q.correctAnswer ?? q.correct_answer ?? '',
          status: q.status ?? 'not_attempted',
          marksAwarded: q.marksAwarded ?? q.marks_awarded ?? 0,
          marksDeducted: q.marksDeducted ?? q.marks_deducted ?? 0,
          timeTaken: q.timeTaken ?? q.time_taken ?? 0,
        }));

        return {
          testId: d.testId ?? testId,
          testName: d.testName ?? d.test_name ?? 'Test Review',
          subject: d.subject ?? '',
          unit: d.unit ?? '',
          date: d.date ?? new Date().toISOString(),
          totalQuestions: d.totalQuestions ?? questions.length,
          attemptedQuestions: d.attemptedQuestions ?? 0,
          score: d.score ?? 0,
          totalMarks: d.totalMarks ?? 100,
          timeAllotted: d.timeAllotted ?? 3600,
          timeSpent: d.timeSpent ?? 0,
          pieChart: {
            correct: d.pieChart?.correct ?? 0,
            wrong: d.pieChart?.wrong ?? 0,
            notAttempted: d.pieChart?.notAttempted ?? 0,
          },
          questions,
        } as TestDetailResponse;
      }),
      catchError((err) => {
        console.error('Test detail failed:', err);
        return of(null);
      }),
    );
  }

  // ── REAL: /analytics/student/topic-mastery (existing endpoint) ─
  getTopicMastery(): Observable<{ strong: string[]; weak: string[] }> {
    return this.api.get<any>('analytics/student/topic-mastery').pipe(
      map((res) => {
        const grouped = res?.data?.grouped ?? {};
        const strong: string[] = (grouped['STRONG'] ?? grouped['strong'] ?? []).map(
          (t: any) => t.topic_name ?? `Module ${t.module_id}`,
        );
        const weak: string[] = (grouped['WEAK'] ?? grouped['weak'] ?? []).map(
          (t: any) => t.topic_name ?? `Module ${t.module_id}`,
        );
        return { strong, weak };
      }),
      catchError(() => of({ strong: [], weak: [] })),
    );
  }

  // ── Helper ────────────────────────────────────────────────────
  private formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }
}