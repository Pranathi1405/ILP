/**
 * ============================================================
 * Teacher SME Routes
 * ------------------------------------------------------------
 * Module  : Course-Level SME Test Engine
 * Author  : Harshitha Ravuri
 * ============================================================
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  getAssignedTests,
  addQuestionWithCompletion,
  removeQuestionWithCompletion,
  editQuestion,
  getCompletionStatus,
} from '../controllers/teacher.sme.controller.js';

const router = Router();

router.use(authenticate, authorize('teacher'));


// GET    /api/teacher/sme-tests/assigned
// All course-SME tests assigned to this teacher
router.get('/assigned', getAssignedTests);

// GET    /api/teacher/sme-tests/:id/completion-status
// Current section-level completion state
router.get('/:id/completion-status', getCompletionStatus);

// POST   /api/teacher/sme-tests/:id/questions
// Add question (QB or manual) + trigger assignment completion check
// Optional body field: module_id
router.post('/:id/questions', addQuestionWithCompletion);

// PATCH  /api/teacher/sme-tests/:id/questions/:qid
// Edit an existing question's text / options / marks
router.patch('/:id/questions/:qid', editQuestion);

// DELETE /api/teacher/sme-tests/:id/questions/:qid
// Remove question + re-evaluate completion
router.delete('/:id/questions/:qid', removeQuestionWithCompletion);

export default router;