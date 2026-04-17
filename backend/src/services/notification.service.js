/**
 * AUTHORS: Harshitha Ravuri,
 * src/services/notification.service.js
 * =======================================
 * Business logic for ALL notification and announcement operations.
 *
 * ─── version 3 KEY CHANGE ──────────────────────────────────────────────────────────
 * sendToUsers() no longer does the work itself.
 *
 * OLD WAY (blocking, inline):
 *   sendToUsers() → DB insert → WebSocket emit → push send → return stats
 *   Problem: HTTP request was blocked for the entire time.
 *            If it crashed mid-way, all work was lost.
 *
 * NEW WAY (queued, non-blocking):
 *   sendToUsers() → add job to Redis queue → return immediately
 *   The notification.worker.js picks up the job and does the actual work
 *   in the background. If it fails, BullMQ retries it automatically.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Rule: ALL sending still goes through sendToUsers(). Nothing else changes
 * for callers — they still call sendToUsers() exactly the same way.
 */

import * as NotificationModel  from '../models/notification.model.js';
import * as PreferenceModel    from '../models/notificationPreference.model.js';
import * as AnnouncementModel  from '../models/announcement.model.js';
import * as TargetModel        from '../models/targetResolution.model.js';

import { NOTIFICATION_TYPES, VALID_NOTIFICATION_TYPES } from '../constants/notificationTypes.js';
import { ANNOUNCEMENT_STATUS }   from '../constants/announcementConstants.js';
// ── v3: Import the queue helper instead of doing work inline ─────────────────
// queueNotificationDelivery() adds a SEND_BATCH job to Redis.
// The notification.worker.js processes it: DB insert + WebSocket + push.
import { queueNotificationDelivery } from '../queues/queues.js';


// ============================================================
// SECTION 1: CORE ORCHESTRATION
// ============================================================

/**
 * MAIN FUNCTION — The ONLY entry point for sending notifications.
 * ALL modules must use this. Never insert into notifications table directly.
 *
 * ── What changed in v3 ──────────────────────────────────────────────────────
 * This function now adds a job to the BullMQ queue and returns immediately.
 * The actual DB insert + WebSocket emit + push delivery is done by
 * notification.worker.js running in the background.
 *
 * This means:
 *   - API responses are INSTANT (no waiting for DB inserts)
 *   - If the server restarts mid-delivery, jobs are not lost (stored in Redis)
 *   - Multiple server instances can share the same queue (horizontal scaling)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * @param {Array<number>} userIds - User IDs to notify
 * @param {Object}        payload
 * @param {string}        payload.title
 * @param {string}        payload.message
 * @param {string}        payload.notification_type   — must match DB ENUM
 * @param {number}        [payload.related_id]
 * @param {string}        [payload.related_type]
 *
 * @returns {Object} { queued: true, total: <number>, job_id: <string> }
 */
export const sendToUsers = async (userIds, payload, createdBy) => {

  // Step 1: Remove duplicate user IDs and any null/undefined values
  const uniqueUserIds = [...new Set(userIds)].filter(Boolean);

  if (uniqueUserIds.length === 0) {
    return { queued: false, total: 0, job_id: null };
  }

  // ✅ Add created_by into payload
  const finalPayload = {
    ...payload,
    created_by: createdBy
  };

  if (process.env.ENABLE_QUEUES === 'true') {
    const job = await queueNotificationDelivery(uniqueUserIds, finalPayload);

    return {
      queued: true,
      total: uniqueUserIds.length,
      job_id: job.id,
    };
  }

  return { queued: false, total: 0, job_id: null };
};


// ============================================================
// SECTION 2: USER NOTIFICATION QUERIES
// ============================================================

/**
 * Get a paginated list of notifications for a user.
 *
 * @param {number} userId
 * @param {Object} query - { type, unread_only, page, limit }
 */
