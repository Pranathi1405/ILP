/**
 * AUTHORS: Harshitha Ravuri,
 * Notification Model
 * ==================
 * This file contains ONLY database queries for the `notifications` table.
 * No business logic here — that belongs in notification.service.js.
 *
 * Rule: Models = SQL only. Services = Business logic.
 */

import pool from '../config/database.config.js';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

// Maximum rows to INSERT in a single query.
// For large announcements (1000s of users), we split into chunks.
// This prevents the DB from being overwhelmed by a single huge INSERT.
const BATCH_CHUNK_SIZE = 500;

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Split an array into smaller chunks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Split a large array into smaller arrays of a given size.
 * Example: chunkArray([1,2,3,4,5], 2) → [[1,2], [3,4], [5]]
 *
 * @param {Array} array - The full array
 * @param {number} size - Max size of each chunk
 * @returns {Array[]} Array of smaller arrays
 */
const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    // slice(i, i+size) gives us one chunk
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

// ─────────────────────────────────────────────────────────────────────────────
// INSERT OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Insert multiple in-app notifications in one go (batch insert).
 * Automatically splits into chunks of 500 to avoid DB overload.
 * status = 'sent', is_sent = true (immediate delivery)
 *
 * @param {Array} notifications - Array of notification objects
 * Each object: { user_id, title, message, notification_type, related_id, related_type }
 * @returns {void}
 */
export const insertNotificationsBatch = async (notifications) => {
  if (!notifications.length) return;

  // Split into chunks of BATCH_CHUNK_SIZE to avoid overwhelming the DB
  const chunks = chunkArray(notifications, BATCH_CHUNK_SIZE);

  // Process each chunk one after the other (sequential to control DB load)
  for (const chunk of chunks) {
    // Build rows for bulk INSERT
    // Each notification maps to one row array in the same column order
    const values = chunk.map((n) => [
      n.user_id,
      n.title,
      n.message,
      n.notification_type,
      n.related_id || null,
      n.related_type || null,
      n.delivery_method || 'in_app',

      false, // is_read
      'sent', // status
      true, // is_sent
      new Date(), // sent_at
      null, // scheduled_at

      n.created_by ,
    ]);

    const sql = `
      INSERT INTO notifications
        (user_id, title, message, notification_type, related_id, related_type,
         delivery_method, is_read, status, is_sent, sent_at, scheduled_at,created_by)
      VALUES ?
    `;

    // mysql2 supports "VALUES ?" with nested arrays for bulk insert
    await pool.query(sql, [values]);
  }
};

/**
 * Insert a scheduled notification (for teacher scheduling feature).
 * status = 'pending', is_sent = false — background job will send it later.
 *
 * @param {Object} notification - { user_id, title, message, notification_type, related_id, related_type, scheduled_at }
 * @returns {Object} MySQL insert result (contains insertId)
 */
