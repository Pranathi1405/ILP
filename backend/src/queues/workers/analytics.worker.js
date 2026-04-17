// Authors: Harshitha Ravuri
// ============================================================
// analytics.worker.js
// BullMQ worker — processes all analytics events off the main thread.
// Each handler maps to one ANALYTICS_EVENT constant.
// ============================================================

import { Worker } from 'bullmq';
import {ANALYTICS_EVENTS } from '../../constants/analyticsTypes.js';
import * as AnalyticsModel from '../../models/analytics.model.js';
import logger from '../../utils/logger.js';

// ─────────────────────────────────────────────────────────────────────────────
// REDIS CONNECTION
// ─────────────────────────────────────────────────────────────────────────────

const redisConnection = {
  host:     process.env.REDIS_HOST     || 'localhost',
  port:     parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
};

// ─────────────────────────────────────────────
// HANDLER: PAYMENT_SUCCESS
// Updates: platform_statistics, course_analytics, teacher_analytics
// Triggered by: payment.service.js → processWebhook (after transaction commits)
// ─────────────────────────────────────────────
const handlePaymentSuccess = async (payload) => {
  const { courseId, amount } = payload;
  await Promise.all([
    AnalyticsModel.incrementPlatformRevenueStats(amount),

    courseId
      ? AnalyticsModel.upsertCourseAnalyticsForAllTeachers(courseId, amount)
      : Promise.resolve(),

    courseId
      ? AnalyticsModel.upsertTeacherAnalyticsForAllTeachers(courseId, amount)
      : Promise.resolve(),
  ]);

};

// ─────────────────────────────────────────────
// HANDLER: COURSE_ENROLLED
// Updates: student_dashboard_analytics, course_progress_analytics (seed row)
// Triggered by: payment.service.js (after PAYMENT_SUCCESS) OR free course enrollment
// ─────────────────────────────────────────────
const handleCourseEnrolled = async (payload) => {
  const { userId, courseId, enrollmentId } = payload;

  const studentId = await AnalyticsModel.getUserStudentMapping(userId);
  if (!studentId) return;

  // Seed a course_progress_analytics row so subsequent updates have a target
  await AnalyticsModel.seedCourseProgressAnalytics(studentId, courseId, enrollmentId);

  // Increment student dashboard enrolled_courses counter
  await AnalyticsModel.incrementStudentDashboardEnrolledCourses(studentId);
};

// ─────────────────────────────────────────────
// HANDLER: TEST_SUBMITTED
// Updates: test_performance_analytics, topic_mastery_analytics,
//          student_dashboard_analytics (tests_attempted, tests_passed),
//          platform_statistics (total_tests_taken)
// Also queues: UPDATE_STUDENT_SCORE_TREND
// Triggered by: quizAttempt.service.js → submitAttempt
// ─────────────────────────────────────────────
const handleTestSubmitted = async (payload) => {
  const {
    userId, studentId, subjectId, courseId, moduleId,
    score, totalMarks, totalQuestions, attemptedQuestions,
    correctAnswers, partialAnswers, timeTakenMinutes,
    lastTestAccuracy, testType = 'custom', passed,
  } = payload;

  await Promise.all([
    // 1. Upsert test_performance_analytics
    AnalyticsModel.upsertTestPerformanceAnalytics({
      studentId, subjectId, testType, score, totalMarks,
      totalQuestions, attemptedQuestions, correctAnswers,
      partialAnswers, timeTakenMinutes, lastTestAccuracy,
    }),

    // 2. Update topic_mastery_analytics
    moduleId
      ? AnalyticsModel.upsertTopicMasteryAnalytics({
          studentId, courseId, subjectId, moduleId,
          correctAnswers, wrongAnswers: (attemptedQuestions - correctAnswers - (partialAnswers || 0)),
          score,
        })
      : Promise.resolve(),

    // 3. Increment student_dashboard_analytics test counters
    AnalyticsModel.incrementStudentTestStats(studentId, passed),

    // 4. Increment platform total_tests_taken
    AnalyticsModel.incrementPlatformTestStats(),
  ]);

  // Score trend is queued separately (needs last 6 attempts — slightly deferred is fine)
  await AnalyticsModel.updateStudentScoreTrendFromAttempts(userId, studentId);
};

