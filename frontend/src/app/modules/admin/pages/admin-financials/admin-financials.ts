/**
 * AUTHOR: Umesh Teja Peddi
 *
 * Admin Financials Component
 * --------------------------
 * Renders the finance dashboard for administrators with
 * revenue charts, KPI cards, transaction insights, and
 * period-based filtering.
 *
 * Purpose:
 * Presents financial analytics from the admin analytics service
 * in a dashboard-oriented view with reusable chart cards.
 *
 * Responsibilities:
 * - Load revenue dashboard data
 * - Load revenue-by-course data
 * - Switch dashboard period ranges
 * - Build chart configurations for financial views
 * - Format KPI values for display
 *
 * Usage:
 * Loaded from the admin financials route under `/admin/financials`.
 */

import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChartConfiguration } from 'chart.js';

import {
  AnalyticsService,
  RevenueByCourseItem,
  RevenueDashboardPayload,
  RevenueDashboardPeriod,
  RevenueDistribution,
  RevenueTransaction,
} from '../../../../core/services/admin/analytics/analytics.service';
import { FinanceKpisComponent } from './finance-kpis';
import { FinanceRecentTransactionsComponent } from './finance-recent-transactions';
import { CommandCenterChartCardComponent } from '../admin-command-center/command-center-chart-card';

@Component({
  selector: 'app-admin-finance-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CommandCenterChartCardComponent,
    FinanceKpisComponent,
    FinanceRecentTransactionsComponent,
  ],
  templateUrl: './admin-financials.html',
})
export class AdminFinanceDashboard implements OnInit {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly periodOptions: Array<{ value: RevenueDashboardPeriod; label: string }> = [
    { value: '30d', label: '30D' },
    { value: '12m', label: '12M' },
    { value: '3y', label: '3Y' },
    { value: 'max', label: 'Max' },
  ];

  isLoading = true;
  errorMessage: string | null = null;
  selectedPeriod: RevenueDashboardPeriod = '30d';

  kpiCards: Array<{
    label: string;
    value: string;
    hint: string;
    tone: 'violet' | 'emerald' | 'blue' | 'rose';
    icon: string;
  }> = [];

  revenueTrendChart: ChartConfiguration | null = null;
  revenueByCourseChart: ChartConfiguration | null = null;
  paymentStatusChart: ChartConfiguration | null = null;

  recentTransactions: RevenueTransaction[] = [];
  revenueBadge = '30D Trend';

  ngOnInit(): void {
    forkJoin({
      dashboard: this.analyticsService.getRevenueDashboard(this.selectedPeriod),
      revenueByCourse: this.analyticsService.getRevenueByCourse(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ dashboard, revenueByCourse }) => {
          this.buildKpiCards(dashboard);

          this.revenueTrendChart = this.buildRevenueTrendChart(dashboard.revenueTrend);
          this.revenueByCourseChart = this.buildRevenueByCourseChart(revenueByCourse || []);

          this.paymentStatusChart = this.buildPaymentStatusChart(
            dashboard.paymentStatusDistribution,
          );

          this.recentTransactions = dashboard.recentTransactions || [];

          this.revenueBadge = `${this.getPeriodLabel(this.selectedPeriod)} Trend`;

          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to load finance dashboard';
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  onPeriodSelect(period: RevenueDashboardPeriod): void {
    if (this.selectedPeriod === period || this.isLoading) return;

    this.selectedPeriod = period;
    this.isLoading = true;
    this.errorMessage = null;

    this.analyticsService
      .getRevenueDashboard(this.selectedPeriod)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (dashboard) => {
          this.buildKpiCards(dashboard);
          this.revenueTrendChart = this.buildRevenueTrendChart(dashboard.revenueTrend);
          this.paymentStatusChart = this.buildPaymentStatusChart(
            dashboard.paymentStatusDistribution,
          );
          this.recentTransactions = dashboard.recentTransactions || [];
          this.revenueBadge = `${this.getPeriodLabel(this.selectedPeriod)} Trend`;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to load finance dashboard';
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  private getPeriodLabel(period: RevenueDashboardPeriod): string {
    return this.periodOptions.find((option) => option.value === period)?.label ?? '30D';
  }

  private buildKpiCards(data: RevenueDashboardPayload): void {
    this.kpiCards = [
      {
        label: 'Total Revenue',
        value: this.formatCurrencyCompact(data.revenueTrend?.total || 0),
        hint: 'Lifetime revenue',
        tone: 'violet',
        icon: 'revenue',
      },
      {
        label: 'Revenue This Month',
        value: this.formatCurrencyCompact(
          data.revenueTrend?.monthlyTotal || data.revenueTrend?.total || 0,
        ),
        hint: 'Current month',
        tone: 'emerald',
        icon: 'calendar',
      },
      {
        label: 'Revenue Today',
        value: this.formatCurrencyCompact(data.revenueTrend?.todayRevenue || 0),
        hint: 'Today bookings',
        tone: 'blue',
        icon: 'today',
      },
      {
        label: 'Total Transactions',
        value: this.formatCompact(data.revenueTrend?.totalTransactions || 0),
        hint: 'All payments processed',
        tone: 'rose',
        icon: 'transactions',
      },
    ];
  }

  private buildRevenueTrendChart(
    trend?: RevenueDashboardPayload['revenueTrend'],
  ): ChartConfiguration {
    return {
      type: 'line',
      data: {
        labels: trend?.labels || [],
        datasets: [
          {
            label: 'Revenue',
            data: trend?.data || [],
            borderColor: '#0ea5e9',
            backgroundColor: 'rgba(14, 165, 233, 0.12)',
            tension: 0.4,
            fill: true,
            borderWidth: 3,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    };
  }

  private buildRevenueByCourseChart(courses: RevenueByCourseItem[]): ChartConfiguration {
    return {
      type: 'bar',
      data: {
        labels: courses.map((course) => course.course_name || course.courseName || 'Untitled'),
        datasets: [
          {
            label: 'Revenue',
            data: courses.map((course) => Number(course.total_revenue ?? course.revenue ?? 0)),
            backgroundColor: '#10b981',
            borderRadius: 12,
            barThickness: 18, // 🔽 reduced size
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
      },
    };
  }

  private buildPaymentStatusChart(data?: RevenueDistribution): ChartConfiguration {
    return {
      type: 'doughnut',
      data: {
        labels: data?.labels || [],
        datasets: [
          {
            data: data?.data || [],
            backgroundColor: ['#10b981', '#eab308', '#ef4444', '#64748b'],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    };
  }

  private formatCompact(value: number): string {
    return new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(value);
  }

  private formatCurrencyCompact(value: number): string {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    return `₹${value.toLocaleString('en-IN')}`;
  }
}
