/**
 * ============================================================
 * Question Routes
 * ------------------------------------------------------------
 * Module  : Question Bank
 * Author  : Nithyasri
 * Description:
 * Routes for question bank management.
 * Teachers can add, view questions for their assigned subjects.
 * ============================================================
 */
import { Router } from 'express';
import * as questionController from '../controllers/question.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// POST /api/questions — add single question (MCQ/NAT/Match List)
router.post(
  '/',
  authenticate,
  authorize('teacher'),
  questionController.addQuestion
);

// POST /api/questions/paragraph — add paragraph-based question
router.post(
  '/paragraph',
  authenticate,
  authorize('teacher'),
  questionController.addParagraphQuestion
);

// POST /api/questions/bulk — bulk add questions
router.post(
  '/bulk',
  authenticate,
  authorize('teacher'),
  questionController.addBulkQuestions
);

// GET /api/questions?subjectId=259
router.get(
  '/',
  authenticate,
  authorize('teacher', 'admin'),
  questionController.getQuestionsBySubject
);

// GET /api/questions/:id
router.get(
  '/:id',
  authenticate,
  authorize('teacher', 'admin'),
  questionController.getQuestionById
);
// PATCH /api/questions/:id — update question
router.patch(
  '/:id',
  authenticate,
  authorize('teacher'),
  questionController.updateQuestion
);

// DELETE /api/questions/:id — delete question
router.delete(
  '/:id',
  authenticate,
  authorize('teacher'),
  questionController.deleteQuestion
);

export default router;