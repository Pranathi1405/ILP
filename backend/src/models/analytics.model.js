// Authors: Harshitha Ravuri,
// ============================================================
// analytics.model.js
// All database query functions for analytics tables.
// Models ONLY do database work — no business logic here.
// ============================================================

import pool from '../config/database.config.js';

// ─────────────────────────────────────────────
// STUDENT ANALYTICS MODELS
// ─────────────────────────────────────────────

/**
 * Get the main dashboard overview for a student.
 * Reads from: student_dashboard_analytics
 */
export const getStudentDashboardAnalytics = async (studentId) => {
  const [rows] = await pool.query(
    `SELECT
       sda.enrolled_courses,
       sda.completed_courses,
       sda.in_progress_courses,
       sda.total_watch_time_minutes,
       sda.tests_attempted,
       sda.tests_passed,
       sda.average_test_score,
       sda.last_3_tests_avg,
       sda.previous_3_tests_avg,
       sda.score_change_percentage,
       sda.score_trend,
       sda.current_streak_days,
       sda.longest_streak_days,
       sda.total_points,
       sda.current_rank,
       sda.last_activity_date,
       sda.updated_at
     FROM student_dashboard_analytics sda
     WHERE sda.student_id = ?`,
    [studentId]
  );
  return rows[0] || null;
};

/**
 * Get course progress list for a student.
 * Reads from: course_progress_analytics
 */
export const getStudentCourseProgress = async (studentId) => {
  const [rows] = await pool.query(
    `SELECT
       cpa.course_id,
       c.course_name            AS course_title,
       c.thumbnail_url,
       cpa.total_modules,
       cpa.completed_modules,
       cpa.total_videos,
       cpa.completed_videos,
       cpa.total_tests,
       cpa.completed_tests,
       cpa.progress_percentage,
       cpa.average_test_score,
       cpa.total_watch_time_minutes,
       cpa.estimated_completion_date,
       cpa.last_accessed_at,
       ce.status               AS enrollment_status
     FROM course_progress_analytics cpa
     JOIN courses c  ON c.course_id   = cpa.course_id
     JOIN course_enrollments ce ON ce.enrollment_id = cpa.enrollment_id
     WHERE cpa.student_id = ?
     ORDER BY cpa.last_accessed_at DESC`,
    [studentId]
  );
  return rows;
};

/**
 * Get subject-level analytics for a student in a course.
 * Reads from: topic_mastery_analytics (grouped by subject)
 */
export const getStudentSubjectAnalytics = async (studentId, courseId) => {
  const [rows] = await pool.query(
    `SELECT
       tma.subject_id,
       cs.subject_name                                                      AS subject_title,
       COUNT(tma.module_id)                                                 AS total_topics,
       AVG(tma.avg_score)                                                   AS avg_score,
       SUM(tma.tests_attempted)                                             AS tests_attempted,
       SUM(tma.correct_answers)                                             AS correct_answers,
       SUM(tma.wrong_answers)                                               AS wrong_answers,
       SUM(CASE WHEN tma.mastery_level = 'high'   THEN 1 ELSE 0 END)       AS strong_topics,
       SUM(CASE WHEN tma.mastery_level = 'medium' THEN 1 ELSE 0 END)       AS average_topics,
       SUM(CASE WHEN tma.mastery_level = 'low'    THEN 1 ELSE 0 END)       AS weak_topics
     FROM topic_mastery_analytics tma
     JOIN course_subjects cs ON cs.subject_id = tma.subject_id
     WHERE tma.student_id = ? AND tma.course_id = ?
     GROUP BY tma.subject_id, cs.subject_name
     ORDER BY avg_score DESC`,
    [studentId, courseId]
  );
  return rows;
};

/**
 * Get test performance analytics for a student.
 * Reads from: test_performance_analytics
 */
export const getStudentTestPerformance = async (studentId) => {
  const [rows] = await pool.query(
    `SELECT
       tpa.test_analytics_id,
       tpa.subject_id,
       cs.subject_name        AS subject_title,
       tpa.test_type,
       tpa.total_tests,
       tpa.completed_tests,
       tpa.average_score,
       tpa.highest_score,
       tpa.lowest_score,
       tpa.total_marks_available,
       tpa.total_time_taken_minutes,
       -- Question-level metrics
       tpa.total_questions,
       tpa.attempted_questions,
       tpa.correct_answers,
       tpa.accuracy_percentage,
       -- Attempt behaviour
       tpa.partial_answers,
       tpa.unanswered_questions,
       -- Speed
       tpa.avg_time_per_question,
       -- Trend + topics
       tpa.improvement_trend,
       tpa.strong_topics,
       tpa.weak_topics,
       -- Consistency
       tpa.score_variance,
       -- Last attempt snapshot
       tpa.last_test_score,
       tpa.last_test_accuracy,
       tpa.last_attempted_at,
       tpa.updated_at
     FROM test_performance_analytics tpa
     JOIN course_subjects cs ON cs.subject_id = tpa.subject_id
     WHERE tpa.student_id = ?
     ORDER BY tpa.average_score DESC`,
    [studentId]
  );
  return rows;
};

/**
 * Get leaderboard — returns current student's rank + top N students.
 * Reads from: leaderboard table (all_time period).
 */
export const getLeaderboard = async (studentId, limit = 50) => {
  const [topStudents] = await pool.query(
    `SELECT
       lb.rank_position                                                                AS rank_position,
       lb.points_earned,
       lb.courses_completed,
       lb.tests_completed,
       lb.average_score,
       u.first_name,
       u.last_name,
       u.profile_picture_url,
       CASE WHEN lb.student_id = ? THEN TRUE ELSE FALSE END                  AS is_current_student
     FROM leaderboard lb
     JOIN students s ON s.student_id = lb.student_id
     JOIN users    u ON u.user_id    = s.user_id
     WHERE lb.period_type = 'all_time'
     ORDER BY lb.rank_position ASC
     LIMIT ?`,
    [studentId, limit]
  );

  const [myRank] = await pool.query(
    `SELECT  rank_position, points_earned, average_score
     FROM leaderboard
     WHERE student_id = ? AND period_type = 'all_time'
     ORDER BY period_start_date DESC
     LIMIT 1`,
    [studentId]
  );

  return {
    student_rank: myRank[0] || null,
    leaderboard_list: topStudents,
  };
};

/**
 * Get topic-level mastery for a student, enriched with module names.
 * Reads from: topic_mastery_analytics JOIN subject_modules
 */