export const getUserNotifications = async (userId, query) => {
  const { type, unread_only, page = 1, limit = 20 } = query;

  if (type && !VALID_NOTIFICATION_TYPES.includes(type)) {
    throw new Error(`Invalid notification type: ${type}`);
  }

  const filters = {
    type,
    unreadOnly: unread_only,
    page:       Number(page),
    limit:      Number(limit),
  };

  const [notifications, total] = await Promise.all([
    NotificationModel.findNotificationsByUser(userId, filters),
    NotificationModel.countNotificationsByUser(userId, filters),
  ]);

  return {
    notifications,
    pagination: {
      page:        filters.page,
      limit:       filters.limit,
      total,
      total_pages: Math.ceil(total / filters.limit),
      has_next:    filters.page * filters.limit < total,
    },
  };
};

/**
 * Get the count of unread notifications for a user.
 *
 * @param {number} userId
 */
export const getUnreadCount = async (userId) => {
  return NotificationModel.countUnreadByUser(userId);
};

/**
 * Mark a single notification as read. Only the owner can do this.
 *
 * @param {number} notificationId
 * @param {number} userId
 */
export const markAsRead = async (notificationId, userId) => {
  const notification = await NotificationModel.findNotificationById(notificationId);

  if (!notification)                   throw new Error('Notification not found');
  if (notification.user_id !== userId) throw new Error('You do not have permission to update this notification');
  if (notification.is_read)            return { already_read: true };

  await NotificationModel.markNotificationAsRead(notificationId, userId);
  return { already_read: false };
};

/**
 * Mark ALL of a user's unread notifications as read at once.
 *
 * @param {number} userId
 */
export const markAllAsRead = async (userId) => {
  const result = await NotificationModel.markAllNotificationsAsRead(userId);
  return { updated_count: result.affectedRows };
};

/**
 * Permanently delete a single notification. Only the owner can do this.
 *
 * @param {number} notificationId
 * @param {number} userId
 */
export const deleteNotification = async (notificationId, userId) => {
  const notification = await NotificationModel.findNotificationById(notificationId);

  if (!notification)                   throw new Error('Notification not found');
  if (notification.user_id !== userId) throw new Error('You do not have permission to delete this notification');

  await NotificationModel.deleteNotificationById(notificationId, userId);
};


// ============================================================
// SECTION 3: PREFERENCE MANAGEMENT
// ============================================================

/**
 * Get all notification preferences for a user.
 * Returns defaults for types the user hasn't configured yet.
 *
 * @param {number} userId
 */
export const getUserPreferences = async (userId) => {
  const existingPrefs = await PreferenceModel.findPreferencesByUser(userId);

  const prefMap = {};
  existingPrefs.forEach((pref) => { prefMap[pref.notification_type] = pref; });

  return VALID_NOTIFICATION_TYPES.map((type) => prefMap[type] || {
    notification_type: type,
    in_app_enabled:    true,
    push_enabled:      true,
    email_enabled:     false,
    sms_enabled:       false,
    updated_at:        null,
    is_default:        true,
  });
};

/**
 * Update one or more notification preferences for a user.
 *
 * @param {number} userId
 * @param {Array}  prefsArray
 */
export const updatePreferences = async (userId, prefsArray) => {
  for (const pref of prefsArray) {
    if (!VALID_NOTIFICATION_TYPES.includes(pref.notification_type)) {
      throw new Error(`Invalid notification type: ${pref.notification_type}`);
    }
  }
  await PreferenceModel.upsertPreferencesBulk(userId, prefsArray);
};

/**
 * Disable ALL notification channels for ALL types at once.
 *
 * @param {number} userId
 */
export const disableAllNotifications = async (userId) => {
  await PreferenceModel.disableAllPreferences(userId, VALID_NOTIFICATION_TYPES);
};


// ============================================================
// SECTION 4: TEACHER NOTIFICATION FUNCTIONS
// ============================================================

