/**
 * ============================================================
 * Practice Test Routes
 * ------------------------------------------------------------
 * Module  : Practice Test Engine
 * Description:
 * Routes for student-driven practice test generation.
 * Filters by module_id (chapterIds) — no subject_id on questions.
 *
 * IMPORTANT: Static routes must come before /:testId wildcard.
 * ============================================================
 */
import { Router } from 'express';
import * as ctrl from '../controllers/practiceTest.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

const student = [authenticate, authorize('student')];
const studentAdmin = [authenticate, authorize('student', 'admin')];

// ── Static routes (must be before /:testId wildcard) ──────────

// GET  /api/practice-tests/summary
router.get('/summary', ...student, ctrl.getPracticeResultsSummary);

// GET  /api/practice-tests/attempts/:attemptId/results
router.get('/attempts/:attemptId/results', ...student, ctrl.getPracticeTestResults);

// POST /api/practice-tests/create
router.post('/create', ...student, ctrl.createPracticeTest);

// GET  /api/practice-tests
router.get('/', ...studentAdmin, ctrl.getAllPracticeTests);

// ── Wildcard /:testId routes (must be last) ────────────────────

// GET  /api/practice-tests/:testId
router.get('/:testId', ...studentAdmin, ctrl.getPracticeTest);

// POST /api/practice-tests/:testId/start
router.post('/:testId/start', ...student, ctrl.startPracticeTest);

// POST /api/practice-tests/:testId/answer
// Body: { questionId, selected_option_id?, selected_option_ids?, numerical_answer? }
// Returns instant feedback: isCorrect, correctOptionId, explanation, allOptions
router.post('/:testId/answer', ...student, ctrl.submitAnswer);

// GET  /api/practice-tests/:testId/hint/:questionId
router.get('/:testId/hint/:questionId', ...student, ctrl.getHint);

// POST /api/practice-tests/:testId/submit
// Body: { answers: [{ questionId, selected_option_id?, ... }] }
router.post('/:testId/submit', ...student, ctrl.submitPracticeTest);

export default router;