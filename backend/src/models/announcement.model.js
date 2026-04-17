/**
 * Author: Harshitha Ravuri,
 * Announcement Model
 * ===================
 * Database queries for the `announcements` table.
 * Only admins can create/manage announcements.
 */


import pool from '../config/database.config.js';
import { ANNOUNCEMENT_STATUS } from '../constants/announcementConstants.js';

// ─────────────────────────────────────────────────────────────────────────────
// INSERT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new announcement.
 *
 * Status is determined by the caller (service layer):
 *   - draft       → no start_date provided
 *   - scheduled   → start_date is in the future
 *   - broadcasted → start_date is now or in the past (instant broadcast)
 *
 * @param {Object} data
 * @param {number}      data.created_by
 * @param {string}      data.title
 * @param {string}      data.content
 * @param {string}      data.target_audience
 * @param {number|null} data.course_id
 * @param {string}      data.priority
 * @param {string}      data.status         - From ANNOUNCEMENT_STATUS
 * @param {string|null} data.start_date
 * @param {string|null} data.end_date
 * @returns {Object} MySQL result (use result.insertId)
 */
export const createAnnouncement = async (data) => {
  const sql = `
    INSERT INTO announcements
      (created_by, title, content, target_audience, course_id,
       priority, status, is_active, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?)
  `;

  const params = [
    data.created_by,
    data.title,
    data.content,
    data.target_audience,
    data.course_id  || null,
    data.priority   || 'medium',
    data.status     || ANNOUNCEMENT_STATUS.DRAFT,
    data.start_date || null,
    data.end_date   || null,
  ];

  const [result] = await pool.query(sql, params);
  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find a single announcement by its ID.
 *
 * @param {number} announcementId
 * @returns {Object|null}
 */
export const findAnnouncementById = async (announcementId) => {
  const sql = `SELECT * FROM announcements WHERE announcement_id = ?`;
  const [rows] = await pool.query(sql, [announcementId]);
  return rows[0] || null;
};

/**
 * Get all announcements (admin management view).
 * Returns every status, including deactivated, for full admin visibility.
 *
 * @param {number} page
 * @param {number} limit
 * @returns {Array}
 */
export const findAllAnnouncements = async (page = 1, limit = 20) => {
  const offset = (page - 1) * limit;

  const sql = `
    SELECT
      a.announcement_id,
      a.title,
      a.content,
      a.target_audience,
      a.course_id,
      a.priority,
      a.status,
      a.is_active,
      a.start_date,
      a.end_date,
      a.created_at,
      a.updated_at,
      CONCAT(u.first_name, ' ', u.last_name) AS created_by_name
    FROM announcements a
    JOIN users u ON u.user_id = a.created_by
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.query(sql, [Number(limit), offset]);
  return rows;
};

/**
 * Get only active, broadcasted (or edited) announcements — for the user-facing view.
 * Respects start_date and end_date windows.
 *
 * @param {number} page
 * @param {number} limit
 * @returns {Array}
 */
export const findActiveAnnouncements = async (page = 1, limit = 20) => {
  const offset = (page - 1) * limit;

  const sql = `
    SELECT
      announcement_id,
      title,
      content,
      target_audience,
      priority,
      status,
      start_date,
      end_date,
      created_at
    FROM announcements
    WHERE is_active = TRUE
      AND status IN ('broadcasted', 'edited')
      AND (start_date IS NULL OR start_date <= NOW())
      AND (end_date   IS NULL OR end_date   >  NOW())
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.query(sql, [Number(limit), offset]);
  return rows;
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update the status column of an announcement.
 * Used internally by service functions.
 *
 * @param {number} announcementId
 * @param {string} status - From ANNOUNCEMENT_STATUS
 */
export const updateAnnouncementStatus = async (announcementId, status) => {
  const sql = `
    UPDATE announcements
    SET status = ?, updated_at = NOW()
    WHERE announcement_id = ?
  `;
  const [result] = await pool.query(sql, [status, announcementId]);
  return result;
};

/**
 * Update an announcement's content fields.
 * Only the fields passed in are updated (all others stay unchanged).
 *
 * If the current status is 'broadcasted', the service will change it to 'edited'.
 * This model function only handles the column updates — status logic is in the service.
 *
 * @param {number} announcementId
 * @param {Object} data - Fields to update (any subset of: title, content, target_audience, course_id, priority, end_date)
 */
export const updateAnnouncement = async (announcementId, data) => {
  // Build SET clause dynamically — only include fields that were passed in
  const setClauses = [];
  const params = [];

  if (data.title !== undefined) {
    setClauses.push('title = ?');
    params.push(data.title);
  }
  if (data.content !== undefined) {
    setClauses.push('content = ?');
    params.push(data.content);
  }
  if (data.target_audience !== undefined) {
    setClauses.push('target_audience = ?');
    params.push(data.target_audience);
  }
  if (data.course_id !== undefined) {
    setClauses.push('course_id = ?');
    params.push(data.course_id);
  }
  if (data.priority !== undefined) {
    setClauses.push('priority = ?');
    params.push(data.priority);
  }
  if (data.end_date !== undefined) {
    setClauses.push('end_date = ?');
    params.push(data.end_date);
  }
  if (data.status !== undefined) {
    setClauses.push('status = ?');
    params.push(data.status);
  }

  if (setClauses.length === 0) return null; // Nothing to update

  setClauses.push('updated_at = NOW()');
  params.push(announcementId);

  const sql = `
    UPDATE announcements
    SET ${setClauses.join(', ')}
    WHERE announcement_id = ?
  `;

  const [result] = await pool.query(sql, params);
  return result;
};

/**
 * Deactivate an announcement.
 * Sets is_active = FALSE and status = 'deactivated'.
 *
 * @param {number} announcementId
 */
export const deactivateAnnouncement = async (announcementId) => {
  const sql = `
    UPDATE announcements
    SET is_active = FALSE,
        status    = 'deactivated',
        updated_at = NOW()
    WHERE announcement_id = ?
  `;
  const [result] = await pool.query(sql, [announcementId]);
  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// BACKGROUND JOB QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find all scheduled announcements whose start_date has arrived.
 * Called by the background job every minute.
 *
 * Conditions:
 *   status = 'scheduled'
 *   start_date <= NOW()
 *   is_active = TRUE
 *
 * @returns {Array} Announcements ready to be broadcasted
 */
export const findScheduledReadyToBroadcast = async () => {
  const sql = `
    SELECT *
    FROM announcements
    WHERE status = 'scheduled'
      AND start_date <= NOW()
      AND is_active = TRUE
    ORDER BY start_date ASC
  `;

  const [rows] = await pool.query(sql);
  return rows;
};

/**
 * Find all active announcements whose end_date has passed.
 * Called by the background job to expire old announcements.
 *
 * @returns {Array} Expired announcements
 */
export const findExpiredAnnouncements = async () => {
  const sql = `
    SELECT announcement_id
    FROM announcements
    WHERE is_active = TRUE
      AND end_date IS NOT NULL
      AND end_date < NOW()
      AND status != 'deactivated'
  `;

  const [rows] = await pool.query(sql);
  return rows;
};

/**
 * Bulk deactivate a list of announcements by their IDs.
 * Used by the background job to expire multiple announcements at once.
 *
 * @param {Array<number>} announcementIds
 */
export const bulkDeactivateAnnouncements = async (announcementIds) => {
  if (!announcementIds.length) return;

  const sql = `
    UPDATE announcements
    SET is_active  = FALSE,
        status     = 'deactivated',
        updated_at = NOW()
    WHERE announcement_id IN (?)
  `;

  const [result] = await pool.query(sql, [announcementIds]);
  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// TARGET AUDIENCE RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve which user_ids to notify based on target_audience.
 * Returns a flat array of user_ids.
 *
 * @param {string} targetAudience - 'all'|'students'|'teachers'|'parents'|'specific_course'
 * @param {number|null} courseId  - Required for 'specific_course'
 * @returns {Array<number>} Array of user_ids
 */
export const resolveTargetUserIds = async (targetAudience, courseId = null) => {
  let sql;
  let params = [];

  switch (targetAudience) {

    // ── all_users: every active user regardless of role ──────────────────────
    case 'all_users':
      sql = `SELECT user_id FROM users WHERE is_active = TRUE`;
      break;

    // ── all_students: every active student ───────────────────────────────────
    case 'all_students':
      sql = `SELECT user_id FROM users WHERE user_type = 'student' AND is_active = TRUE`;
      break;

    // ── course_students: enrolled students of one course ─────────────────────
    case 'course_students':
      if (!courseId) {
        console.warn('[Announcement] course_students requires course_id');
        return [];
      }
      sql = `
        SELECT DISTINCT u.user_id
        FROM users u
        JOIN students s           ON s.user_id   = u.user_id
        JOIN course_enrollments e ON e.student_id = s.student_id
        WHERE e.course_id = ?
          AND e.status   != 'dropped'
          AND u.is_active = TRUE
      `;
      params = [courseId];
      break;

    // ── teachers: all active teachers ────────────────────────────────────────
    case 'teachers':
      sql = `SELECT user_id FROM users WHERE user_type = 'teacher' AND is_active = TRUE`;
      break;

    // ── parents: all active parents ───────────────────────────────────────────
    case 'parents':
      sql = `SELECT user_id FROM users WHERE user_type = 'parent' AND is_active = TRUE`;
      break;

    default:
      console.warn(`[Announcement] Unknown target_audience: "${targetAudience}"`);
      return [];
  }

  const [rows] = await pool.query(sql, params);

  // Return a flat array of user_ids e.g. [1, 2, 3, 4]
  return rows.map((row) => row.user_id);
};










