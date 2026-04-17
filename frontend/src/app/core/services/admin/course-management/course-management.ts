import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../api.service';

export interface Course {
  course_id: number;
  course_name: string;
  course_code: string;
  description: string;
  thumbnail_url: string | null;
  price: string;
  is_free: number;
  difficulty_level: string;
  medium: string;
  enrolled_students: number;
  created_at: string;
  category_id: number;
  category_name: string;
  basicPrice: number;
  proPrice: number;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CoursesResponse {
  success: boolean;
  data: {
    pagination: Pagination;
    courses: Course[];
  };
}

export interface Category {
  category_id: number;
  category_name: string;
  description: string;
  thumbnail: string;
  display_order: number;
}

export interface CourseFilters {
  search?: string;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface SubjectFilters {
  courseId?: number;
  page?: number;
  limit?: number;
}

export interface CreateSubjectPayload {
  courseId: number;
  teacherId: number;
  title: string;
  description?: string;
  displayOrder?: number;
}

export interface CreateCategoryPayload {
  categoryName: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class CourseManagementService {

  constructor(private api: ApiService) {}

  // ── Courses ─────────────────────────────────────────────────────

  getCourses(filters: CourseFilters = {}): Observable<CoursesResponse> {
    const params = new URLSearchParams();
    if (filters.search)   params.set('search',   filters.search);
    if (filters.category) params.set('category', filters.category);
    if (filters.status)   params.set('status',   filters.status);
    if (filters.page)     params.set('page',     filters.page.toString());
    if (filters.limit)    params.set('limit',    filters.limit.toString());
    params.set('_t', Date.now().toString());
    const query = params.toString();
    return this.api.get<CoursesResponse>(`courses?${query}`);
  }

  getCourseById(id: number): Observable<any> {
    return this.api.get<any>(`courses/${id}`);
  }

  createCourse(payload: any): Observable<any> {
    return this.api.post<any>('courses', payload);
  }

  updateCourse(id: number, payload: any): Observable<any> {
    return this.api.patch<any>(`courses/${id}`, payload);
  }

  deleteCourse(id: number): Observable<any> {
    return this.api.delete<any>(`courses/${id}`);
  }

  // ── Categories ──────────────────────────────────────────────────

  getCategories(search?: string): Observable<any> {
    const t = Date.now();
    const endpoint = search
      ? `categories?search=${encodeURIComponent(search)}&_t=${t}`
      : `categories?_t=${t}`;
    return this.api.get<any>(endpoint);
  }

  createCategory(payload: CreateCategoryPayload): Observable<any> {
    return this.api.post<any>('categories', payload);
  }

  // ── Subjects ────────────────────────────────────────────────────

  getSubjects(filters: SubjectFilters = {}): Observable<any> {
    const params = new URLSearchParams();
    if (filters.courseId) params.set('courseId', filters.courseId.toString());
    if (filters.page)     params.set('page',     filters.page.toString());
    if (filters.limit)    params.set('limit',    filters.limit.toString());
    params.set('_t', Date.now().toString());
    return this.api.get<any>(`subjects?${params.toString()}`);
  }

  createSubject(payload: CreateSubjectPayload): Observable<any> {
    return this.api.post<any>('subjects', payload);
  }

  // ── Teachers ────────────────────────────────────────────────────

  getTeachers(): Observable<any> {
    const t = Date.now();
    return this.api.get<any>(`admin/teachers?_t=${t}`);
  }

  getTeachersByDepartment(department: string): Observable<any> {
    return this.api.get<any>(`admin/teachers?department=${encodeURIComponent(department)}&_t=${Date.now()}`);
  }

}