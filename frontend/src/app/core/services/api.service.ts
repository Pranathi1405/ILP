/**
 * AUTHOR: Umesh Teja Peddi
 *
 * API Service
 * -----------
 * Centralized HTTP communication layer for the application.
 *
 * Purpose:
 * Provides reusable wrapper methods for GET, POST, PUT, PATCH,
 * and DELETE requests while automatically attaching the base API URL
 * and enabling credential-based authentication.
 *
 * Usage:
 * Injected into feature services to standardize backend API
 * interactions and avoid repetitive HttpClient configurations.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrl;

  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${endpoint}`, {
      observe: 'body',
      withCredentials: true,
    });
  }

  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${endpoint}`, body, {
      observe: 'body',
      withCredentials: true,
    });
  }

  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${endpoint}`, body, {
      observe: 'body',
      withCredentials: true,
    });
  }

  patch<T>(endpoint: string, body: any): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}/${endpoint}`, body, {
      observe: 'body',
      withCredentials: true,
    });
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}/${endpoint}`, {
      observe: 'body',
      withCredentials: true,
    });
  }
}
