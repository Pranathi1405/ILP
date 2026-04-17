import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

@Injectable({
  providedIn: 'root',
})
export class CourseService {
  private api = inject(ApiService);

  // GET all courses
  getCourses(filters?: any): Observable<any> {
    const params = new URLSearchParams();
    params.set('page', String(filters?.page ?? 1));
    params.set('limit', String(filters?.limit ?? 10));
    params.set('search', String(filters?.search ?? '').trim());
    params.set('categoryId', String(filters?.categoryId ?? ''));

    return this.api.get<any>(`courses?${params.toString()}`);
  }

  // GET single course
  getCourseById(id: string): Observable<any> {
    return this.api.get<any>(`courses/${id}`);
  }

  // GET categories
  getCategories(): Observable<any> {
    return this.api.get<any>('categories');
  }

  // GET modules
  getModules(filters?: any): Observable<any> {
    const params = new URLSearchParams();
    if (filters?.subjectId != null) {
      params.set('subjectId', String(filters.subjectId));
    }
    params.set('page', String(filters?.page ?? 1));
    params.set('limit', String(filters?.limit ?? 10));
    params.set('sortBy', String(filters?.sortBy ?? ''));
    params.set('order', String(filters?.order ?? ''));

    return this.api.get<any>(`modules?${params.toString()}`);
  }

  // GET module by ID
  getModuleById(id: number): Observable<any> {
    return this.api.get<any>(`modules/${id}`);
  }

  // GET subject
  getSubjectById(id: number): Observable<any> {
    return this.api.get<any>(`subjects/${id}`);
  }
}