export const getStudentTopicMastery = async (studentId) => {
  const [rows] = await pool.query(
    `SELECT
       tma.module_id,
       sm.module_name               AS topic_name,
       tma.subject_id,
       cs.subject_name              AS subject_title,
       tma.course_id,
       tma.tests_attempted,
       tma.correct_answers,
       tma.wrong_answers,
       tma.avg_score,
       tma.mastery_level,
       tma.last_attempted_at
     FROM topic_mastery_analytics tma
     LEFT JOIN subject_modules sm ON sm.module_id  = tma.module_id
     LEFT JOIN course_subjects cs ON cs.subject_id = tma.subject_id
     WHERE tma.student_id = ?
     ORDER BY tma.avg_score ASC`,
    [studentId]
  );
  return rows;
};

// ─────────────────────────────────────────────
// SCORE IMPROVEMENT TREND  (Student / Parent / Teacher)
// ─────────────────────────────────────────────

/**
 * Fetch the last N submitted test attempts for a student (via user_id).
 * Returns test metadata alongside the score so callers can show a trend chart.
 *
 * @param {number} userId      - maps to test_attempts.user_id
 * @param {number} [limit=10]  - how many recent attempts to return
 */
export const getScoreImprovementTrend = async (userId, limit = 10) => {
  const [rows] = await pool.query(
    `SELECT
       ta.attempt_id,
       t.title                                         AS test_name,
       ta.total_score                                  AS score,
       t.total_marks                                   AS max_score,
       ta.submitted_at                                 AS attempted_at,
       -- Score difference vs the immediately previous attempt (window fn)
       ta.total_score - LAG(ta.total_score) OVER (
         PARTITION BY ta.user_id ORDER BY ta.submitted_at
       )                                               AS score_diff,
       -- Trend direction vs previous attempt
       CASE
         WHEN ta.total_score > LAG(ta.total_score) OVER (
               PARTITION BY ta.user_id ORDER BY ta.submitted_at) THEN 'increase'
         WHEN ta.total_score < LAG(ta.total_score) OVER (
               PARTITION BY ta.user_id ORDER BY ta.submitted_at) THEN 'decrease'
         ELSE 'stable'
       END                                             AS trend_direction
     FROM test_attempts ta
     JOIN tests t ON t.test_id = ta.test_id
     WHERE ta.user_id = ?
       AND ta.status  = 'submitted'
     ORDER BY ta.submitted_at DESC
     LIMIT ?`,
    [userId, limit]
  );
  // Return in chronological order so the frontend can render a left→right chart
  return rows.reverse();
};

// ─────────────────────────────────────────────
// COURSE LEADERBOARD
// ─────────────────────────────────────────────

/**
 * Get a student's rank inside a specific course.
 * Returns rank, total enrolled students, and percentile.
 *
 * @param {number} studentId
 * @param {number} courseId
 */
export const getStudentCourseRank = async (studentId, courseId) => {
  const [rows] = await pool.query(
    `SELECT
       cl.rank_in_course,
       cl.total_score,
       cl.completion_percentage,
       cl.average_test_score,
       -- Total students in this course leaderboard
       (SELECT COUNT(*) FROM course_leaderboard WHERE course_id = ?)     AS total_students,
       -- Percentile rank (higher is better)
       ROUND(
         (1 - (cl.rank_in_course - 1) /
               NULLIF((SELECT COUNT(*) FROM course_leaderboard WHERE course_id = ?), 1)
         ) * 100,
       1)                                                                  AS percentile
     FROM course_leaderboard cl
     WHERE cl.student_id = ? AND cl.course_id = ?`,
    [courseId, courseId, studentId, courseId]
  );
  return rows[0] || null;
};

/**
 * Get the top N students in a course leaderboard.
 * Used by: Teacher dashboard (leaderboard preview) & Student rank comparison.
 *
 * @param {number} courseId
 * @param {number} [limit=10]
 */
export const getCourseLeaderboard = async (courseId, limit = 10) => {
  const [rows] = await pool.query(
    `SELECT
       cl.rank_in_course,
       cl.student_id,
       u.first_name,
       u.last_name,
       u.profile_picture_url,
       cl.total_score,
       cl.completion_percentage,
       cl.average_test_score,
       cl.tests_completed
     FROM course_leaderboard cl
     JOIN students s ON s.student_id = cl.student_id
     JOIN users    u ON u.user_id    = s.user_id
     WHERE cl.course_id = ?
     ORDER BY cl.rank_in_course ASC
     LIMIT ?`,
    [courseId, limit]
  );
  return rows;
};

/**
 * Get rank comparison data for a student in a course:
 * their own rank vs. the class average rank vs. the top performer.
 *
 * @param {number} studentId
 * @param {number} courseId
 */
export const getCourseRankComparison = async (studentId, courseId) => {
  const [rows] = await pool.query(
    `SELECT
       -- Student's own metrics
       my.rank_in_course                         AS my_rank,
       my.average_test_score                     AS my_avg_score,
       my.completion_percentage                  AS my_completion,
       -- Class average
       stats.avg_rank,
       stats.avg_score_class,
       stats.avg_completion_class,
       stats.total_students,
       -- Top performer
       top.rank_in_course                        AS top_rank,
       top.average_test_score                    AS top_avg_score,
       top.completion_percentage                 AS top_completion,
       top_u.first_name                          AS top_first_name,
       top_u.last_name                           AS top_last_name
     FROM course_leaderboard my
     -- Aggregate stats for the whole course
     JOIN (
       SELECT
         course_id,
         AVG(rank_in_course)       AS avg_rank,
         AVG(average_test_score)   AS avg_score_class,
         AVG(completion_percentage)AS avg_completion_class,
         COUNT(*)                  AS total_students
       FROM course_leaderboard
       WHERE course_id = ?
       GROUP BY course_id
     ) stats ON stats.course_id = my.course_id
     -- Top-ranked student
     JOIN course_leaderboard top ON top.course_id = my.course_id AND top.rank_in_course = 1
     JOIN students top_s ON top_s.student_id = top.student_id
     JOIN users    top_u ON top_u.user_id    = top_s.user_id
     WHERE my.student_id = ? AND my.course_id = ?`,
    [courseId, studentId, courseId]
  );
  return rows[0] || null;
};

// ─────────────────────────────────────────────
// TEACHER ANALYTICS MODELS
// ─────────────────────────────────────────────

/**
 * Get teacher's own dashboard metrics.
 * Reads from: teacher_analytics
 */
export const getTeacherDashboardAnalytics = async (teacherId) => {
  const [rows] = await pool.query(
    `SELECT
       ta.total_courses_created,
       ta.published_courses,
       ta.total_students,
       ta.active_students,
       ta.total_enrollments,
       ta.average_course_rating,
       ta.total_reviews,
       ta.total_revenue,
       ta.average_student_progress,
       ta.total_live_classes,
       ta.total_doubts_answered,
       ta.average_response_time_hours,
       ta.updated_at
     FROM teacher_analytics ta
     WHERE ta.teacher_id = ?`,
    [teacherId]
  );
  return rows[0] || null;
};

