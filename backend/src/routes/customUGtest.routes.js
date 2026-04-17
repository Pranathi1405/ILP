/**
 * ============================================================
 * Custom UG Exam Test Routes
 * ------------------------------------------------------------
 * Module  : Test Generator - Custom UG Exam Engine
 * Author  : NDMATRIX
 * Description:
 * Routes for custom UG exam test generation.
 * Student picks exam, subjects, difficulty, optional chapters.
 *
 * IMPORTANT: Static routes must come before /:testId wildcard.
 * ============================================================
 */
import { Router } from 'express';
import * as customUgTestController from '../controllers/customUGtest.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// ── Static routes (must be before /:testId wildcard) ──────────

// GET /api/custom-ug-tests/exams/:examCode/pattern
// ?subjects=Mathematics,Physics  (optional)
// ?difficulty=easy               (optional)
router.get(
  '/exams/:examCode/pattern',
  authenticate,
  customUgTestController.getCustomExamPattern
);

// GET /api/custom-ug-tests/attempts/:attemptId/results
router.get(
  '/attempts/:attemptId/results',
  authenticate,
  authorize('student'),
  customUgTestController.getResults
);

// POST /api/custom-ug-tests/generate
router.post(
  '/generate',
  authenticate,
  authorize('student'),
  customUgTestController.generateCustomUgTest
);

// GET /api/custom-ug-tests
router.get(
  '/',
  authenticate,
  authorize('student', 'admin'),
  customUgTestController.getMyCustomUgTests
);
// GET /api/custom-ug-tests/exams
router.get(
  '/exams',
  authenticate,
  authorize('student'),
  customUgTestController.getAvailableExams
);

// GET /api/custom-ug-tests/exams/:examCode/subjects
router.get(
  '/exams/:examCode/subjects',
  authenticate,
  customUgTestController.getSubjectsForExam
);

// GET /api/custom-ug-tests/chapters?globalSubjectId=2
router.get(
  '/chapters',
  authenticate,
  customUgTestController.getChaptersBySubject
);


// ── Wildcard /:testId routes (must be last) ────────────────────

// GET /api/custom-ug-tests/:testId
router.get(
  '/:testId',
  authenticate,
  authorize('student', 'admin'),
  customUgTestController.getCustomUgTestById
);

// POST /api/custom-ug-tests/:testId/start
router.post(
  '/:testId/start',
  authenticate,
  authorize('student'),
  customUgTestController.startAttempt
);

// POST /api/custom-ug-tests/:testId/submit
router.post(
  '/:testId/submit',
  authenticate,
  authorize('student'),
  customUgTestController.submitTest
);

export default router;