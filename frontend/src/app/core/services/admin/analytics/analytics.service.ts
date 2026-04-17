/**
 * AUTHOR: Umesh Teja Peddi
 *
 * Analytics Service
 * -----------------
 * Centralized service for admin analytics and reporting data.
 * Handles command center metrics, revenue dashboards, course
 * performance, user growth, and supporting fallback data.
 *
 * Purpose:
 * Provides a normalized analytics access layer with caching for
 * frequently reused admin dashboard requests.
 *
 * Responsibilities:
 * - Load command center snapshot data
 * - Normalize analytics payloads for admin pages
 * - Cache command center and financial dashboard reads
 * - Expose typed revenue dashboard models
 * - Provide fallback data for resilient UI rendering
 *
 * Usage:
 * Injected into admin analytics pages such as command center
 * and financial dashboards.
 */

import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, shareReplay, timeout } from 'rxjs';
import { ApiService } from '../../api.service';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/* ===================== MODELS ===================== */

export interface AdminPlatformDashboard {
  total_users: number;
  active_users: number;
  new_users_today: number;
  total_students: number;
  total_teachers: number;
  total_courses: number;
  published_courses: number;
  total_enrollments: number;
  new_enrollments_today: number;
  total_revenue: number;
  revenue_today: number;
  total_tests_taken: number;
  total_live_classes: number;
  total_doubts: number;
  resolved_doubts: number;
  average_platform_rating: number;
  stat_date: string;
  total_revenue_formatted: string;
  revenue_today_formatted: string;
  doubt_resolution_rate: number | string;
}

export interface AdminUserGrowthPoint {
  period: string;
  new_users: number;
  total_users: number;
}

export interface AdminUserGrowthPayload {
  range: string;
  data_points: AdminUserGrowthPoint[];
  total_new_users: number;
}

export interface AdminActiveUsersPoint {
  stat_date: string;
  active_users: number;
  total_users: number;
}

export interface AdminActiveUsersPayload {
  data_points: AdminActiveUsersPoint[];
  latest_active_users: number;
}

export interface AdminTopCourse {
  course_id: number;
  course_name: string;
  thumbnail_url?: string | null;
  total_enrollments: number;
  average_completion_rate: number | string;
  average_test_score: number | string;
  average_rating: number | string;
  total_revenue: number | string;
  total_revenue_formatted: string;
}

export interface AdminDropoutCourse {
  course_id: number;
  course_name: string;
  dropout_rate: number | string;
  total_enrollments: number;
  completed_students?: number;
}

export interface AdminDropoutRatePayload {
  platform_average: {
    average_dropout_rate: number | string;
    highest_dropout_rate?: number | string;
    lowest_dropout_rate?: number | string;
  };
  top_dropout_courses: AdminDropoutCourse[];
}

export interface AdminRevenueTrendPoint {
  period_type: string;
  period_start_date: string;
  period_end_date: string;
  total_revenue: number | string;
  net_revenue: number | string;
  total_transactions: number;
  successful_transactions: number;
  refund_amount: number | string;
  average_transaction_value: number | string;
  total_revenue_formatted: string;
  net_revenue_formatted: string;
  refund_amount_formatted: string;
}

export interface AdminPendingDoubt {
  doubt_id: number;
  title: string;
  status: string;
  created_at: string;
  course_id: number;
  course_title: string;
  first_name: string;
  last_name: string;
  hours_pending: number;
  is_overdue: boolean;
  urgency: 'low' | 'medium' | 'high';
}

export interface AdminPendingDoubtsPayload {
  summary: {
    total_pending: number;
    overdue_24h: number;
  };
  doubts: AdminPendingDoubt[];
}

export interface AdminInactiveInstructor {
  teacher_id: number;
  first_name: string;
  last_name: string;
  email: string;
  total_courses_created: number;
  total_students: number;
  last_class_date: string;
  days_since_last_class: number | string;
  risk_level: 'medium' | 'high';
}