/**
 * Get analytics for all courses taught by a teacher.
 * Reads from: course_analytics
 */
export const getTeacherCourseAnalytics = async (teacherId) => {
  const [rows] = await pool.query(
    `SELECT
       ca.course_id,
       c.course_name                AS course_title,
       c.thumbnail_url,
       ca.total_enrollments,
       ca.active_students,
       ca.completed_students,
       ca.dropout_rate,
       ca.average_completion_rate,
       ca.average_test_score,
       ca.total_revenue,
       ca.average_rating,
       ca.total_reviews,
       ca.popular_modules,
       ca.challenging_topics,
       ca.updated_at
     FROM course_analytics ca
     JOIN courses c ON c.course_id = ca.course_id
     WHERE ca.teacher_id = ?
     ORDER BY ca.total_enrollments DESC`,
    [teacherId]
  );
  return rows;
};

/**
 * Get test performance analytics for a teacher's courses.
 * Reads from: test_performance_analytics (across all students in teacher's courses).
 */
export const getTeacherTestAnalytics = async (teacherId) => {
  const [rows] = await pool.query(
    `SELECT
       tpa.subject_id,
       cs.subject_name         AS subject_title,
       c.course_name           AS course_title,
       tpa.test_type,
       COUNT(DISTINCT tpa.student_id)                         AS total_students,
       AVG(tpa.average_score)                                 AS average_score,
       AVG(tpa.accuracy_percentage)                           AS avg_accuracy,
       AVG(tpa.avg_time_per_question)                         AS avg_time_per_question,
       AVG(tpa.score_variance)                                AS avg_score_variance,
       SUM(tpa.total_questions)                               AS total_questions,
       SUM(tpa.correct_answers)                               AS total_correct_answers,
       SUM(tpa.unanswered_questions)                          AS total_unanswered,
       -- pass rate = students who averaged >= 40
       SUM(CASE WHEN tpa.average_score >= 40 THEN 1 ELSE 0 END) AS students_passed,
       COUNT(tpa.student_id)                                  AS total_attempts
     FROM test_performance_analytics tpa
     JOIN course_subjects cs ON cs.subject_id = tpa.subject_id
     JOIN courses c          ON c.course_id    = cs.course_id
     WHERE c.created_by = ?
     GROUP BY tpa.subject_id, cs.subject_name, c.course_name, tpa.test_type
     ORDER BY average_score ASC`,
    [teacherId]
  );
  return rows;
};

/**
 * Get all students enrolled in a teacher's courses with progress & rank.
 * Used by: Teacher → Course-wise Student Progress feature.
 *
 * @param {number} teacherId
 * @param {number} courseId
 */
export const getCourseStudentProgress = async (teacherId, courseId) => {
  const [rows] = await pool.query(
    `SELECT
  ce.course_id,
  c.course_name,

  s.student_id,
  u.first_name,
  u.last_name,
  u.profile_picture_url,

  cpa.progress_percentage,
  cpa.average_test_score,
  cpa.last_accessed_at AS last_activity,

  cl.rank_in_course AS course_rank,

  COUNT(*) OVER (PARTITION BY ce.course_id) AS total_students

FROM course_enrollments ce

JOIN courses c
  ON c.course_id = ce.course_id

JOIN students s 
  ON s.student_id = ce.student_id

JOIN users u 
  ON u.user_id = s.user_id

-- Validate teacher belongs to this course
JOIN course_subjects sub 
  ON sub.course_id = ce.course_id 
 AND sub.teacher_id = ?
 AND sub.is_active = 1

LEFT JOIN course_progress_analytics cpa
  ON cpa.student_id = ce.student_id 
 AND cpa.course_id = ce.course_id

LEFT JOIN course_leaderboard cl
  ON cl.student_id = ce.student_id 
 AND cl.course_id = ce.course_id

WHERE ce.course_id = ?
  AND ce.status = 'active'

ORDER BY 
  cl.rank_in_course IS NULL,
  cl.rank_in_course ASC`,
    [teacherId, courseId]
  );

  return rows;
};
/**
 * Get a specific student's performance (for teacher to view).
 * Reads from: student_dashboard_analytics, topic_mastery_analytics (with names),
 *             course_progress_analytics.
 */
export const getStudentPerformanceForTeacher = async (studentId) => {
  const [dashboardRows] = await pool.query(
    `SELECT * FROM student_dashboard_analytics WHERE student_id = ?`,
    [studentId]
  );

  const [topicRows] = await pool.query(
    `SELECT
       tma.*,
       sm.module_name AS topic_name,
       cs.subject_name AS subject_title
     FROM topic_mastery_analytics tma
     LEFT JOIN subject_modules sm ON sm.module_id  = tma.module_id
     JOIN      course_subjects cs ON cs.subject_id = tma.subject_id
     WHERE tma.student_id = ?`,
    [studentId]
  );

  const [progressRows] = await pool.query(
    `SELECT cpa.*, c.course_name AS course_title
     FROM course_progress_analytics cpa
     JOIN courses c ON c.course_id = cpa.course_id
     WHERE cpa.student_id = ?`,
    [studentId]
  );

  return {
    overview: dashboardRows[0] || null,
    topic_mastery: topicRows,
    course_progress: progressRows,
  };
};

/**
 * Get live class analytics for a teacher.
 * Reads from: live_class_attendance + live_classes.
 */
export const getTeacherLiveClassAnalytics = async (teacherId) => {
  const [rows] = await pool.query(
    `SELECT
       lc.class_id,
       lc.title                  AS class_title,
       lc.scheduled_start_time,
       lc.duration_minutes,
       COUNT(lca.attendance_id)  AS total_participants,
       AVG(lca.duration_minutes) AS average_duration_minutes,
       (
         COUNT(lca.attendance_id) * 100.0 /
         NULLIF(
           (SELECT COUNT(*)
            FROM course_enrollments ce2
            WHERE ce2.course_id = lc.course_id
              AND ce2.status    = 'active'),
           0
         )
       )                         AS attendance_rate
     FROM live_classes lc
     LEFT JOIN live_class_attendance lca ON lca.class_id = lc.class_id
     WHERE lc.teacher_id = ?
     GROUP BY
       lc.class_id, lc.title, lc.scheduled_start_time,
       lc.duration_minutes, lc.course_id
     ORDER BY lc.scheduled_start_time DESC
     LIMIT 20`,
    [teacherId]
  );
  return rows;
};

// ─────────────────────────────────────────────
// ADMIN ANALYTICS MODELS
// ─────────────────────────────────────────────

/**
 * Get latest platform-wide statistics.
 * Reads from: platform_statistics (most recent row).
 */
