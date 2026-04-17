/**
 * src/routes/announcement.routes.js
 * ====================================
 * All routes under /api/announcements
 *
 * Endpoint groups:
 *   Admin only  → POST, PUT, PATCH (create / edit / deactivate / broadcast)
 *   Any user    → GET /active (user-facing banner/feed)
 *   Admin only  → GET / (management view with all statuses)
 *
 * ⚠️ ORDER MATTERS IN EXPRESS!
 *   Static paths must come BEFORE dynamic paths (/:id).
 *   'schedule', 'broadcast', 'active' must be defined BEFORE '/:id'.
 *
 * Mounted in app.js as:
 *   app.use('/api/announcements', announcementRouter);
 */

import express from 'express';
import { authenticate, authorize ,announementManagerOnly} from '../middleware/auth.middleware.js';
import * as AnnouncementController from '../controllers/announcement.controller.js';

import {
  validateCreateDraft,
  validateScheduleAnnouncement,
  validateBroadcast,
  validateEditAnnouncement,
  validateDeactivate,
} from '../validators/announcement.validator.js';

const router = express.Router();

// Every route in this file requires a valid JWT token
router.use(authenticate);

// ─────────────────────────────────────────────────────────────────────────────
// STATIC ROUTES  (must come before /:id routes)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/announcements/active
 * User-facing view — only returns active broadcasted/edited announcements
 * within their date window.
 * Open to all authenticated users (students, teachers, parents, admins).
 *
 * Query: ?page=1&limit=20
 */
router.get(
  '/active',
  AnnouncementController.getActiveAnnouncements
);

/**
 * POST /api/announcements/schedule
 * Create a scheduled announcement — background job will broadcast it
 * when start_date arrives.
 * Admin only.
 *
 * Body: { title, content, target_audience, course_id?, priority?, start_date, end_date? }
 *
 * ⚠️ Must be BEFORE /:id to avoid 'schedule' being treated as :id
 */
router.post(
  '/schedule',
  authorize('admin'),
  validateScheduleAnnouncement,
  AnnouncementController.scheduleAnnouncement
);

/**
 * POST /api/announcements/broadcast/:announcementId
 * Immediately broadcast an existing announcement to all target users.
 * Creates one notification row per user + emits WebSocket events.
 * Admin only.
 *
 * URL param: announcementId (integer)
 */
router.post(
  '/broadcast/:announcementId',
  authorize('admin'),
  validateBroadcast,
  AnnouncementController.instantBroadcast
);

// ─────────────────────────────────────────────────────────────────────────────
// ROOT ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/announcements
 * Create a draft announcement.
 * No notifications sent. Admin can edit and broadcast/schedule later.
 * Admin only.
 *
 * Body: { title, content, target_audience, course_id?, priority?, end_date? }
 */
router.post(
  '/',
  authorize('admin'),
  validateCreateDraft,
  AnnouncementController.createDraftAnnouncement
);

/**
 * GET /api/announcements
 * Admin management view — returns ALL announcements (every status).
 * Admin only.
 *
 * Query: ?page=1&limit=20
 */
router.get(
  '/',
  authorize('admin'),
  announementManagerOnly,
  AnnouncementController.getAllAnnouncements
);

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC ROUTES  /:id  (must come AFTER all static routes)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PUT /api/announcements/:id
 * Edit an announcement's content (partial update — only send changed fields).
 * If announcement was already broadcasted → status becomes 'edited'.
 * Admin only.
 *
 * Body: any subset of { title, content, target_audience, course_id, priority, end_date }
 */
router.put(
  '/:id',
  authorize('admin'),
  validateEditAnnouncement,
  AnnouncementController.editAnnouncement
);

/**
 * PATCH /api/announcements/:id/deactivate
 * Disable an announcement. Sets is_active = false, status = 'deactivated'.
 * Cannot be reversed via API (create a new one instead).
 * Admin only.
 */
router.patch(
  '/:id/deactivate',
  authorize('admin'),
  validateDeactivate,
  AnnouncementController.deactivateAnnouncement
);

export default router;