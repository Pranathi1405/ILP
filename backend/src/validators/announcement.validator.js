/**
 * AUTHORS: HArshitha Ravuri,
 * src/validators/announcement.validator.js
 * ==========================================
 * Input validation for all announcement endpoints.
 * All endpoints are admin-only (role check happens in routes).
 */

import { body, param } from 'express-validator';
import { VALID_TARGET_AUDIENCES, VALID_PRIORITIES } from '../constants/announcementConstants.js';
import dayjs from '../utils/timezoneConversion.js';
// ─────────────────────────────────────────────────────────────────────────────
// SHARED PARAM VALIDATOR
// ─────────────────────────────────────────────────────────────────────────────

/** Validates :id or :announcementId in URL params */
export const validateAnnouncementIdParam = [
  param('id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Announcement ID must be a positive integer'),

  param('announcementId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Announcement ID must be a positive integer'),
];

// ─────────────────────────────────────────────────────────────────────────────
// SHARED BODY FIELDS (reused across create / schedule)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rules shared by both POST /announcements and POST /announcements/schedule.
 * (title, content, target_audience, course_id, priority, end_date)
 */
const sharedAnnouncementBody = [
  body('title')
  .optional()
    .trim()
    .notEmpty()
    .withMessage('title is required')
    .isLength({ max: 255 })
    .withMessage('title must be 255 characters or fewer'),

  body('content')
  .optional()
    .trim()
    .notEmpty()
    .withMessage('content is required'),

  body('target_audience')
  .optional()
    .notEmpty()
    .withMessage('target_audience is required')
    .isIn(VALID_TARGET_AUDIENCES)
    .withMessage(`target_audience must be one of: ${VALID_TARGET_AUDIENCES.join(', ')}`),

  // course_id is only needed when target_audience = 'course_students'
  body('course_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('course_id must be a positive integer')
    .custom((value, { req }) => {
      const audience = req.body.target_audience;

      // If targeting a specific course, course_id is mandatory
      if (audience === 'course_students' && !value) {
        throw new Error('course_id is required when target_audience is course_students');
      }

      // If NOT targeting a specific course, course_id should not be sent
      if (audience && audience !== 'course_students' && value) {
        throw new Error('course_id should only be provided when target_audience is course_students');
      }

      return true;
    }),

  body('priority')
    .optional()
    .isIn(VALID_PRIORITIES)
    .withMessage(`priority must be one of: ${VALID_PRIORITIES.join(', ')}`),

   body('end_date')
    .optional()

    .custom((value) => {

      const istDate = dayjs.tz(value, 'YYYY-MM-DD HH:mm:ss', 'Asia/Kolkata');

      if (!istDate.isValid()) {
        throw new Error('end_date must be a valid datetime e.g. 2026-03-15 23:59:59');
      }

      const nowIST = dayjs().tz('Asia/Kolkata');

      if (istDate.isBefore(nowIST)) {
        throw new Error('end_date must be in the future');
      }

      return true;
    })

    .customSanitizer((value) => {
      return dayjs
        .tz(value, 'YYYY-MM-DD HH:mm:ss', 'Asia/Kolkata')
        .utc()
        .format('YYYY-MM-DD HH:mm:ss');
    }),
];

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /announcements
 * Create a draft announcement.
 * No start_date required — admin will broadcast or schedule it later.
 */
export const validateCreateDraft = [...sharedAnnouncementBody];

/**
 * POST /announcements/schedule
 * Create and schedule an announcement for a future start_date.
 * start_date is REQUIRED here (that's what makes it a scheduled announcement).
 */
export const validateScheduleAnnouncement = [
  ...sharedAnnouncementBody,

  body('start_date')
    .notEmpty()
    .withMessage('start_date is required for scheduling')

    .custom((value) => {
      const istDate = dayjs.tz(value, 'YYYY-MM-DD HH:mm:ss', 'Asia/Kolkata');

      if (!istDate.isValid()) {
        throw new Error('start_date must be a valid datetime e.g. 2026-03-10 10:00:00');
      }

      const nowIST = dayjs().tz('Asia/Kolkata');

      if (istDate.isBefore(nowIST)) {
        throw new Error('start_date must be in the future');
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

/**
 * POST /announcements/broadcast/:announcementId
 * Validates the URL param only — no body needed for broadcast.
 */
export const validateBroadcast = [
  param('announcementId')
    .isInt({ min: 1 })
    .withMessage('announcementId must be a positive integer'),
];

/**
 * PUT /announcements/:id
 * Update an announcement's content.
 * All fields are optional — admin only sends what they want to change.
 */
export const validateEditAnnouncement = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Announcement ID must be a positive integer'),

  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('title cannot be empty if provided')
    .isLength({ max: 255 })
    .withMessage('title must be 255 characters or fewer'),

  body('content')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('content cannot be empty if provided'),

  body('target_audience')
    .optional()
    .isIn(VALID_TARGET_AUDIENCES)
    .withMessage(`target_audience must be one of: ${VALID_TARGET_AUDIENCES.join(', ')}`),

  body('course_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('course_id must be a positive integer'),

  body('priority')
    .optional()
    .isIn(VALID_PRIORITIES)
    .withMessage(`priority must be one of: ${VALID_PRIORITIES.join(', ')}`),

   body('end_date')
    .optional()

    .custom((value) => {

      const istDate = dayjs.tz(value, 'YYYY-MM-DD HH:mm:ss', 'Asia/Kolkata');

      if (!istDate.isValid()) {
        throw new Error('end_date must be a valid datetime e.g. 2026-03-15 23:59:59');
      }

      const nowIST = dayjs().tz('Asia/Kolkata');

      if (istDate.isBefore(nowIST)) {
        throw new Error('end_date must be in the future');
      }

      return true;
    })

    .customSanitizer((value) => {
      return dayjs
        .tz(value, 'YYYY-MM-DD HH:mm:ss', 'Asia/Kolkata')
        .utc()
        .format('YYYY-MM-DD HH:mm:ss');
    }),
];

/**
 * PATCH /announcements/:id/deactivate
 * Validates the URL param only — no body needed.
 */
export const validateDeactivate = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Announcement ID must be a positive integer'),
];