export const getPlatformDashboard = async () => {
  const [rows] = await pool.query(
    `SELECT
       ps.total_users,
       ps.active_users,
       ps.new_users_today,
       ps.total_students,
       ps.total_teachers,
       ps.total_courses,
       ps.published_courses,
       ps.total_enrollments,
       ps.new_enrollments_today,
       ps.total_revenue,
       ps.revenue_today,
       ps.total_tests_taken,
       ps.total_live_classes,
       ps.total_doubts,
       ps.resolved_doubts,
       ps.average_platform_rating,
       ps.stat_date
     FROM platform_statistics ps
     ORDER BY ps.stat_date DESC
     LIMIT 1`
  );
  return rows[0] || null;
};

/**
 * Get user growth over a date range.
 * Reads from: platform_statistics.
 * @param {string} range - '7d', '30d', or '12m'
 */
export const getUserGrowth = async (range) => {
  let daysBack;
  let groupBy;

  if (range === '12m') {
    daysBack = 365;
    groupBy = "DATE_FORMAT(ps.stat_date, '%Y-%m')";
  } else if (range === '30d') {
    daysBack = 30;
    groupBy = 'ps.stat_date';
  } else {
    daysBack = 7;
    groupBy = 'ps.stat_date';
  }

  const [rows] = await pool.query(
    `SELECT
       ${groupBy}              AS period,
       SUM(ps.new_users_today) AS new_users,
       MAX(ps.total_users)     AS total_users
     FROM platform_statistics ps
     WHERE ps.stat_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY ${groupBy}
     ORDER BY period ASC`,
    [daysBack]
  );
  return rows;
};

/**
 * Get active user counts.
 * Reads from: platform_statistics (last 7 rows).
 */
export const getActiveUsers = async () => {
  const [rows] = await pool.query(
    `SELECT stat_date, active_users, total_users
     FROM platform_statistics
     ORDER BY stat_date DESC
     LIMIT 7`
  );
  return rows;
};

/**
 * Get top-performing courses by enrollment.
 * Reads from: course_analytics.
 */
export const getTopCourses = async (limit = 10) => {
  const [rows] = await pool.query(
    `SELECT
       ca.course_id,
       c.course_name,
       c.thumbnail_url,
       ca.total_enrollments,
       ca.average_completion_rate,
       ca.average_test_score,
       ca.average_rating,
       ca.total_revenue
     FROM course_analytics ca
     JOIN courses c ON c.course_id = ca.course_id
     ORDER BY ca.total_enrollments DESC
     LIMIT ?`,
    [limit]
  );
  return rows;
};

/**
 * Get course completion statistics.
 * Reads from: course_analytics.
 */
export const getCourseCompletionStats = async () => {
  const [rows] = await pool.query(
    `SELECT
       ca.course_id,
       c.course_name,
       ca.total_enrollments,
       ca.completed_students,
       ca.average_completion_rate,
       ca.dropout_rate
     FROM course_analytics ca
     JOIN courses c ON c.course_id = ca.course_id
     ORDER BY ca.average_completion_rate DESC`
  );
  return rows;
};

/**
 * Get dropout rate metrics.
 * Reads from: platform_statistics + course_analytics.
 */
export const getDropoutRate = async () => {
  const [platform] = await pool.query(
    `SELECT
       AVG(ca.dropout_rate) AS average_dropout_rate,
       MAX(ca.dropout_rate) AS highest_dropout_rate,
       MIN(ca.dropout_rate) AS lowest_dropout_rate
     FROM course_analytics ca`
  );

  const [perCourse] = await pool.query(
    `SELECT
       ca.course_id,
       c.course_name,
       ca.dropout_rate,
       ca.total_enrollments,
       ca.completed_students
     FROM course_analytics ca
     JOIN courses c ON c.course_id = ca.course_id
     ORDER BY ca.dropout_rate DESC
     LIMIT 10`
  );

  return {
    platform_average: platform[0],
    top_dropout_courses: perCourse,
  };
};

// ─────────────────────────────────────────────
// REPLACE: getRevenueTrend
// Now accepts period ('30d' | '12m' | '3y' | 'max') and reads
// directly from the payments table for real-time accuracy.
// ─────────────────────────────────────────────

/**
 * Get revenue trend from payments table, grouped by period.
 * @param {string} period - '30d' | '12m' | '3y' | 'max'
 */
