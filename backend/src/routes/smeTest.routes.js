/**
 * ============================================================
 * SME Test Routes
 * ------------------------------------------------------------
 * Module  : SME Test Engine
 * Author  : NDMATRIX
 * Description:
 * Defines API routes for SME test creation, question
 * management, attempt flow, results and analytics.
 * ============================================================
 */
import { Router } from 'express';
import * as smeTestController from '../controllers/smeTest.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// ── Static / non-parameterized routes FIRST ──────────────────

// POST   /api/sme-tests
router.post('/', authenticate, authorize('teacher'), smeTestController.createSmeTest);

// GET    /api/sme-tests
router.get('/', authenticate, authorize('teacher', 'student', 'admin'), smeTestController.getSmeTests);

// GET    /api/sme-tests/teacher/dealing-subjects
router.get('/teacher/dealing-subjects', authenticate, authorize('teacher'), smeTestController.getTeacherDealingSubjects);

// GET    /api/sme-tests/exams
router.get('/exams', authenticate, authorize('teacher', 'student'), smeTestController.getExams);

// GET    /api/sme-tests/exams/:examCode/subjects
router.get('/exams/:examCode/subjects', authenticate, smeTestController.getSubjects);

// GET    /api/sme-tests/chapters
router.get('/chapters', authenticate, smeTestController.getChapters);

// GET    /api/sme-tests/attempts/:attemptId/results  ← MUST be before /:id
router.get('/attempts/:attemptId/results', authenticate, authorize('student'), smeTestController.getResults);

// ── Parameterized sub-routes BEFORE bare /:id ─────────────────

// GET    /api/sme-tests/:id/available-questions
router.get('/:id/available-questions', authenticate, authorize('teacher'), smeTestController.getAvailableQuestions);

// POST   /api/sme-tests/:id/questions
router.post('/:id/questions', authenticate, authorize('teacher'), smeTestController.addQuestion);

// DELETE /api/sme-tests/:id/questions/:qid
router.delete('/:id/questions/:qid', authenticate, authorize('teacher'), smeTestController.removeQuestion);

// PATCH  /api/sme-tests/:id/publish
router.patch('/:id/publish', authenticate, authorize('teacher'), smeTestController.publishTest);

//student side routes for attempting and submitting tests

// POST   /api/sme-tests/:id/start
router.post('/:id/start', authenticate, authorize('student'), smeTestController.startAttempt);

// POST   /api/sme-tests/:id/submit
router.post('/:id/submit', authenticate, authorize('student'), smeTestController.submitTest);

// GET    /api/sme-tests/:id/analytics
router.get('/:id/analytics', authenticate, authorize('teacher'), smeTestController.getSmeTestAnalytics);

// ── Bare /:id routes LAST ─────────────────────────────────────

// GET    /api/sme-tests/:id
router.get('/:id', authenticate, authorize('teacher', 'student', 'admin'), smeTestController.getSmeTestById);

// PATCH  /api/sme-tests/:id  → update test meta + questions
router.patch('/:id', authenticate, authorize('teacher'), smeTestController.updateSmeTest);

// DELETE /api/sme-tests/:id
router.delete('/:id', authenticate, authorize('teacher', 'admin'), smeTestController.deleteSmeTest);

export default router;