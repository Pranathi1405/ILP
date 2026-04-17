/**
 * ============================================================
 * Admin SME Routes
 * ------------------------------------------------------------
 * Module  : Course-Level SME Test Engine
 * Author  : Harshitha Ravuri
 * ============================================================
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  createAdminSmeTest,
  getAdminSmeTests,
  publishAdminSmeTest,
  getTestAssignments,
} from '../controllers/admin.sme.controller.js';

const router = Router();

router.use(authenticate, authorize('admin'));

// POST  /api/admin/sme-tests
// Create a course-level SME test (parent + child tests + assignments)
router.post('/', createAdminSmeTest);

// GET   /api/admin/sme-tests
// List all course-level SME tests (admin dashboard)
router.get('/', getAdminSmeTests);

// GET   /api/admin/sme-tests/:id/assignments
// View per-subject assignment status for a parent test
router.get('/:id/assignments', getTestAssignments);

// PATCH /api/admin/sme-tests/:id/publish
// Publish — blocked if any assignment is not completed
router.patch('/:id/publish', publishAdminSmeTest);

export default router;