export const insertScheduledNotification = async (notification) => {
  const sql = `
    INSERT INTO notifications
      (user_id, title, message, notification_type, related_id, related_type,
       delivery_method, is_read, status, is_sent, scheduled_at,created_by)
    VALUES (?, ?, ?, ?, ?, ?, 'in_app', FALSE, 'pending', FALSE, ?,?)
  `;

  const params = [
    notification.user_id,
    notification.title,
    notification.message,
    notification.notification_type,
    notification.related_id   || null,
    notification.related_type || null,
    notification.scheduled_at,  // The datetime when the job should fire
    notification.created_by   // The user who created the notification
  ];

  const [result] = await pool.query(sql, params);
  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// BACKGROUND JOB QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find all pending scheduled notifications whose time has come.
 * Called by the background job every minute.
 *
 * A notification is "ready" when:
 *   status = 'pending'  AND  scheduled_at <= NOW()
 *
 * @returns {Array} Array of notification rows ready to be sent
 */
export const findPendingScheduledNotifications = async () => {
  const sql = `
    SELECT *
    FROM notifications
    WHERE status = 'pending'
      AND scheduled_at IS NOT NULL
      AND scheduled_at <= NOW()
    ORDER BY scheduled_at ASC
  `;

  const [rows] = await pool.query(sql);
  return rows;
};

/**
 * Mark a list of notifications as sent.
 * Called by the background job after emitting WebSocket events.
 *
 * @param {Array<number>} notificationIds - IDs to mark as sent
 */
export const markNotificationsAsSent = async (notificationIds) => {
  if (!notificationIds.length) return;

  const sql = `
    UPDATE notifications
    SET status   = 'sent',
        is_sent  = TRUE,
        sent_at  = NOW()
    WHERE notification_id IN (?)
  `;

  const [result] = await pool.query(sql, [notificationIds]);
  return result;
};

/**
 * Mark a notification as failed (e.g., WebSocket emit threw an error).
 *
 * @param {number} notificationId
 */
export const markNotificationAsFailed = async (notificationId) => {
  const sql = `
    UPDATE notifications SET status = 'failed' WHERE notification_id = ?
  `;
  await pool.query(sql, [notificationId]);
};

// ─────────────────────────────────────────────────────────────────────────────
// READ OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch paginated notifications for a user.
 * Only returns status = 'sent' notifications (not pending or failed).
 *
 * @param {number} userId
 * @param {Object} filters - { type, unreadOnly, page, limit }
 * @returns {Array}
 */
export const findNotificationsByUser = async (userId, filters = {}) => {
  const { type, unreadOnly, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  // Build WHERE clause dynamically
  const conditions = ['user_id = ?', "status = 'sent'"];
  const params = [userId];

  if (type) {
    conditions.push('notification_type = ?');
    params.push(type);
  }

  if (unreadOnly === true || unreadOnly === 'true') {
    conditions.push('is_read = FALSE');
  }

  // Pagination params go last
  params.push(Number(limit), offset);

  const sql = `
    SELECT
      notification_id,
      title,
      message,
      notification_type,
      related_id,
      related_type,
      is_read,
      read_at,
      delivery_method,
      status,
      created_at
    FROM notifications
    WHERE ${conditions.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.query(sql, params);
  return rows;
};

/**
 * Count total notifications for a user (for pagination metadata).
 *
 * @param {number} userId
 * @param {Object} filters - Same as findNotificationsByUser
 * @returns {number}
 */
export const countNotificationsByUser = async (userId, filters = {}) => {
  const { type, unreadOnly } = filters;

  const conditions = ['user_id = ?', "status = 'sent'"];
  const params = [userId];

  if (type) {
    conditions.push('notification_type = ?');
    params.push(type);
  }

  if (unreadOnly === true || unreadOnly === 'true') {
    conditions.push('is_read = FALSE');
  }

  const sql = `
    SELECT COUNT(*) AS total
    FROM notifications
    WHERE ${conditions.join(' AND ')}
  `;

  const [rows] = await pool.query(sql, params);
  return rows[0].total;
};

/**
 * Count unread (sent) notifications for a user.
 *
 * @param {number} userId
 * @returns {number}
 */
export const countUnreadByUser = async (userId) => {
  const sql = `
    SELECT COUNT(*) AS unread_count
    FROM notifications
    WHERE user_id = ? AND is_read = FALSE AND status = 'sent'
  `;

  const [rows] = await pool.query(sql, [userId]);
  return rows[0].unread_count;
};

/**
 * Find a single notification by its ID.
 *
 * @param {number} notificationId
 * @returns {Object|null}
 */
export const findNotificationById = async (notificationId) => {
  const sql = `SELECT * FROM notifications WHERE notification_id = ?`;
  const [rows] = await pool.query(sql, [notificationId]);
  return rows[0] || null;
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mark a single notification as read.
 *
 * @param {number} notificationId
 * @param {number} userId - Safety check: only owner can mark as read
 */
export const markNotificationAsRead = async (notificationId, userId) => {
  const sql = `
    UPDATE notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE notification_id = ? AND user_id = ?
  `;
  const [result] = await pool.query(sql, [notificationId, userId]);
  return result;
};

/**
 * Mark ALL unread notifications as read for a user.
 *
 * @param {number} userId
 * @returns {Object} MySQL result with affectedRows
 */
export const markAllNotificationsAsRead = async (userId) => {
  const sql = `
    UPDATE notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE user_id = ? AND is_read = FALSE AND status = 'sent'
  `;
  const [result] = await pool.query(sql, [userId]);
  return result;
};

/**
 * Permanently delete a single notification.
 *
 * @param {number} notificationId
 * @param {number} userId - Safety check
 */
export const deleteNotificationById = async (notificationId, userId) => {
  const sql = `
    DELETE FROM notifications
    WHERE notification_id = ? AND user_id = ?
  `;
  const [result] = await pool.query(sql, [notificationId, userId]);
  return result;
};


export const findNotificationsSentByTeacher = async (teacherUserId, filters = {}) => {
  const { course_id, status, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;
 
  // Pass teacherUserId TWICE — once for teacher_id match, once for user_id match.
  // This makes the function resilient whether the caller passes user_id or teacher_id.
  const params = [teacherUserId, teacherUserId];
  const extraConditions = [];
 
  // Optional course filter — must also check related_type to avoid matching
  // student user_ids stored in related_id for individual student sends.
  if (course_id) {
    extraConditions.push("n.related_type = 'course' AND n.related_id = ?");
    params.push(Number(course_id));
  }
 
  const extraWhere = extraConditions.length > 0
    ? 'AND ' + extraConditions.join(' AND ')
    : '';
 
  let havingClause = '';
  if (status === 'sent')           havingClause = 'HAVING delivered_count > 0';
  else if (status === 'scheduled') havingClause = 'HAVING scheduled_count > 0';
  else if (status === 'failed')    havingClause = 'HAVING failed_count > 0';
  // undefined → no HAVING clause, return every batch (pending/scheduled included)
 
  params.push(Number(limit), offset);
 
  const sql = `
    SELECT
      n.title,
      n.message,
      n.notification_type,
      n.related_id,
      n.related_type,
      n.scheduled_at,
 
      MIN(n.created_at)                                       AS sent_at,
      COUNT(*)                                                AS recipient_count,
 
      -- Delivered
      SUM(CASE WHEN n.status = 'sent'
               THEN 1 ELSE 0 END)                            AS delivered_count,
 
      -- Scheduled/Pending: ALL status='pending' rows, regardless of scheduled_at.
      -- This covers both future-scheduled sends (scheduled_at IS NOT NULL)
      -- and BullMQ-queued sends (scheduled_at IS NULL) under one column.
      SUM(CASE WHEN n.status = 'pending'
               THEN 1 ELSE 0 END)                            AS scheduled_count,
 
      -- Failed
      SUM(CASE WHEN n.status = 'failed'
               THEN 1 ELSE 0 END)                            AS failed_count
 
    FROM notifications n
    JOIN teachers t_author ON t_author.user_id = n.created_by
 
    WHERE
      -- Works whether caller passes user_id (36) or teacher_id (3) or array [3]
      (t_author.teacher_id = ? OR t_author.user_id = ?)
 
      ${extraWhere}
 
    GROUP BY
      n.title,
      n.message,
      n.notification_type,
      n.related_id,
      n.related_type,
      n.scheduled_at,
      FLOOR(UNIX_TIMESTAMP(n.created_at) / 60)
 
    ${havingClause}
 
    ORDER BY sent_at DESC
 
    LIMIT ? OFFSET ?
  `;
 
  const [rows] = await pool.query(sql, params);
  return rows;
};
 
 
/**
 * Count total batches sent by a teacher (for pagination).
 * Mirrors findNotificationsSentByTeacher() exactly — same WHERE and HAVING.
 *
 * @param {number|number[]} teacherUserId  — teacher's user_id OR teacher_id (both handled)
 * @param {Object} filters - { course_id, status }
 * @returns {number}
 */
export const countNotificationsSentByTeacher = async (teacherUserId, filters = {}) => {
  const { course_id, status } = filters;
 
  // Same dual-param approach as findNotificationsSentByTeacher
  const params = [teacherUserId, teacherUserId];
  const extraConditions = [];
 
  if (course_id) {
    extraConditions.push("n.related_type = 'course' AND n.related_id = ?");
    params.push(Number(course_id));
  }
 
  const extraWhere = extraConditions.length > 0
    ? 'AND ' + extraConditions.join(' AND ')
    : '';
 
  let havingClause = '';
  if (status === 'sent')           havingClause = 'HAVING SUM(CASE WHEN n.status = \'sent\'    THEN 1 ELSE 0 END) > 0';
  else if (status === 'scheduled') havingClause = 'HAVING SUM(CASE WHEN n.status = \'pending\'  THEN 1 ELSE 0 END) > 0';
  else if (status === 'failed')    havingClause = 'HAVING SUM(CASE WHEN n.status = \'failed\'   THEN 1 ELSE 0 END) > 0';
  // undefined → no HAVING clause
 
  const sql = `
    SELECT COUNT(*) AS total
    FROM (
      SELECT 1
      FROM notifications n
      JOIN teachers t_author ON t_author.user_id = n.created_by
      WHERE
        (t_author.teacher_id = ? OR t_author.user_id = ?)
        ${extraWhere}
      GROUP BY
        n.title, n.message, n.notification_type,
        n.related_id, n.related_type, n.scheduled_at,
        FLOOR(UNIX_TIMESTAMP(n.created_at) / 60)
      ${havingClause}
    ) AS batches
  `;
 
  const [rows] = await pool.query(sql, params);
  return rows[0].total;
};