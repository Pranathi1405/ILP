// ============================================================
// src/services/parentAnalytics.service.js
// Business logic for parent analytics.
// Services add formatting, derived fields, and edge-case
// handling on top of raw model data.
// ============================================================

import {
  getLinkedStudents,
  validateParentStudentMapping,
  getPrimaryStudent,
  countLinkedStudents,
  getParentDashboardAnalytics,
} from '../models/parentAnalytics.model.js';
import {
  getScoreImprovementTrend,
  getStudentTopicMastery,
  getStudentTestPerformance,
  getUserStudentMapping,
} from '../models/analytics.model.js';
import { formatMinutesToDuration } from '../utils/analyticsHelpers.js';
import logger from '../utils/logger.js';

// ─────────────────────────────────────────────────────────────
// GET LINKED STUDENTS
// ─────────────────────────────────────────────────────────────

/**
 * Return all students linked to a parent with a profile summary.
 *
 * @param {number} parentId
 * @returns {{ students: Array }}
 */
export const getParentLinkedStudents = async (parentId) => {
  const students = await getLinkedStudents(parentId);

  const enriched = students.map((s) => ({
    ...s,
    watch_time_formatted: formatMinutesToDuration(s.total_watch_time_minutes ?? 0),
  }));

  return { students: enriched };
};

// ─────────────────────────────────────────────────────────────
// GET PARENT DASHBOARD
// ─────────────────────────────────────────────────────────────

/**
 * Return the analytics dashboard for one (parent, student) pair.
 *
 * Resolution order for studentId:
 *   1. Explicit studentId passed in → use it (after ownership check)
 *   2. Parent has exactly 1 child   → use that child
 *   3. Parent has a primary child   → use that child
 *   4. Otherwise                    → throw 400 (studentId required)
 *
 * @param {number} parentId
 * @param {number|null} studentId  - from query param, may be null
 * @returns {{ student_id, analytics, test_analytics, score_trend, topic_mastery }}
 * @throws {{ status, message }} on validation failure
 */
