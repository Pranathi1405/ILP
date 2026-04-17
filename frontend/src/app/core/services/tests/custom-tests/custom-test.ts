/**
 * ============================================================
 * UG Exam Test — Angular Frontend Service
 * Author  : E.Kaeith Emmanuel
 * ============================================================
 */
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../api.service';

export interface UgExam {
  exam_id: number;
  exam_code: string;
  exam_name: string;
  total_marks: number;
  total_questions: number;
  duration_mins: number;
  total_papers: number;
  has_partial_marking: number;
  notes: string | null;
}

export interface UgSubject {
  subject_id: number;
  subject_name: string;
}

export interface UgChapter {
  chapter_id: number;
  chapter_name: string;
  display_order: number;
}

export interface GenerateTestPayload {
  exam_code: string;
  paper_number?: number;
  test_type?: 'multi-subject' | 'topic-based';
  subjects?: number[]; // multi-subject or topic-based: subject_id[]
  subject_id?: number; // optional single subject_id (not used currently)
  chapters?: string[]; // topic-based: chapter_name[] (optional)
  module_ids?: number[]; // topic-based: chapter/module ids
  difficulty?: string; // 'Easy' | 'Medium' | 'Hard'
}

export interface UgTest {
  test_id: number;
  exam_id: number;
  attempt_id?: number;
  exam_type: string;
  exam_name: string;
  paper_number: number;
  total_questions: number;
  total_marks: number;
  duration_minutes: number;
  has_partial_marking: number;
  created_at: string;
  questions?: UgTestQuestion[];
  total_score?: number;
  accuracy_percent?: number;
}

export interface UgTestQuestion {
  question_id: number;
  section_id: number;
  marks_correct: number;
  marks_incorrect: number;
  question_type: string;
  paper_number: number;
  sort_order: number;
  question_text: string;
  difficulty: string;
  subject_name: string;
  section_name: string;
  question_image_url?: string | null;
  options: UgQuestionOption[];
}

export interface UgQuestionOption {
  option_id: number;
  option_text: string;
  option_image_url?: string | null;
}

export interface UgAttempt {
  attempt_id: number;
  test_id: number;
  exam_id: number;
  exam_name: string;
  attempt_number: number;
  paper_number: number;
  user_id: number;
  status: 'in_progress' | 'submitted';
  started_at: string;
  submitted_at?: string;
  total_score?: number;
  accuracy_percent?: number;
}

export interface AnswerPayload {
  question_id: number;
  selected_option_id?: number | null;
  selected_option_ids?: number[] | null;
  numerical_answer?: number | null;
}

export interface SubmitTestPayload {
  answers: AnswerPayload[];
}

export interface AttemptSubmitResult {
  attempt_id: number;
  totalScore: number;
  accuracy: string;
  correctCount: number;
  totalQuestions: number;
}

export interface AttemptResultDetail {
  attempt_id: number;
  test_id: number;
  exam_id?: number;
  user_id: number;
  exam_name: string;
  attempt_number?: number;
  paper_number?: number;
  has_partial_marking: number;
  status: string;
  total_score: number;
  total_marks: number;
  accuracy_percent: string;
  duration_minutes: number;
  time_taken_sec?: number | null;
  started_at: string;
  submitted_at: string;
  created_at?: string;
  updated_at?: string;
  title?: string;
  exam_type?: string;
  answers: AttemptAnswerDetail[];
}

