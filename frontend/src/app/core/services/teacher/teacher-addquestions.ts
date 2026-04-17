import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
@Injectable({
  providedIn: 'root',
})
export class TeacherAddquestions {

  // private apiurl = 'http://localhost:3000/api/questions';
  apiurl = environment.apiUrl;
  private apiUrl       = 'http://localhost:3000/api/questions';
  private userApiUrl   = 'http://localhost:3000/api/userCourse';

  constructor(private http: HttpClient) {}

  // ── Course / Subject / Module ─────────────────────────────

  getTeacherCourses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.userApiUrl}/teacher/courses`, {
      withCredentials: true
    });
  }

  getSubjectsByCourse(courseId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.userApiUrl}/teacher/courses/${courseId}/subjects`,
      { withCredentials: true }
    );
  }

  getModulesBySubject(subjectId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.userApiUrl}/teacher/subjects/${subjectId}/modules`,
      { withCredentials: true }
    );
  }

  // ── Questions ─────────────────────────────────────────────

  addQuestion(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}`, data, {
      withCredentials: true
    });
  }

  addParagraphQuestion(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/paragraph`, data, {
      withCredentials: true
    });
  }

  addBulkQuestions(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/bulk`, data, {
      withCredentials: true
    });
  }

  getQuestions(subjectId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}?subjectId=${subjectId}`, {
      withCredentials: true
    });
  }

  getQuestionById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`, {
      withCredentials: true
    });
  }

  updateQuestion(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}`, data, {
      withCredentials: true
    });
  }

  deleteQuestion(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      withCredentials: true
    });
  }
}