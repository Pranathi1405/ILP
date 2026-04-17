/**
 * ============================================================
 * Admin SME Routes
 * ------------------------------------------------------------
 * Module  : SME Test Engine — Course Level
 * Author  : Harshitha Ravuri
 * Description:
 * HTTP layer for admin operations:
 *   • Create course-level SME test (parent + child tests + assignments)
 *   • Publish course SME test (with completion guard)
 * ============================================================
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  createAdminSmeTest,
  publishAdminSmeTest,
  getTestAssignments,
} from '../controllers/admin.sme.controller.js';

const router = Router();

// All routes require admin role
router.use(authenticate, authorize('admin'));

// POST   /api/admin/sme-tests
// Create a course-level SME test (parent + child tests + assignments)
router.post('/', createAdminSmeTest);

// PATCH  /api/admin/sme-tests/:id/publish
// Publish the parent test (blocked if any assignment is incomplete)
router.patch('/:id/publish', publishAdminSmeTest);

// GET    /api/admin/sme-tests/:id/assignments
// View assignment statuses for a parent test
router.get('/:id/assignments', getTestAssignments);

export default router;