import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChartConfiguration } from 'chart.js';
import {
  AdminActiveUsersPayload,
  AdminCommandCenterSnapshot,
  AdminRevenueTrendPoint,
  AdminTopCourse,
  AnalyticsService,
} from '../../../../core/services/admin/analytics/analytics.service';
import { CommandCenterChartCardComponent } from './command-center-chart-card';
import { CommandCenterKpisComponent } from './command-center-kpis';
import { CommandCenterActionsComponent } from './command-center-actions';

@Component({
  selector: 'app-admin-command-center',
  standalone: true,
  imports: [
    CommonModule,
    CommandCenterChartCardComponent,
    CommandCenterKpisComponent,
    CommandCenterActionsComponent,
  ],
  templateUrl: './admin-command-center.html',
})
export class AdminCommandCenter implements OnInit {
  private analyticsService = inject(AnalyticsService);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  isLoading = true;
  errorMessage: string | null = null;

  kpiCards: Array<{
    label: string;
    value: string;
    hint: string;
    tone: 'blue' | 'emerald' | 'amber' | 'violet' | 'rose' | 'slate';
    icon: string;
  }> = [];

  actionCards: Array<{
    label: string;
    count: string;
    description: string;
    route: string;
    tone: 'amber' | 'rose' | 'blue' | 'violet';
  }> = [];

  userGrowthChart: ChartConfiguration | null = null;
  revenueTrendChart: ChartConfiguration | null = null;
  topCoursesChart: ChartConfiguration | null = null;
  revenueBadge = 'Latest periods';