// ─────────────────────────────────────────────
// HANDLER: UPDATE_STUDENT_SCORE_TREND
// Updates: student_dashboard_analytics (score trend columns)
// Triggered by: handleTestSubmitted (above) OR standalone event
// ─────────────────────────────────────────────
const handleUpdateStudentScoreTrend = async (payload) => {
  const { userId, studentId: payloadStudentId } = payload;

  const studentId = payloadStudentId ?? await AnalyticsModel.getUserStudentMapping(userId);
  if (!studentId) return;

  const attempts = await AnalyticsModel.fetchLastSixTestAttempts(userId);

  if (attempts.length < 3) return; // Not enough data for a trend

  const scores = attempts.map((a) => parseFloat(a.total_score));

  const last3     = scores.slice(0, 3);
  const previous3 = scores.length >= 6 ? scores.slice(3, 6) : null;

  const last3Avg     = last3.reduce((s, v) => s + v, 0) / 3;
  const previous3Avg = previous3
    ? previous3.reduce((s, v) => s + v, 0) / 3
    : null;

  let changePercentage = null;
  let trend            = null;

  if (previous3Avg !== null && previous3Avg > 0) {
    changePercentage = parseFloat(
      (((last3Avg - previous3Avg) / previous3Avg) * 100).toFixed(2)
    );
    if (changePercentage > 5)  trend = 'improving';
    else if (changePercentage < -5) trend = 'declining';
    else trend = 'stable';
  }

  await AnalyticsModel.updateStudentScoreTrend(studentId, {
    last3Avg:          parseFloat(last3Avg.toFixed(2)),
    previous3Avg,
    changePercentage,
    trend,
  });
};

// ─────────────────────────────────────────────
// HANDLER: USER_REGISTERED
// Updates: platform_statistics (total_users, new_users_today, role count)
// Triggered by: auth.service.js → registerUser (after OTP verification)
// ─────────────────────────────────────────────
const handleUserRegistered = async (payload) => {
  const { userType } = payload;
  await AnalyticsModel.incrementPlatformUserStats(userType);
};

// ─────────────────────────────────────────────
// HANDLER: COURSE_COMPLETED
// Updates: course_analytics, student_dashboard_analytics, platform_statistics
// Triggered by: enrollment.service.js → markCourseCompleted
// ─────────────────────────────────────────────
const handleCourseCompleted = async (payload) => {
  const { userId, courseId } = payload;

  const studentId = await AnalyticsModel.getUserStudentMapping(userId);
  if (!studentId) return;

  await Promise.all([
    AnalyticsModel.updateCourseAnalyticsOnCompletion(courseId),
    AnalyticsModel.updateStudentDashboardOnCompletion(studentId),
  ]);
};

// ─────────────────────────────────────────────
// HANDLER: MODULE_COMPLETED
// Updates: course_progress_analytics
// Triggered by: video.service.js → updateVideoProgress (when last video is done)
//           OR: enrollment.service.js → markModuleCompleted
// ─────────────────────────────────────────────
const handleModuleCompleted = async (payload) => {
  const { userId, courseId, enrollmentId } = payload;

  const studentId = await AnalyticsModel.getUserStudentMapping(userId);
  if (!studentId) return;

  await AnalyticsModel.incrementCourseProgressOnModuleComplete(studentId, courseId, enrollmentId);
};

// ─────────────────────────────────────────────
// HANDLER: DOUBT_CREATED
// Updates: platform_statistics (total_doubts)
// Triggered by: doubt.service.js → postDoubt
// ─────────────────────────────────────────────
const handleDoubtCreated = async () => {
  await AnalyticsModel.incrementPlatformDoubtStats('created');
};

// ─────────────────────────────────────────────
// HANDLER: DOUBT_RESOLVED
// Updates: platform_statistics (resolved_doubts), teacher_analytics
// Triggered by: doubt.service.js → resolveDoubt (when status → 'resolved')
// ─────────────────────────────────────────────
const handleDoubtResolved = async (payload) => {
  const { teacherUserId } = payload;

  const teacherId = teacherUserId
    ? await AnalyticsModel.getTeacherIdByUserId(teacherUserId)
    : null;

  await Promise.all([
    AnalyticsModel.incrementPlatformDoubtStats('resolved'),
    teacherId
      ? AnalyticsModel.incrementTeacherDoubtsAnswered(teacherId)
      : Promise.resolve(),
  ]);
};

// ─────────────────────────────────────────────
// HANDLER: LIVE_CLASS_JOINED
// Updates: platform_statistics (total_live_classes — counted on first join)
//          teacher_analytics (total_live_classes)
// Triggered by: liveClass.service.js → startLiveClass (teacher side)
// ─────────────────────────────────────────────
const handleLiveClassJoined = async (payload) => {
  const { teacherUserId, isFirstJoin } = payload;

  // Only count the class once — when the teacher starts it (isFirstJoin = true)
  if (!isFirstJoin) return;

  const teacherId = teacherUserId
    ? await AnalyticsModel.getTeacherIdByUserId(teacherUserId)
    : null;

  await Promise.all([
    AnalyticsModel.incrementPlatformLiveClassStats(),
    teacherId
      ? AnalyticsModel.incrementTeacherLiveClassCount(teacherId)
      : Promise.resolve(),
  ]);
};

