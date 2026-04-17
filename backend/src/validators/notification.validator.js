/**
 *  AUTHORS: Harshitha Ravuri,
 * src/validators/notification.validator.js
 * ==========================================
 * Input validation for all notification endpoints.
 * Uses express-validator — rules run as middleware before the controller.
 *
 * How it works:
 *   1. You add these as middleware arrays in the route definition.
 *   2. If any rule fails, the controller calls validationResult(req) and returns 400.
 *
 * Example usage in routes:
 *   router.post('/course', validateSendToCourse, NotificationController.sendToCourse);
 */

import { body, query, param } from 'express-validator';
import { VALID_NOTIFICATION_TYPES } from '../constants/notificationTypes.js';
import dayjs from '../utils/timezoneConversion.js';
// ─────────────────────────────────────────────────────────────────────────────
// SHARED PARAM VALIDATORS (reused across routes)
// ─────────────────────────────────────────────────────────────────────────────

/** Validates :id in URL e.g. PATCH /notifications/:id/read */
export const validateIdParam = [
  param('id').isInt({ min: 1 }).withMessage('Notification ID must be a positive integer'),
];

// ─────────────────────────────────────────────────────────────────────────────
// USER NOTIFICATION VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates query params for GET /notifications
 * All are optional — just enforces correct types if provided.
 */
export const validateGetNotifications = [
  query('type')
    .optional()
    .isIn(VALID_NOTIFICATION_TYPES)
    .withMessage(`type must be one of: ${VALID_NOTIFICATION_TYPES.join(', ')}`),

  query('unread_only')
    .optional()
    .isBoolean({ strict: false }) // Accepts 'true', 'false', true, false
    .withMessage('unread_only must be true or false'),

  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
];

// ─────────────────────────────────────────────────────────────────────────────
// PREFERENCE VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates body for PUT /notifications/preferences
 * Body must be: { preferences: [{ notification_type, in_app_enabled?, push_enabled? }] }
 */
export const validateUpdatePreferences = [
  body('preferences').isArray({ min: 1 }).withMessage('preferences must be a non-empty array'),

  body('preferences.*.notification_type')
    .isIn(VALID_NOTIFICATION_TYPES)
    .withMessage(`notification_type must be one of: ${VALID_NOTIFICATION_TYPES.join(', ')}`),

  body('preferences.*.in_app_enabled')
    .optional()
    .isBoolean()
    .withMessage('in_app_enabled must be a boolean'),

  body('preferences.*.push_enabled')
    .optional()
    .isBoolean()
    .withMessage('push_enabled must be a boolean'),
];

// ─────────────────────────────────────────────────────────────────────────────
// TEACHER NOTIFICATION VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates body for POST /notifications/course
 * course_id comes from req.body (NOT from the URL).
 *
 * Body: { course_id, title, message, notification_type?, include_parents? }
 */
export const validateSendToCourse = [
  body('course_id')
    .notEmpty()
    .withMessage('course_id is required')
    .isInt({ min: 1 })
    .withMessage('course_id must be a positive integer'),

  body('title')
    .trim()
    .notEmpty()
    .withMessage('title is required')
    .isLength({ max: 255 })
    .withMessage('title must be 255 characters or fewer'),

  body('message').trim().notEmpty().withMessage('message is required'),

  body('notification_type')
    .optional()
    .isIn(VALID_NOTIFICATION_TYPES)
    .withMessage(`notification_type must be one of: ${VALID_NOTIFICATION_TYPES.join(', ')}`),

  body('include_parents')
    .optional()
    .isBoolean()
    .withMessage('include_parents must be true or false'),
];

/**
 * Validates body for POST /notifications/student
 * student_id comes from req.body (NOT from the URL).
 *
 * Body: { student_id, title, message, notification_type?, include_parents? }
 */
export const validateSendToStudent = [
  body('student_id')
    .notEmpty()
    .withMessage('student_id is required')
    .isInt({ min: 1 })
    .withMessage('student_id must be a positive integer'),

  body('title')
    .trim()
    .notEmpty()
    .withMessage('title is required')
    .isLength({ max: 255 })
    .withMessage('title must be 255 characters or fewer'),

  body('message').trim().notEmpty().withMessage('message is required'),

  body('notification_type')
    .optional()
    .isIn(VALID_NOTIFICATION_TYPES)
    .withMessage(`notification_type must be one of: ${VALID_NOTIFICATION_TYPES.join(', ')}`),

  body('include_parents')
    .optional()
    .isBoolean()
    .withMessage('include_parents must be true or false'),
];

/**
 * Validates body for POST /notifications/schedule
 * Teacher schedules a notification for a future time.
 *
 * Body: { course_id, title, message, scheduled_at }
 */
export const validateScheduleTeacherNotification = [
  body('course_id')
    .notEmpty()
    .withMessage('course_id is required')
    .isInt({ min: 1 })
    .withMessage('course_id must be a positive integer'),

  body('title')
    .trim()
    .notEmpty()
    .withMessage('title is required')
    .isLength({ max: 255 })
    .withMessage('title must be 255 characters or fewer'),

  body('message').trim().notEmpty().withMessage('message is required'),

  body('scheduled_at')
    .notEmpty()
    .withMessage('scheduled_at is required for scheduling')

    .custom((value) => {
      const istDate = dayjs.tz(value, 'YYYY-MM-DD HH:mm:ss', 'Asia/Kolkata');

      if (!istDate.isValid()) {
        throw new Error('scheduled_at must be a valid datetime e.g. 2026-03-10 10:00:00');
      }

      const nowIST = dayjs().tz('Asia/Kolkata');

      if (istDate.isBefore(nowIST)) {
        throw new Error('scheduled_at must be in the future');
      }

      return true;
    })

    .customSanitizer((value) => {
      const istDate = dayjs.tz(value, 'YYYY-MM-DD HH:mm:ss', 'Asia/Kolkata');
      const utcDate = istDate.utc().format('YYYY-MM-DD HH:mm:ss');

      console.log('IST:', istDate.format());
      console.log('UTC:', utcDate);

      return utcDate;
    }),
];
// ─────────────────────────────────────────────────────────────────────────────
// TEACHER DASHBOARD VALIDATOR
// ─────────────────────────────────────────────────────────────────────────────
 
/**
 * Validates query params for GET /api/notifications/sent
 * All params are optional — enforces correct types if provided.
 *
 * Query params:
 *   ?course_id=5          — filter by a specific course (must be a positive integer)
 *   ?status=sent          — filter by delivery status: sent | pending | failed
 *   ?page=1&limit=20      — pagination
 */
export const validateGetTeacherSentNotifications = [
  query('course_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('course_id must be a positive integer'),
 
  // 'sent'      → batches with at least one delivered row
  // 'scheduled' → batches with any pending rows (covers scheduled_at set AND BullMQ queued)
  // 'failed'    → batches with at least one failed row
  // omit        → return all batches including scheduled/pending ones (default)
  query('status')
    .optional()
    .isIn(['sent', 'scheduled', 'failed'])
    .withMessage('status must be one of: sent, scheduled, failed'),
 
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
 
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
];
 