/**
 * ============================================================
 * Student SME Routes
 * ------------------------------------------------------------
 * Module  : SME Test Engine — Course Level
 * Author  : Harshitha Ravuri
 * Description:
 * HTTP layer for student-facing course SME test operations:
 * ============================================================
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  getFullPublishedTests,
  getPattern,
  getTestQuestions,
  startAttempt,
  submitTest,
  getTestResults,
} from '../controllers/student.sme.controller.js';

const router = Router();

// ── Static routes (no :id param) ─────────────────────────────

// GET  /api/sme-tests/full
// All published parent (course-level) SME tests with timing_status
router.get('/full', authenticate, authorize('student'), getFullPublishedTests);

// ── Parameterised routes ──────────────────────────────────────

// GET  /api/sme-tests/:id/pattern
// Section/marking structure for a test
router.get('/:id/pattern', authenticate, authorize('student', 'teacher'), getPattern);

// GET  /api/sme-tests/:id/questions
// Full test with questions for a student to read/attempt
router.get('/:id/questions', authenticate, authorize('student'), getTestQuestions);

// POST /api/sme-tests/:id/start
// Begin (or resume) an attempt
router.post('/:id/start', authenticate, authorize('student'), startAttempt);

// POST /api/sme-tests/:id/submit
// Submit answers: { answers: [{ question_id, selected_option_id }] }
router.post('/:id/submit', authenticate, authorize('student'), submitTest);

// GET  /api/sme-tests/:id/results
// Extended results with metrics (available after test ends)
router.get('/:id/results', authenticate, authorize('student'), getTestResults);

export default router;