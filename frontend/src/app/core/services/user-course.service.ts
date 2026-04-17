import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class UserCourseService {
  private api = inject(ApiService);

  getEnrolledCourses(): Observable<{ success: boolean; message: string; data: any[] }> {
    return this.api.get<{ success: boolean; message: string; data: any[] }>(
      'userCourse/student/enrolled-courses',
    );
  }

  getCourseSubjects(
    courseId: number,
  ): Observable<{ success: boolean; message: string; data: any[] }> {
    return this.api.get<{ success: boolean; message: string; data: any[] }>(
      `userCourse/student/courses/${courseId}/subjects`,
    );
  }
}
