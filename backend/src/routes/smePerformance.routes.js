import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import * as SmePerformanceController from '../controllers/smePerformance.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/filters/subjects', SmePerformanceController.getSubjectFilters);
router.get('/filters/courses', SmePerformanceController.getCourseFilters);

router.get('/student/:studentId/stats', authorize('student'), SmePerformanceController.getStudentStats);
router.get(
  '/student/:studentId/performance-graph',
  authorize('student'),
  SmePerformanceController.getStudentPerformanceGraph
);
router.get('/student/:studentId/tests', authorize('student'), SmePerformanceController.getStudentTests);
router.get(
  '/student/:studentId/tests/:testId',
  authorize('student'),
  SmePerformanceController.getStudentTestDetail
);

router.get('/teacher/:teacherId/stats', authorize('teacher'), SmePerformanceController.getTeacherStats);
router.get(
  '/teacher/:teacherId/leaderboard',
  authorize('teacher'),
  SmePerformanceController.getTeacherLeaderboard
);
router.get(
  '/teacher/:teacherId/students',
  authorize('teacher'),
  SmePerformanceController.getTeacherStudents
);
router.get(
  '/teacher/:teacherId/students/:studentId',
  authorize('teacher'),
  SmePerformanceController.getTeacherStudentDetail
);

router.get('/parent/:parentId/stats', authorize('parent'), SmePerformanceController.getParentStats);
router.get(
  '/parent/:parentId/performance-graph',
  authorize('parent'),
  SmePerformanceController.getParentPerformanceGraph
);
router.get('/parent/:parentId/tests', authorize('parent'), SmePerformanceController.getParentTests);
router.get(
  '/parent/:parentId/tests/:testId',
  authorize('parent'),
  SmePerformanceController.getParentTestDetail
);
router.get(
  '/parent/:parentId/child-overview',
  authorize('parent'),
  SmePerformanceController.getParentChildOverview
);

export default router;
