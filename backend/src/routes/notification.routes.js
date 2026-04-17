/**
 * AUTHORS: Harshitha Ravuri,
 * src/routes/notification.routes.js
 * ====================================
 * All routes under /api/notifications
 *
 * Groups:
 *   1. User notification routes  — any authenticated user
 *   2. Preference routes         — any authenticated user
 *   3. Teacher routes            — teacher + admin only
 *
 *   Static paths must come BEFORE dynamic paths (/:id).
 *   e.g. '/read-all' must be defined BEFORE '/:id/read'
 *        '/preferences/disable-all' must be BEFORE '/preferences'
 *   Otherwise Express will treat 'read-all' as the :id parameter.
 *
 * Mounted in app.js as:
 *   app.use('/api/notifications', notificationRouter);
 */

import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import * as NotificationController from '../controllers/notification.controller.js';


import {
  validateGetNotifications,
  validateIdParam,
  validateUpdatePreferences,
  validateSendToCourse,
  validateSendToStudent,
  validateScheduleTeacherNotification,
  validateGetTeacherSentNotifications,
} from '../validators/notification.validator.js';

const router = express.Router();

// Every route in this file requires a valid JWT token
router.use(authenticate);

// ─────────────────────────────────────────────────────────────────────────────
// 1. USER NOTIFICATION ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/notifications
 * Fetch the logged-in user's notifications (paginated).
 *
 * Optional query params:
 *   ?type=payment
 *   ?unread_only=true
 *   ?page=1&limit=20
 */
router.get(
  '/',
  validateGetNotifications,
  NotificationController.getNotifications
);

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications for the badge on the bell icon.
 *
 * ⚠️ Must be BEFORE /:id to avoid 'unread-count' being treated as :id
 */
router.get('/unread-count', NotificationController.getUnreadCount);
 
/**
 * GET /api/notifications/sent
 * Fetch the history of notifications this teacher has sent — grouped by batch.
 *
 * Each row = one "send action" (e.g., sent to Course 5) with recipient count.
 *
 * Optional query params:
 *   ?course_id=5      → only show notifications for this course
 *   ?status=pending   → filter by status: sent | pending | failed
 *   ?page=1&limit=20  → pagination
 *
 * Role: teacher + admin only
 *
 * ⚠️ Must be BEFORE /:id routes to avoid 'sent' being treated as :id
 */
router.get(
  '/sent',
  authorize('teacher', 'admin'),
  validateGetTeacherSentNotifications,
  NotificationController.getTeacherSentNotifications
);
 
/**
 * PATCH /api/notifications/read-all
 * Mark ALL notifications as read for the logged-in user.
 *
 * ⚠️ Must be BEFORE /:id/read
 */
router.patch('/read-all', NotificationController.markAllAsRead);

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
router.patch('/:id/read', validateIdParam, NotificationController.markAsRead);

/**
 * DELETE /api/notifications/:id
 * Permanently delete a notification (owner only).
 */
router.delete('/:id', validateIdParam, NotificationController.deleteNotification);

// ─────────────────────────────────────────────────────────────────────────────
// 2. PREFERENCE ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PATCH /api/notifications/preferences/disable-all
 * Turn off all notifications for the logged-in user.
 *
 * ⚠️ Must be BEFORE /preferences (GET and PUT) to avoid route conflicts
 */
router.patch(
  '/preferences/disable-all',
  NotificationController.disableAllNotifications
);

/**
 * GET /api/notifications/preferences
 * Get all notification type preferences for the logged-in user.
 * Returns defaults for types that haven't been configured yet.
 */
router.get('/preferences', NotificationController.getPreferences);

/**
 * PUT /api/notifications/preferences
 * Update preferences for one or more notification types.
 * Uses upsert — safe to call multiple times.
 *
 * Body: { preferences: [{ notification_type, in_app_enabled, push_enabled }] }
 */
router.put(
  '/preferences',
  validateUpdatePreferences,
  NotificationController.updatePreferences
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. TEACHER NOTIFICATION ROUTES  (teacher + admin only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/notifications/course
 * Teacher sends a notification to ALL students in a course.
 *
 * Body: { course_id, title, message, notification_type?, include_parents? }
 *
 * Note: course_id is in the body, NOT in the URL.
 * This allows more flexibility (no route conflicts with /:id).
 */
router.post(
  '/course',
  authorize('teacher', 'admin'),
  validateSendToCourse,
  NotificationController.sendToCourse
);

/**
 * POST /api/notifications/student
 * Teacher sends a notification to ONE specific student.
 *
 * Body: { student_id, title, message, notification_type?, include_parents? }
 */
router.post(
  '/student',
  authorize('teacher', 'admin'),
  validateSendToStudent,
  NotificationController.sendToStudent
);

/**
 * POST /api/notifications/schedule
 * Teacher schedules a notification to be sent at a future time.
 * Background job (teacherNotification.job.js) will deliver it.
 *
 * Body: { course_id, title, message, scheduled_at }
 *
 * Example scheduled_at: "2026-03-05T18:00:00Z"
 */
router.post(
  '/schedule',
  authorize('teacher', 'admin'),
  validateScheduleTeacherNotification,
  NotificationController.scheduleTeacherNotification
);

export default router;