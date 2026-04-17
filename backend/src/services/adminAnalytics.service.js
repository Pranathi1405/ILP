// Authors: Harshitha Ravuri,
// ============================================================
// adminAnalytics.service.js
// Business logic for admin analytics.
// ============================================================

import * as AnalyticsModel from '../models/analytics.model.js';
import { DATE_RANGES, INACTIVE_INSTRUCTOR_DAYS } from '../constants/analyticsTypes.js';

/**
 * Get platform-wide dashboard statistics.
 */
export const getPlatformDashboard = async () => {
  const data = await AnalyticsModel.getPlatformDashboard();

  if (!data) {
    return { message: 'No platform statistics available yet.' };
  }

  return {
    ...data,
    // Format revenue values
    total_revenue_formatted: formatCurrency(data.total_revenue),
    revenue_today_formatted: formatCurrency(data.revenue_today),
    // Doubt resolution rate
    doubt_resolution_rate: data.total_doubts > 0
      ? ((data.resolved_doubts / data.total_doubts) * 100).toFixed(1)
      : 0,
  };
};

/**
 * Get user growth data for a given time range.
 * @param {string} range - '7d', '30d', or '12m'
 */
export const getUserGrowth = async (range) => {
  // Validate range; fallback to 7d if invalid
  const validRange = Object.values(DATE_RANGES).includes(range)
    ? range
    : DATE_RANGES.SEVEN_DAYS;

  const data = await AnalyticsModel.getUserGrowth(validRange);

  return {
    range: validRange,
    data_points: data,
    // Total new users in the period
    total_new_users: data.reduce((sum, row) => sum + Number(row.new_users), 0),
  };
};

/**
 * Get active user counts for the last 7 days.
 */
export const getActiveUsers = async () => {
  const data = await AnalyticsModel.getActiveUsers();

  return {
    data_points: data,
    latest_active_users: data.length > 0 ? data[0].active_users : 0,
  };
};

/**
 * Get top courses by enrollment.
 */
export const getTopCourses = async () => {
  const courses = await AnalyticsModel.getTopCourses(10);

  return courses.map((c) => ({
    ...c,
    average_rating:            parseFloat(c.average_rating || 0).toFixed(1),
    average_completion_rate:   parseFloat(c.average_completion_rate || 0).toFixed(2),
    total_revenue_formatted:   formatCurrency(c.total_revenue),
  }));
};

/**
 * Get course completion statistics.
 */
export const getCourseCompletion = async () => {
  const data = await AnalyticsModel.getCourseCompletionStats();

  return data.map((c) => ({
    ...c,
    completion_rate: parseFloat(c.average_completion_rate || 0).toFixed(2),
    dropout_rate:    parseFloat(c.dropout_rate || 0).toFixed(2),
  }));
};

/**
 * Get dropout rate analysis.
 */
export const getDropoutRate = async () => {
  const data = await AnalyticsModel.getDropoutRate();

  return {
    platform_average: {
      ...data.platform_average,
      average_dropout_rate: parseFloat(data.platform_average.average_dropout_rate || 0).toFixed(2),
    },
    top_dropout_courses: data.top_dropout_courses.map((c) => ({
      ...c,
      dropout_rate: parseFloat(c.dropout_rate || 0).toFixed(2),
    })),
  };
};



// ─────────────────────────────────────────────
// NEW: getPaymentMethodBreakdown
// Returns chart-ready labels + data arrays grouped by payment method.
// ─────────────────────────────────────────────
export const getPaymentMethodBreakdown = async () => {
  const rows = await AnalyticsModel.getRevenueByPaymentMethod();

  return {
    labels: rows.map((r) => r.label || 'Unknown'),
    data:   rows.map((r) => parseFloat(r.total_revenue || 0)),
  };
};


// ─────────────────────────────────────────────
// NEW: getPaymentStatusDistribution
// Returns counts of each payment status (pending, completed, failed, etc.)
// ─────────────────────────────────────────────
export const getPaymentStatusDistribution = async () => {
  const rows = await AnalyticsModel.getPaymentStatusDistribution();

  return {
    labels: rows.map((r) => r.label),
    data:   rows.map((r) => Number(r.count)),
  };
};
/**
 * Get revenue trend for a given period.
 * @param {string} period - '30d' | '12m' | '3y' | 'max'  (default '30d')
 */
