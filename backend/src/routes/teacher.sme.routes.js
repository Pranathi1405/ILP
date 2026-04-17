/**
 * ============================================================
 * Teacher SME Routes
 * ------------------------------------------------------------
 * Module  : SME Test Engine — Course Level
 * Author  : Harshitha Ravuri,
 * Description:
 * HTTP layer for teacher operations in the course SME flow:
 * ============================================================
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  getAssignedTests,
  addQuestionWithCompletion,
  removeQuestionWithCompletion,
  handleDocumentParse,
  getCompletionStatus,
} from '../controllers/teacher.sme.controller.js';

const router = Router();

// All routes require teacher role
router.use(authenticate, authorize('teacher'));

// GET  /api/teacher/sme-tests/assigned
// List all course SME tests assigned to this teacher
router.get('/assigned', getAssignedTests);

// POST /api/teacher/sme-tests/:id/questions
// Add question (QB or manual) + trigger assignment completion check
// Body supports optional: { module_id: number }
router.post('/:id/questions', addQuestionWithCompletion);

// DELETE /api/teacher/sme-tests/:id/questions/:qid
// Remove question + re-check completion
router.delete('/:id/questions/:qid', removeQuestionWithCompletion);

// POST /api/teacher/sme-tests/:id/parse-document
// Handle result of a document parsing attempt
// Body: { parsed_count, required_count }
router.post('/:id/parse-document', handleDocumentParse);

// GET  /api/teacher/sme-tests/:id/completion-status
// Check current assignment completion state
router.get('/:id/completion-status', getCompletionStatus);

export default router;