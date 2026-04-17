// Authors: Harshitha Ravuri,
// ============================================================
// studentAnalytics.service.js
// Business logic for student analytics.
// Services receive raw data from models and format/enrich it
// before returning to the controller.
// ============================================================

import * as AnalyticsModel from '../models/analytics.model.js';

/**
 * Get student overview dashboard data.
 * @param {number} studentId
 */
export const getStudentOverview = async (studentId) => {
  const data = await AnalyticsModel.getStudentDashboardAnalytics(studentId);

  if (!data) {
    return {
      enrolled_courses:        0,
      completed_courses:       0,
      in_progress_courses:     0,
      total_watch_time_minutes:0,
      tests_attempted:         0,
      tests_passed:            0,
      average_test_score:      0,
      current_streak_days:     0,
      longest_streak_days:     0,
      total_points:            0,
      current_rank:            null,
      last_activity_date:      null,
      scoreImprovement: {
        last3Avg:         null,
        previous3Avg:     null,
        changePercentage: null,
        trend:            null,
      },
    };
  }

  return {
    // ── Core metrics ──────────────────────────────────────────
    enrolled_courses:        data.enrolled_courses,
    completed_courses:       data.completed_courses,
    in_progress_courses:     data.in_progress_courses,
    total_watch_time_minutes:data.total_watch_time_minutes,
    tests_attempted:         data.tests_attempted,
    tests_passed:            data.tests_passed,
    average_test_score:      data.average_test_score,
    current_streak_days:     data.current_streak_days,
    longest_streak_days:     data.longest_streak_days,
    total_points:            data.total_points,
    current_rank:            data.current_rank,
    last_activity_date:      data.last_activity_date,
    // ── Derived helpers ───────────────────────────────────────
    watch_time_formatted: formatWatchTime(data.total_watch_time_minutes),
    pass_rate: data.tests_attempted > 0
      ? ((data.tests_passed / data.tests_attempted) * 100).toFixed(1)
      : 0,
    // ── Score improvement ─────────────────────────────────────
    scoreImprovement: {
      last3Avg:         data.last_3_tests_avg         ?? null,
      previous3Avg:     data.previous_3_tests_avg     ?? null,
      changePercentage: data.score_change_percentage  ?? null,
      trend:            data.score_trend              ?? null,
    },
  };
};

/**
 * Get student's progress across all enrolled courses.
 * @param {number} studentId
 */
export const getStudentCourses = async (studentId) => {
  const courses = await AnalyticsModel.getStudentCourseProgress(studentId);

  return courses.map((course) => ({
    ...course,
    status: deriveStatusLabel(course.progress_percentage, course.enrollment_status),
  }));
};

/**
 * Get subject-level analytics for a student within a course.
 * @param {number} studentId
 * @param {number} courseId
 */
export const getStudentSubjectAnalytics = async (studentId, courseId) => {
  const subjects = await AnalyticsModel.getStudentSubjectAnalytics(studentId, courseId);

  return subjects.map((subject) => ({
    ...subject,
    avg_score: parseFloat(subject.avg_score || 0).toFixed(2),
    mastery_summary: getMasterySummary(
      subject.strong_topics,
      subject.average_topics,
      subject.weak_topics,
      subject.total_topics
    ),
  }));
};

/**
 * Get test performance data for a student.
 * @param {number} studentId
 */
export const getStudentTestPerformance = async (studentId) => {
  const tests = await AnalyticsModel.getStudentTestPerformance(studentId);

  return tests.map((test) => ({
    ...test,
    // Parse JSON topic arrays
    strong_topics: safeParseJSON(test.strong_topics),
    weak_topics:   safeParseJSON(test.weak_topics),
    // Trend label derived from improvement_trend
    trend_label: test.improvement_trend > 0 ? 'improving'
               : test.improvement_trend < 0 ? 'declining'
               : 'stable',
    // Format decimals cleanly
    average_score:         parseFloat(test.average_score       || 0).toFixed(2),
    highest_score:         parseFloat(test.highest_score       || 0).toFixed(2),
    lowest_score:          parseFloat(test.lowest_score        || 0).toFixed(2),
    accuracy_percentage:   parseFloat(test.accuracy_percentage || 0).toFixed(2),
    avg_time_per_question: parseFloat(test.avg_time_per_question || 0).toFixed(2),
    score_variance:        parseFloat(test.score_variance      || 0).toFixed(2),
    last_test_score:       test.last_test_score    ?? null,
    last_test_accuracy:    test.last_test_accuracy ?? null,
    last_attempted_at:     test.last_attempted_at  ?? null,
    // Derived: completion rate for this subject
    completion_rate: test.total_questions > 0
      ? parseFloat(((test.attempted_questions / test.total_questions) * 100).toFixed(2))
      : 0,
    // Derived: engagement label based on unanswered questions
    engagement_level: test.unanswered_questions === 0 ? 'full'
                    : test.unanswered_questions <= 2   ? 'partial'
                    : 'low',
  }));
};
/**
 * Get leaderboard data, including current student's rank.
 * @param {number} studentId
 */
