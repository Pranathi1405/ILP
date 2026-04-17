//Authors: Harshitha Ravuri,
/**
 * src/routes/adminAnalytics.routes.js
 * ========================================
 * All routes under /api/analytics/admin
 *
 * Every route requires:
 *   1. A valid JWT token (authenticate middleware)
 *   2. The caller must be an admin (authorize('admin'))
 *
 * All routes are static (no dynamic :id segments in this file).
 *
 * Mounted in app.js as:
 *   app.use('/api/analytics/admin', adminAnalyticsRouter);
 */

import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import * as AdminAnalyticsController from '../controllers/adminAnalytics.controller.js';

const router = express.Router();

// Every route in this file requires a valid JWT token + admin role
router.use(authenticate);
router.use(authorize('admin'));

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ANALYTICS ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/analytics/admin/dashboard
 * Returns today's platform-wide snapshot.
 * Data source: platform_statistics (most recent row)
 */
router.get('/dashboard', AdminAnalyticsController.getPlatformDashboard);

/**
 * GET /api/analytics/admin/user-growth?range=7d|30d|12m
 * Returns new user registration trend data.
 * Query param: range (optional, default '7d')
 * Data source: platform_statistics
 */
router.get('/user-growth', AdminAnalyticsController.getUserGrowth);

/**
 * GET /api/analytics/admin/active-users
 * Returns daily active user counts for the last 7 days.
 * Data source: platform_statistics
 */
router.get('/active-users', AdminAnalyticsController.getActiveUsers);

/**
 * GET /api/analytics/admin/top-courses
 * Returns the top 10 courses by enrollment count.
 * Data source: course_analytics
 */
router.get('/top-courses', AdminAnalyticsController.getTopCourses);

/**
 * GET /api/analytics/admin/course-completion
 * Returns completion rates and dropout rates per course.
 * Data source: course_analytics
 */
router.get('/course-completion', AdminAnalyticsController.getCourseCompletion);

/**
 * GET /api/analytics/admin/dropout-rate
 * Returns platform-average dropout rate + top 10 high-dropout courses.
 * Data source: course_analytics
 */
router.get('/dropout-rate', AdminAnalyticsController.getDropoutRate);
/**
 * GET /api/analytics/admin/revenue-trend?period=30d|12m|3y|max
 * Returns revenue trend grouped by period.
 * Query param: period (optional, default '30d')
 * Data source: payments table (live aggregation)
 */
router.get('/revenue-trend', AdminAnalyticsController.getRevenueTrend);

/**
 * GET /api/analytics/admin/revenue-dashboard?period=30d|12m|3y|max
 * Returns all revenue dashboard data in one call:
 *   revenueTrend, paymentMethodBreakdown,
 *   paymentStatusDistribution, recentTransactions
 * Query param: period (optional, default '30d')
 * Data source: payments table
 */
router.get('/revenue-dashboard', AdminAnalyticsController.getRevenueDashboard);

/**
 * GET /api/analytics/admin/revenue-by-course
 * Returns total revenue and revenue-per-student per course.
 * Data sources: revenue_analytics + course_analytics
 */
router.get('/revenue-by-course', AdminAnalyticsController.getRevenueByCourse);

/**
 * GET /api/analytics/admin/pending-doubts
 * Returns all open doubts with urgency flags (low/medium/high).
 * Doubts open > 24 h are flagged is_overdue = true.
 * Data source: doubt_posts
 */
router.get('/pending-doubts', AdminAnalyticsController.getPendingDoubts);

/**
 * GET /api/analytics/admin/inactive-instructors
 * Returns teachers who have not conducted a live class in 30+ days.
 * Derived from: live_classes + teacher_analytics
 */
router.get('/inactive-instructors', AdminAnalyticsController.getInactiveInstructors);

export default router;