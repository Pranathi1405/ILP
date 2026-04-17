// ============================================================
// src/models/parentAnalytics.model.js
// All database queries for parent analytics.
// Models ONLY do database work — no business logic here.
// ============================================================

import pool from '../config/database.config.js';

// ─────────────────────────────────────────────────────────────
// READ QUERIES
// ─────────────────────────────────────────────────────────────

/**
 * Fetch all students linked to a parent.
 * Reads from: parent_student_relationship → students → users
 *
 * @param {number} parentId
 * @returns {Array} list of linked students with basic profile info
 */
export const getLinkedStudents = async (parentId) => {
  const [rows] = await pool.query(
    `SELECT
       s.student_id,
       u.first_name,
       u.last_name,
       u.profile_picture_url,
       u.email,
       psr.relationship_type,
       psr.is_primary,
       -- Pull latest analytics snapshot so the list can show a quick summary
       sda.enrolled_courses,
       sda.average_test_score,
       sda.current_rank,
       sda.last_activity_date
     FROM parent_student_relationship psr
     JOIN students s ON s.student_id = psr.student_id
     JOIN users    u ON u.user_id    = s.user_id
     LEFT JOIN student_dashboard_analytics sda
       ON sda.student_id = s.student_id
     WHERE psr.parent_id = ?
     ORDER BY psr.is_primary DESC, u.first_name ASC`,
    [parentId],
  );
  return rows;
};

/**
 * Verify that a (parent, student) pair exists in the mapping table.
 * Used by the service before returning any analytics.
 *
 * @param {number} parentId
 * @param {number} studentId
 * @returns {boolean}
 */
export const validateParentStudentMapping = async (parentId, studentId) => {
  const [rows] = await pool.query(
    `SELECT 1
     FROM parent_student_relationship
     WHERE parent_id = ? AND student_id = ?
     LIMIT 1`,
    [parentId, studentId],
  );
  return rows.length > 0;
};

/**
 * Get the primary student for a parent (is_primary = 1).
 * Used when studentId is not supplied and parent has only 1 child
 * or an explicit primary is set.
 *
 * @param {number} parentId
 * @returns {object|null} { student_id } or null
 */
export const getPrimaryStudent = async (parentId) => {
  const [rows] = await pool.query(
    `SELECT student_id
     FROM parent_student_relationship
     WHERE parent_id = ? AND is_primary = 1
     LIMIT 1`,
    [parentId],
  );
  return rows[0] || null;
};

/**
 * Count how many students are linked to a parent.
 *
 * @param {number} parentId
 * @returns {number}
 */
