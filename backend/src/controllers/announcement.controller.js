/**
 * AUTHORS: Harshitha Ravuri,
 * src/controllers/announcement.controller.js
 * =============================================
 * Handles HTTP requests for the announcements module.
 * All endpoints here are admin-only (enforced in routes).
 *
 * Endpoints:
 *   POST   /api/announcements            → createDraftAnnouncement
 *   POST   /api/announcements/schedule   → scheduleAnnouncement
 *   POST   /api/announcements/broadcast/:id → instantBroadcast
 *   PUT    /api/announcements/:id        → editAnnouncement
 *   PATCH  /api/announcements/:id/deactivate → deactivateAnnouncement
 *   GET    /api/announcements            → getAllAnnouncements (admin)
 *   GET    /api/announcements/active     → getActiveAnnouncements (any user)
 */

import { validationResult } from 'express-validator';
import * as NotificationService from '../services/notification.service.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

const getValidationErrors = (req) => {
  const errors = validationResult(req);
  return errors.isEmpty() ? null : errors.array();
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/announcements
 * Create a draft announcement (not sent to users yet).
 *
 * Body: { title, content, target_audience, course_id?, priority?, end_date? }
 */
export const createDraftAnnouncement = async (req, res) => {
  const errors = getValidationErrors(req);
  if (errors) return sendError(res, 400, 'Validation failed', errors);

  try {
    const result = await NotificationService.createDraftAnnouncement(
      req.user.id,
      req.body
    );
    
    return sendSuccess(res, 201, 'Announcement created as draft', result);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

/**
 * POST /api/announcements/schedule
 * Create and schedule an announcement for a future start_date.
 * Background job will broadcast it when the time comes.
 *
 * Body: { title, content, target_audience, course_id?, priority?, start_date, end_date? }
 */
export const scheduleAnnouncement = async (req, res) => {
  const errors = getValidationErrors(req);
  if (errors) return sendError(res, 400, 'Validation failed', errors);

  const { start_date, end_date } = req.body;

  // Validate date order
  if (start_date && end_date) {
    const start = new Date(start_date);
    const end = new Date(end_date);

    if (end <= start) {
      return sendError(
        res,
        400,
        'End date must be greater than start date'
      );
    }
  }

  try {
    const result = await NotificationService.scheduleAnnouncement(
      req.user.id,
      req.body
    );

    return sendSuccess(res, 201, 'Announcement scheduled successfully', result);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};
/**
 * POST /api/announcements/broadcast/:announcementId
 * Immediately broadcast an existing announcement to all target users.
 * Creates one notification per user + WebSocket emit.
 *
 * URL param: announcementId
 */
export const instantBroadcast = async (req, res) => {
  const errors = getValidationErrors(req);
  if (errors) return sendError(res, 400, 'Validation failed', errors);

  try {
    const announcementId = parseInt(req.params.announcementId);

    const stats = await NotificationService.instantBroadcast(announcementId);

    return sendSuccess(res, 200, 'Announcement broadcasted successfully', {
      delivery_stats: stats,
    });

  } catch (err) {
    console.error('🔥 Broadcast Error:', err);

    // ✅ Clean handling using statusCode
    if (err.statusCode) {
      return sendError(res, err.statusCode, err.message);
    }

    return sendError(res, 500, 'Internal server error');
  }
};
/**
 * PUT /api/announcements/:id
 * Edit an announcement's content.
 * If already broadcasted → status becomes 'edited'.
 *
 * Body: any subset of { title, content, target_audience, course_id, priority, end_date }
 */
export const editAnnouncement = async (req, res) => {
  const errors = getValidationErrors(req);
  if (errors) return sendError(res, 400, 'Validation failed', errors);

  try {
    const announcementId = parseInt(req.params.id);
    await NotificationService.editAnnouncement(announcementId, req.body);

    return sendSuccess(res, 200, 'Announcement updated successfully');
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    return sendError(res, status, err.message);
  }
};

/**
 * PATCH /api/announcements/:id/deactivate
 * Deactivate an announcement.
 * Sets is_active = false, status = 'deactivated'.
 */
export const deactivateAnnouncement = async (req, res) => {
  const errors = getValidationErrors(req);
  if (errors) return sendError(res, 400, 'Validation failed', errors);

  try {
    const announcementId = parseInt(req.params.id);
    await NotificationService.deactivateAnnouncement(announcementId);

    return sendSuccess(res, 200, 'Announcement deactivated successfully');
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    return sendError(res, status, err.message);
  }
};

/**
 * GET /api/announcements
 * Admin view — returns ALL announcements (every status).
 *
 * Query: page?, limit?
 */
export const getAllAnnouncements = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const announcements = await NotificationService.getAllAnnouncements(
      Number(page),
      Number(limit)
    );

    return sendSuccess(res, 200, 'Announcements fetched successfully', { announcements });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ENDPOINT (any authenticated user)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/announcements/active
 * User-facing view — only broadcasted/edited, within date window.
 *
 * Query: page?, limit?
 */
export const getActiveAnnouncements = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const announcements = await NotificationService.getActiveAnnouncements(
      Number(page),
      Number(limit)
    );

    return sendSuccess(res, 200, 'Active announcements fetched', { announcements });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};