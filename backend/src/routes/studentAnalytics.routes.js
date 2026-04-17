// Author: Harshitha Ravuri,
/**
 * src/routes/studentAnalytics.routes.js
 * ========================================
 * All routes under /api/analytics/student
 *
 * Every route requires:
 *   1. A valid JWT token (authenticate middleware)
 *   2. The caller must be a student (authorize('student'))
 *
 * Mounted in app.js as:
 *   app.use('/api/analytics/student', studentAnalyticsRouter);
 */

import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import * as StudentAnalyticsController from '../controllers/studentAnalytics.controller.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('student'));

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT ANALYTICS ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/analytics/student/overview
 * Overall dashboard metrics (enrolled courses, streaks, score trend, rank…).
 * Data source: student_dashboard_analytics
 */
router.get('/overview', StudentAnalyticsController.getStudentOverview);

/**
 * GET /api/analytics/student/courses
 * Progress data for all enrolled courses.
 * Data source: course_progress_analytics
 */
router.get('/courses', StudentAnalyticsController.getStudentCourses);

/**
 * GET /api/analytics/student/subjects?courseId=<id>
 * Subject-level analytics for a specific course.
 * Query param: courseId (required)
 * Data source: topic_mastery_analytics (grouped by subject)
 */
router.get('/subjects', StudentAnalyticsController.getStudentSubjectAnalytics);

/**
 * GET /api/analytics/student/tests
 * Test performance per subject with trend direction.
 * Data source: test_performance_analytics
 */
router.get('/tests', StudentAnalyticsController.getStudentTestPerformance);

/**
 * GET /api/analytics/student/leaderboard
 * Global leaderboard + the student's own rank entry.
 * Data source: leaderboard
 */
router.get('/leaderboard', StudentAnalyticsController.getStudentLeaderboard);

/**
 * GET /api/analytics/student/topic-mastery
 * All topics grouped by mastery level (STRONG / AVERAGE / WEAK),
 * with resolved topic names from subject_modules.
 * Data source: topic_mastery_analytics JOIN subject_modules
 */
router.get('/topic-mastery', StudentAnalyticsController.getStudentTopicMastery);

/**
 * GET /api/analytics/student/score-trend?limit=10
 * Recent test attempts in chronological order with per-attempt score
 * diff and trend direction (increase / decrease / stable).
 * Query param: limit (optional, default 10)
 * Data source: test_attempts JOIN tests
 */
router.get('/score-trend', StudentAnalyticsController.getStudentScoreTrend);

/**
 * GET /api/analytics/student/course-rank?courseId=<id>
 * Student's rank within a course plus rank comparison
 * (vs class average and top performer).
 * Query param: courseId (required)
 * Data source: course_leaderboard
 */
router.get('/course-rank', StudentAnalyticsController.getStudentCourseRank);

export default router;