/**
 * Queue a notification to all students in a course (and optionally parents).
 * Teacher must own the course.
 *
 * @param {number} teacherUserId
 * @param {Object} payload - { course_id, title, message, notification_type, include_parents }
 */
export const sendToCourse = async (teacherUserId, payload) => {
  const { course_id, title, message, notification_type, include_parents } = payload;

  const isAuthorized = await TargetModel.isTeacherOfCourse(teacherUserId, course_id);
  if (!isAuthorized) {
    throw new Error('You are not authorized to send notifications for this course');
  }

  let userIds = await TargetModel.getStudentUserIdsByCourse(course_id);

  if (include_parents) {
    const parentIds = await TargetModel.getParentUserIdsByCourse(course_id);
    userIds = [...userIds, ...parentIds];
  }

  if (userIds.length === 0) {
    return { queued: false, total: 0, job_id: null };
  }

  return sendToUsers(
    userIds,
    {
      title,
      message,
      notification_type: notification_type || NOTIFICATION_TYPES.TEACHER_NOTIFICATION,
      related_id: course_id,
      related_type: 'course',
    },
    teacherUserId
  );
};

/**
 * Queue a notification to one specific student (and optionally their parents).
 * Teacher must have this student in at least one of their courses.
 *
 * @param {number} teacherUserId
 * @param {Object} payload - { student_id, title, message, notification_type, include_parents }
 */
export const sendToStudent = async (teacherUserId, payload) => {
  const { student_id, title, message, notification_type, include_parents } = payload;

  const isAuthorized = await TargetModel.isStudentOfTeacher(teacherUserId, student_id);
  if (!isAuthorized) {
    throw new Error('This student is not enrolled in any of your courses');
  }

  const studentUserIds = await TargetModel.getUserIdByStudentId(student_id);
  if (studentUserIds.length === 0) {
    throw new Error('Student not found or inactive');
  }

  let userIds = [...studentUserIds];
  console.log('Student user IDs:', userIds);
  if (include_parents) {
    const parentIds = await TargetModel.getParentUserIdsByStudentId(student_id);
    userIds = [...userIds, ...parentIds];
  }
  console.log('Final user IDs to notify:', userIds);
  return sendToUsers(
    userIds,
    {
      title,
      message,
      notification_type: notification_type || NOTIFICATION_TYPES.TEACHER_NOTIFICATION,
      related_id: student_id,
      related_type: 'student',
    },
    teacherUserId
  ); 
};

/**
 * Schedule a teacher notification for a future datetime.
 *
 * NOT queued via BullMQ directly — inserts pending DB rows instead.
 * The SEND_PENDING_TEACHER_NOTIFICATIONS recurring job picks them up every 60 seconds and queues them for delivery when the time arrives.
 *
 * @param {number} teacherUserId
 * @param {Object} payload - { course_id, title, message, scheduled_at }
 */
export const scheduleTeacherNotification = async (teacherUserId, payload) => {
  const { course_id, title, message, scheduled_at } = payload;

  const isAuthorized = await TargetModel.isTeacherOfCourse(teacherUserId, course_id);
  if (!isAuthorized) {
    throw new Error('You are not authorized to send notifications for this course');
  }

  const userIds = await TargetModel.getStudentUserIdsByCourse(course_id);
  if (userIds.length === 0) {
    return { scheduled_count: 0, scheduled_at };
  }

  // Insert one pending row per student — NOT sent yet
  const insertPromises = userIds.map((userId) =>
    NotificationModel.insertScheduledNotification({
      user_id:           userId,
      title,
      message,
      notification_type: NOTIFICATION_TYPES.TEACHER_NOTIFICATION,
      related_id:        course_id,
      related_type:      'course',
      scheduled_at,
      created_by:       teacherUserId,

    })
  );

  await Promise.all(insertPromises);

  return { scheduled_count: userIds.length, scheduled_at };
};


// ============================================================
// SECTION 5: ANNOUNCEMENT FUNCTIONS
// ============================================================

