// Authors: Harshitha Ravuri
// ============================================================
// studentAnalytics.controller.js
// HTTP request handlers for student analytics endpoints.
// Controllers: receive request → call service → send response.
// ============================================================

import * as StudentAnalyticsService from '../services/studentAnalytics.service.js';
import { getStudentIdByUserId } from '../models/targetResolution.model.js';

const sendSuccess = (res, data, message = 'Success') => {
  res.status(200).json({ success: true, message, data });
};

const sendError = (res, error, statusCode = 500) => {
  console.error('[StudentAnalyticsController] Error:', error);
  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal server error',
  });
};

// ─────────────────────────────────────────────

/**
 * GET /analytics/student/overview
 * Returns the student's overall dashboard metrics.
 */
export const getStudentOverview = async (req, res) => {
  try {
    const studentId = await getStudentIdByUserId(req.user.id);
    const data = await StudentAnalyticsService.getStudentOverview(studentId);
    sendSuccess(res, data, 'Student overview fetched successfully');
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /analytics/student/courses
 * Returns progress data for all courses the student is enrolled in.
 */
export const getStudentCourses = async (req, res) => {
  try {
    const studentId = await getStudentIdByUserId(req.user.id);
    const data = await StudentAnalyticsService.getStudentCourses(studentId);
    sendSuccess(res, data, 'Course progress fetched successfully');
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /analytics/student/subjects?courseId=
 * Returns subject-level analytics for a student in a specific course.
 * Requires 'courseId' query param.
 */
export const getStudentSubjectAnalytics = async (req, res) => {
  try {
    const studentId = await getStudentIdByUserId(req.user.id);
    const courseId  = req.query.courseId;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'courseId query parameter is required',
      });
    }

    const data = await StudentAnalyticsService.getStudentSubjectAnalytics(
      studentId,
      parseInt(courseId)
    );
    sendSuccess(res, data, 'Subject analytics fetched successfully');
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /analytics/student/tests
 * Returns test performance analytics for the student.
 */
export const getStudentTestPerformance = async (req, res) => {
  try {
    const studentId = await getStudentIdByUserId(req.user.id);
    const data = await StudentAnalyticsService.getStudentTestPerformance(studentId);
    sendSuccess(res, data, 'Test performance fetched successfully');
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /analytics/student/leaderboard
 * Returns the global leaderboard with the student's own rank.
 */
export const getStudentLeaderboard = async (req, res) => {
  try {
    const studentId = await getStudentIdByUserId(req.user.id);
    const data = await StudentAnalyticsService.getStudentLeaderboard(studentId);
    sendSuccess(res, data, 'Leaderboard fetched successfully');
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /analytics/student/topic-mastery
 * Returns topic mastery details grouped by mastery level,
 * with resolved topic names from subject_modules.
 */
export const getStudentTopicMastery = async (req, res) => {
  try {
    const studentId = await getStudentIdByUserId(req.user.id);
    const data = await StudentAnalyticsService.getStudentTopicMastery(studentId);
    sendSuccess(res, data, 'Topic mastery fetched successfully');
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /analytics/student/score-trend?limit=10
 * Returns recent test attempts in chronological order with
 * per-attempt score diff and trend direction.
 *
 * Uses JWT user_id (not student_id) because test_attempts references users.user_id.
 */
export const getStudentScoreTrend = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data  = await StudentAnalyticsService.getStudentScoreTrend(req.user.id, limit);
    sendSuccess(res, data, 'Score trend fetched successfully');
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /analytics/student/course-rank?courseId=
 * Returns the student's rank within a course and a comparison
 * against class average and top performer.
 *
 * Requires 'courseId' query param.
 */
export const getStudentCourseRank = async (req, res) => {
  try {
    const studentId = await getStudentIdByUserId(req.user.id);
    const courseId  = parseInt(req.query.courseId);

    if (!courseId || isNaN(courseId)) {
      return res.status(400).json({
        success: false,
        message: 'courseId query parameter is required and must be a valid integer',
      });
    }

    const data = await StudentAnalyticsService.getStudentCourseRank(studentId, courseId);
    sendSuccess(res, data, 'Course rank fetched successfully');
  } catch (error) {
    sendError(res, error);
  }
};