export const countLinkedStudents = async (parentId) => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM parent_student_relationship
     WHERE parent_id = ?`,
    [parentId],
  );
  return rows[0]?.cnt ?? 0;
};

/**
 * Fetch the pre-computed analytics row for a (parent, student) pair.
 * Reads from: parent_dashboard_analytics
 *
 * @param {number} parentId
 * @param {number} studentId
 * @returns {object|null}
 */
export const getParentDashboardAnalytics = async (parentId, studentId) => {
  const [rows] = await pool.query(
    `SELECT
       pda.total_courses_enrolled,
       pda.courses_in_progress,
       pda.courses_completed,
       pda.average_course_progress,
       pda.total_tests_attempted,
       pda.average_test_score,
       pda.total_study_time_minutes,
       pda.attendance_rate,
       pda.current_rank,
       pda.last_active_date,
       pda.performance_trend,
       pda.updated_at
     FROM parent_dashboard_analytics pda
     WHERE pda.parent_id = ? AND pda.student_id = ?`,
    [parentId, studentId],
  );
  return rows[0] || null;
};

// ─────────────────────────────────────────────────────────────
// WRITE QUERIES  (called by worker + cron)
// ─────────────────────────────────────────────────────────────

/**
 * Upsert parent_dashboard_analytics for one (parent, student) pair.
 *
 * Computes all metrics by reading from student analytics tables:
 *   student_dashboard_analytics  → rank, study time, test counts
 *   course_progress_analytics    → course counts, progress %
 *   live_class_attendance        → attendance_rate
 *
 * Called by:
 *   - analytics.worker.js  (UPDATE_PARENT_ANALYTICS job)
 *   - analyticsCron.job.js (nightly recompute)
 *
 * @param {number} parentId
 * @param {number} studentId
 */
export const upsertParentDashboardAnalytics = async (parentId, studentId) => {
  // ── 1. Pull from student_dashboard_analytics ──────────────
  const [sdaRows] = await pool.query(
    `SELECT
       enrolled_courses,
       completed_courses,
       in_progress_courses,
       total_watch_time_minutes,
       tests_attempted,
       average_test_score,
       current_rank,
       last_activity_date
     FROM student_dashboard_analytics
     WHERE student_id = ?`,
    [studentId],
  );

  const sda = sdaRows[0] || {};

  // ── 2. Average course progress across all enrolled courses ─
  const [progressRows] = await pool.query(
    `SELECT AVG(progress_percentage) AS avg_progress
     FROM course_progress_analytics
     WHERE student_id = ?`,
    [studentId],
  );

  const avgProgress = progressRows[0]?.avg_progress ?? 0;

  // ── 3. Attendance rate ─────────────────────────────────────
  // = classes attended / total classes for courses student is enrolled in
  const [attendanceRows] = await pool.query(
    `SELECT
       COUNT(DISTINCT lca.class_id)                                  AS attended,
       (SELECT COUNT(DISTINCT lc2.class_id)
        FROM live_classes lc2
        JOIN course_enrollments ce2
          ON ce2.course_id = lc2.course_id
        WHERE ce2.student_id = ?
          AND lc2.status = 'completed'
          AND lc2.is_deleted = FALSE
       )                                                              AS total_classes
     FROM live_class_attendance lca
     WHERE lca.student_id = ?`,
    [studentId, studentId],
  );

  const attended     = attendanceRows[0]?.attended     ?? 0;
  const totalClasses = attendanceRows[0]?.total_classes ?? 0;
  const attendanceRate = totalClasses > 0
    ? parseFloat(((attended / totalClasses) * 100).toFixed(2))
    : 0;

  // ── 4. Performance trend ───────────────────────────────────
  // Compare last 2 test average scores from test_performance_analytics
  const [trendRows] = await pool.query(
    `SELECT improvement_trend
     FROM test_performance_analytics
     WHERE student_id = ?
     ORDER BY updated_at DESC
     LIMIT 5`,
    [studentId],
  );

  const avgTrend = trendRows.length
    ? trendRows.reduce((sum, r) => sum + parseFloat(r.improvement_trend || 0), 0) / trendRows.length
    : 0;

  const performanceTrend = avgTrend > 2
    ? 'improving'
    : avgTrend < -2
      ? 'declining'
      : 'stable';

  // ── 5. UPSERT ──────────────────────────────────────────────
  await pool.query(
    `INSERT INTO parent_dashboard_analytics
       (parent_id, student_id,
        total_courses_enrolled, courses_in_progress, courses_completed,
        average_course_progress,
        total_tests_attempted, average_test_score,
        total_study_time_minutes, attendance_rate,
        current_rank, last_active_date, performance_trend)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       total_courses_enrolled  = VALUES(total_courses_enrolled),
       courses_in_progress     = VALUES(courses_in_progress),
       courses_completed       = VALUES(courses_completed),
       average_course_progress = VALUES(average_course_progress),
       total_tests_attempted   = VALUES(total_tests_attempted),
       average_test_score      = VALUES(average_test_score),
       total_study_time_minutes= VALUES(total_study_time_minutes),
       attendance_rate         = VALUES(attendance_rate),
       current_rank            = VALUES(current_rank),
       last_active_date        = VALUES(last_active_date),
       performance_trend       = VALUES(performance_trend)`,
    [
      parentId,
      studentId,
      sda.enrolled_courses        ?? 0,
      sda.in_progress_courses     ?? 0,
      sda.completed_courses       ?? 0,
      parseFloat((avgProgress).toFixed(2)),
      sda.tests_attempted         ?? 0,
      parseFloat((sda.average_test_score ?? 0).toFixed(2)),
      sda.total_watch_time_minutes ?? 0,
      attendanceRate,
      sda.current_rank            ?? null,
      sda.last_activity_date      ?? null,
      performanceTrend,
    ],
  );
};