export const getParentDashboard = async (parentId, studentId) => {
  // ── Step 1: resolve which student to show ─────────────────
  let resolvedStudentId = studentId ? parseInt(studentId, 10) : null;

  if (!resolvedStudentId) {
    const count = await countLinkedStudents(parentId);

    if (count === 0) {
      throw { status: 404, message: 'No students linked to this parent account' };
    }

    if (count === 1) {
      const students = await getLinkedStudents(parentId);
      resolvedStudentId = students[0].student_id;
    } else {
      const primary = await getPrimaryStudent(parentId);
      if (primary) {
        resolvedStudentId = primary.student_id;
      } else {
        throw {
          status: 400,
          message: 'This account has multiple students. Please provide studentId as a query parameter.',
        };
      }
    }
  }

  // ── Step 2: ownership check ────────────────────────────────
  const isLinked = await validateParentStudentMapping(parentId, resolvedStudentId);
  if (!isLinked) {
    logger.warn(
      `[ParentAnalytics] Parent ${parentId} attempted to access student ${resolvedStudentId} — not linked`,
    );
    throw { status: 403, message: "You are not authorized to view this student's analytics" };
  }

  // ── Step 3: fetch pre-computed dashboard analytics ─────────
  const analytics = await getParentDashboardAnalytics(parentId, resolvedStudentId);

  // ── Step 4: handle no data yet ────────────────────────────
  const data = analytics ?? {
    total_courses_enrolled:   0,
    courses_in_progress:      0,
    courses_completed:        0,
    average_course_progress:  0,
    total_tests_attempted:    0,
    average_test_score:       0,
    total_study_time_minutes: 0,
    attendance_rate:          0,
    current_rank:             null,
    last_active_date:         null,
    performance_trend:        'stable',
    updated_at:               null,
    _is_default:              true,
  };

  // ── Step 5: fetch deep analytics in parallel ───────────────
  // Resolve user_id from student_id for the score-trend query
  const [testAnalytics, topicMasteryRaw, userId] = await Promise.all([
    getParentStudentTestAnalytics(resolvedStudentId),
    getStudentTopicMastery(resolvedStudentId),
    resolveUserIdFromStudentId(resolvedStudentId),
  ]);

  // Score trend requires user_id (test_attempts.user_id)
  const scoreTrend = userId
    ? await getScoreImprovementTrend(userId, 10).catch(() => [])
    : [];

  // ── Step 6: normalise topic mastery ───────────────────────
  const normaliseMastery = (level) => {
    const map = { high: 'STRONG', medium: 'AVERAGE', low: 'WEAK' };
    return map[level] ?? level?.toUpperCase() ?? 'WEAK';
  };

  const topicMastery = topicMasteryRaw.map((t) => ({
    ...t,
    mastery_level: normaliseMastery(t.mastery_level),
    avg_score:     parseFloat(t.avg_score || 0).toFixed(2),
  }));

  // ── Step 7: enrich with formatted fields ──────────────────
  return {
    student_id: resolvedStudentId,
    analytics: {
      ...data,
      study_time_formatted:    formatMinutesToDuration(data.total_study_time_minutes),
      average_test_score:      parseFloat(Number(data.average_test_score      ?? 0).toFixed(1)),
      average_course_progress: parseFloat(Number(data.average_course_progress ?? 0).toFixed(1)),
      attendance_rate:         parseFloat(Number(data.attendance_rate         ?? 0).toFixed(1)),
    },
    // ── Deep analytics ─────────────────────────────────────
    test_analytics: testAnalytics,
    score_trend: {
      attempts:       scoreTrend,
      total_attempts: scoreTrend.length,
    },
    topic_mastery: {
      total_topics: topicMastery.length,
      grouped: {
        STRONG:  topicMastery.filter((t) => t.mastery_level === 'STRONG'),
        AVERAGE: topicMastery.filter((t) => t.mastery_level === 'AVERAGE'),
        WEAK:    topicMastery.filter((t) => t.mastery_level === 'WEAK'),
      },
      all_topics: topicMastery,
    },
  };
};

// ─────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Derive full test analytics for a student to surface in parent view.
 * Returns: total tests, avg score, highest score, weakest subject.
 *
 * @param {number} studentId
 */
const getParentStudentTestAnalytics = async (studentId) => {
  const tests = await getStudentTestPerformance(studentId);

  if (!tests.length) {
    return {
      total_tests:      0,
      avg_score:        0,
      highest_score:    0,
      weakest_subject:  null,
    };
  }

  const totalTests   = tests.reduce((sum, t) => sum + (t.total_tests    || 0), 0);
  const allScores    = tests.map((t) => parseFloat(t.average_score || 0));
  const avgScore     = allScores.length
    ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1)
    : 0;
  const highestScore = Math.max(...tests.map((t) => parseFloat(t.highest_score || 0))).toFixed(1);

  // Weakest subject = the one with the lowest average_score
  const weakest = tests.reduce(
    (min, t) => (parseFloat(t.average_score) < parseFloat(min.average_score) ? t : min),
    tests[0]
  );

  return {
    total_tests:     totalTests,
    avg_score:       parseFloat(avgScore),
    highest_score:   parseFloat(highestScore),
    weakest_subject: weakest
      ? { subject_id: weakest.subject_id, subject_title: weakest.subject_title, avg_score: parseFloat(weakest.average_score || 0).toFixed(1) }
      : null,
  };
};

/**
 * Resolve user_id from student_id via the students table.
 * Needed to query test_attempts (which stores user_id, not student_id).
 *
 * @param {number} studentId
 * @returns {number|null}
 */
const resolveUserIdFromStudentId = async (studentId) => {
  try {
    // Re-use the pool directly via a simple inline query
    const pool = (await import('../config/database.config.js')).default;
    const [rows] = await pool.query(
      `SELECT user_id FROM students WHERE student_id = ? LIMIT 1`,
      [studentId]
    );
    return rows[0]?.user_id ?? null;
  } catch {
    return null;
  }
};