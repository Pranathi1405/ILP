/*
  Author: Shri Mownika
  Description: Fetches teacher's assigned courses and categories for course management page.
*/

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

@Injectable({
  providedIn: 'root',
})
export class TeacherCourseService {
  private api = inject(ApiService);

  // GET categories for dropdown
  getCategories(): Observable<any> {
    return this.api.get<any>('categories');
  }

  // GET teacher's assigned courses, optional categoryId filter
  getTeacherCourses(categoryId?: number): Observable<any> {
    const endpoint = categoryId
      ? `userCourse/teacher/courses?categoryId=${categoryId}`
      : `userCourse/teacher/courses`;
    return this.api.get<any>(endpoint);
  }
}