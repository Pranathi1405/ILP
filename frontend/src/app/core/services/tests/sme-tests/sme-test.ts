import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../api.service';

@Injectable({
  providedIn: 'root',
})
export class SmeTestService {
  private api = inject(ApiService);
  private base = 'sme-tests';

  createTest(payload: any): Observable<any> {
    return this.api.post(this.base, payload);
  }

  getMyTests(page = 1, limit = 10): Observable<any> {
    return this.api.get(`${this.base}?page=${page}&limit=${limit}`);
  }

  // Student-facing: returns published tests with attempt_status + attempt_id
  getPublishedTests(page = 1, limit = 20): Observable<any> {
    return this.api.get(`${this.base}?page=${page}&limit=${limit}`);
  }

  getTestById(id: number): Observable<any> {
    return this.api.get(`${this.base}/${id}`);
  }

  updateTest(testId: number, payload: any): Observable<any> {
    return this.api.patch(`${this.base}/${testId}`, payload);
  }

  deleteTest(testId: number): Observable<any> {
    return this.api.delete(`${this.base}/${testId}`);
  }

  getAvailableQuestions(
    testId: number,
    sectionId: number,
    difficulty?: string,
    limit?: number,
  ): Observable<any> {
    let query = `section_id=${sectionId}`;
    if (difficulty) query += `&difficulty=${difficulty}`;
    if (limit && limit > 0) query += `&limit=${limit}`;
    return this.api.get(`${this.base}/${testId}/available-questions?${query}`);
  }

  addQuestion(testId: number, payload: any): Observable<any> {
    return this.api.post(`${this.base}/${testId}/questions`, payload);
  }

  updateQuestion(questionId: number, payload: any): Observable<any> {
    return this.api.patch(`questions/${questionId}`, payload);
  }

  removeQuestion(testId: number, questionId: number): Observable<any> {
    return this.api.delete(`${this.base}/${testId}/questions/${questionId}`);
  }

  publishTest(testId: number): Observable<any> {
    return this.api.patch(`${this.base}/${testId}/publish`, {});
  }

  //student side routes
  startAttempt(testId: number): Observable<any> {
    return this.api.post(`${this.base}/${testId}/start`, {});
  }

  submitTest(testId: number, answers: any[]): Observable<any> {
    return this.api.post(`${this.base}/${testId}/submit`, { answers });
  }

  getResults(attemptId: number): Observable<any> {
    return this.api.get(`${this.base}/attempts/${attemptId}/results`);
  }

  getAnalytics(testId: number): Observable<any> {
    return this.api.get(`${this.base}/${testId}/analytics`);
  }

  getTeacherDealingSubjects(): Observable<any> {
    return this.api.get(`${this.base}/teacher/dealing-subjects`);
  }
}
