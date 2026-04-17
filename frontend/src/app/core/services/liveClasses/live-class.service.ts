// Author: Poojitha
// Live Class API Service 
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BroadcastTokenResponse, LiveClass } from '../../../modules/teacher/pages/live-classes/models/live-class.model';
import { map } from 'rxjs/operators';
import { ApiService } from '../api.service';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class LiveClassService {
  private api = inject(ApiService);

  // API call to fetch dashboard stats
  getDashboardStats(): Observable<any> {
    return this.api.get(`live-classes/dashboard`);
  }

  // API call to schedule a new live class
  scheduleLiveClass(data: any) {
    return this.api.post<any>(`live-classes`, data);
  }

  // API call to fetch courses for the teacher
  getTeacherCourses(): Observable<any> {
    return this.api.get(`live-classes/courses`);
  }

  // API call to fetch subjects based on course
  getSubjectsByCourse(courseId: number): Observable<any> {
    return this.api.get(`live-classes/courses/${courseId}/subjects`);
  }

  // API call to fetch modules based on subject
  getModulesBySubject(subjectId: number): Observable<any> {
    return this.api.get(`live-classes/subjects/${subjectId}/modules`);
  }

  // API call to fetch upcoming or past classes
  getClasses(type: 'upcoming' | 'past'): Observable<any> {
    return this.api.get(`live-classes?type=${type}`);
  }

  // API call to search classes
  searchClasses(query: string, type: 'upcoming' | 'live' | 'past') {
    return this.api
      .get<any>(`live-classes/search?q=${query}&type=${type}`)
      .pipe(map(res => res.data));
  }

  //API call for deleting class
  deleteClass(id: string) {
    return this.api.delete(`live-classes/${id}`);
  }

  //API call for updating Live class details
  updateLiveClass(id: string, data: any) {
    return this.api.put<any>(`live-classes/${id}`, data);
  }

  //API call for getting live class by id
  getLiveClassById(id: string) {
    return this.api.get(`live-classes/${id}`);
  }

  // API call to start live class
  startClass(id: string): Observable<LiveClass> {
    return this.api
      .post<ApiResponse<LiveClass>>(`live-classes/${id}/start`, {})
      .pipe(map(res => res.data));
  }

  getBroadcastToken(id: string): Observable<BroadcastTokenResponse> {
    return this.api
      .post<ApiResponse<BroadcastTokenResponse>>(
        `live-classes/${id}/broadcast-token`,
        {}
      )
      .pipe(map(res => res.data));
  }

  resumeClass(id: string): Observable<LiveClass> {
    return this.api.post<ApiResponse<LiveClass>>(`live-classes/${id}/resume`, {})
      .pipe(map((res) => res.data));
  }

  //teacher side api for ending live class
  endClass(classId: string | number) {
    return this.api.post(`live-classes/${classId}/end`, {});
  }
  // Teacher reminder API (Incoming Stream Banner)
  getTeacherReminder(): Observable<any> {
    return this.api.get(`live-classes/teacher/reminder`);
  }

  //student side api for joining live class
  joinClass(id: string) {
    return this.api.post<ApiResponse<any>>(`live-classes/${id}/join`, {})
      .pipe(map(res => res.data.zego));
  }

  //student side api for leaving live class
  leaveClass(id: string) {
    return this.api.post(`live-classes/${id}/leave`, {});
  }


  // Student side API - fetch upcoming or past classes
  getStudentClasses(type: 'upcoming' | 'past') {
    return this.api.get<ApiResponse<any>>(`live-classes/student/classes?type=${type}`)
      .pipe(map(res => res.data));
  }
}
