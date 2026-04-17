/**
 * AUTHORS: Harshitha Ravuri,
 * src/controllers/notification.controller.js
 * =============================================
 * Handles HTTP requests for:
 *   - User notifications (GET, mark read, delete)
 *   - Notification preferences
 *   - Teacher notifications (send to course, student, schedule)
 *
 * v2 Changes:
 *   - sendToCourse: course_id now from req.body (not URL param)
 *   - sendToStudent: student_id now from req.body (not URL param)
 *   - scheduleTeacherNotification: new endpoint
 *
 * Rule: Controllers are THIN. They only:
 *   1. Read from req (body, params, query, user)
 *   2. Call the service
 *   3. Send the response
 */

import { validationResult } from 'express-validator';
import * as NotificationService from '../services/notification.service.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { getTeacherIdByUserId } from '../models/targetResolution.model.js';

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────

// Returns validation errors array if any, or null if request is clean
const getValidationErrors = (req) => {
  const errors = validationResult(req);
  return errors.isEmpty() ? null : errors.array();
};

// ─────────────────────────────────────────────────────────────────────────────
// USER NOTIFICATION ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/notifications
 * Fetch paginated notifications for the logged-in user.
 */
export const getNotifications = async (req, res) => {
  const errors = getValidationErrors(req);
  if (errors) return sendError(res, 400, 'Validation failed', errors);

  try {
    const result = await NotificationService.getUserNotifications(req.user.id, req.query);
    return sendSuccess(res, 200, 'Notifications fetched successfully', result);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

/**
 * GET /api/notifications/unread-count
 */
export const getUnreadCount = async (req, res) => {
  try {
    const count = await NotificationService.getUnreadCount(req.user.id);
    return sendSuccess(res, 200, 'Unread count fetched', { unread_count: count });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

/**
 * PATCH /api/notifications/read-all
 */
export const markAllAsRead = async (req, res) => {
  try {
    const result = await NotificationService.markAllAsRead(req.user.id);
    return sendSuccess(res, 200, `${result.updated_count} notifications marked as read`, {
      updated_count: result.updated_count,
    });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

/**
 * PATCH /api/notifications/:id/read
 */
export const markAsRead = async (req, res) => {
  const errors = getValidationErrors(req);
  if (errors) return sendError(res, 400, 'Validation failed', errors);

  try {
    const result = await NotificationService.markAsRead(
      parseInt(req.params.id),
      req.user.id
    );

    const message = result.already_read
      ? 'Notification was already marked as read'
      : 'Notification marked as read';

    return sendSuccess(res, 200, message);
  } catch (err) {
    const status = err.message.includes('not found') ? 404
      : err.message.includes('permission')           ? 403
      : 500;
    return sendError(res, status, err.message);
  }
};

/**
 * DELETE /api/notifications/:id
 */
export const deleteNotification = async (req, res) => {
  const errors = getValidationErrors(req);
  if (errors) return sendError(res, 400, 'Validation failed', errors);

  try {
    await NotificationService.deleteNotification(parseInt(req.params.id), req.user.id);
    return sendSuccess(res, 200, 'Notification deleted successfully');
  } catch (err) {
    const status = err.message.includes('not found') ? 404
      : err.message.includes('permission')           ? 403
      : 500;
    return sendError(res, status, err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PREFERENCE ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/notifications/preferences */
export const getPreferences = async (req, res) => {
  try {
    const preferences = await NotificationService.getUserPreferences(req.user.id);
    return sendSuccess(res, 200, 'Preferences fetched successfully', { preferences });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

/** PUT /api/notifications/preferences */
export const updatePreferences = async (req, res) => {
  const errors = getValidationErrors(req);
  if (errors) return sendError(res, 400, 'Validation failed', errors);

  try {
    await NotificationService.updatePreferences(req.user.id, req.body.preferences);
    return sendSuccess(res, 200, 'Preferences updated successfully');
  } catch (err) {
    return sendError(res, 400, err.message);
  }
};

/** PATCH /api/notifications/preferences/disable-all */
export const disableAllNotifications = async (req, res) => {
  try {
    await NotificationService.disableAllNotifications(req.user.id);
    return sendSuccess(res, 200, 'All notifications have been disabled');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// TEACHER ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/notifications/course
 * Send notification to all students in a course.
 * course_id comes from req.body (NOT from URL).
 *
 * Body: { course_id, title, message, notification_type?, include_parents? }
 */
export const sendToCourse = async (req, res) => {
  const errors = getValidationErrors(req);
  if (errors) return sendError(res, 400, 'Validation failed', errors);

  try {
    // Pass the entire body — service reads course_id from it
    const stats = await NotificationService.sendToCourse(req.user.id, req.body);
    return sendSuccess(res, 200, 'Notification sent to course students', { delivery_stats: stats });
  } catch (err) {
    const status = err.message.includes('not authorized') ? 403 : 500;
    return sendError(res, status, err.message);
  }
};

/**
 * POST /api/notifications/student
 * Send notification to a specific student.
 * student_id comes from req.body (NOT from URL).
 *
 * Body: { student_id, title, message, notification_type?, include_parents? }
 */
export const sendToStudent = async (req, res) => {
  const errors = getValidationErrors(req);
  if (errors) return sendError(res, 400, 'Validation failed', errors);

  try {
    const stats = await NotificationService.sendToStudent(req.user.id, req.body);
    return sendSuccess(res, 200, 'Notification sent to student', { delivery_stats: stats });
  } catch (err) {
    const status = err.message.includes('not enrolled') ? 403
      : err.message.includes('not found')               ? 404
      : 500;
    return sendError(res, status, err.message);
  }
};

/**
 * POST /api/notifications/schedule
 * Schedule a teacher notification for a future time.
 *
 * Body: { course_id, title, message, scheduled_at }
 */
export const scheduleTeacherNotification = async (req, res) => {
  const errors = getValidationErrors(req);
  if (errors) return sendError(res, 400, 'Validation failed', errors);

  try {
    const result = await NotificationService.scheduleTeacherNotification(
      req.user.id,
      req.body
    );

    return sendSuccess(res, 201, 'Notification scheduled successfully', result);
  } catch (err) {
    const status = err.message.includes('not authorized') ? 403 : 500;
    return sendError(res, status, err.message);
  }
};
// ─────────────────────────────────────────────────────────────────────────────
// TEACHER DASHBOARD: SENT NOTIFICATIONS HISTORY
// ─────────────────────────────────────────────────────────────────────────────
 
/**
 * GET /api/notifications/sent
 *
 * Returns a paginated, grouped history of notifications this teacher has sent.
 * Each row represents one "batch send" — one notification to N students.
 *
 * Example response row:
 *   {
 *     title:           "Test reminder",
 *     message:         "Your test is due tomorrow.",
 *     notification_type: "teacher_notification",
 *     course_id:       5,
 *     related_type:    "course",
 *     scheduled_at:    null,
 *     sent_at:         "2026-03-10T10:00:00.000Z",
 *     recipient_count: 45,
 *     delivered_count: 43,
 *     pending_count:   0,
 *     failed_count:    2
 *   }
 *
 * Optional query params:
 *   ?course_id=5      — only show notifications for this course
 *   ?status=pending   — filter by delivery status (sent | pending | failed)
 *   ?page=1&limit=20  — pagination
 *
 * Role: teacher, admin
 */
export const getTeacherSentNotifications = async (req, res) => {
  const errors = getValidationErrors(req);
  if (errors) return sendError(res, 400, 'Validation failed', errors);
   const teacherId= await getTeacherIdByUserId(req.user.id);
   if(!teacherId){
    return sendError(res, 403, 'User is not a teacher');
   }
  try {
    const result = await NotificationService.getTeacherSentNotifications(
      req.user.id,
      req.query       // passes course_id, status, page, limit from the URL
    );
   
    return sendSuccess(res, 200, 'Sent notifications fetched successfully', result);
  } catch (err) {
    // Service throws a plain Error with a helpful message for bad filter values
    const status = err.message.includes('must be one of') ? 400 : 500;
    return sendError(res, status, err.message);
  }
};