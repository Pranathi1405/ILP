import { Injectable, signal, inject } from '@angular/core';
import { Observable, tap, finalize } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ApiService } from '../api.service';
import {
  Doubt,
  DoubtResponse,
  Course,
  CourseResponse,
  Subject,
  SubjectResponse,
  DoubtDetail,
  DoubtDetailResponse,
  DoubtFilters,
  DoubtPagination,
  BackendPagination,
  mapDoubt,
  mapCourse,
  mapSubject,
  mapDoubtDetail,
  computePagination,
} from '../../models/doubt.model';

@Injectable({ providedIn: 'root' })
export class DoubtService {
  private api = inject(ApiService);
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrl;

  // ── Sidebar state ─────────────────────────────────────────────────────────
  doubts = signal<Doubt[]>([]);
  pagination = signal<DoubtPagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
  });
  isLoadingDoubts = signal(false);
  isLoadingMore = signal(false);
  doubtsError = signal<string | null>(null);

  // ── Filter / course state ─────────────────────────────────────────────────
  courses = signal<Course[]>([]);
  subjects = signal<Subject[]>([]);
  isLoadingCourses = signal(false);
  isLoadingSubjects = signal(false);

  // ── Chat / detail state ───────────────────────────────────────────────────
  activeDoubt = signal<Doubt | null>(null);
  doubtDetail = signal<DoubtDetail | null>(null);
  isLoadingDetail = signal(false);
  isSendingReply = signal(false);
  chatError = signal<string | null>(null);

  // ── GET /doubts/my-doubts ─────────────────────────────────────────────────
  fetchDoubts(
    filters: DoubtFilters = {},
  ): Observable<{ success: boolean; data: DoubtResponse[]; pagination: BackendPagination }> {
    this.isLoadingDoubts.set(true);
    this.doubtsError.set(null);

    return this.api
      .get<{
        success: boolean;
        data: DoubtResponse[];
        pagination: BackendPagination;
      }>(`doubts/my-doubts?${this.buildParams({ ...filters, page: 1 })}`)
      .pipe(
        tap({
          next: (res) => {
            this.doubts.set(res.data.map(mapDoubt));
            this.pagination.set(computePagination(res.pagination));
            this.isLoadingDoubts.set(false);
          },
          error: (err) => {
            this.doubtsError.set(err?.error?.message ?? 'Failed to fetch doubts.');
            this.isLoadingDoubts.set(false);
          },
        }),
      );
  }

  /** Infinite scroll — appends next page. No-op if no next page or already loading. */
  loadMoreDoubts(filters: DoubtFilters = {}): void {
    const current = this.pagination();
    if (!current.hasNextPage || this.isLoadingMore()) return;

    const nextPage = current.page + 1;
    this.isLoadingMore.set(true);

    this.api
      .get<{ success: boolean; data: DoubtResponse[]; pagination: BackendPagination }>(
        `doubts/my-doubts?${this.buildParams({ ...filters, page: nextPage })}`,
      )
      .pipe(
        tap({
          next: (res) => {
            this.doubts.update((prev) => [...prev, ...res.data.map(mapDoubt)]);
            this.pagination.set(computePagination(res.pagination));
          },
          error: (err) => {
            this.doubtsError.set(err?.error?.message ?? 'Failed to load more doubts.');
          },
        }),
        finalize(() => this.isLoadingMore.set(false)),
      )
      .subscribe();
  }

  // ── GET /doubts/enrolled-courses → { success, message, data: Course[] } ──
  fetchCourses(): Observable<{ success: boolean; message: string; data: CourseResponse[] }> {
    this.isLoadingCourses.set(true);
    return this.api
      .get<{ success: boolean; message: string; data: CourseResponse[] }>('doubts/enrolled-courses')
      .pipe(
        tap({
          next: (res) => {
            this.courses.set(res.data.map(mapCourse));
            this.isLoadingCourses.set(false);
          },
          error: () => this.isLoadingCourses.set(false),
        }),
      );
  }

  // ── GET /doubts/subjects?courseId=X → { success, message, data: Subject[] } ──
  fetchSubjects(
    courseId: number,
  ): Observable<{ success: boolean; message: string; data: SubjectResponse[] }> {
    this.isLoadingSubjects.set(true);
    this.subjects.set([]);
    return this.api
      .get<{
        success: boolean;
        message: string;
        data: SubjectResponse[];
      }>(`doubts/subjects?courseId=${courseId}`)
      .pipe(
        tap({
          next: (res) => {
            this.subjects.set(res.data.map(mapSubject));
            this.isLoadingSubjects.set(false);
          },
          error: () => this.isLoadingSubjects.set(false),
        }),
      );
  }

  // ── GET /doubts/:doubtId → { success, message, data: DoubtDetailResponse } ──
  fetchDoubtDetail(doubtId: number): Observable<{ success: boolean; data: DoubtDetailResponse }> {
    this.isLoadingDetail.set(true);
    this.chatError.set(null);
    return this.api.get<{ success: boolean; data: DoubtDetailResponse }>(`doubts/${doubtId}`).pipe(
      tap({
        next: (res) => {
          this.doubtDetail.set(mapDoubtDetail(res.data));
          this.isLoadingDetail.set(false);
        },
        error: (err) => {
          this.chatError.set(err?.error?.message ?? 'Failed to load doubt.');
          this.isLoadingDetail.set(false);
        },
      }),
    );
  }

  // ── POST /doubts/reply (multipart) — { doubtId, replyText } + files[] ────
  sendReply(doubtId: number, replyText: string, files: File[]): Observable<any> {
    this.isSendingReply.set(true);
    this.chatError.set(null);

    const formData = new FormData();
    formData.append('doubtId', String(doubtId));
    formData.append('replyText', replyText);
    files.forEach((f) => formData.append('files', f));

    // Use HttpClient directly — ApiService.post sets Content-Type, which breaks multipart
    return this.http
      .post<any>(`${this.baseUrl}/doubts/reply`, formData, { withCredentials: true })
      .pipe(
        tap({
          next: () => {
            // Re-fetch detail to get the new reply with full responder info
            this.fetchDoubtDetail(doubtId).subscribe();
            this.isSendingReply.set(false);
          },
          error: (err) => {
            this.chatError.set(err?.error?.message ?? 'Failed to send reply.');
            this.isSendingReply.set(false);
          },
        }),
      );
  }

  // ── PUT /doubts/:doubtId/status ───────────────────────────────────────────
  resolveDoubt(doubtId: number): Observable<any> {
    return this.http
      .put<any>(`${this.baseUrl}/doubts/${doubtId}/status`, {}, { withCredentials: true })
      .pipe(
        tap({
          next: () => {
            // Update sidebar list
            this.doubts.update((prev) =>
              prev.map((d) => (d.doubt_id === doubtId ? { ...d, status: 'RESOLVED' as const } : d)),
            );
            // Update active doubt
            const active = this.activeDoubt();
            if (active?.doubt_id === doubtId) {
              this.activeDoubt.set({ ...active, status: 'RESOLVED' });
            }
            // Update detail panel
            const detail = this.doubtDetail();
            if (detail?.doubtId === doubtId) {
              this.doubtDetail.set({ ...detail, status: 'RESOLVED' });
            }
          },
          error: (err) => this.chatError.set(err?.error?.message ?? 'Failed to resolve doubt.'),
        }),
      );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  setActiveDoubt(doubt: Doubt): void {
    this.activeDoubt.set(doubt);
    this.doubtDetail.set(null);
    this.fetchDoubtDetail(doubt.doubt_id).subscribe();
  }

  private buildParams(filters: DoubtFilters): string {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.courseId) params.set('courseId', String(filters.courseId));
    if (filters.subjectId) params.set('subjectId', String(filters.subjectId));
    if (filters.keyword) params.set('keyword', filters.keyword); // ← 'keyword' not 'search'
    params.set('page', String(filters.page ?? 1));
    params.set('limit', String(filters.limit ?? 10));
    return params.toString();
  }
}