// ─────────────────────────────────────────────
// HANDLER: UPDATE_PARENT_ANALYTICS
// Updates: parent_dashboard_analytics
// Triggered by: student activity events (TEST_SUBMITTED, COURSE_COMPLETED)
// ─────────────────────────────────────────────
const handleUpdateParentAnalytics = async (payload) => {
  const { studentId } = payload;
  if (!studentId) return;
  await AnalyticsModel.recomputeParentAnalyticsForStudent(studentId);
};

// ─────────────────────────────────────────────
// HANDLER: STUDENT_ACTIVITY
// Updates: learning_streaks, student_dashboard_analytics.last_activity_date
// Triggered by: any student action (video watched, test taken, etc.)
// ─────────────────────────────────────────────
const handleStudentActivity = async (payload) => {
  const { userId } = payload;

  const studentId = await AnalyticsModel.getUserStudentMapping(userId);
  if (!studentId) return;

  await AnalyticsModel.updateLearningStreak(studentId);
};

// ─────────────────────────────────────────────
// DISPATCHER
// Maps BullMQ job.name to the correct handler.
// BullMQ uses job.name (= eventType) for routing.
// ─────────────────────────────────────────────
const processors = {
  [ANALYTICS_EVENTS.PAYMENT_SUCCESS]:             (job) => handlePaymentSuccess(job.data.payload),
  [ANALYTICS_EVENTS.COURSE_ENROLLED]:             (job) => handleCourseEnrolled(job.data.payload),
  [ANALYTICS_EVENTS.TEST_SUBMITTED]:              (job) => handleTestSubmitted(job.data.payload),
  [ANALYTICS_EVENTS.UPDATE_STUDENT_SCORE_TREND]:  (job) => handleUpdateStudentScoreTrend(job.data.payload),
  [ANALYTICS_EVENTS.USER_REGISTERED]:             (job) => handleUserRegistered(job.data.payload),
  [ANALYTICS_EVENTS.COURSE_COMPLETED]:            (job) => handleCourseCompleted(job.data.payload),
  [ANALYTICS_EVENTS.MODULE_COMPLETED]:            (job) => handleModuleCompleted(job.data.payload),
  [ANALYTICS_EVENTS.DOUBT_CREATED]:               (job) => handleDoubtCreated(job.data.payload),
  [ANALYTICS_EVENTS.DOUBT_RESOLVED]:              (job) => handleDoubtResolved(job.data.payload),
  [ANALYTICS_EVENTS.LIVE_CLASS_JOINED]:           (job) => handleLiveClassJoined(job.data.payload),
  [ANALYTICS_EVENTS.UPDATE_PARENT_ANALYTICS]:     (job) => handleUpdateParentAnalytics(job.data.payload),
  [ANALYTICS_EVENTS.STUDENT_ACTIVITY]:            (job) => handleStudentActivity(job.data.payload),
};
export const startAnalyticsWorker = () => {
  const worker = new Worker(
    'analytics',
    async (job) => {
      const handler = processors[job.name];

      if (!handler) {
        logger.warn('Analytics worker: no handler for event', {
          event: job.name,
        });
        return;
      }

      try {
        await handler(job); // ✅ IMPORTANT: pass full job (your processors expect job)
        
        logger.debug('Analytics worker: processed event', {
          event: job.name,
          job_id: job.id,
        });

      } catch (err) {
        logger.error('Analytics worker: handler failed', {
          event: job.name,
          job_id: job.id,
          error: err.message,
          ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
        });

        throw err; // 🔁 retry via BullMQ
      }
    },
    {
      connection: redisConnection,
      concurrency: 5,
    }
  );

  // ── Worker lifecycle events ───────────────────────────────
  worker.on('completed', (job) => {
    logger.debug('Analytics job completed', {
      job_id: job.id,
      event: job.name,
    });
  });

  worker.on('failed', (job, err) => {
    logger.error('Analytics job permanently failed', {
      job_id: job?.id,
      event: job?.name,
      error: err.message,
    });
  });

  worker.on('error', (err) => {
    logger.error('Analytics worker error', {
      error: err.message,
    });
  });

  logger.info('Analytics worker started');

  return worker; // ✅ ALWAYS return something with .close()
};