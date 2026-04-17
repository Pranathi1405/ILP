/**
 * AUTHOR: Umesh Teja Peddi
 *
 * User Management Service
 * -----------------------
 * Manages admin-side user operations including fetching users,
 * filtering, pagination, role handling, and account actions.
 *
 * Purpose:
 * Acts as the centralized data layer for Admin User Management,
 * handling API communication, lightweight caching, and
 * reactive user directory state.
 *
 * Responsibilities:
 * - Fetch and cache paginated user lists
 * - Add teachers and admin users
 * - Suspend and reinstate accounts
 * - Approve and reject teachers
 * - Keep local user state in sync after mutations
 *
 * Usage:
 * Injected into admin user management components to load users
 * and perform account lifecycle operations.
 */

import { Injectable, signal, inject } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';
import { ApiService } from '../../api.service';

// ── Backend response shape ────────────────────────────────────────────────────
export interface UserResponse {
  user_id: number;
  email: string;
  full_name: string;
  joined_date: string;
  role: 'student' | 'teacher' | 'parent' | 'admin';
  status: 0 | 1;
  /** Only present for teachers: 1 = approved, 0 = pending. null for all other roles. */
  approval: number | null;
}

// ── Frontend model ────────────────────────────────────────────────────────────
export type UserRole = 'STUDENT' | 'TEACHER' | 'PARENT' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING';

export interface User {
  user_id: number;
  email: string;
  name: string;
  created_at: string;
  user_type: UserRole;
  status: UserStatus;
  /** Only present for teachers: 1 = approved, 0 = pending. null for all other roles. */
  approval: number | null;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserFilters {
  role?: string; // 'student' | 'teacher' | 'parent' | 'admin' | undefined for all
  status?: string; // 'active' | 'suspended' | 'pending' | undefined for all
  search?: string;
  page?: number;
  limit?: number;
}

// ── Add user payloads ─────────────────────────────────────────────────────────
export interface Teacher extends User {
  user_type: 'TEACHER';
  countryCode: string;
  contactNumber: string;
  department: string;
}

export interface AddTeacherPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string; // countryCode + contactNumber
  department: string;
}

export interface AddAdminPayload {
  email: string;
  role: string;
  permissions: Record<string, boolean>;
}

export interface UserMutationResponse {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

// ── Mapper ────────────────────────────────────────────────────────────────────
function mapUser(r: UserResponse): User {
  return {
    user_id: r.user_id,
    email: r.email,
    name: r.full_name.trim(),
    created_at: r.joined_date,
    user_type: r.role.toUpperCase() as UserRole,
    status:
      r.approval === 0 && r.role === 'teacher'
        ? 'PENDING'
        : r.status === 1
          ? 'ACTIVE'
          : 'SUSPENDED',
    approval: r.approval ?? null,
  };
}

@Injectable({ providedIn: 'root' })
export class UserManagement {
  private readonly api = inject(ApiService);
  private readonly listCacheTtlMs = 5 * 60 * 1000;
  private readonly usersQueryCache = new Map<
    string,
    { fetchedAt: number; stream: Observable<{ data: UserResponse[]; pagination: Pagination }> }
  >();

  users = signal<User[]>([]);
  pagination = signal<Pagination>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  isLoading = signal(false);
  error = signal<string | null>(null);

  fetchUsers(
    filters: UserFilters = {},
  ): Observable<{ data: UserResponse[]; pagination: Pagination }> {
    this.isLoading.set(true);
    this.error.set(null);

    const params = new URLSearchParams();
    if (filters.role) params.set('role', filters.role);
    if (filters.status) params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    params.set('page', String(filters.page ?? 1));
    params.set('limit', String(filters.limit ?? 10));
    const queryKey = params.toString();
    const cached = this.usersQueryCache.get(queryKey);

    if (cached && Date.now() - cached.fetchedAt < this.listCacheTtlMs) {
      return cached.stream;
    }

    const request$ = this.api
      .get<{ data: UserResponse[]; pagination: Pagination }>(`admin/users?${params.toString()}`)
      .pipe(
        tap({
          next: (res) => {
            this.users.set(res.data.map(mapUser));
            this.pagination.set(res.pagination);
            this.isLoading.set(false);
          },
          error: (err) => {
            this.error.set(err?.error?.error ?? 'Failed to fetch users.');
            this.isLoading.set(false);
          },
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    this.usersQueryCache.set(queryKey, { fetchedAt: Date.now(), stream: request$ });

    return request$;
  }

  addTeacher(payload: AddTeacherPayload): Observable<UserMutationResponse> {
    return this.api
      .post<UserMutationResponse>('admin/teachers/add', payload)
      .pipe(tap(() => this.invalidateUserListCache()));
  }

  addAdmin(payload: AddAdminPayload): Observable<UserMutationResponse> {
    return this.api
      .post<UserMutationResponse>('admin/admin-invitation', payload)
      .pipe(tap(() => this.invalidateUserListCache()));
  }

  suspendUser(userId: number): Observable<void> {
    return this.api.post<void>(`admin/suspend/${userId}`, {}).pipe(
      tap({
        next: () => {
          this.invalidateUserListCache();
          this.users.update((users) =>
            users.map((u) => (u.user_id === userId ? { ...u, status: 'SUSPENDED' as const } : u)),
          );
        },
        error: (err) => this.error.set(err?.error?.error ?? 'Failed to suspend user.'),
      }),
    );
  }

  reinstateUser(userId: number): Observable<void> {
    return this.api.post<void>(`admin/reinstate/${userId}`, {}).pipe(
      tap({
        next: () => {
          this.invalidateUserListCache();
          this.users.update((users) =>
            users.map((u) => (u.user_id === userId ? { ...u, status: 'ACTIVE' as const } : u)),
          );
        },
        error: (err) => this.error.set(err?.error?.error ?? 'Failed to reinstate user.'),
      }),
    );
  }

  approveTeacher(userId: number): Observable<void> {
    return this.api.post<void>(`admin/teachers/${userId}/approve`, {}).pipe(
      tap({
        next: () => {
          // Mark approved locally — no refetch needed
          this.invalidateUserListCache();
          this.users.update((users) =>
            users.map((u) =>
              u.user_id === userId ? { ...u, approval: 1, status: 'ACTIVE' as const } : u,
            ),
          );
        },
        error: (err) => this.error.set(err?.error?.error ?? 'Failed to approve teacher.'),
      }),
    );
  }

  rejectTeacher(userId: number): Observable<void> {
    return this.api.post<void>(`admin/teachers/${userId}/reject`, {}).pipe(
      tap({
        next: () => {
          // Remove the rejected teacher from the list — backend deletes the user row
          this.invalidateUserListCache();
          this.users.update((users) => users.filter((u) => u.user_id !== userId));
          this.pagination.update((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
        },
        error: (err) => this.error.set(err?.error?.error ?? 'Failed to reject teacher.'),
      }),
    );
  }

  private invalidateUserListCache(): void {
    this.usersQueryCache.clear();
  }
}