export const getRevenueTrend = async (period = '30d') => {
  // Decide how far back to look and how to group dates
  let whereClause = ''; // SQL WHERE condition for date range
  let groupFormat = ''; // MySQL DATE_FORMAT string for grouping

  if (period === '30d') {
    whereClause = `WHERE payment_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;
    groupFormat = '%Y-%m-%d'; // group by day  e.g. "2026-03-01"
  } else if (period === '12m') {
    whereClause = `WHERE payment_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)`;
    groupFormat = '%Y-%m'; // group by month e.g. "2026-03"
  } else if (period === '3y') {
    whereClause = `WHERE payment_date >= DATE_SUB(NOW(), INTERVAL 3 YEAR)`;
    groupFormat = '%Y-%m'; // group by month across 3 years
  } else {
    // 'max' — no date filter, group by year-month
    whereClause = '';
    groupFormat = '%Y-%m';
  }

  const [rows] = await pool.query(
    `SELECT
       DATE_FORMAT(payment_date, '${groupFormat}') AS label,
       SUM(amount)                                 AS total_revenue,
       COUNT(*)                                    AS total_transactions,
       SUM(CASE WHEN payment_status = 'completed' THEN amount ELSE 0 END) AS net_revenue
     FROM payments
     ${whereClause}
     GROUP BY label
     ORDER BY label ASC`
  );

  return rows;
};

// ─────────────────────────────────────────────
// NEW: getRevenueByPaymentMethod
// Groups completed payments by payment_method.
// Reads from: payments table
// ─────────────────────────────────────────────
export const getRevenueByPaymentMethod = async () => {
  const [rows] = await pool.query(
    `SELECT
       payment_method                             AS label,
       SUM(amount)                                AS total_revenue,
       COUNT(*)                                   AS transaction_count
     FROM payments
     WHERE payment_status = 'completed'
       AND payment_method IS NOT NULL
     GROUP BY payment_method
     ORDER BY total_revenue DESC`
  );
  return rows;
};

// ─────────────────────────────────────────────
// NEW: getPaymentStatusDistribution
// Counts payments grouped by payment_status.
// Reads from: payments table
// ─────────────────────────────────────────────
export const getPaymentStatusDistribution = async () => {
  const [rows] = await pool.query(
    `SELECT
       payment_status AS label,
       COUNT(*)       AS count
     FROM payments
     GROUP BY payment_status
     ORDER BY count DESC`
  );
  return rows;
};

// ─────────────────────────────────────────────
// NEW: getRecentTransactions
// Fetches the latest 10 payment records with student + course info.
// Reads from: payments → students → users → courses
// ─────────────────────────────────────────────
export const getRecentTransactions = async () => {
  const [rows] = await pool.query(
    `SELECT
       p.payment_date                            AS date,
       CONCAT(u.first_name, ' ', u.last_name)   AS studentName,
       c.course_name                             AS courseName,
       p.amount,
       p.payment_method                          AS paymentMethod,
       p.payment_status                          AS status
     FROM payments p
     JOIN students s  ON s.student_id = p.student_id
     JOIN users u     ON u.user_id    = s.user_id
     LEFT JOIN courses c ON c.course_id = p.course_id
     ORDER BY p.payment_date DESC
     LIMIT 10`
  );
  return rows;
};

/**
 * Get revenue broken down by course.
 * Reads from: revenue_analytics + course_analytics.
 */
export const getRevenueByCourse = async () => {
  const [rows] = await pool.query(
    `SELECT
       ca.course_id,
       c.course_name,
       c.price,
       ca.total_revenue,
       ca.total_enrollments,
       ROUND(ca.total_revenue / NULLIF(ca.total_enrollments, 0), 2) AS revenue_per_student
     FROM course_analytics ca
     JOIN courses c ON c.course_id = ca.course_id
     ORDER BY ca.total_revenue DESC`
  );
  return rows;
};

/**
 * Get pending (unresolved) doubts.
 * Reads directly from: doubt_posts.
 */
export const getPendingDoubts = async () => {
  const [rows] = await pool.query(
    `SELECT
       dp.doubt_id,
       dp.question_text,
       dp.status,
       dp.created_at,
       dp.deadline_at,
       dp.course_id,
       dp.subject_id,
       dp.assigned_teacher_id,
       c.course_name                                               AS course_title,
       u.first_name,
       u.last_name,
       TIMESTAMPDIFF(HOUR, dp.created_at, NOW())                  AS hours_pending,
       TIMESTAMPDIFF(HOUR, NOW(), dp.deadline_at)                 AS hours_to_deadline
     FROM doubt_posts dp
     JOIN students s ON s.student_id = dp.student_id
     JOIN users    u ON u.user_id    = s.user_id
     JOIN courses  c ON c.course_id  = dp.course_id
     WHERE dp.status     = 'open'
       AND dp.is_deleted = FALSE
     ORDER BY dp.created_at ASC
     LIMIT 50`
  );

  const [summary] = await pool.query(
    `SELECT
       COUNT(*) AS total_pending,
       SUM(CASE
             WHEN deadline_at IS NOT NULL AND deadline_at < NOW()
             THEN 1 ELSE 0
           END) AS overdue_count,
       SUM(CASE
             WHEN deadline_at IS NOT NULL
              AND deadline_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
             THEN 1 ELSE 0
           END) AS due_soon_24h
     FROM doubt_posts
     WHERE status     = 'open'
       AND is_deleted = FALSE`
  );

  return {
    summary: summary[0],
    doubts: rows,
  };
};

/**
 * Get instructors who haven't conducted a class in 30+ days.
 * Reads from: live_classes + teacher_analytics.
 */
export const getInactiveInstructors = async (inactiveDays = 30) => {
  const [rows] = await pool.query(
    `SELECT
       t.teacher_id,
       u.first_name,
       u.last_name,
       u.email,
       ta.total_courses_created,
       ta.total_students,
       MAX(lc.scheduled_start_time)                         AS last_class_date,
       DATEDIFF(NOW(), MAX(lc.scheduled_start_time))        AS days_since_last_class
     FROM teachers t
     JOIN users u ON u.user_id = t.user_id
     LEFT JOIN teacher_analytics    ta ON ta.teacher_id = t.teacher_id
     LEFT JOIN live_classes         lc ON lc.teacher_id = t.teacher_id
     GROUP BY t.teacher_id, u.first_name, u.last_name, u.email,
              ta.total_courses_created, ta.total_students
     HAVING last_class_date IS NULL
         OR DATEDIFF(NOW(), last_class_date) >= ?
     ORDER BY days_since_last_class DESC`,
    [inactiveDays]
  );
  return rows;
};

// ─────────────────────────────────────────────
// WORKER MODELS
// Called by analytics.worker.js to UPDATE analytics tables.
// ─────────────────────────────────────────────

/**
 * Upsert (insert or update) topic mastery for a student.
 * Called after a student submits a test.
 */
export const upsertTopicMastery = async (data) => {
  const { studentId, courseId, subjectId, topicId, isCorrect, score } = data;

  const [existing] = await pool.query(
    `SELECT id, tests_attempted, correct_answers, wrong_answers, avg_score
     FROM topic_mastery_analytics
     WHERE student_id = ? AND module_id = ?`,
    [studentId, topicId]
  );

  if (existing.length === 0) {
    await pool.query(
      `INSERT INTO topic_mastery_analytics
         (student_id, course_id, subject_id, module_id,
          tests_attempted, correct_answers, wrong_answers,
          avg_score, mastery_level, last_attempted_at)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, NOW())`,
      [
        studentId,
        courseId,
        subjectId,
        topicId,
        isCorrect ? 1 : 0,
        isCorrect ? 0 : 1,
        score,
        getMasteryLevel(score),
      ]
    );
  } else {
    const rec = existing[0];
    const newAttempts = rec.tests_attempted + 1;
    const newCorrect = rec.correct_answers + (isCorrect ? 1 : 0);
    const newWrong = rec.wrong_answers + (isCorrect ? 0 : 1);
    const newAvgScore = (rec.avg_score * rec.tests_attempted + score) / newAttempts;

    await pool.query(
      `UPDATE topic_mastery_analytics
       SET tests_attempted   = ?,
           correct_answers   = ?,
           wrong_answers     = ?,
           avg_score         = ?,
           mastery_level     = ?,
           last_attempted_at = NOW()
       WHERE student_id = ? AND module_id = ?`,
      [
        newAttempts,
        newCorrect,
        newWrong,
        newAvgScore.toFixed(2),
        getMasteryLevel(newAvgScore),
        studentId,
        topicId,
      ]
    );
  }
};

/**
 * Increment a student's test count in student_dashboard_analytics.
 * Called after a student submits a test.
 */
export const incrementStudentTestCount = async (studentId, passed) => {
  await pool.query(
    `INSERT INTO student_dashboard_analytics (student_id, tests_attempted, tests_passed)
     VALUES (?, 1, ?)
     ON DUPLICATE KEY UPDATE
       tests_attempted    = tests_attempted + 1,
       tests_passed       = tests_passed + ?,
       last_activity_date = NOW()`,
    [studentId, passed ? 1 : 0, passed ? 1 : 0]
  );
};

/**
 * Increment platform stats when a new user registers.
 */
export const incrementPlatformUserCount = async (userType) => {
  const column =
    userType === 'student'
      ? 'total_students'
      : userType === 'teacher'
        ? 'total_teachers'
        : userType === 'parent'
          ? 'total_parents'
          : null;

  await pool.query(
    `INSERT INTO platform_statistics (stat_date, total_users, new_users_today ${column ? `, ${column}` : ''})
     VALUES (CURDATE(), 1, 1 ${column ? ', 1' : ''})
     ON DUPLICATE KEY UPDATE
       total_users     = total_users + 1,
       new_users_today = new_users_today + 1
       ${column ? `, ${column} = ${column} + 1` : ''}`
  );
};

/**
 * Increment platform + course enrollment counters.
 */
export const incrementEnrollmentCount = async (courseId, teacherId) => {
  await pool.query(
    `INSERT INTO platform_statistics (stat_date, total_enrollments, new_enrollments_today)
     VALUES (CURDATE(), 1, 1)
     ON DUPLICATE KEY UPDATE
       total_enrollments     = total_enrollments + 1,
       new_enrollments_today = new_enrollments_today + 1`
  );

  await pool.query(
    `INSERT INTO course_analytics (course_id, teacher_id, total_enrollments, active_students)
     VALUES (?, ?, 1, 1)
     ON DUPLICATE KEY UPDATE
       total_enrollments = total_enrollments + 1,
       active_students   = active_students + 1`,
    [courseId, teacherId]
  );

  await pool.query(
    `INSERT INTO teacher_analytics (teacher_id, total_enrollments, total_students)
     VALUES (?, 1, 1)
     ON DUPLICATE KEY UPDATE
       total_enrollments = total_enrollments + 1,
       total_students    = total_students + 1`,
    [teacherId]
  );
};

/**
 * Recompute and update the global leaderboard.
 * Called by the daily cron job.
 */
export const recomputeLeaderboard = async () => {
  const [students] = await pool.query(
    `SELECT
       s.student_id,
       sda.total_points,
       sda.completed_courses,
       sda.tests_attempted,
       sda.average_test_score
     FROM student_dashboard_analytics sda
     JOIN students s ON s.student_id = sda.student_id
     ORDER BY sda.total_points DESC`
  );

  const today = new Date().toISOString().split('T')[0];

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const rank = i + 1;

    await pool.query(
      `INSERT INTO leaderboard
         (student_id, period_type, period_start_date, period_end_date,
          rank_position, points_earned, courses_completed, tests_completed, average_score)
       VALUES (?, 'all_time', '2000-01-01', ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         rank_position     = VALUES(rank_position),
         points_earned     = VALUES(points_earned),
         courses_completed = VALUES(courses_completed),
         tests_completed   = VALUES(tests_completed),
         average_score     = VALUES(average_score)`,
      [
        student.student_id,
        today,
        rank,
        student.total_points,
        student.completed_courses,
        student.tests_attempted,
        student.average_test_score,
      ]
    );

    await pool.query(
      `UPDATE student_dashboard_analytics
       SET current_rank = ?
       WHERE student_id = ?`,
      [rank, student.student_id]
    );
  }
};

/**
 * Aggregate daily revenue into revenue_analytics.
 * Called by the daily cron job.
 */
export const aggregateDailyRevenue = async () => {
  await pool.query(
    `INSERT INTO revenue_analytics
       (period_type, period_start_date, period_end_date,
        total_revenue, total_transactions, successful_transactions,
        failed_transactions, refunded_transactions, refund_amount,
        net_revenue, average_transaction_value)
     SELECT
       'daily',
       CURDATE(),
       CURDATE(),
       SUM(CASE WHEN p.status = 'success'  THEN p.amount ELSE 0 END),
       COUNT(*),
       SUM(CASE WHEN p.status = 'success'  THEN 1 ELSE 0 END),
       SUM(CASE WHEN p.status = 'failed'   THEN 1 ELSE 0 END),
       SUM(CASE WHEN p.status = 'refunded' THEN 1 ELSE 0 END),
       SUM(CASE WHEN p.status = 'refunded' THEN p.amount ELSE 0 END),
       SUM(CASE WHEN p.status = 'success'  THEN p.amount ELSE 0 END) -
       SUM(CASE WHEN p.status = 'refunded' THEN p.amount ELSE 0 END),
       AVG(CASE WHEN p.status = 'success'  THEN p.amount ELSE NULL END)
     FROM payments p
     WHERE DATE(p.created_at) = CURDATE()
     ON DUPLICATE KEY UPDATE
       total_revenue             = VALUES(total_revenue),
       total_transactions        = VALUES(total_transactions),
       successful_transactions   = VALUES(successful_transactions),
       failed_transactions       = VALUES(failed_transactions),
       refunded_transactions     = VALUES(refunded_transactions),
       refund_amount             = VALUES(refund_amount),
       net_revenue               = VALUES(net_revenue),
       average_transaction_value = VALUES(average_transaction_value)`
  );
};

/**
 * Map a user_id to a student_id.
 */
export const getUserStudentMapping = async (userId) => {
  const [rows] = await pool.query(`SELECT student_id FROM students WHERE user_id = ? LIMIT 1`, [
    userId,
  ]);
  return rows[0]?.student_id ?? null;
};

/**
 * Fetch the last 6 SUBMITTED test scores for a user (raw scores for worker).
 */
export const fetchLastSixTestAttempts = async (userId) => {
  const [rows] = await pool.query(
    `SELECT total_score
     FROM   test_attempts
     WHERE  user_id = ?
       AND  status  = 'submitted'
     ORDER  BY submitted_at DESC
     LIMIT  6`,
    [userId]
  );
  return rows;
};

/**
 * Write computed score-trend metrics back to student_dashboard_analytics.
 * Called exclusively by the analytics worker.
 */
export const updateStudentScoreTrend = async (studentId, metrics) => {
  const { last3Avg, previous3Avg, changePercentage, trend } = metrics;

  await pool.query(
    `INSERT INTO student_dashboard_analytics
       (student_id,
        last_3_tests_avg, previous_3_tests_avg,
        score_change_percentage, score_trend)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       last_3_tests_avg        = VALUES(last_3_tests_avg),
       previous_3_tests_avg    = VALUES(previous_3_tests_avg),
       score_change_percentage = VALUES(score_change_percentage),
       score_trend             = VALUES(score_trend)`,
    [studentId, last3Avg, previous3Avg, changePercentage, trend]
  );
};

// NEW model function — replaces the inline pool.query in the worker
/**
 * Upsert test_performance_analytics after a test is submitted.
 * Handles all new columns introduced in the updated schema.
 *
 * @param {object} data
 * @param {number} data.studentId
 * @param {number} data.subjectId
 * @param {string} data.testType          - 'custom' | 'sme'
 * @param {number} data.score             - total_score from test_attempts
 * @param {number} data.totalMarks        - total marks of the test
 * @param {number} data.totalQuestions    - total questions in the test
 * @param {number} data.attemptedQuestions
 * @param {number} data.correctAnswers
 * @param {number} data.partialAnswers
 * @param {number} data.timeTakenMinutes  - total time spent on this attempt
 * @param {number} data.lastTestAccuracy  - accuracy % for this specific attempt
 */
export const upsertTestPerformanceAnalytics = async (data) => {
  const {
    studentId,
    subjectId,
    testType = 'custom',
    score = 0,
    totalMarks = 0,
    totalQuestions = 0,
    attemptedQuestions = 0,
    correctAnswers = 0,
    partialAnswers = 0,
    timeTakenMinutes = 0,
    lastTestAccuracy = 0,
  } = data;

  // unanswered = total - attempted
  const unanswered = Math.max(0, totalQuestions - attemptedQuestions);
  // avg time per question for this attempt
  const avgTimeThisTest =
    attemptedQuestions > 0 ? parseFloat((timeTakenMinutes / attemptedQuestions).toFixed(2)) : 0;

  await pool.query(
    `INSERT INTO test_performance_analytics
       (student_id, subject_id, test_type,
        total_tests, completed_tests,
        average_score, highest_score, lowest_score,
        total_marks_available, total_time_taken_minutes,
        total_questions, attempted_questions, correct_answers,
        accuracy_percentage,
        partial_answers, unanswered_questions,
        avg_time_per_question,
        score_variance,
        last_test_score, last_test_accuracy, last_attempted_at)
     VALUES
       (?, ?, ?,
        1, 1,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?,
        ?,
        ?, ?,
        ?,
        0,
        ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       -- Test counts
       total_tests           = total_tests + 1,
       completed_tests       = completed_tests + 1,
       -- Running average score
       average_score         = ROUND(
         (average_score * (total_tests - 1) + VALUES(average_score)) / total_tests, 2
       ),
       highest_score         = GREATEST(highest_score, VALUES(highest_score)),
       lowest_score          = LEAST(lowest_score, VALUES(lowest_score)),
       -- Running totals
       total_marks_available    = total_marks_available + VALUES(total_marks_available),
       total_time_taken_minutes = total_time_taken_minutes + VALUES(total_time_taken_minutes),
       total_questions          = total_questions + VALUES(total_questions),
       attempted_questions      = attempted_questions + VALUES(attempted_questions),
       correct_answers          = correct_answers + VALUES(correct_answers),
       partial_answers          = partial_answers + VALUES(partial_answers),
       unanswered_questions     = unanswered_questions + VALUES(unanswered_questions),
       -- Accuracy % = cumulative correct / cumulative attempted * 100
       accuracy_percentage   = ROUND(
         (correct_answers * 100.0) / NULLIF(attempted_questions, 0), 2
       ),
       -- Running avg time per question
       avg_time_per_question = ROUND(
         (avg_time_per_question * (total_tests - 1) + VALUES(avg_time_per_question)) / total_tests, 2
       ),
       -- Score variance: Welford-style incremental variance approximation
       -- variance_new = variance_old + (score - avg_old) * (score - avg_new)
       score_variance        = ROUND(
         GREATEST(0,
           score_variance + (VALUES(average_score) - (average_score))
           * (VALUES(average_score) - ROUND(
               (average_score * (total_tests - 1) + VALUES(average_score)) / total_tests, 2
             ))
         ), 2
       ),
       -- Last attempt snapshot
       last_test_score       = VALUES(last_test_score),
       last_test_accuracy    = VALUES(last_test_accuracy),
       last_attempted_at     = NOW()`,
    [
      studentId,
      subjectId,
      testType,
      score,
      score,
      score,
      totalMarks,
      timeTakenMinutes,
      totalQuestions,
      attemptedQuestions,
      correctAnswers,
      lastTestAccuracy,
      partialAnswers,
      unanswered,
      avgTimeThisTest,
      score,
      lastTestAccuracy,
    ]
  );
};

// ─────────────────────────────────────────────
// PAYMENT_SUCCESS — Real-time updates
// ─────────────────────────────────────────────

/**
 * Increment today's platform_statistics revenue counters on every payment.
 * Uses ON DUPLICATE KEY UPDATE so the row is created if it doesn't exist yet today.
 */
export const incrementPlatformRevenueStats = async (amount) => {
  await pool.query(
    `INSERT INTO platform_statistics
       (stat_date, total_revenue, revenue_today, total_enrollments, new_enrollments_today)
     VALUES (CURDATE(), ?, ?, 1, 1)
     ON DUPLICATE KEY UPDATE
       total_revenue          = total_revenue + VALUES(total_revenue),
       revenue_today          = revenue_today + VALUES(revenue_today),
       total_enrollments      = total_enrollments + 1,
       new_enrollments_today  = new_enrollments_today + 1`,
    [amount, amount]
  );
};

/**
 * Upsert course_analytics when a new enrollment + payment comes in.
 */
export const upsertTeacherAnalyticsForAllTeachers = async (courseId, amount) => {
  await pool.query(
    `
    INSERT INTO teacher_analytics
      (teacher_id, total_revenue, total_enrollments, total_students, active_students)
    SELECT teacher_id, ?, 1, 1, 1
    FROM subjects
    WHERE course_id = ?
    GROUP BY teacher_id
    ON DUPLICATE KEY UPDATE
      total_revenue     = total_revenue + VALUES(total_revenue),
      total_enrollments = total_enrollments + 1,
      total_students    = total_students + 1,
      active_students   = active_students + 1
    `,
    [amount, courseId]
  );
};
/**
 * Upsert teacher_analytics revenue + enrollment counts on payment.
 */
export const upsertTeacherAnalyticsOnEnrollment = async (teacherId, amount) => {
  await pool.query(
    `INSERT INTO teacher_analytics
       (teacher_id, total_revenue, total_enrollments, total_students, active_students)
     VALUES (?, ?, 1, 1, 1)
     ON DUPLICATE KEY UPDATE
       total_revenue     = total_revenue + VALUES(total_revenue),
       total_enrollments = total_enrollments + 1,
       total_students    = total_students + 1,
       active_students   = active_students + 1`,
    [teacherId, amount]
  );
};

// ─────────────────────────────────────────────
// USER_REGISTERED — Real-time updates
// ─────────────────────────────────────────────

/**
 * Increment platform_statistics user counters on registration.
 * @param {string} userType - 'student' | 'teacher' | 'parent'
 */
export const incrementPlatformUserStats = async (userType) => {
  const columnMap = {
    student: 'total_students',
    teacher: 'total_teachers',
    parent: 'total_parents',
  };
  const col = columnMap[userType];
  if (!col) return; // admin registrations don't count in platform stats

  await pool.query(
    `INSERT INTO platform_statistics
       (stat_date, total_users, active_users, new_users_today, ${col})
     VALUES (CURDATE(), 1, 1, 1, 1)
     ON DUPLICATE KEY UPDATE
       total_users      = total_users + 1,
       active_users     = active_users + 1,
       new_users_today  = new_users_today + 1,
       ${col}           = ${col} + 1`
  );
};

// ─────────────────────────────────────────────
// DOUBT_CREATED / DOUBT_RESOLVED — Real-time updates
// ─────────────────────────────────────────────

/**
 * Increment platform_statistics doubt counters.
 * @param {'created'|'resolved'} action
 */
export const incrementPlatformDoubtStats = async (action) => {
  if (action === 'created') {
    await pool.query(
      `INSERT INTO platform_statistics (stat_date, total_doubts)
       VALUES (CURDATE(), 1)
       ON DUPLICATE KEY UPDATE total_doubts = total_doubts + 1`
    );
  } else if (action === 'resolved') {
    await pool.query(
      `INSERT INTO platform_statistics (stat_date, resolved_doubts)
       VALUES (CURDATE(), 1)
       ON DUPLICATE KEY UPDATE resolved_doubts = resolved_doubts + 1`
    );
  }
};

/**
 * Update teacher_analytics.total_doubts_answered on doubt resolution.
 * @param {number} teacherId
 */
export const incrementTeacherDoubtsAnswered = async (teacherId) => {
  await pool.query(
    `INSERT INTO teacher_analytics (teacher_id, total_doubts_answered)
     VALUES (?, 1)
     ON DUPLICATE KEY UPDATE total_doubts_answered = total_doubts_answered + 1`,
    [teacherId]
  );
};

// ─────────────────────────────────────────────
// LIVE_CLASS_JOINED — Real-time updates
// ─────────────────────────────────────────────

/**
 * Increment platform_statistics live class attendance.
 * Called once per class (not per student join).
 */
export const incrementPlatformLiveClassStats = async () => {
  await pool.query(
    `INSERT INTO platform_statistics (stat_date, total_live_classes)
     VALUES (CURDATE(), 1)
     ON DUPLICATE KEY UPDATE total_live_classes = total_live_classes + 1`
  );
};

/**
 * Increment teacher_analytics.total_live_classes.
 * Called when teacher starts a live class.
 * @param {number} teacherId
 */
export const incrementTeacherLiveClassCount = async (teacherId) => {
  await pool.query(
    `INSERT INTO teacher_analytics (teacher_id, total_live_classes)
     VALUES (?, 1)
     ON DUPLICATE KEY UPDATE total_live_classes = total_live_classes + 1`,
    [teacherId]
  );
};

// ─────────────────────────────────────────────
// MODULE_COMPLETED — Real-time updates
// ─────────────────────────────────────────────

/**
 * Increment course_progress_analytics.completed_modules for a student.
 * Also recalculates progress_percentage in DB.
 */
export const incrementCourseProgressOnModuleComplete = async (
  studentId,
  courseId,
  enrollmentId
) => {
  await pool.query(
    `UPDATE course_progress_analytics
     SET
       completed_modules    = completed_modules + 1,
       progress_percentage  = ROUND(
         (completed_modules + 1) * 100.0 / NULLIF(total_modules, 0), 2
       ),
       last_accessed_at     = NOW()
     WHERE student_id = ? AND course_id = ? AND enrollment_id = ?`,
    [studentId, courseId, enrollmentId]
  );
};

// ─────────────────────────────────────────────
// COURSE_COMPLETED — Real-time updates
// ─────────────────────────────────────────────

/**
 * Update course_analytics completed_students + dropout_rate recalculation.
 */
export const updateCourseAnalyticsOnCompletion = async (courseId) => {
  await pool.query(
    `UPDATE course_analytics
     SET
       completed_students = completed_students + 1,
       active_students    = GREATEST(0, active_students - 1),
       dropout_rate       = ROUND(
         (1 - (completed_students + 1) / NULLIF(total_enrollments, 0)) * 100, 2
       )
     WHERE course_id = ?`,
    [courseId]
  );
};

/**
 * Update student_dashboard_analytics on course completion.
 */
export const updateStudentDashboardOnCompletion = async (studentId) => {
  await pool.query(
    `UPDATE student_dashboard_analytics
     SET
       completed_courses    = completed_courses + 1,
       in_progress_courses  = GREATEST(0, in_progress_courses - 1)
     WHERE student_id = ?`,
    [studentId]
  );
};

// ─────────────────────────────────────────────
// TEST_SUBMITTED — platform stats increment
// (test_performance_analytics already handled — this adds platform counter)
// ─────────────────────────────────────────────

/**
 * Increment platform_statistics.total_tests_taken.
 */
export const incrementPlatformTestStats = async () => {
  await pool.query(
    `INSERT INTO platform_statistics (stat_date, total_tests_taken)
     VALUES (CURDATE(), 1)
     ON DUPLICATE KEY UPDATE total_tests_taken = total_tests_taken + 1`
  );
};

// ─────────────────────────────────────────────
// COURSE_PUBLISHED — platform stats
// ─────────────────────────────────────────────

/**
 * Increment platform_statistics.published_courses + teacher_analytics.published_courses.
 * @param {number} teacherId
 */
export const incrementPublishedCourseStats = async (teacherId) => {
  await pool.query(
    `INSERT INTO platform_statistics (stat_date, total_courses, published_courses)
     VALUES (CURDATE(), 1, 1)
     ON DUPLICATE KEY UPDATE
       total_courses     = total_courses + 1,
       published_courses = published_courses + 1`
  );

  await pool.query(
    `INSERT INTO teacher_analytics (teacher_id, total_courses_created, published_courses)
     VALUES (?, 1, 1)
     ON DUPLICATE KEY UPDATE
       total_courses_created = total_courses_created + 1,
       published_courses     = published_courses + 1`,
    [teacherId]
  );
};
export const getTeacherIdsByCourseId = async (courseId) => {
  const [rows] = await pool.execute(
    `
    SELECT DISTINCT teacher_id
    FROM subjects
    WHERE course_id = ?
    `,
    [courseId]
  );

  return rows.map((r) => r.teacher_id);
};
// ─────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────

/** Determine mastery level from a numeric score (0–100). */
const getMasteryLevel = (score) => {
  if (score >= 75) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};