export interface AdminCommandCenterSnapshot {
  dashboard: AdminPlatformDashboard;
  userGrowth: AdminUserGrowthPayload;
  activeUsers: AdminActiveUsersPayload;
  revenueTrend: AdminRevenueTrendPoint[];
  topCourses: AdminTopCourse[];
  pendingDoubts: AdminPendingDoubtsPayload;
  dropoutRate: AdminDropoutRatePayload;
  inactiveInstructors: AdminInactiveInstructor[];
}

export interface DashboardAnalytics {
  totalUsers: number;
  activeUsers: number;
  courses: number;
  revenue: number;
}

export type RevenueDashboardPeriod = '30d' | '12m' | '3y' | 'max';

export interface RevenueDashboardTrend {
  period?: string;
  labels?: string[];
  data?: number[];
  total?: number;
  monthlyTotal?: number;
  todayRevenue?: number;
  totalTransactions?: number;
}

export interface RevenueDistribution {
  labels?: string[];
  data?: number[];
}

export interface RevenueTransaction {
  transaction_id?: number | string;
  amount?: number | string;
  status?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface RevenueDashboardPayload {
  revenueTrend?: RevenueDashboardTrend;
  paymentStatusDistribution?: RevenueDistribution;
  recentTransactions?: RevenueTransaction[];
  [key: string]: unknown;
}

export interface RevenueByCourseItem {
  course_name?: string;
  courseName?: string;
  total_revenue?: number | string;
  revenue?: number | string;
  [key: string]: unknown;
}

/* ===================== SERVICE ===================== */

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly api = inject(ApiService);
  private readonly analyticsTimeoutMs = 8000;
  private readonly cacheTtlMs = 5 * 60 * 1000;

  private snapshot$?: Observable<AdminCommandCenterSnapshot>;
  private snapshotFetchedAt = 0;
  private readonly revenueDashboardCache = new Map<
    RevenueDashboardPeriod,
    { fetchedAt: number; stream: Observable<RevenueDashboardPayload> }
  >();
  private revenueByCourse$?: Observable<RevenueByCourseItem[]>;
  private revenueByCourseFetchedAt = 0;

  /* ================= SNAPSHOT ================= */

