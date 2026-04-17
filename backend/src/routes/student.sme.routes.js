/**
 * ============================================================
 * Student SME Routes
 * ------------------------------------------------------------
 * Module  : Course-Level SME Test Engine
 * Author  : Harshitha Ravuri
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

// NOTE: Register BEFORE existing smeTest routes in app.js so /full and
// /pattern don't get caught by the existing /:id handler.

// GET  /api/sme-tests/full
// Published parent (course-level) SME tests with timing_status
router.get('/full', authenticate, authorize('student'), getFullPublishedTests);

// GET  /api/sme-tests/:id/pattern
// Section / marking scheme for a test
router.get('/:id/pattern', authenticate, authorize('student', 'teacher'), getPattern);

// GET  /api/sme-tests/:id/questions
// Full test with questions (student takes test)
router.get('/:id/questions', authenticate, authorize('student'), getTestQuestions);

// POST /api/sme-tests/:id/start
// Begin or resume an attempt
router.post('/:id/start', authenticate, authorize('student'), startAttempt);

// POST /api/sme-tests/:id/submit
// Submit answers: { answers: [{ question_id, selected_option_id }] }
router.post('/:id/submit', authenticate, authorize('student'), submitTest);

// GET  /api/sme-tests/:id/results
// Extended results with accuracy metrics (available after test ends)
router.get('/:id/results', authenticate, authorize('student'), getTestResults);

export default router;