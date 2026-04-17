// Authors: Harshitha Ravuri,
// ============================================================
// analyticsCron.job.js
// Scheduled (cron) jobs for heavy analytics computations.
//
// These jobs run on a fixed schedule (daily/weekly) and
// recompute data that would be too expensive to compute live.
// ============================================================

import cron from 'node-cron';
import { CRON_SCHEDULES } from '../constants/analyticsTypes.js';
import {
  recomputeLeaderboard,
  aggregateDailyRevenue,
  getInactiveInstructors,
} from '../models/analytics.model.js';
import {
  upsertParentDashboardAnalytics,
} from '../models/parentAnalytics.model.js';
import logger from '../utils/logger.js';

/**
 * Start all analytics cron jobs.
 * Call this once when the server starts.
 *
 * @example
 * // In app.js or server.js:
 * import { startAnalyticsCronJobs } from './jobs/analyticsCron.job.js';
 * startAnalyticsCronJobs();
 */
export const startAnalyticsCronJobs = () => {
  logger.info('[AnalyticsCron] Starting all cron jobs...');

  // ─────────────────────────────────────────────
  // JOB 1: Leaderboard Recomputation
  // Runs: Daily at 2:00 AM
  // ─────────────────────────────────────────────
  cron.schedule(CRON_SCHEDULES.LEADERBOARD_RECOMPUTE, async () => {
    logger.info('[AnalyticsCron] Running leaderboard recomputation...');
    try {
      await recomputeLeaderboard();
      logger.info('[AnalyticsCron] Leaderboard recomputed successfully');
    } catch (error) {
      logger.error(`[AnalyticsCron] Leaderboard recomputation failed: ${error.message}`);
    }
  });

  // ─────────────────────────────────────────────
  // JOB 2: Revenue Aggregation
  // Runs: Daily at 3:00 AM
  // ─────────────────────────────────────────────
  cron.schedule(CRON_SCHEDULES.REVENUE_AGGREGATION, async () => {
    logger.info('[AnalyticsCron] Running daily revenue aggregation...');
    try {
      await aggregateDailyRevenue();
      logger.info('[AnalyticsCron] Revenue aggregated successfully');
    } catch (error) {
      logger.error(`[AnalyticsCron] Revenue aggregation failed: ${error.message}`);
    }
  });

  // ─────────────────────────────────────────────
  // JOB 3: Dropout Detection
  // Runs: Daily at 4:00 AM
  // Purpose: Log/alert students who enrolled but haven't
  // progressed in 14+ days (extend as needed)
  // ─────────────────────────────────────────────
  cron.schedule(CRON_SCHEDULES.DROPOUT_DETECTION, async () => {
    logger.info('[AnalyticsCron] Running dropout detection...');
    try {
      await detectDropouts();
      logger.info('[AnalyticsCron] Dropout detection completed');
    } catch (error) {
      logger.error(`[AnalyticsCron] Dropout detection failed: ${error.message}`);
    }
  });

  // ─────────────────────────────────────────────
  // JOB 4: Inactive Instructor Detection
  // Runs: Every Monday at 5:00 AM
  // ─────────────────────────────────────────────
  cron.schedule(CRON_SCHEDULES.INACTIVE_INSTRUCTOR_DETECTION, async () => {
    logger.info('[AnalyticsCron] Running inactive instructor detection...');
    try {
      await detectInactiveInstructors();
      logger.info('[AnalyticsCron] Inactive instructor detection completed');
    } catch (error) {
      logger.error(`[AnalyticsCron] Inactive instructor detection failed: ${error.message}`);
    }
  });

  // ─────────────────────────────────────────────
  // JOB 5: Parent Analytics Recompute
  // Runs: Daily at 2:00 AM (after leaderboard recompute)
  // Iterates every (parent, student) pair and upserts
  // parent_dashboard_analytics so parent views are always fresh.
  // ─────────────────────────────────────────────
  cron.schedule(CRON_SCHEDULES.PARENT_ANALYTICS_RECOMPUTE, async () => {
    logger.info('[AnalyticsCron] Running parent analytics recompute...');
    try {
      await recomputeParentAnalytics();
      logger.info('[AnalyticsCron] Parent analytics recomputed successfully');
    } catch (error) {
      logger.error(`[AnalyticsCron] Parent analytics recompute failed: ${error.message}`);
    }
  });

  logger.info('[AnalyticsCron] All cron jobs scheduled');
};