export const getRevenueTrend = async (period = '30d') => {
  // Validate — fallback to '30d' for any unknown value
  const validPeriods = ['30d', '12m', '3y', 'max'];
  const safePeriod   = validPeriods.includes(period) ? period : '30d';

  const rows = await AnalyticsModel.getRevenueTrend(safePeriod);

  // Pull labels (x-axis) and revenue values (y-axis) into flat arrays
  const labels = rows.map((r) => r.label);
  const data   = rows.map((r) => parseFloat(r.net_revenue  || 0));
  const total  = data.reduce((sum, v) => sum + v, 0);

  return { period: safePeriod, labels, data, total };
};

// ─────────────────────────────────────────────
// NEW: getRecentTransactions
// Returns the latest 10 transactions with student + course details.
// ─────────────────────────────────────────────
export const getRecentTransactions = async () => {
  const rows = await AnalyticsModel.getRecentTransactions();

  return rows.map((r) => ({
    date:          r.date,
    studentName:   r.studentName,
    courseName:    r.courseName   || 'N/A',
    amount:        parseFloat(r.amount || 0),
    paymentMethod: r.paymentMethod || 'Unknown',
    status:        r.status,
  }));
};


// ─────────────────────────────────────────────
// NEW: getRevenueDashboard
// Aggregated endpoint — fetches all 4 datasets in parallel using
// Promise.all to minimise total response time.
// @param {string} period - '30d' | '12m' | '3y' | 'max'
// ─────────────────────────────────────────────
export const getRevenueDashboard = async (period = '30d') => {
  // All 4 queries run concurrently — no sequential waiting
  const [
    revenueTrend,
    paymentMethodBreakdown,
    paymentStatusDistribution,
    recentTransactions,
  ] = await Promise.all([
    getRevenueTrend(period),
    getPaymentMethodBreakdown(),
    getPaymentStatusDistribution(),
    getRecentTransactions(),
  ]);

  return {
    revenueTrend,
    paymentMethodBreakdown,
    paymentStatusDistribution,
    recentTransactions,
  };
};

/**
 * Get revenue broken down by course.
 */
export const getRevenueByCourse = async () => {
  const data = await AnalyticsModel.getRevenueByCourse();

  return data.map((row) => ({
    ...row,
    total_revenue_formatted:    formatCurrency(row.total_revenue),
    revenue_per_student_formatted: formatCurrency(row.revenue_per_student),
  }));
};

/**
 * Get pending doubts.
 */
export const getPendingDoubts = async () => {
  const data = await AnalyticsModel.getPendingDoubts();

  return {
    ...data,
    doubts: data.doubts.map((d) => {
      const isOverdue =
        d.deadline_at && new Date(d.deadline_at) < new Date();

      let urgency = 'low';

      if (isOverdue) {
        urgency = 'high';
      } else if (d.hours_to_deadline !== null) {
        if (d.hours_to_deadline <= 24) urgency = 'medium';
        if (d.hours_to_deadline <= 6) urgency = 'high';
      } else {
        // fallback if no deadline
        if (d.hours_pending > 48) urgency = 'high';
        else if (d.hours_pending > 24) urgency = 'medium';
      }

      return {
        ...d,
        is_overdue: isOverdue,
        urgency,
      };
    }),
  };
};

/**
 * Get inactive instructors.
 */
export const getInactiveInstructors = async () => {
  const data = await AnalyticsModel.getInactiveInstructors(INACTIVE_INSTRUCTOR_DAYS);

  return data.map((instructor) => ({
    ...instructor,
    // Null means they never conducted a class
    last_class_date:      instructor.last_class_date || 'Never',
    days_since_last_class:instructor.days_since_last_class ?? 'N/A',
    // Risk level
    risk_level: !instructor.last_class_date || instructor.days_since_last_class > 60
      ? 'high'
      : 'medium',
  }));
};

// ─────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────

const formatCurrency = (amount) => {
  if (!amount) return '₹0.00';
  return `₹${parseFloat(amount).toFixed(2)}`;
};