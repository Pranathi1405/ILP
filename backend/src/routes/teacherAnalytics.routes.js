// Authors: Harshitha Ravuri,
/**
 * src/routes/teacherAnalytics.routes.js
 * ========================================
 * All routes under /api/analytics/teacher
 *
 * Every route requires:
 *   1. A valid JWT token (authenticate middleware)
 *   2. The caller must be a teacher (authorize('teacher'))
 *
 *   ORDER MATTERS IN EXPRESS!
 *   Static routes must come BEFORE dynamic routes.
 *
 * Mounted in app.js as:
 *   app.use('/api/analytics/teacher', teacherAnalyticsRouter);
 */

import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import * as TeacherAnalyticsController from '../controllers/teacherAnalytics.controller.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('teacher'));

// ─────────────────────────────────────────────────────────────────────────────
// STATIC ROUTES  (must come before dynamic routes)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/analytics/teacher/dashboard
 * Teacher's personal aggregate metrics.
 * Data source: teacher_analytics
 */
router.get('/dashboard', TeacherAnalyticsController.getTeacherDashboard);

/**
 * GET /api/analytics/teacher/courses
 * Enrollment, completion, revenue, and rating per course.
 * Data source: course_analytics
 */
router.get('/courses', TeacherAnalyticsController.getTeacherCourses);

/**
 * GET /api/analytics/teacher/tests
 * Average scores, pass rates, and attempt counts across
 * all subjects in the teacher's courses.
 * Data source: test_performance_analytics
 */
router.get('/tests', TeacherAnalyticsController.getTeacherTests);

/**
 * GET /api/analytics/teacher/live-classes
 * Attendance rate, avg duration, and participant count
 * for the teacher's last 20 live classes.
 * Data sources: live_classes + live_class_attendance
 */
router.get('/live-classes', TeacherAnalyticsController.getTeacherLiveClasses);

// ─────────────────────────────────────────────────────────────────────────────
// COURSE-LEVEL ROUTES  (static prefix /courses/:courseId, before /student/:id)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/analytics/teacher/courses/:courseId/students
 * All students enrolled in a course with progress %, avg score,
 * last activity, and course rank.
 * URL param: courseId (integer)
 * Data sources: course_enrollments + course_progress_analytics + course_leaderboard
 */
router.get('/courses/:courseId/students', TeacherAnalyticsController.getCourseStudentProgress);

/**
 * GET /api/analytics/teacher/courses/:courseId/leaderboard?limit=10
 * Top N students in a course leaderboard (default 10).
 * URL param:   courseId (integer)
 * Query param: limit (optional)
 * Data source: course_leaderboard
 */
router.get('/courses/:courseId/leaderboard', TeacherAnalyticsController.getCourseLeaderboard);

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC ROUTES  (must come AFTER all static routes)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/analytics/teacher/student/:studentId
 * A specific student's overview, course progress, and topic mastery
 * (with resolved topic names) — teacher view.
 * URL param: studentId (integer)
 * Data sources: student_dashboard_analytics + topic_mastery_analytics
 *               + course_progress_analytics + subject_modules
 */
router.get('/student/:studentId', TeacherAnalyticsController.getStudentPerformance);

export default router;