// ─────────────────────────────────────────────
// PRIVATE JOB IMPLEMENTATIONS
// ─────────────────────────────────────────────

/**
 * Detect students who are at risk of dropping out.
 * A student is a dropout risk if:
 *   - They enrolled > 14 days ago
 *   - Their progress is below 10%
 *   - They haven't accessed the course in 7 days
 *
 * Currently just logs them; extend to send notifications.
 */
const detectDropouts = async () => {
  const pool = (await import('../config/database.config.js')).default;

  const [atRiskStudents] = await pool.query(
    `SELECT
       cpa.student_id,
       cpa.course_id,
       cpa.progress_percentage,
       cpa.last_accessed_at,
       u.email,
       u.first_name
     FROM course_progress_analytics cpa
     JOIN students s ON s.student_id = cpa.student_id
     JOIN users u ON u.user_id = s.user_id
     WHERE cpa.progress_percentage < 10
       AND cpa.last_accessed_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
       AND cpa.enrollment_id IN (
         SELECT enrollment_id FROM course_enrollments
         WHERE created_at < DATE_SUB(NOW(), INTERVAL 14 DAY)
           AND status = 'active'
       )`
  );

  if (atRiskStudents.length > 0) {
    logger.warn(
      `[AnalyticsCron] ${atRiskStudents.length} students are at dropout risk. ` +
      `IDs: ${atRiskStudents.map(s => s.student_id).join(', ')}`
    );
    // TODO: Trigger re-engagement email notifications here
    // await emailService.sendDropoutRiskEmails(atRiskStudents);
  }
};

/**
 * Detect instructors who have been inactive for 30+ days.
 * Logs them and can trigger admin notifications.
 */
const detectInactiveInstructors = async () => {
  const inactiveInstructors = await getInactiveInstructors(30);

  if (inactiveInstructors.length > 0) {
    logger.warn(
      `[AnalyticsCron] ${inactiveInstructors.length} inactive instructors detected. ` +
      `IDs: ${inactiveInstructors.map(i => i.teacher_id).join(', ')}`
    );
    // TODO: Send admin alerts or instructor nudge emails
    // await emailService.sendInactiveInstructorAlert(inactiveInstructors);
  }
};

/**
 * Recompute parent_dashboard_analytics for every (parent, student) pair.
 * Runs after leaderboard recompute so current_rank is already fresh.
 *
 * Uses sequential processing (not Promise.all) to avoid overwhelming
 * the DB with too many concurrent upserts on large datasets.
 */
const recomputeParentAnalytics = async () => {
  const pairs = await getAllParentStudentPairs();

  if (pairs.length === 0) {
    logger.info('[AnalyticsCron] No parent-student pairs found — skipping parent analytics recompute');
    return;
  }

  let successCount = 0;
  let failCount    = 0;

  for (const { parent_id, student_id } of pairs) {
    try {
      await upsertParentDashboardAnalytics(parent_id, student_id);
      successCount++;
    } catch (err) {
      failCount++;
      logger.error(
        `[AnalyticsCron] Failed to recompute parent ${parent_id} / student ${student_id}: ${err.message}`,
      );
    }
  }

  logger.info(
    `[AnalyticsCron] Parent analytics recompute done — ` +
    `${successCount} updated, ${failCount} failed (of ${pairs.length} pairs)`,
  );
};