  ngOnInit(): void {
    this.analyticsService
      .getCommandCenterSnapshot()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (snapshot) => {
          this.kpiCards = this.buildKpiCards(snapshot);
          this.actionCards = this.buildActionCards(snapshot);
          this.userGrowthChart = this.buildUserGrowthChart(
            snapshot.userGrowth,
            snapshot.activeUsers,
          );
          this.revenueTrendChart = this.buildRevenueChart(snapshot.revenueTrend);
          this.topCoursesChart = this.buildTopCoursesChart(snapshot.topCourses);
          this.revenueBadge = snapshot.revenueTrend[0]?.period_type
            ? `${snapshot.revenueTrend[0].period_type} trend`
            : 'Latest periods';
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message ?? 'Something went wrong while loading analytics.';
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  private buildKpiCards(snapshot: AdminCommandCenterSnapshot) {
    const highDropout = snapshot.dropoutRate.top_dropout_courses.filter(
      (course) => Number(course.dropout_rate ?? 0) >= 20,
    ).length;
    const healthWarning =
      snapshot.pendingDoubts.summary.overdue_24h > 0 ||
      snapshot.inactiveInstructors.length > 0 ||
      highDropout > 2;

    return [
      {
        label: 'Total Users',
        value: this.formatCompact(snapshot.dashboard.total_users),
        hint: `${this.formatCompact(snapshot.dashboard.total_students)} students + ${this.formatCompact(snapshot.dashboard.total_teachers)} teachers`,
        tone: 'blue' as const,
        icon: 'users',
      },
      {
        label: 'Active Users Today',
        value: this.formatCompact(snapshot.dashboard.active_users),
        hint: `${this.formatCompact(snapshot.activeUsers.latest_active_users)} latest active pulse`,
        tone: 'emerald' as const,
        icon: 'pulse',
      },
      {
        label: 'Revenue Today',
        value: this.formatCurrencyCompact(snapshot.dashboard.revenue_today),
        hint: `${snapshot.dashboard.revenue_today_formatted} booked today`,
        tone: 'violet' as const,
        icon: 'revenue',
      },
      {
        label: 'Platform Health',
        value: healthWarning ? 'Needs Review' : 'Stable',
        hint: healthWarning
          ? `${snapshot.pendingDoubts.summary.overdue_24h} overdue doubts, ${snapshot.inactiveInstructors.length} inactive teachers`
          : 'Queues and instructor activity look stable',
        tone: healthWarning ? ('amber' as const) : ('emerald' as const),
        icon: 'doubts',
      },
    ];
  }

  private buildActionCards(snapshot: AdminCommandCenterSnapshot) {
    return [
      {
        label: 'Pending Doubts',
        count: this.formatCompact(snapshot.pendingDoubts.summary.total_pending),
        description: 'Open question queue waiting for intervention.',
        route: '/admin/notifications',
        tone: 'amber' as const,
      },
      {
        label: 'Overdue Doubts',
        count: this.formatCompact(snapshot.pendingDoubts.summary.overdue_24h),
        description: 'Doubts aging past 24 hours that need escalation.',
        route: '/admin/notifications',
        tone: 'rose' as const,
      },
      {
        label: 'High Dropout Courses',
        count: this.formatCompact(
          snapshot.dropoutRate.top_dropout_courses.filter(
            (course) => Number(course.dropout_rate ?? 0) >= 20,
          ).length,
        ),
        description: 'Courses with elevated dropout risk and lower completion.',
        route: '/admin/course-management',
        tone: 'blue' as const,
      },
      {
        label: 'Inactive Teachers',
        count: this.formatCompact(snapshot.inactiveInstructors.length),
        description: 'Teachers with no live class activity in the last 30 days.',
        route: '/admin/user-management',
        tone: 'violet' as const,
      },
    ];
  }

  private buildUserGrowthChart(
    growth: any,
    activeUsers: AdminActiveUsersPayload,
  ): ChartConfiguration {
    const registrationMap = new Map(
      (growth.data_points ?? []).map((point: any) => [
        this.normalizeDayKey(point.period),
        Number(point.new_users ?? 0),
      ]),
    );

    const orderedActive = [...(activeUsers.data_points ?? [])].sort(
      (a, b) => new Date(a.stat_date).getTime() - new Date(b.stat_date).getTime(),
    );

    const registrationSeries: number[] = orderedActive.map((point) =>
      Number(registrationMap.get(this.normalizeDayKey(point.stat_date)) ?? 0),
    );

    return {
      type: 'line',
      data: {
        labels: orderedActive.map((point) => this.formatShortDate(point.stat_date)),
        datasets: [
          {
            label: 'Active Users',
            data: orderedActive.map((point) => Number(point.active_users ?? 0)),
            borderColor: '#0ea5e9',
            backgroundColor: 'rgba(14,165,233,0.14)',
            pointBackgroundColor: '#0ea5e9',
            pointRadius: 3.5,
            pointHoverRadius: 5,
            tension: 0.35,
            fill: true,
            borderWidth: 2.6,
            yAxisID: 'y',
          },
          {
            label: 'Registrations',
            data: registrationSeries,
            borderColor: '#6366f1',
            pointBackgroundColor: '#6366f1',
            pointRadius: 3,
            pointHoverRadius: 4.5,
            tension: 0.32,
            fill: false,
            borderWidth: 2.2,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 10,
              color: '#334155',
              font: { size: 11, weight: 700 },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { size: 11, weight: 600 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: '#e2e8f0' },
            ticks: { color: '#64748b', font: { size: 11, weight: 600 } },
          },
          y1: {
            position: 'right',
            beginAtZero: true,
            grid: { drawOnChartArea: false },
            ticks: { color: '#6366f1', font: { size: 11, weight: 700 } },
          },
        },
      },
    };
  }

  private buildRevenueChart(points: AdminRevenueTrendPoint[]): ChartConfiguration {
    return {
      type: 'line',
      data: {
        labels: points.map((point) => this.formatShortDate(point.period_start_date)),
        datasets: [
          {
            label: 'Total Revenue',
            data: points.map((point) => Number(point.total_revenue ?? 0)),
            borderColor: '#0ea5e9',
            backgroundColor: 'rgba(14,165,233,0.14)',
            fill: true,
            pointRadius: 0,
            tension: 0.35,
            borderWidth: 2.8,
          },
          {
            label: 'Net Revenue',
            data: points.map((point) => Number(point.net_revenue ?? 0)),
            borderColor: '#111827',
            fill: false,
            pointRadius: 0,
            tension: 0.34,
            borderWidth: 2.2,
          },
        ],
      },
      options: {
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'line',
              boxWidth: 18,
              color: '#334155',
              font: { size: 11, weight: 700 },
            },
          },
          tooltip: {
            callbacks: {
              label: (context) =>
                ` ${context.dataset.label}: ${this.formatCurrencyCompact(Number(context.parsed.y ?? 0))}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { size: 11, weight: 600 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: '#e2e8f0' },
            ticks: {
              color: '#64748b',
              font: { size: 11, weight: 600 },
              callback: (value) => this.formatCurrencyAxis(Number(value)),
            },
          },
        },
      },
    };
  }

  private buildTopCoursesChart(courses: AdminTopCourse[]): ChartConfiguration {
    return {
      type: 'bar',
      data: {
        labels: courses.map((course) => course.course_name),
        datasets: [
          {
            label: 'Enrollments',
            data: courses.map((course) => Number(course.total_enrollments ?? 0)),
            backgroundColor: ['#0ea5e9', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa'],
            borderRadius: 12,
            borderSkipped: false,
            barThickness: 18,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.parsed.x} enrollments`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: '#e2e8f0' },
            ticks: { color: '#64748b', font: { size: 11, weight: 600 } },
          },
          y: {
            grid: { display: false },
            ticks: { color: '#334155', font: { size: 11, weight: 700 } },
          },
        },
      },
    };
  }

  private normalizeDayKey(value: string): string {
    return new Date(value).toISOString().slice(0, 10);
  }

  private formatCompact(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      notation: 'compact',
      maximumFractionDigits: value >= 1000 ? 1 : 0,
    }).format(value);
  }

  private formatCurrencyCompact(value: number): string {
    if (value >= 1e7) return `₹${(value / 1e7).toFixed(1)}Cr`;
    if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)}L`;
    if (value >= 1e3) return `₹${(value / 1e3).toFixed(1)}K`;
    return `₹${Number(value ?? 0).toFixed(0)}`;
  }

  private formatCurrencyAxis(value: number): string {
    if (value >= 1e7) return `₹${(value / 1e7).toFixed(0)}Cr`;
    if (value >= 1e5) return `₹${(value / 1e5).toFixed(0)}L`;
    if (value >= 1e3) return `₹${(value / 1e3).toFixed(0)}K`;
    return `₹${value}`;
  }

  private formatShortDate(value: string): string {
    return new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric' }).format(
      new Date(value),
    );
  }
}