export const getStudentLeaderboard = async (studentId) => {
  return await AnalyticsModel.getLeaderboard(studentId);
};

/**
 * Get topic-level mastery breakdown for a student.
 * Topic names are resolved via subject_modules join in the model.
 * @param {number} studentId
 */
export const getStudentTopicMastery = async (studentId) => {
  const topics = await AnalyticsModel.getStudentTopicMastery(studentId);

  // Map DB mastery_level enum (low/medium/high) to display labels
  const normalise = (level) => {
    const map = { high: 'STRONG', medium: 'AVERAGE', low: 'WEAK' };
    return map[level] ?? level?.toUpperCase() ?? 'WEAK';
  };

  const normalisedTopics = topics.map((t) => ({
    ...t,
    mastery_level: normalise(t.mastery_level),
  }));

  const grouped = {
    STRONG:  normalisedTopics.filter((t) => t.mastery_level === 'STRONG'),
    AVERAGE: normalisedTopics.filter((t) => t.mastery_level === 'AVERAGE'),
    WEAK:    normalisedTopics.filter((t) => t.mastery_level === 'WEAK'),
  };

  return {
    total_topics: normalisedTopics.length,
    grouped,
    all_topics: normalisedTopics,
  };
};

/**
 * Get score improvement trend for the current student.
 * Returns recent test scores in chronological order with per-attempt diff and direction.
 *
 * @param {number} userId   - JWT user_id (test_attempts uses user_id, not student_id)
 * @param {number} [limit]  - how many recent attempts to include (default 10)
 */
export const getStudentScoreTrend = async (userId, limit = 10) => {
  const trend = await AnalyticsModel.getScoreImprovementTrend(userId, limit);

  return {
    attempts: trend.map((t) => ({
      attempt_id:      t.attempt_id,
      test_name:       t.test_name,
      score:           parseFloat(t.score || 0),
      max_score:       t.max_score,
      score_percent:   t.max_score > 0
        ? parseFloat(((t.score / t.max_score) * 100).toFixed(1))
        : 0,
      attempted_at:    t.attempted_at,
      score_diff:      t.score_diff !== null ? parseFloat(t.score_diff) : null,
      trend_direction: t.trend_direction ?? 'stable',
    })),
    total_attempts: trend.length,
  };
};

/**
 * Get a student's rank within a specific course plus rank comparison.
 *
 * @param {number} studentId
 * @param {number} courseId
 */
export const getStudentCourseRank = async (studentId, courseId) => {
  const [rankData, comparisonData] = await Promise.all([
    AnalyticsModel.getStudentCourseRank(studentId, courseId),
    AnalyticsModel.getCourseRankComparison(studentId, courseId),
  ]);

  return {
    my_rank:    rankData,
    comparison: comparisonData,
  };
};

// ─────────────────────────────────────────────
// PRIVATE HELPER FUNCTIONS
// ─────────────────────────────────────────────

/** Convert total minutes into a readable string like "3h 20m". */
const formatWatchTime = (minutes) => {
  if (!minutes || minutes === 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins  = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
};

/** Derive a display status from enrollment status + progress. */
const deriveStatusLabel = (progressPercentage, enrollmentStatus) => {
  if (enrollmentStatus === 'completed' || progressPercentage >= 100) return 'Completed';
  if (progressPercentage > 0) return 'In Progress';
  return 'Not Started';
};

/** Build a mastery summary object. */
const getMasterySummary = (strong, average, weak, total) => ({
  strong_count:   Number(strong)  || 0,
  average_count:  Number(average) || 0,
  weak_count:     Number(weak)    || 0,
  total_topics:   Number(total)   || 0,
  strong_percent: total > 0 ? ((strong / total) * 100).toFixed(1) : 0,
});

/** Safely parse a JSON string from the DB. Returns [] if null or invalid. */
const safeParseJSON = (value) => {
  if (!value) return [];
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return [];
  }
};