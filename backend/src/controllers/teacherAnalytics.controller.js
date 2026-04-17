// Authors: Harshitha Ravuri
// ============================================================
// teacherAnalytics.controller.js
// HTTP request handlers for teacher analytics endpoints.
// ============================================================

import * as TeacherAnalyticsService from '../services/teacherAnalytics.service.js';
import { getTeacherIdByUserId } from '../models/targetResolution.model.js';

const sendSuccess = (res, data, message = 'Success') => {
  res.status(200).json({ success: true, message, data });
};

const sendError = (res, error, statusCode = 500) => {
  console.error('[TeacherAnalyticsController] Error:', error);
  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal server error',
  });
};

// ─────────────────────────────────────────────

/**
 * GET /analytics/teacher/dashboard
 * Returns the teacher's personal analytics dashboard.
 */
export const getTeacherDashboard = async (req, res) => {
  try {
    const teacherId = await getTeacherIdByUserId(req.user.id);
    const data = await TeacherAnalyticsService.getTeacherDashboard(teacherId);
    sendSuccess(res, data, 'Teacher dashboard fetched successfully');
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /analytics/teacher/courses
 * Returns analytics for all courses created by the teacher.
 */
export const getTeacherCourses = async (req, res) => {
  try {
    const teacherId = await getTeacherIdByUserId(req.user.id);
    const data = await TeacherAnalyticsService.getTeacherCourses(teacherId);
    sendSuccess(res, data, 'Course analytics fetched successfully');
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /analytics/teacher/tests
 * Returns test analytics across all the teacher's courses.
 */
export const getTeacherTests = async (req, res) => {
  try {
    const teacherId = await getTeacherIdByUserId(req.user.id);
    const data = await TeacherAnalyticsService.getTeacherTests(teacherId);
    sendSuccess(res, data, 'Test analytics fetched successfully');
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /analytics/teacher/student/:studentId
 * Returns detailed performance of a specific student (teacher view).
 */
export const getStudentPerformance = async (req, res) => {
  try {
    const teacherId = await getTeacherIdByUserId(req.user.id);
    const studentId = parseInt(req.params.studentId);

    if (!studentId || isNaN(studentId)) {
      return res.status(400).json({ success: false, message: 'Valid studentId is required' });
    }

    const data = await TeacherAnalyticsService.getStudentPerformance(teacherId, studentId);
    sendSuccess(res, data, 'Student performance fetched successfully');
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /analytics/teacher/live-classes
 * Returns live class attendance and engagement analytics for a teacher.
 */
export const getTeacherLiveClasses = async (req, res) => {
  try {
    const teacherId = await getTeacherIdByUserId(req.user.id);
    const data = await TeacherAnalyticsService.getTeacherLiveClasses(teacherId);
    sendSuccess(res, data, 'Live class analytics fetched successfully');
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /analytics/teacher/courses/:courseId/students
 * Returns all students in a course with progress %, avg score, last activity, and rank.
 *
 * URL param: courseId (integer)
 */
export const getCourseStudentProgress = async (req, res) => {
  try {
    const teacherId = await getTeacherIdByUserId(req.user.id);
    const courseId  = parseInt(req.params.courseId);

    if (!courseId || isNaN(courseId)) {
      return res.status(400).json({ success: false, message: 'Valid courseId is required' });
    }

    const data = await TeacherAnalyticsService.getTeacherCourseStudentProgress(teacherId, courseId);
    sendSuccess(res, data, 'Course student progress fetched successfully');
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /analytics/teacher/courses/:courseId/leaderboard?limit=10
 * Returns the top N students in a course leaderboard.
 *
 * URL param:   courseId (integer)
 * Query param: limit (optional, default 10)
 */
export const getCourseLeaderboard = async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const limit    = parseInt(req.query.limit) || 10;

    if (!courseId || isNaN(courseId)) {
      return res.status(400).json({ success: false, message: 'Valid courseId is required' });
    }

    const data = await TeacherAnalyticsService.getTeacherCourseLeaderboard(courseId, limit);
    sendSuccess(res, data, 'Course leaderboard fetched successfully');
  } catch (error) {
    sendError(res, error);
  }
};