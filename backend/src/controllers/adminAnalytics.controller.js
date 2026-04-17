// Authors: Harshitha Ravuri
// ============================================================
// adminAnalytics.controller.js
// HTTP request handlers for admin analytics endpoints.
// ============================================================

import * as AdminAnalyticsService from '../services/adminAnalytics.service.js';

const sendSuccess = (res, data, message = 'Success') => {
  res.status(200).json({ success: true, message, data });
};

const sendError = (res, error, statusCode = 500) => {
  console.error('[AdminAnalyticsController] Error:', error);
  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal server error',
  });
};

// ─────────────────────────────────────────────

/**
 * GET /analytics/admin/dashboard
 * Returns platform-wide statistics.
 */
export const getPlatformDashboard = async (req, res) => {
  try {
    const data = await AdminAnalyticsService.getPlatformDashboard();
    sendSuccess(res, data, 'Platform dashboard fetched successfully');
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /analytics/admin/user-growth?range=7d|30d|12m
 * Returns user registration trend data.
 */
export const getUserGrowth = async (req, res) => {
  try {
    const range = req.query.range || '7d';
    const data  = await AdminAnalyticsService.getUserGrowth(range);
    sendSuccess(res, data, 'User growth data fetched successfully');
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /analytics/admin/active-users
 * Returns active user counts for the last 7 days.
 */
export const getActiveUsers = async (req, res) => {
  try {
    const data = await AdminAnalyticsService.getActiveUsers();
    sendSuccess(res, data, 'Active users data fetched successfully');
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /analytics/admin/top-courses
 * Returns the top 10 courses by enrollment.
 */
export const getTopCourses = async (req, res) => {
  try {
    const data = await AdminAnalyticsService.getTopCourses();
    sendSuccess(res, data, 'Top courses fetched successfully');
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /analytics/admin/course-completion
 * Returns completion rate statistics per course.
 */
export const getCourseCompletion = async (req, res) => {
  try {
    const data = await AdminAnalyticsService.getCourseCompletion();
    sendSuccess(res, data, 'Course completion stats fetched successfully');
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /analytics/admin/dropout-rate
 * Returns dropout rate analysis across all courses.
 */
export const getDropoutRate = async (req, res) => {
  try {
    const data = await AdminAnalyticsService.getDropoutRate();
    sendSuccess(res, data, 'Dropout rate data fetched successfully');
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /analytics/admin/revenue-trend?period=30d
 * Returns revenue trend data for the requested period.
 * period: '30d' | '12m' | '3y' | 'max'  (default: '30d')
 */
export const getRevenueTrend = async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const data   = await AdminAnalyticsService.getRevenueTrend(period);
    sendSuccess(res, data, 'Revenue trend fetched successfully');
  } catch (error) {
    sendError(res, error);
  }
};


// ─────────────────────────────────────────────
// NEW: getRevenueDashboard
// Single aggregated endpoint for the Revenue Dashboard page.
// ─────────────────────────────────────────────

/**
 * GET /analytics/admin/revenue-dashboard?period=30d
 * Returns all revenue dashboard data in one call.
 */
export const getRevenueDashboard = async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const data   = await AdminAnalyticsService.getRevenueDashboard(period);
    sendSuccess(res, data, 'Revenue dashboard fetched successfully');
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /analytics/admin/revenue-by-course
 * Returns revenue broken down by individual course.
 */
export const getRevenueByCourse = async (req, res) => {
  try {
    const data = await AdminAnalyticsService.getRevenueByCourse();
    sendSuccess(res, data, 'Revenue by course fetched successfully');
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /analytics/admin/pending-doubts
 * Returns open/unresolved doubts awaiting instructor response.
 */
export const getPendingDoubts = async (req, res) => {
  try {
    const data = await AdminAnalyticsService.getPendingDoubts();
    sendSuccess(res, data, 'Pending doubts fetched successfully');
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /analytics/admin/inactive-instructors
 * Returns instructors who haven't conducted a class in 30+ days.
 */
export const getInactiveInstructors = async (req, res) => {
  try {
    const data = await AdminAnalyticsService.getInactiveInstructors();
    sendSuccess(res, data, 'Inactive instructors fetched successfully');
  } catch (error) {
    sendError(res, error);
  }
};