/**
 * Create a DRAFT announcement — no notifications sent, no broadcast.
 *
 * @param {number} adminUserId
 * @param {Object} data
 */
export const createDraftAnnouncement = async (adminUserId, data) => {
  const result = await AnnouncementModel.createAnnouncement({
    created_by:      adminUserId,
    title:           data.title,
    content:         data.content,
    target_audience: data.target_audience,
    course_id:       data.course_id  || null,
    priority:        data.priority   || 'medium',
    status:          ANNOUNCEMENT_STATUS.DRAFT,
    start_date:      null,
    end_date:        data.end_date   || null,
  });

  return { announcement_id: result.insertId };
};

/**
 * Schedule an announcement for a future start_date.
 * The CHECK_SCHEDULED_ANNOUNCEMENTS recurring job broadcasts it automatically.
 *
 * @param {number} adminUserId
 * @param {Object} data
 */
export const scheduleAnnouncement = async (adminUserId, data) => {
  const result = await AnnouncementModel.createAnnouncement({
    created_by:      adminUserId,
    title:           data.title,
    content:         data.content,
    target_audience: data.target_audience,
    course_id:       data.course_id  || null,
    priority:        data.priority   || 'medium',
    status:          ANNOUNCEMENT_STATUS.SCHEDULED,
    start_date:      data.start_date,
    end_date:        data.end_date   || null,
  });
  console.log("start_date received in service:", data.start_date);
  return { announcement_id: result.insertId, scheduled_at: data.start_date };
};
/* helper to validate that the announcemnet body is not empty */
const validateAnnouncementForBroadcast = (announcement) => {
  if (!announcement.title?.trim()) {
    throw new Error('Announcement title is required for broadcasting');
  }

  if (!announcement.content?.trim()) {
    throw new Error('Announcement content is required for broadcasting');
  }

  if (!announcement.target_audience) {
    throw new Error('Target audience is required for broadcasting');
  }

  if (
    announcement.target_audience === 'course_students' &&
    !announcement.course_id
  ) {
    throw new Error('course_id is required when target_audience is course_students');
  }
};

/**
 * Instantly broadcast an existing announcement to all target users.
 * Queues delivery for all users, then marks announcement as 'broadcasted'.
 *
 * @param {number} announcementId
 */
// helper (optional but recommended)
const createError = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

export const instantBroadcast = async (announcementId) => {
  // Step 1: Fetch announcement
  const announcement = await AnnouncementModel.findAnnouncementById(announcementId);

  // Step 2: Basic checks
  if (!announcement) {
    throw createError('Announcement not found', 404);
  }

  if (!announcement.is_active) {
    throw createError('Cannot broadcast an inactive announcement', 400);
  }

  if (announcement.status === ANNOUNCEMENT_STATUS.DEACTIVATED) {
    throw createError('Cannot broadcast a deactivated announcement', 400);
  }

  // ✅ Your new validation (fixed properly)
  if (announcement.status === ANNOUNCEMENT_STATUS.BROADCASTED) {
    throw createError('Announcement has already been broadcasted', 400);
  }

  // Step 3: Content validations
  if (!announcement.title || !announcement.title.trim()) {
    throw createError('Announcement title is required for broadcasting', 400);
  }

  if (!announcement.content || !announcement.content.trim()) {
    throw createError('Announcement content is required for broadcasting', 400);
  }

  if (!announcement.target_audience) {
    throw createError('Target audience is required for broadcasting', 400);
  }

  if (
    announcement.target_audience === 'course_students' &&
    !announcement.course_id
  ) {
    throw createError(
      'course_id is required when target_audience is course_students',
      400
    );
  }

  // Step 4: Resolve target users
  const userIds = await AnnouncementModel.resolveTargetUserIds(
    announcement.target_audience,
    announcement.course_id
  );

  // ✅ safer check (prevents crash)
  if (!userIds || userIds.length === 0) {
    throw createError('No target users found for this announcement', 400);
  }

  // Step 5: Queue notification delivery
  const result = await sendToUsers(userIds, {
    title: announcement.title,
    message: announcement.content,
    notification_type: NOTIFICATION_TYPES.ANNOUNCEMENT,
    related_id: announcementId,
    related_type: 'announcement',
    created_by: announcement.created_by,
  });

  // Step 6: Mark as broadcasted
  await AnnouncementModel.updateAnnouncementStatus(
    announcementId,
    ANNOUNCEMENT_STATUS.BROADCASTED
  );

  return result;
};