  getCommandCenterSnapshot(): Observable<AdminCommandCenterSnapshot> {
    const now = Date.now();

    if (this.snapshot$ && now - this.snapshotFetchedAt < this.cacheTtlMs) {
      return this.snapshot$;
    }

    this.snapshot$ = forkJoin({
      dashboard: this.getDashboard(),
      userGrowth: this.getUserGrowth(),
      activeUsers: this.getActiveUsers(),
      revenueTrend: this.getRevenueTrend(),
      topCourses: this.getTopCourses(),
      pendingDoubts: this.getPendingDoubts(),
      dropoutRate: this.getDropoutRate(),
      inactiveInstructors: this.getInactiveInstructors(),
    }).pipe(
      // refCount: false keeps the multicasted value alive even with 0 subscribers,
      // so re-subscribers within the TTL window still get the cached emission.
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.snapshotFetchedAt = now;

    return this.snapshot$;
  }

  refreshCommandCenterSnapshot(): void {
    this.snapshot$ = undefined;
    this.snapshotFetchedAt = 0;
  }

  refreshRevenueDashboard(period?: RevenueDashboardPeriod): void {
    if (period) {
      this.revenueDashboardCache.delete(period);
      return;
    }

    this.revenueDashboardCache.clear();
  }

  refreshRevenueByCourse(): void {
    this.revenueByCourse$ = undefined;
    this.revenueByCourseFetchedAt = 0;
  }

  /* ================= API METHODS ================= */

  getDashboard(): Observable<AdminPlatformDashboard> {
    return this.api.get<ApiEnvelope<AdminPlatformDashboard>>('analytics/admin/dashboard').pipe(
      timeout(this.analyticsTimeoutMs),
      map((res) => this.normalizeDashboard(res.data)),
      catchError(() => of(this.getFallbackDashboard())),
    );
  }

  getUserGrowth(range: '7d' | '30d' | '12m' = '7d'): Observable<AdminUserGrowthPayload> {
    return this.api
      .get<ApiEnvelope<AdminUserGrowthPayload>>(`analytics/admin/user-growth?range=${range}`)
      .pipe(
        timeout(this.analyticsTimeoutMs),
        map((res) => ({
          ...res.data,
          data_points: (res.data.data_points ?? []).map((p) => ({
            period: p.period,
            new_users: Number(p.new_users ?? 0),
            total_users: Number(p.total_users ?? 0),
          })),
          total_new_users: Number(res.data.total_new_users ?? 0),
        })),
        catchError(() => of(this.getFallbackUserGrowth())),
      );
  }

  getActiveUsers(): Observable<AdminActiveUsersPayload> {
    return this.api.get<ApiEnvelope<AdminActiveUsersPayload>>('analytics/admin/active-users').pipe(
      timeout(this.analyticsTimeoutMs),
      map((res) => ({
        latest_active_users: Number(res.data.latest_active_users ?? 0),
        data_points: [...(res.data.data_points ?? [])]
          .map((p) => ({
            stat_date: p.stat_date,
            active_users: Number(p.active_users ?? 0),
            total_users: Number(p.total_users ?? 0),
          }))
          .sort((a, b) => new Date(a.stat_date).getTime() - new Date(b.stat_date).getTime()),
      })),
      catchError(() => of(this.getFallbackActiveUsers())),
    );
  }

  getTopCourses(limit = 5): Observable<AdminTopCourse[]> {
    return this.api.get<ApiEnvelope<AdminTopCourse[]>>('analytics/admin/top-courses').pipe(
      timeout(this.analyticsTimeoutMs),
      map((res) =>
        (res.data ?? []).slice(0, limit).map((c) => ({
          ...c,
          total_enrollments: Number(c.total_enrollments ?? 0),
          average_completion_rate: Number(c.average_completion_rate ?? 0),
          average_test_score: Number(c.average_test_score ?? 0),
          average_rating: Number(c.average_rating ?? 0),
          total_revenue: Number(c.total_revenue ?? 0),
        })),
      ),
      catchError(() => of(this.getFallbackTopCourses().slice(0, limit))),
    );
  }

  getDropoutRate(): Observable<AdminDropoutRatePayload> {
    return this.api.get<ApiEnvelope<AdminDropoutRatePayload>>('analytics/admin/dropout-rate').pipe(
      timeout(this.analyticsTimeoutMs),
      map((res) => ({
        platform_average: {
          ...res.data.platform_average,
          average_dropout_rate: Number(res.data.platform_average?.average_dropout_rate ?? 0),
          highest_dropout_rate: Number(res.data.platform_average?.highest_dropout_rate ?? 0),
          lowest_dropout_rate: Number(res.data.platform_average?.lowest_dropout_rate ?? 0),
        },
        // Kept full normalization from original (v2 skipped per-course coercion)
        top_dropout_courses: (res.data.top_dropout_courses ?? []).map((c) => ({
          ...c,
          dropout_rate: Number(c.dropout_rate ?? 0),
          total_enrollments: Number(c.total_enrollments ?? 0),
          completed_students: Number(c.completed_students ?? 0),
        })),
      })),
      catchError(() => of(this.getFallbackDropoutRate())),
    );
  }

  getRevenueTrend(): Observable<AdminRevenueTrendPoint[]> {
    return this.api
      .get<ApiEnvelope<AdminRevenueTrendPoint[]>>('analytics/admin/revenue-trend')
      .pipe(
        timeout(this.analyticsTimeoutMs),
        map((res) => this.normalizeRevenueTrend(res.data ?? [])),
        catchError(() => of(this.getFallbackRevenueTrend())),
      );
  }

  getPendingDoubts(): Observable<AdminPendingDoubtsPayload> {
    return of(this.getFallbackPendingDoubts());
  }

  getInactiveInstructors(): Observable<AdminInactiveInstructor[]> {
    return this.api
      .get<ApiEnvelope<AdminInactiveInstructor[]>>('analytics/admin/inactive-instructors')
      .pipe(
        timeout(this.analyticsTimeoutMs),
        map((res) =>
          (res.data ?? []).map((t) => ({
            ...t,
            total_courses_created: Number(t.total_courses_created ?? 0),
            total_students: Number(t.total_students ?? 0),
            days_since_last_class:
              t.days_since_last_class === 'N/A' ? 'N/A' : Number(t.days_since_last_class ?? 0),
          })),
        ),
        catchError(() => of(this.getFallbackInactiveInstructors())),
      );
  }

  /* ================= NORMALIZERS ================= */

  private normalizeDashboard(data: AdminPlatformDashboard): AdminPlatformDashboard {
    return {
      ...data,
      total_users: Number(data.total_users ?? 0),
      active_users: Number(data.active_users ?? 0),
      new_users_today: Number(data.new_users_today ?? 0),
      total_students: Number(data.total_students ?? 0),
      total_teachers: Number(data.total_teachers ?? 0),
      total_courses: Number(data.total_courses ?? 0),
      published_courses: Number(data.published_courses ?? 0),
      total_enrollments: Number(data.total_enrollments ?? 0),
      new_enrollments_today: Number(data.new_enrollments_today ?? 0),
      total_revenue: Number(data.total_revenue ?? 0),
      revenue_today: Number(data.revenue_today ?? 0),
      total_tests_taken: Number(data.total_tests_taken ?? 0),
      total_live_classes: Number(data.total_live_classes ?? 0),
      total_doubts: Number(data.total_doubts ?? 0),
      resolved_doubts: Number(data.resolved_doubts ?? 0),
      average_platform_rating: Number(data.average_platform_rating ?? 0),
      doubt_resolution_rate: Number(data.doubt_resolution_rate ?? 0),
    };
  }

  private normalizeRevenueTrend(points: AdminRevenueTrendPoint[]): AdminRevenueTrendPoint[] {
    if (!points.length) return [];

    const grouped = new Map<string, AdminRevenueTrendPoint[]>();
    for (const point of points) {
      const key = String(point.period_type ?? 'daily').toLowerCase();
      grouped.set(key, [...(grouped.get(key) ?? []), point]);
    }

    const preferredKey = grouped.has('daily')
      ? 'daily'
      : grouped.has('weekly')
        ? 'weekly'
        : grouped.has('monthly')
          ? 'monthly'
          : [...grouped.keys()][0];

    return [...(grouped.get(preferredKey) ?? [])]
      .map((point) => ({
        ...point,
        total_revenue: Number(point.total_revenue ?? 0),
        net_revenue: Number(point.net_revenue ?? 0),
        refund_amount: Number(point.refund_amount ?? 0),
        average_transaction_value: Number(point.average_transaction_value ?? 0),
        total_transactions: Number(point.total_transactions ?? 0),
        successful_transactions: Number(point.successful_transactions ?? 0),
      }))
      .sort(
        (a, b) => new Date(a.period_start_date).getTime() - new Date(b.period_start_date).getTime(),
      )
      .slice(-12);
  }

  /* ================= FALLBACKS ================= */

  private getFallbackDashboard(): AdminPlatformDashboard {
    return {
      total_users: 12452,
      active_users: 3480,
      new_users_today: 126,
      total_students: 12294,
      total_teachers: 158,
      total_courses: 84,
      published_courses: 76,
      total_enrollments: 18760,
      new_enrollments_today: 92,
      total_revenue: 12000000,
      revenue_today: 185000,
      total_tests_taken: 0,
      total_live_classes: 0,
      total_doubts: 480,
      resolved_doubts: 412,
      average_platform_rating: 4.6,
      stat_date: new Date().toISOString(),
      total_revenue_formatted: 'Rs 1.2Cr',
      revenue_today_formatted: 'Rs 1.85L',
      doubt_resolution_rate: 85.8,
    };
  }

  private getFallbackUserGrowth(): AdminUserGrowthPayload {
    const dates = this.getRecentDates(7);
    const newUsers = [72, 86, 91, 110, 124, 138, 126];

    return {
      range: '7d',
      total_new_users: newUsers.reduce((sum, value) => sum + value, 0),
      data_points: dates.map((date, index) => ({
        period: date,
        new_users: newUsers[index] ?? 0,
        total_users: 11800 + index * 110,
      })),
    };
  }

  private getFallbackActiveUsers(): AdminActiveUsersPayload {
    const dates = this.getRecentDates(7);
    const activeUsers = [2580, 2740, 2890, 3010, 3240, 3390, 3480];

    return {
      latest_active_users: activeUsers[activeUsers.length - 1] ?? 0,
      data_points: dates.map((date, index) => ({
        stat_date: date,
        active_users: activeUsers[index] ?? 0,
        total_users: 11800 + index * 110,
      })),
    };
  }

  private getFallbackTopCourses(): AdminTopCourse[] {
    return [
      {
        course_id: 1,
        course_name: 'NEET Biology Mastery',
        total_enrollments: 1240,
        average_completion_rate: 78,
        average_test_score: 82,
        average_rating: 4.7,
        total_revenue: 2850000,
        total_revenue_formatted: 'Rs 28.5L',
      },
      {
        course_id: 2,
        course_name: 'JEE Advanced Mathematics',
        total_enrollments: 1165,
        average_completion_rate: 74,
        average_test_score: 79,
        average_rating: 4.6,
        total_revenue: 2640000,
        total_revenue_formatted: 'Rs 26.4L',
      },
      {
        course_id: 3,
        course_name: 'Physics Rank Booster',
        total_enrollments: 1032,
        average_completion_rate: 71,
        average_test_score: 77,
        average_rating: 4.5,
        total_revenue: 2280000,
        total_revenue_formatted: 'Rs 22.8L',
      },
      {
        course_id: 4,
        course_name: 'Organic Chemistry Mastery',
        total_enrollments: 948,
        average_completion_rate: 69,
        average_test_score: 76,
        average_rating: 4.4,
        total_revenue: 2140000,
        total_revenue_formatted: 'Rs 21.4L',
      },
      {
        course_id: 5,
        course_name: 'Class 10 Foundation Science',
        total_enrollments: 884,
        average_completion_rate: 81,
        average_test_score: 84,
        average_rating: 4.8,
        total_revenue: 1730000,
        total_revenue_formatted: 'Rs 17.3L',
      },
    ];
  }

  private getFallbackDropoutRate(): AdminDropoutRatePayload {
    return {
      platform_average: {
        average_dropout_rate: 12.4,
        highest_dropout_rate: 27.1,
        lowest_dropout_rate: 4.8,
      },
      top_dropout_courses: [
        {
          course_id: 10,
          course_name: 'Crash Course Algebra',
          dropout_rate: 27.1,
          total_enrollments: 420,
          completed_students: 306,
        },
        {
          course_id: 11,
          course_name: 'Competitive Physics Sprint',
          dropout_rate: 23.4,
          total_enrollments: 380,
          completed_students: 291,
        },
        {
          course_id: 12,
          course_name: 'Organic Chemistry Booster',
          dropout_rate: 20.6,
          total_enrollments: 395,
          completed_students: 314,
        },
      ],
    };
  }

  private getFallbackRevenueTrend(): AdminRevenueTrendPoint[] {
    const dates = this.getRecentDates(7);
    const totalRevenue = [118000, 132000, 141000, 156000, 162000, 174000, 185000];
    const netRevenue = [103000, 116000, 125000, 139000, 146000, 157000, 168000];

    return dates.map((date, index) => ({
      period_type: 'daily',
      period_start_date: date,
      period_end_date: date,
      total_revenue: totalRevenue[index] ?? 0,
      net_revenue: netRevenue[index] ?? 0,
      total_transactions: 80 + index * 5,
      successful_transactions: 74 + index * 5,
      refund_amount: 4000 + index * 400,
      average_transaction_value: 1800 + index * 60,
      total_revenue_formatted: '',
      net_revenue_formatted: '',
      refund_amount_formatted: '',
    }));
  }

  private getFallbackPendingDoubts(): AdminPendingDoubtsPayload {
    return {
      summary: {
        total_pending: 12,
        overdue_24h: 4,
      },
      doubts: [
        {
          doubt_id: 101,
          title: 'Need help with integration by parts shortcut',
          status: 'open',
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          course_id: 11,
          course_title: 'JEE Advanced Mathematics',
          first_name: 'Aarav',
          last_name: 'Sharma',
          hours_pending: 6,
          is_overdue: false,
          urgency: 'medium',
        },
        {
          doubt_id: 102,
          title: 'Confused about aldehyde reaction mechanism',
          status: 'open',
          created_at: new Date(Date.now() - 29 * 60 * 60 * 1000).toISOString(),
          course_id: 14,
          course_title: 'Organic Chemistry Mastery',
          first_name: 'Diya',
          last_name: 'Verma',
          hours_pending: 29,
          is_overdue: true,
          urgency: 'high',
        },
        {
          doubt_id: 103,
          title: 'Wave optics derivation step mismatch',
          status: 'open',
          created_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
          course_id: 9,
          course_title: 'Physics Rank Booster',
          first_name: 'Kabir',
          last_name: 'Singh',
          hours_pending: 18,
          is_overdue: false,
          urgency: 'low',
        },
      ],
    };
  }

  private getFallbackInactiveInstructors(): AdminInactiveInstructor[] {
    return [
      {
        teacher_id: 1,
        first_name: 'Riya',
        last_name: 'Kapoor',
        email: 'riya.kapoor@example.com',
        total_courses_created: 4,
        total_students: 320,
        last_class_date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_last_class: 35,
        risk_level: 'medium',
      },
      {
        teacher_id: 2,
        first_name: 'Arjun',
        last_name: 'Mehta',
        email: 'arjun.mehta@example.com',
        total_courses_created: 3,
        total_students: 248,
        last_class_date: new Date(Date.now() - 49 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_last_class: 49,
        risk_level: 'high',
      },
    ];
  }

  /* ================= UTILITIES ================= */

  private getRecentDates(days: number): string[] {
    return Array.from({ length: days }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (days - 1 - index));
      return date.toISOString().split('T')[0]; // "YYYY-MM-DD" — consistent, no time drift
    });
  }
  getRevenueDashboard(period: RevenueDashboardPeriod = '30d'): Observable<RevenueDashboardPayload> {
    const cached = this.revenueDashboardCache.get(period);
    if (cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) {
      return cached.stream;
    }

    const request$ = this.api
      .get<ApiEnvelope<RevenueDashboardPayload>>(`analytics/admin/revenue-dashboard?period=${period}`)
      .pipe(
        timeout(this.analyticsTimeoutMs),
        map((res) => res.data),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    this.revenueDashboardCache.set(period, { fetchedAt: Date.now(), stream: request$ });

    return request$;
  }

  getRevenueByCourse(): Observable<RevenueByCourseItem[]> {
    if (this.revenueByCourse$ && Date.now() - this.revenueByCourseFetchedAt < this.cacheTtlMs) {
      return this.revenueByCourse$;
    }

    this.revenueByCourse$ = this.api
      .get<ApiEnvelope<RevenueByCourseItem[]>>('analytics/admin/revenue-by-course')
      .pipe(
        timeout(this.analyticsTimeoutMs),
        map((res) => res.data ?? []),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    this.revenueByCourseFetchedAt = Date.now();

    return this.revenueByCourse$;
  }
}