export interface AttemptAnswerDetail {
  question_id: number;
  question_text: string;
  question_type: string;
  difficulty: string;
  explanation: string | null;
  marks_correct: number;
  marks_incorrect: number;
  subject_name: string;
  section_name: string;
  sort_order: number;
  selected_option_id: number | null;
  selected_option_ids: string | null;
  selected_option_text: string | null;
  numerical_answer: number | null;
  correct_option_id: number | null;
  correct_option_ids: string | null;
  correct_numerical: string | null;
  correct_option_text: string | null;
  question_text_snapshot?: string | null;
  is_correct: number;
  is_partial: number;
  marks_obtained: number;
  section_id?: number;
  answer_status: 'answered' | 'not_answered';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class UgTestService {
  private api = inject(ApiService);
  private readonly BASE = 'custom-ug-tests';

  /** GET /api/ug-tests/exams — all active exams, no subscription needed */
  getAvailableExams(): Observable<ApiResponse<UgExam[]>> {
    return this.api.get<ApiResponse<UgExam[]>>(`${this.BASE}/exams`);
  }

  /** GET /api/ug-tests/exams/:examCode/subjects → [{ subject_id, subject_name }] */
  getSubjectsForExam(examCode: string): Observable<ApiResponse<UgSubject[]>> {
    return this.api.get<ApiResponse<UgSubject[]>>(`${this.BASE}/exams/${examCode}/subjects`);
  }

  /** GET /api/ug-tests/chapters?subjectId=X → [{ chapter_id, chapter_name, display_order }] */
  getChaptersBySubject(subjectId: number): Observable<ApiResponse<UgChapter[]>> {
    return this.api.get<ApiResponse<any[]>>(`${this.BASE}/chapters?subjectId=${subjectId}`).pipe(
      map((res) => ({
        ...res,
        data: (res.data || []).map((c) => ({
          chapter_id: c.chapter_id ?? c.module_id,
          chapter_name: c.chapter_name ?? c.module_name,
          display_order: c.display_order ?? 0,
        })) as UgChapter[],
      })),
    );
  }

  /** POST /api/ug-tests/generate */
  generateTest(payload: GenerateTestPayload): Observable<ApiResponse<UgTest>> {
    return this.api.post<ApiResponse<UgTest>>(`${this.BASE}/generate`, payload);
  }

  /** GET /api/ug-tests */
  getMyTests(page = 1, limit = 10): Observable<ApiResponse<PaginatedResponse<UgTest>>> {
    return this.api.get<ApiResponse<PaginatedResponse<UgTest>>>(
      `${this.BASE}?page=${page}&limit=${limit}`,
    );
  }

  /** GET /api/ug-tests/:testId */
  getTestById(testId: number): Observable<ApiResponse<UgTest>> {
    return this.api.get<ApiResponse<UgTest>>(`${this.BASE}/${testId}`);
  }

  /** POST /api/ug-tests/:testId/start */
  startAttempt(testId: number): Observable<ApiResponse<UgAttempt>> {
    return this.api.post<ApiResponse<UgAttempt>>(`${this.BASE}/${testId}/start`, {});
  }

  /** POST /api/ug-tests/:testId/submit */
  submitTest(
    testId: number,
    answers: AnswerPayload[],
  ): Observable<ApiResponse<AttemptSubmitResult>> {
    return this.api.post<ApiResponse<AttemptSubmitResult>>(`${this.BASE}/${testId}/submit`, {
      answers,
    } satisfies SubmitTestPayload);
  }

  /** GET /api/ug-tests/attempts/:attemptId/results */
  getResults(attemptId: number): Observable<ApiResponse<AttemptResultDetail>> {
    return this.api.get<ApiResponse<AttemptResultDetail>>(
      `${this.BASE}/attempts/${attemptId}/results`,
    );
  }
  /** GET /api/ug-tests/exams/:examCode/pattern */
  getExamPattern(
    examCode: string,
    subjectIds: Array<string | number> = [],
    difficulty: string = '',
    moduleIds: Array<string | number> = [],
  ): Observable<ApiResponse<any>> {
    const params: Record<string, string> = {};

    if (subjectIds.length > 0) {
      params['subjectIds'] = subjectIds.join(',');
    }
    if (difficulty) {
      params['difficulty'] = difficulty;
    }
    if (moduleIds.length > 0) {
      params['moduleIds'] = moduleIds.join(',');
    }

    // Build query string manually so Angular HttpClient doesn't encode commas
    const queryString = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');

    const url = queryString
      ? `${this.BASE}/exams/${examCode}/pattern?${queryString}`
      : `${this.BASE}/exams/${examCode}/pattern`;

    return this.api.get<ApiResponse<any>>(url);
  }
}