/**
 * Edit an announcement's content after it's been created.
 * If it was broadcasted, status becomes 'edited'.
 *
 * @param {number} announcementId
 * @param {Object} data
 */
export const editAnnouncement = async (announcementId, data) => {
  const announcement = await AnnouncementModel.findAnnouncementById(announcementId);
  if (!announcement) throw new Error('Announcement not found');

  const newStatus = announcement.status === ANNOUNCEMENT_STATUS.BROADCASTED
    ? announcement.status
    : ANNOUNCEMENT_STATUS.EDITED;

  await AnnouncementModel.updateAnnouncement(announcementId, { ...data, status: newStatus });
};

/**
 * Deactivate an announcement — hides it from all user feeds.
 *
 * @param {number} announcementId
 */
export const deactivateAnnouncement = async (announcementId) => {
  const announcement = await AnnouncementModel.findAnnouncementById(announcementId);
  if (!announcement) throw new Error('Announcement not found');

  await AnnouncementModel.deactivateAnnouncement(announcementId);
};

/**
 * Get all announcements — admin view (every status included).
 */
export const getAllAnnouncements = async (page = 1, limit = 20) => {
  return AnnouncementModel.findAllAnnouncements(page, limit);
};

/**
 * Get active, broadcasted announcements — user-facing view.
 */
export const getActiveAnnouncements = async (page = 1, limit = 20) => {
  return AnnouncementModel.findActiveAnnouncements(page, limit);
};

// ─────────────────────────────────────────────────────────────────────────────
// TEACHER DASHBOARD: SENT NOTIFICATIONS HISTORY
// ─────────────────────────────────────────────────────────────────────────────
 
/**
 * Get a paginated list of notifications sent by a teacher — grouped by batch.
 *
 * Each "batch" is one send action (e.g., "Send to Course 5") regardless of
 * how many students received it. The response shows recipient_count so the
 * teacher can see the reach of each notification they sent.
 *
 * Filters (all optional):
 *   course_id — show only notifications for a specific course
 *   status    — filter by delivery status: 'sent' | 'pending' | 'failed'
 *   page, limit — pagination
 *
 * @param {number} teacherUserId  - the logged-in teacher's user_id
 * @param {Object} query          - { course_id, status, page, limit }
 * @returns {Object}              - { notifications: [...], pagination: { ... } }
 */
export const getTeacherSentNotifications = async (teacherUserId, query) => {
  const { course_id, status, page = 1, limit = 20 } = query;

  const validStatuses = ['sent', 'scheduled', 'failed'];
  if (status && !validStatuses.includes(status)) {
    throw new Error(`status must be one of: ${validStatuses.join(', ')}`);
  }
 
  const filters = {
    course_id: course_id ? Number(course_id) : undefined,
    status:    status || undefined,  // undefined = no filter
    page:      Number(page),
    limit:     Number(limit),
  };
 
  // Run both queries in parallel for speed
  const [notifications, total] = await Promise.all([
    NotificationModel.findNotificationsSentByTeacher(teacherUserId, filters),
    NotificationModel.countNotificationsSentByTeacher(teacherUserId, filters),
  ]);
 
  return {
    notifications,
    pagination: {
      page:        filters.page,
      limit:       filters.limit,
      total,
      total_pages: Math.ceil(total / filters.limit),
      has_next:    filters.page * filters.limit < total,
    },
  };
};