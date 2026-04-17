/**
 * src/routes/parentAnalytics.routes.js
 * ========================================
 * All routes under /api/analytics/parent
 *
 * Every route requires:
 *   1. A valid JWT token (authenticate middleware)
 *   2. The caller must be a parent (authorize('parent'))
 *
 * All routes are static (no dynamic :id segments).
 * studentId is passed as a query parameter, not a URL segment,
 * because it is optional — the service resolves it automatically
 * when the parent has a single child or a primary child set.
 *
 * Mounted in app.js as:
 *   app.use('/api/analytics/parent', parentAnalyticsRouter);
 */

import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  getLinkedStudents,
  getParentDashboardHandler,
} from '../controllers/parentAnalytics.controller.js';

const router = express.Router();

// Every route in this file requires a valid JWT token + parent role
router.use(authenticate);
router.use(authorize('parent'));

// ─────────────────────────────────────────────────────────────
// PARENT ANALYTICS ROUTES
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/analytics/parent/students
 * Returns all students linked to the authenticated parent.
 * Includes a quick analytics summary (rank, score, last active)
 * so the parent can pick which child to view in detail.
 *
 * Data source: parent_student_relationship + student_dashboard_analytics
 */
router.get('/students', getLinkedStudents);

/**
 * GET /api/analytics/parent/dashboard?studentId=<id>
 * Returns the full analytics dashboard for one student.
 *
 * studentId resolution:
 *   1. Explicit ?studentId=N in query → use it (after ownership check)
 *   2. Parent has exactly 1 child → default to that child
 *   3. Parent has is_primary = 1 set → use that child
 *   4. Multiple children, no primary → 400 (studentId required)
 *
 * Data source: parent_dashboard_analytics
 */
router.get('/dashboard', getParentDashboardHandler);

export default router;