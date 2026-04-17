// Authors: Harshitha Ravuri,
// ============================================================
// teacherAnalytics.service.js
// Business logic for teacher analytics.
// ============================================================

import * as AnalyticsModel from '../models/analytics.model.js';

/**
 * Get a teacher's personal dashboard summary.
 * @param {number} teacherId
 */
export const getTeacherDashboard = async (teacherId) => {
  const data = await AnalyticsModel.getTeacherDashboardAnalytics(teacherId);

  if (!data) {
    return {
      total_courses_created:      0,
      published_courses:          0,
      total_students:             0,
      active_students:            0,
      total_enrollments:          0,
      average_course_rating:      0,
      total_reviews:              0,
      total_revenue:              0,
      average_student_progress:   0,
      total_live_classes:         0,
      total_doubts_answered:      0,
      average_response_time_hours:0,
    };
  }

  return {
    ...data,
    total_revenue_formatted: formatCurrency(data.total_revenue),
    average_course_rating: parseFloat(data.average_course_rating || 0).toFixed(1),
  };
};

/**
 * Get analytics for all courses a teacher has created.
 * @param {number} teacherId
 */
export const getTeacherCourses = async (teacherId) => {
  const courses = await AnalyticsModel.getTeacherCourseAnalytics(teacherId);

  return courses.map((course) => ({
    ...course,
    popular_modules:         safeParseJSON(course.popular_modules),
    challenging_topics:      safeParseJSON(course.challenging_topics),
    dropout_rate:            parseFloat(course.dropout_rate            || 0).toFixed(2),
    average_completion_rate: parseFloat(course.average_completion_rate || 0).toFixed(2),
    average_rating:          parseFloat(course.average_rating          || 0).toFixed(1),
    total_revenue_formatted: formatCurrency(course.total_revenue),
  }));
};

/**
 * Get test analytics across a teacher's courses.
 * @param {number} teacherId
 */
export const getTeacherTests = async (teacherId) => {
  const tests = await AnalyticsModel.getTeacherTestAnalytics(teacherId);

  return tests.map((test) => ({
    ...test,
    // Existing
    pass_rate:              test.total_attempts > 0
      ? ((test.students_passed / test.total_attempts) * 100).toFixed(1)
      : 0,
    average_score:          parseFloat(test.average_score          || 0).toFixed(2),
    // New enriched fields
    avg_accuracy:           parseFloat(test.avg_accuracy           || 0).toFixed(2),
    avg_time_per_question:  parseFloat(test.avg_time_per_question  || 0).toFixed(2),
    avg_score_variance:     parseFloat(test.avg_score_variance     || 0).toFixed(2),
    total_correct_answers:  Number(test.total_correct_answers      || 0),
    total_unanswered:       Number(test.total_unanswered           || 0),
    // Derived: overall accuracy across all students in this subject
    overall_accuracy: test.total_questions > 0
      ? parseFloat(((test.total_correct_answers / test.total_questions) * 100).toFixed(2))
      : 0,
    // Consistency flag — high variance = inconsistent performance
    consistency_level: test.avg_score_variance < 50  ? 'consistent'
                     : test.avg_score_variance < 150 ? 'moderate'
                     : 'inconsistent',
  }));
};
/**
 * Get a specific student's full performance (teacher view).
 * Topic mastery rows are enriched with module names (resolved by model).
 *
 * @param {number} teacherId  - used for access-control in middleware
 * @param {number} studentId
 */
export const getStudentPerformance = async (teacherId, studentId) => {
  const data = await AnalyticsModel.getStudentPerformanceForTeacher(studentId);

  if (data.topic_mastery) {
    // Normalise mastery_level enum and round avg_score
    data.topic_mastery = data.topic_mastery.map((topic) => ({
      ...topic,
      avg_score:     parseFloat(topic.avg_score || 0).toFixed(2),
      mastery_level: normaliseMasteryLevel(topic.mastery_level),
    }));
  }

  return data;
};

/**
 * Get live class analytics for a teacher.
 * @param {number} teacherId
 */
export const getTeacherLiveClasses = async (teacherId) => {
  const classes = await AnalyticsModel.getTeacherLiveClassAnalytics(teacherId);

  return classes.map((cls) => ({
    ...cls,
    attendance_rate:          parseFloat(cls.attendance_rate           || 0).toFixed(1),
    average_duration_minutes: parseFloat(cls.average_duration_minutes  || 0).toFixed(0),
  }));
};

/**
 * Get student-level progress for all students in a specific course.
 * Includes name, progress %, avg score, last activity, and course rank.
 *
 * @param {number} teacherId
 * @param {number} courseId
 */
export const getTeacherCourseStudentProgress = async (teacherId, courseId) => {
  const students = await AnalyticsModel.getCourseStudentProgress(teacherId, courseId);

  if (!students.length) {
    return {
      course_id: courseId,
      course_name: null,
      total_students: 0,
      students: [],
    };
  }

  const { course_name, total_students } = students[0];

  return {
    course_id: courseId,
    course_name,
    total_students: Number(total_students),

    students: students.map((s) => ({
      student_id:          s.student_id,
      name:                `${s.first_name} ${s.last_name}`,
      profile_picture_url: s.profile_picture_url,
      progress_percentage: parseFloat(s.progress_percentage || 0).toFixed(1),
      average_test_score:  parseFloat(s.average_test_score  || 0).toFixed(1),
      last_activity:       s.last_activity,
      course_rank:         s.course_rank ?? null,
      status:              deriveStatusLabel(s.progress_percentage),
    })),
  };
};
/**
 * Get the leaderboard preview (top N students) for a specific course.
 *
 * @param {number} courseId
 * @param {number} [limit=10]
 */
export const getTeacherCourseLeaderboard = async (courseId, limit = 10) => {
  const rows = await AnalyticsModel.getCourseLeaderboard(courseId, limit);

  return rows.map((r) => ({
    rank:                r.rank_in_course,
    student_id:          r.student_id,
    name:                `${r.first_name} ${r.last_name}`,
    profile_picture_url: r.profile_picture_url,
    total_score:         parseFloat(r.total_score          || 0).toFixed(2),
    completion_percent:  parseFloat(r.completion_percentage|| 0).toFixed(1),
    average_test_score:  parseFloat(r.average_test_score   || 0).toFixed(1),
    tests_completed:     r.tests_completed,
  }));
};

// ─────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────

const formatCurrency = (amount) => {
  if (!amount) return '₹0.00';
  return `₹${parseFloat(amount).toFixed(2)}`;
};

const safeParseJSON = (value) => {
  if (!value) return [];
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return [];
  }
};

/** Map DB enum (low/medium/high) → display label (WEAK/AVERAGE/STRONG). */
const normaliseMasteryLevel = (level) => {
  const map = { high: 'STRONG', medium: 'AVERAGE', low: 'WEAK' };
  return map[level] ?? level?.toUpperCase() ?? 'WEAK';
};

/** Derive a status label from progress percentage alone. */
const deriveStatusLabel = (progress) => {
  if (progress >= 100) return 'Completed';
  if (progress >   0 ) return 'In Progress';
  return 'Not Started';
};