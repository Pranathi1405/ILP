import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface StudentLinkedCourse {
  course_id: number;
  course_name: string;
  thumbnail_url?: string | null;
}

export interface StudentLinkedSubject {
  subject_id: number;
  subject_name: string;
  course_id?: number;
  description?: string | null;
  display_order?: number;
}

export interface StudentLinkedModule {
  module_id: number;
  module_name: string;
  subject_id?: number;
  description?: string | null;
  display_order?: number;
}

@Injectable({ providedIn: 'root' })
export class StudentCourseService {
  private api = inject(ApiService);
  private readonly base = 'userCourse/student';

  getEnrolledCourses(): Observable<ApiResponse<StudentLinkedCourse[]>> {
    return this.api.get<ApiResponse<StudentLinkedCourse[]>>(`${this.base}/enrolled-courses`);
  }

  getSubjectsByCourse(courseId: number): Observable<ApiResponse<StudentLinkedSubject[]>> {
    return this.api.get<ApiResponse<StudentLinkedSubject[]>>(`${this.base}/courses/${courseId}/subjects`);
  }

  getModulesBySubject(subjectId: number): Observable<ApiResponse<StudentLinkedModule[]>> {
    return this.api.get<ApiResponse<StudentLinkedModule[]>>(`${this.base}/subjects/${subjectId}/modules`);
  }
}
