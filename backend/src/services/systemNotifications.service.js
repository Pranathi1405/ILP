/**
 * src/services/systemNotifications.service.js
 * =============================================
 * Every system-triggered notification in the platform lives here.
 *
 * HOW TO USE THIS FILE:
 *   Import the function for the event you need and call it wherever
 *   that event happens in the codebase (e.g. inside payment module,
 *   enrollment module, test module, etc.).
 *
 *   Example — when a student enrolls in a course:
 *     import { notifyStudentCourseEnrollment } from '../services/systemNotifications.service.js';
 *     await notifyStudentCourseEnrollment(studentUserId, courseId, courseName);
 *
 * RULE — NEVER write notification logic outside this file:
 *   All notifications go through sendToUsers() inside notification.service.js.
 *   This file is the only place that prepares payloads and calls sendToUsers().
 *
 * ORGANISATION:
 *   ── SECTION 1: Student Notifications ──────────────────
 *     1.1  Course Related
 *     1.2  Tests / Quizzes
 *     1.3  Live Classes
 *     1.4  Doubts / Discussions
 *     1.5  Achievements & Progress
 *     1.6  Payments / Subscriptions
 *     1.7  System / General
 *   ── SECTION 2: Teacher Notifications ──────────────────
 *     2.1  Account / Admin Actions
 *     2.2  Doubts / Questions
 *     2.3  Tests / Assessments
 *     2.4  Live Classes
 *     2.5  System / Admin
 *   ── SECTION 3: Admin Notifications ───────────────────
 *     3.1  User Management
 *     3.2  Payments
 *     3.3  System Operations
 */

// ── Imports ─────────────────────────────────────────────────────────────────

// sendToUsers() is the ONLY function we call to deliver a notification.
// It handles: DB insert → WebSocket emit → push check → push send.
import { sendToUsers } from './notification.service.js';

// All message strings come from here — no raw strings in this file.
import {
  STUDENT_MESSAGES,
  TEACHER_MESSAGES,
  ADMIN_MESSAGES,
} from '../constants/systemNotificationMessages.js';

// Notification type constants — these must match the DB ENUM exactly.
import { NOTIFICATION_TYPES } from '../constants/notificationTypes.js';

// DB helpers for fetching user_ids when needed.
import { getAllAdminUserIds, getUserIdByStudentId } from '../models/targetResolution.model.js';


// ============================================================
// SECTION 1: STUDENT NOTIFICATIONS
// ============================================================
// Each function here sends a notification TO a specific student.
// The student's user_id is always the first parameter.
// ============================================================


// ── 1.1  Course Related ──────────────────────────────────────────────────────

/**
 * Send when: student is successfully enrolled in a course.
 *
 * Called by: Enrollment module / Admin panel.
 *
 * @param {number} studentUserId  - user_id of the student
 * @param {number} courseId       - ID of the course
 * @param {string} courseName     - display name of the course
 */
export const notifyStudentCourseEnrollment = async (studentId, courseId, courseName) => {
  const { title, message } = STUDENT_MESSAGES.COURSE.ENROLLMENT(courseName);
  const studentUserId = await getUserIdByStudentId(studentId);
  await sendToUsers([studentUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.ENROLLMENT, // 'enrollment'
    related_id:        courseId,
    related_type:      'course',
  });
};

/**
 * Send when: a new course is added to the student's stream/feed.
 *
 * Called by: Course module when a new course becomes visible to the student.
 *
 * @param {number} studentUserId
 * @param {number} courseId
 * @param {string} courseName
 * @param {string} teacherName
 */
export const notifyStudentNewCourseInStream = async (studentUserId, courseId, courseName, teacherName) => {
  const { title, message } = STUDENT_MESSAGES.COURSE.NEW_COURSE_IN_STREAM(courseName, teacherName);

  await sendToUsers([studentUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.COURSE, // 'course'
    related_id:        courseId,
    related_type:      'course',
  });
};

/**
 * Send when: admin manually assigns a course to a specific student.
 *
 * Called by: Admin panel → assign course action.
 *
 * @param {number} studentUserId
 * @param {number} courseId
 * @param {string} courseName
 */
export const notifyStudentCourseAssignedByAdmin = async (studentUserId, courseId, courseName) => {
  const { title, message } = STUDENT_MESSAGES.COURSE.ASSIGNED_BY_ADMIN(courseName);

  await sendToUsers([studentUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.COURSE, // 'course'
    related_id:        courseId,
    related_type:      'course',
  });
};

/**
 * Send when: teacher adds a new video, module, or piece of content to a course.
 *
 * Called by: Content management module after a new module is published.
 *
 * @param {number} studentUserId
 * @param {number} courseId
 * @param {string} courseName
 * @param {string} moduleName  - name of the new module/video
 */
export const notifyStudentNewContentAdded = async (studentUserId, courseId, courseName, moduleName) => {
  const { title, message } = STUDENT_MESSAGES.COURSE.NEW_CONTENT_ADDED(courseName, moduleName);

  await sendToUsers([studentUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.COURSE, // 'course'
    related_id:        courseId,
    related_type:      'course',
  });
};

/**
 * Send when: student has not completed a course and a reminder is due.
 * (e.g. cron job checks progress every week and sends reminders below 90%)
 *
 * Called by: A scheduled job in the course module.
 *
 * @param {number} studentUserId
 * @param {number} courseId
 * @param {string} courseName
 * @param {number} progressPercent  - e.g. 65 (for "65% complete")
 */
export const notifyStudentCourseCompletionReminder = async (studentUserId, courseId, courseName, progressPercent) => {
  const { title, message } = STUDENT_MESSAGES.COURSE.COMPLETION_REMINDER(courseName, progressPercent);

  await sendToUsers([studentUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.COURSE, // 'course'
    related_id:        courseId,
    related_type:      'course',
  });
};

/**
 * Send when: student completes a course and their certificate is generated.
 *
 * Called by: Certificate generation service after processing.
 *
 * @param {number} studentUserId
 * @param {number} courseId
 * @param {string} courseName
 */
export const notifyStudentCertificateReady = async (studentUserId, courseId, courseName) => {
  const { title, message } = STUDENT_MESSAGES.COURSE.CERTIFICATE_READY(courseName);

  await sendToUsers([studentUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.ACHIEVEMENT, // 'achievement'
    related_id:        courseId,
    related_type:      'course',
  });
};


// ── 1.2  Tests / Quizzes ─────────────────────────────────────────────────────

/**
 * Send when: teacher schedules a new test for a course.
 *
 * Called by: Test module after a teacher creates and schedules a test.
 *
 * @param {number} studentUserId
 * @param {number} testId
 * @param {string} testTitle
 * @param {string} scheduledAt  - human-readable e.g. "12 Mar 2026, 10:00 AM"
 */
export const notifyStudentTestScheduled = async (studentUserId, testId, testTitle, scheduledAt) => {
  const { title, message } = STUDENT_MESSAGES.TEST.SCHEDULED(testTitle, scheduledAt);

  await sendToUsers([studentUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.TEST, // 'test'
    related_id:        testId,
    related_type:      'test',
  });
};

/**
 * Send when: a reminder should go out before a test deadline.
 * (e.g. 24 hours before deadline)
 *
 * Called by: Reminder scheduler in the test module.
 *
 * @param {number} studentUserId
 * @param {number} testId
 * @param {string} testTitle
 * @param {string} deadline  - e.g. "12 Mar 2026, 11:59 PM"
 */
export const notifyStudentTestReminder = async (studentUserId, testId, testTitle, deadline) => {
  const { title, message } = STUDENT_MESSAGES.TEST.REMINDER(testTitle, deadline);

  await sendToUsers([studentUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.TEST, // 'test'
    related_id:        testId,
    related_type:      'test',
  });
};

/**
 * Send when: test deadline is very close (e.g. 1 hour left).
 *
 * Called by: Deadline checker job — fires when time remaining is critical.
 *
 * @param {number} studentUserId
 * @param {number} testId
 * @param {string} testTitle
 * @param {string} deadline
 */
export const notifyStudentTestDeadlineApproaching = async (studentUserId, testId, testTitle, deadline) => {
  const { title, message } = STUDENT_MESSAGES.TEST.DEADLINE_APPROACHING(testTitle, deadline);

  await sendToUsers([studentUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.TEST, // 'test'
    related_id:        testId,
    related_type:      'test',
  });
};

/**
 * Send when: student submits a test and the submission is saved successfully.
 *
 * Called by: Test submission handler after saving answers to DB.
 *
 * @param {number} studentUserId
 * @param {number} testId
 * @param {string} testTitle
 */
export const notifyStudentTestSubmissionSuccessful = async (studentUserId, testId, testTitle) => {
  const { title, message } = STUDENT_MESSAGES.TEST.SUBMISSION_SUCCESSFUL(testTitle);

  await sendToUsers([studentUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.TEST, // 'test'
    related_id:        testId,
    related_type:      'test',
  });
};

/**
 * Send when: teacher publishes test results for all students.
 *
 * Called by: Test results module after teacher clicks "Publish Results".
 *
 * @param {number} studentUserId
 * @param {number} testId
 * @param {string} testTitle
 */
export const notifyStudentTestResultsPublished = async (studentUserId, testId, testTitle) => {
  const { title, message } = STUDENT_MESSAGES.TEST.RESULTS_PUBLISHED(testTitle);

  await sendToUsers([studentUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.TEST, // 'test'
    related_id:        testId,
    related_type:      'test',
  });
};


// ── 1.3  Live Classes ────────────────────────────────────────────────────────

/**
 * Send when: a new live class is scheduled for the student's course.
 *
 * Called by: Live class module after teacher/admin creates the class.
 *
 * @param {number} studentUserId
 * @param {number} liveClassId
 * @param {string} classTitle
 * @param {string} scheduledAt  - e.g. "12 Mar 2026, 03:00 PM"
 */
export const notifyStudentLiveClassScheduled = async (studentUserId, liveClassId, classTitle, scheduledAt) => {
  const { title, message } = STUDENT_MESSAGES.LIVE_CLASS.SCHEDULED(classTitle, scheduledAt);

  await sendToUsers([studentUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.LIVE_CLASS, // 'live_class'
    related_id:        liveClassId,
    related_type:      'live_class',
  });
};

/**
 * Send when: X minutes before a live class starts (e.g. 15 min reminder).
 *
 * Called by: Live class reminder scheduler.
 *
 * @param {number} studentUserId
 * @param {number} liveClassId
 * @param {string} classTitle
 * @param {string} startsAt  - e.g. "03:00 PM"
 */
export const notifyStudentLiveClassReminder = async (studentUserId, liveClassId, classTitle, startsAt) => {
  const { title, message } = STUDENT_MESSAGES.LIVE_CLASS.REMINDER(classTitle, startsAt);

  await sendToUsers([studentUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.LIVE_CLASS, // 'live_class'
    related_id:        liveClassId,
    related_type:      'live_class',
  });
};

/**
 * Send when: teacher clicks "Go Live" — the class session has started.
 *
 * Called by: Live class module when status changes to 'live'.
 *
 * @param {number} studentUserId
 * @param {number} liveClassId
 * @param {string} classTitle
 */
export const notifyStudentLiveClassStarted = async (studentUserId, liveClassId, classTitle) => {
  const { title, message } = STUDENT_MESSAGES.LIVE_CLASS.STARTED(classTitle);

  await sendToUsers([studentUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.LIVE_CLASS, // 'live_class'
    related_id:        liveClassId,
    related_type:      'live_class',
  });
};

/**
 * Send when: teacher ends the live class session.
 *
 * Called by: Live class module when status changes to 'ended'.
 *
 * @param {number} studentUserId
 * @param {number} liveClassId
 * @param {string} classTitle
 */
export const notifyStudentLiveClassEnded = async (studentUserId, liveClassId, classTitle) => {
  const { title, message } = STUDENT_MESSAGES.LIVE_CLASS.ENDED(classTitle);

  await sendToUsers([studentUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.LIVE_CLASS, // 'live_class'
    related_id:        liveClassId,
    related_type:      'live_class',
  });
};

/**
 * Send when: the recording of the ended class is processed and available.
 *
 * Called by: Recording processing service after upload is complete.
 *
 * @param {number} studentUserId
 * @param {number} liveClassId
 * @param {string} classTitle
 */
export const notifyStudentLiveClassRecordingAvailable = async (studentUserId, liveClassId, classTitle) => {
  const { title, message } = STUDENT_MESSAGES.LIVE_CLASS.RECORDING_AVAILABLE(classTitle);

  await sendToUsers([studentUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.LIVE_CLASS, // 'live_class'
    related_id:        liveClassId,
    related_type:      'live_class',
  });
};


// ── 1.4  Doubts / Discussions ────────────────────────────────────────────────

/**
 * Send when: student's doubt/question is saved to the system.
 *
 * Called by: Doubts module after saving the new doubt row.
 *
 * @param {number} studentUserId
 * @param {number} doubtId
 * @param {string} questionTitle  - short version of the question
 */
export const notifyStudentDoubtPosted = async (studentUserId, doubtId, questionTitle) => {
  const { title, message } = STUDENT_MESSAGES.DOUBT.POSTED_SUCCESSFULLY(questionTitle);

  await sendToUsers([studentUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.DOUBT, // 'doubt'
    related_id:        doubtId,
    related_type:      'doubt',
  });
};

/**
 * Send when: teacher marks the doubt as answered.
 *
 * Called by: Doubts module when teacher submits their answer.
 *
 * @param {number} studentUserId
 * @param {number} doubtId
 * @param {string} questionTitle
 * @param {string} teacherName
 */
export const notifyStudentDoubtAnswered = async (studentUserId, doubtId, questionTitle, teacherName) => {
  const { title, message } = STUDENT_MESSAGES.DOUBT.ANSWERED_BY_TEACHER(questionTitle, teacherName);

  await sendToUsers([studentUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.DOUBT, // 'doubt'
    related_id:        doubtId,
    related_type:      'doubt',
  });
};

/**
 * Send when: another user adds a reply to a discussion thread the student is in.
 *
 * Called by: Discussion module after a new reply is saved.
 *
 * @param {number} studentUserId
 * @param {number} doubtId
 * @param {string} questionTitle
 */
export const notifyStudentReplyAddedToThread = async (studentUserId, doubtId, questionTitle) => {
  const { title, message } = STUDENT_MESSAGES.DOUBT.REPLY_ADDED(questionTitle);

  await sendToUsers([studentUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.DOUBT, // 'doubt'
    related_id:        doubtId,
    related_type:      'doubt',
  });
};


// ── 1.5  Achievements & Progress ─────────────────────────────────────────────

/**
 * Send when: student earns an achievement badge.
 *
 * Called by: Gamification/achievement module.
 *
 * @param {number} studentUserId
 * @param {number} achievementId
 * @param {string} achievementName  - e.g. "Quiz Master", "Fast Learner"
 */
export const notifyStudentAchievementEarned = async (studentUserId, achievementId, achievementName) => {
  const { title, message } = STUDENT_MESSAGES.ACHIEVEMENT.BADGE_EARNED(achievementName);

  await sendToUsers([studentUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.ACHIEVEMENT, // 'achievement'
    related_id:        achievementId,
    related_type:      'achievement',
  });
};

/**
 * Send when: student hits a learning milestone (hours studied, courses started, etc.).
 *
 * Called by: Progress tracking module when a threshold is crossed.
 *
 * @param {number} studentUserId
 * @param {string} milestone  - e.g. "10 hours of learning completed"
 */
export const notifyStudentLearningMilestone = async (studentUserId, milestone) => {
  const { title, message } = STUDENT_MESSAGES.ACHIEVEMENT.LEARNING_MILESTONE(milestone);

  await sendToUsers([studentUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.ACHIEVEMENT, // 'achievement'
    related_id:        null,
    related_type:      'achievement',
  });
};

/**
 * Send when: student reaches a progress checkpoint in a specific course.
 * e.g. 25%, 50%, 75%, 100% complete.
 *
 * Called by: Progress tracking module after each lesson completion.
 *
 * @param {number} studentUserId
 * @param {number} courseId
 * @param {string} courseName
 * @param {number} percent  - e.g. 50
 */
export const notifyStudentCourseProgressMilestone = async (studentUserId, courseId, courseName, percent) => {
  const { title, message } = STUDENT_MESSAGES.ACHIEVEMENT.COURSE_PROGRESS_MILESTONE(courseName, percent);

  await sendToUsers([studentUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.ACHIEVEMENT, // 'achievement'
    related_id:        courseId,
    related_type:      'course',
  });
};


// ── 1.6  Payments / Subscriptions ────────────────────────────────────────────

/**
 * Send when: payment gateway confirms a successful payment.
 *
 * Called by: Payment module after Razorpay webhook confirms success.
 *
 * @param {number} userId     - user who made the payment
 * @param {number} paymentId
 * @param {number} amount     - in INR e.g. 2999
 * @param {string} courseName
 */
export const notifyStudentPaymentSuccessful = async (userId, paymentId, amount, courseName) => {
  const { title, message } = STUDENT_MESSAGES.PAYMENT.SUCCESSFUL(amount, courseName);

  await sendToUsers([userId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.PAYMENT, // 'payment'
    related_id:        paymentId,
    related_type:      'payment',
  });
};

/**
 * Send when: payment gateway returns a failure response.
 *
 * Called by: Payment module after Razorpay webhook signals failure.
 *
 * @param {number} userId
 * @param {number} paymentId
 * @param {number} amount
 * @param {string} courseName
 */
export const notifyStudentPaymentFailed = async (userId, paymentId, amount, courseName) => {
  const { title, message } = STUDENT_MESSAGES.PAYMENT.FAILED(amount, courseName);

  await sendToUsers([userId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.PAYMENT, // 'payment'
    related_id:        paymentId,
    related_type:      'payment',
  });
};

/**
 * Send when: payment is initiated but not yet confirmed by the gateway.
 *
 * Called by: Payment module immediately after creating the payment order.
 *
 * @param {number} userId
 * @param {number} paymentId
 * @param {number} amount
 * @param {string} courseName
 */
export const notifyStudentPaymentPending = async (userId, paymentId, amount, courseName) => {
  const { title, message } = STUDENT_MESSAGES.PAYMENT.PENDING(amount, courseName);

  await sendToUsers([userId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.PAYMENT, // 'payment'
    related_id:        paymentId,
    related_type:      'payment',
  });
};

/**
 * Send when: student's subscription plan is activated successfully.
 *
 * Called by: Subscription module after plan activation is confirmed.
 *
 * @param {number} userId
 * @param {number} subscriptionId
 * @param {string} planName    - e.g. "Pro Plan", "Annual Bundle"
 * @param {string} validUntil  - e.g. "31 Mar 2027"
 */
export const notifyStudentSubscriptionActivated = async (userId, subscriptionId, planName, validUntil) => {
  const { title, message } = STUDENT_MESSAGES.PAYMENT.SUBSCRIPTION_ACTIVATED(planName, validUntil);

  await sendToUsers([userId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.PAYMENT, // 'payment'
    related_id:        subscriptionId,
    related_type:      'subscription',
  });
};


// ── 1.7  System / General ────────────────────────────────────────────────────

/**
 * Send when: admin broadcasts a new announcement that targets students.
 *
 * Called by: Announcement service → instantBroadcast() in notification.service.js.
 *
 * @param {number} studentUserId
 * @param {number} announcementId
 * @param {string} announcementTitle
 */
export const notifyStudentNewAnnouncement = async (studentUserId, announcementId, announcementTitle) => {
  const { title, message } = STUDENT_MESSAGES.SYSTEM.NEW_ANNOUNCEMENT(announcementTitle);

  await sendToUsers([studentUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.ANNOUNCEMENT, // 'announcement'
    related_id:        announcementId,
    related_type:      'announcement',
  });
};

/**
 * Send when: student updates their own profile (name, photo, bio, etc.).
 *
 * Called by: User profile update handler.
 *
 * @param {number} userId
 */
export const notifyStudentProfileUpdated = async (userId) => {
  const { title, message } = STUDENT_MESSAGES.SYSTEM.PROFILE_UPDATED();

  await sendToUsers([userId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.SYSTEM, // 'system'
    related_id:        null,
    related_type:      'profile',
  });
};

/**
 * Send when: suspicious activity is detected on the student's account.
 * e.g. login from a new device, multiple failed logins.
 *
 * Called by: Auth module / security monitoring service.
 *
 * @param {number} userId
 * @param {string} alertMessage  - e.g. "Login from a new device in Mumbai"
 */
export const notifyStudentAccountSecurityAlert = async (userId, alertMessage) => {
  const { title, message } = STUDENT_MESSAGES.SYSTEM.SECURITY_ALERT(alertMessage);

  await sendToUsers([userId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.SYSTEM, // 'system'
    related_id:        null,
    related_type:      'security',
  });
};

/**
 * Send when: student successfully changes their password.
 *
 * Called by: Auth module after password change is saved.
 *
 * @param {number} userId
 */
export const notifyStudentPasswordChanged = async (userId) => {
  const { title, message } = STUDENT_MESSAGES.SYSTEM.PASSWORD_CHANGED();

  await sendToUsers([userId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.SYSTEM, // 'system'
    related_id:        null,
    related_type:      'security',
  });
};


// ============================================================
// SECTION 2: TEACHER NOTIFICATIONS
// ============================================================
// Each function here sends a notification TO a specific teacher.
// The teacher's user_id is always the first parameter.
// ============================================================


// ── 2.1  Account / Admin Actions ─────────────────────────────────────────────

/**
 * Send when: teacher registers and their account is pending admin approval.
 *
 * Called by: Auth module after teacher signup is complete.
 *
 * @param {number} teacherUserId
 */
export const notifyTeacherRegistrationPending = async (teacherUserId) => {
  const { title, message } = TEACHER_MESSAGES.ACCOUNT.REGISTRATION_PENDING();

  await sendToUsers([teacherUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.SYSTEM, // 'system'
    related_id:        null,
    related_type:      'account',
  });
};

/**
 * Send when: admin approves the teacher's account — teacher can now log in fully.
 *
 * Called by: Admin panel → approve teacher action.
 *
 * @param {number} teacherUserId
 */
export const notifyTeacherAccountApproved = async (teacherUserId) => {
  const { title, message } = TEACHER_MESSAGES.ACCOUNT.APPROVED();

  await sendToUsers([teacherUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.SYSTEM, // 'system'
    related_id:        null,
    related_type:      'account',
  });
};

/**
 * Send when: admin rejects the teacher's account application.
 *
 * Called by: Admin panel → reject teacher action.
 *
 * @param {number} teacherUserId
 * @param {string} reason  - reason for rejection (optional, shown in message)
 */
export const notifyTeacherAccountRejected = async (teacherUserId, reason = '') => {
  const { title, message } = TEACHER_MESSAGES.ACCOUNT.REJECTED(reason);

  await sendToUsers([teacherUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.SYSTEM, // 'system'
    related_id:        null,
    related_type:      'account',
  });
};

/**
 * Send when: admin assigns a subject for the teacher to teach.
 *
 * Called by: Admin panel → assign subject action.
 *
 * @param {number} teacherUserId
 * @param {number} subjectId
 * @param {string} subjectName
 */
export const notifyTeacherSubjectAssigned = async (teacherUserId, subjectId, subjectName) => {
  const { title, message } = TEACHER_MESSAGES.ACCOUNT.SUBJECT_ASSIGNED(subjectName);

  await sendToUsers([teacherUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.COURSE, // 'course'
    related_id:        subjectId,
    related_type:      'subject',
  });
};

/**
 * Send when: admin assigns an existing course to a teacher.
 *
 * Called by: Admin panel → assign course to teacher action.
 *
 * @param {number} teacherUserId
 * @param {number} courseId
 * @param {string} courseName
 */
export const notifyTeacherCourseAssigned = async (teacherUserId, courseId, courseName) => {
  const { title, message } = TEACHER_MESSAGES.ACCOUNT.COURSE_ASSIGNED(courseName);

  await sendToUsers([teacherUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.COURSE, // 'course'
    related_id:        courseId,
    related_type:      'course',
  });
};


// ── 2.2  Doubts / Questions ───────────────────────────────────────────────────

/**
 * Send when: a student in the teacher's course posts a new doubt.
 *
 * Called by: Doubts module after saving the new doubt row.
 *
 * @param {number} teacherUserId
 * @param {number} doubtId
 * @param {string} questionTitle
 * @param {string} studentName
 * @param {string} courseName
 */
export const notifyTeacherNewDoubtPosted = async (teacherUserId, doubtId, questionTitle, studentName, courseName) => {
  const { title, message } = TEACHER_MESSAGES.DOUBT.NEW_DOUBT_POSTED(studentName, questionTitle, courseName);

  await sendToUsers([teacherUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.DOUBT, // 'doubt'
    related_id:        doubtId,
    related_type:      'doubt',
  });
};

/**
 * Send when: the deadline for responding to a doubt is approaching.
 *
 * Called by: Doubt reminder scheduler.
 *
 * @param {number} teacherUserId
 * @param {number} doubtId
 * @param {string} questionTitle
 * @param {string} deadline  - e.g. "Today at 11:59 PM"
 */
export const notifyTeacherDoubtDeadlineApproaching = async (teacherUserId, doubtId, questionTitle, deadline) => {
  const { title, message } = TEACHER_MESSAGES.DOUBT.DEADLINE_APPROACHING(questionTitle, deadline);

  await sendToUsers([teacherUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.DOUBT, // 'doubt'
    related_id:        doubtId,
    related_type:      'doubt',
  });
};

/**
 * Send when: a doubt has gone unanswered for a long time.
 *
 * Called by: Doubt monitoring job — checks for old unanswered doubts.
 *
 * @param {number} teacherUserId
 * @param {number} doubtId
 * @param {string} questionTitle
 * @param {number} daysPending  - how many days it has been open
 */
export const notifyTeacherDoubtUnresolvedLong = async (teacherUserId, doubtId, questionTitle, daysPending) => {
  const { title, message } = TEACHER_MESSAGES.DOUBT.UNRESOLVED_LONG_TIME(questionTitle, daysPending);

  await sendToUsers([teacherUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.DOUBT, // 'doubt'
    related_id:        doubtId,
    related_type:      'doubt',
  });
};

/**
 * Send when: student marks their own doubt as resolved/closed.
 *
 * Called by: Doubts module when student updates doubt status to 'closed'.
 *
 * @param {number} teacherUserId
 * @param {number} doubtId
 * @param {string} questionTitle
 * @param {string} studentName
 */
export const notifyTeacherDoubtClosedByStudent = async (teacherUserId, doubtId, questionTitle, studentName) => {
  const { title, message } = TEACHER_MESSAGES.DOUBT.CLOSED_BY_STUDENT(questionTitle, studentName);

  await sendToUsers([teacherUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.DOUBT, // 'doubt'
    related_id:        doubtId,
    related_type:      'doubt',
  });
};


// ── 2.3  Tests / Assessments ─────────────────────────────────────────────────

/**
 * Send when: the submission window for a test has closed.
 *
 * Called by: Test module when the test end_time passes (job or webhook).
 *
 * @param {number} teacherUserId
 * @param {number} testId
 * @param {string} testTitle
 * @param {string} courseName
 */
export const notifyTeacherTestSubmissionDeadlineReached = async (teacherUserId, testId, testTitle, courseName) => {
  const { title, message } = TEACHER_MESSAGES.TEST.SUBMISSION_DEADLINE_REACHED(testTitle, courseName);

  await sendToUsers([teacherUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.TEST, // 'test'
    related_id:        testId,
    related_type:      'test',
  });
};

/**
 * Send when: anti-cheat system detects suspicious activity during a test.
 *
 * Called by: Anti-cheat / proctoring module.
 *
 * @param {number} teacherUserId
 * @param {number} testId
 * @param {string} testTitle
 * @param {string} studentName
 */
export const notifyTeacherSuspiciousTestActivity = async (teacherUserId, testId, testTitle, studentName) => {
  const { title, message } = TEACHER_MESSAGES.TEST.SUSPICIOUS_ACTIVITY(testTitle, studentName);

  await sendToUsers([teacherUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.TEST, // 'test'
    related_id:        testId,
    related_type:      'test',
  });
};


// ── 2.4  Live Classes ────────────────────────────────────────────────────────

/**
 * Send when: a live class is scheduled (teacher or admin created it).
 *
 * Called by: Live class module after a new session is created.
 *
 * @param {number} teacherUserId
 * @param {number} liveClassId
 * @param {string} classTitle
 * @param {string} scheduledAt  - e.g. "12 Mar 2026, 03:00 PM"
 */
export const notifyTeacherLiveClassScheduled = async (teacherUserId, liveClassId, classTitle, scheduledAt) => {
  const { title, message } = TEACHER_MESSAGES.LIVE_CLASS.SCHEDULED(classTitle, scheduledAt);

  await sendToUsers([teacherUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.LIVE_CLASS, // 'live_class'
    related_id:        liveClassId,
    related_type:      'live_class',
  });
};

/**
 * Send when: X minutes before the teacher's class starts (e.g. 30 min reminder).
 *
 * Called by: Live class reminder scheduler.
 *
 * @param {number} teacherUserId
 * @param {number} liveClassId
 * @param {string} classTitle
 * @param {string} startsAt  - e.g. "03:00 PM"
 */
export const notifyTeacherLiveClassReminder = async (teacherUserId, liveClassId, classTitle, startsAt) => {
  const { title, message } = TEACHER_MESSAGES.LIVE_CLASS.REMINDER(classTitle, startsAt);

  await sendToUsers([teacherUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.LIVE_CLASS, // 'live_class'
    related_id:        liveClassId,
    related_type:      'live_class',
  });
};


// ── 2.5  System / Admin ───────────────────────────────────────────────────────

/**
 * Send when: a bulk operation (e.g. CSV import of students) is finished.
 *
 * Called by: Bulk import/export module after processing.
 *
 * @param {number} teacherUserId
 * @param {string} operationType  - e.g. "Student Import", "Grade Export"
 * @param {number} recordsCount   - how many records were processed
 */
export const notifyTeacherBulkOperationCompleted = async (teacherUserId, operationType, recordsCount) => {
  const { title, message } = TEACHER_MESSAGES.SYSTEM.BULK_OPERATION_COMPLETED(operationType, recordsCount);

  await sendToUsers([teacherUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.SYSTEM, // 'system'
    related_id:        null,
    related_type:      'system',
  });
};

/**
 * Send when: admin posts an announcement targeted at teachers.
 *
 * Called by: Announcement service → instantBroadcast() for teacher audience.
 *
 * @param {number} teacherUserId
 * @param {number} announcementId
 * @param {string} announcementTitle
 */
export const notifyTeacherNewAdminAnnouncement = async (teacherUserId, announcementId, announcementTitle) => {
  const { title, message } = TEACHER_MESSAGES.SYSTEM.NEW_ADMIN_ANNOUNCEMENT(announcementTitle);

  await sendToUsers([teacherUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.ANNOUNCEMENT, // 'announcement'
    related_id:        announcementId,
    related_type:      'announcement',
  });
};

/**
 * Send when: admin schedules a system maintenance window.
 *
 * Called by: Admin panel → schedule maintenance action.
 *
 * @param {number} teacherUserId
 * @param {string} scheduledAt  - e.g. "15 Mar 2026, 02:00 AM – 04:00 AM"
 * @param {string} details      - e.g. "Database upgrade"
 */
export const notifyTeacherMaintenanceScheduled = async (teacherUserId, scheduledAt, details) => {
  const { title, message } = TEACHER_MESSAGES.SYSTEM.MAINTENANCE_SCHEDULED(scheduledAt, details);

  await sendToUsers([teacherUserId], {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.SYSTEM, // 'system'
    related_id:        null,
    related_type:      'system',
  });
};


// ============================================================
// SECTION 3: ADMIN NOTIFICATIONS
// ============================================================
// Admin notifications go to ALL active admins at once.
// We fetch all admin user_ids from DB and call sendToUsers().
//
// This means every admin gets alerted for important events —
// no admin is left out just because they are not logged in.
// ============================================================


// ── 3.1  User Management ─────────────────────────────────────────────────────

/**
 * Send when: a new teacher registers on the platform.
 * Notifies ALL admins so someone can act on the approval.
 *
 * Called by: Auth module after a new teacher signup is saved.
 *
 * @param {number} newTeacherUserId  - user_id of the new teacher
 * @param {string} teacherName       - full name of the teacher
 */
export const notifyAdminNewTeacherRegistration = async (newTeacherUserId, teacherName) => {
  // Get all admin user_ids from DB
  const adminUserIds = await getAllAdminUserIds();

  if (adminUserIds.length === 0) return; // No admins to notify

  const { title, message } = ADMIN_MESSAGES.USER.NEW_TEACHER_REGISTRATION(teacherName);

  await sendToUsers(adminUserIds, {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.SYSTEM, // 'system'
    related_id:        newTeacherUserId,
    related_type:      'user',
  });
};

/**
 * Send when: a teacher registration is still awaiting approval past a threshold.
 * Notifies ALL admins as a reminder.
 *
 * Called by: Admin reminder job — checks for old pending teacher registrations.
 *
 * @param {number} pendingTeacherUserId
 * @param {string} teacherName
 * @param {number} hoursPending  - how many hours since they registered
 */
export const notifyAdminTeacherApprovalRequired = async (pendingTeacherUserId, teacherName, hoursPending) => {
  const adminUserIds = await getAllAdminUserIds();

  if (adminUserIds.length === 0) return;

  const { title, message } = ADMIN_MESSAGES.USER.TEACHER_APPROVAL_REQUIRED(teacherName, hoursPending);

  await sendToUsers(adminUserIds, {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.SYSTEM, // 'system'
    related_id:        pendingTeacherUserId,
    related_type:      'user',
  });
};

/**
 * Send when: a new student registers on the platform.
 * Notifies ALL admins for visibility.
 *
 * Called by: Auth module after a new student signup is complete.
 *
 * @param {number} newStudentUserId
 * @param {string} studentName
 */
export const notifyAdminNewStudentRegistration = async (newStudentUserId, studentName) => {
  const adminUserIds = await getAllAdminUserIds();

  if (adminUserIds.length === 0) return;

  const { title, message } = ADMIN_MESSAGES.USER.NEW_STUDENT_REGISTRATION(studentName);

  await sendToUsers(adminUserIds, {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.SYSTEM, // 'system'
    related_id:        newStudentUserId,
    related_type:      'user',
  });
};

/**
 * Send when: security system detects suspicious activity on ANY account.
 * Notifies ALL admins immediately.
 *
 * Called by: Auth module / security monitoring service.
 *
 * @param {number} suspectedUserId  - user_id of the account with suspicious activity
 * @param {string} userName         - name of the user
 * @param {string} details          - e.g. "Multiple failed logins from different IPs"
 */
export const notifyAdminSuspiciousAccountActivity = async (suspectedUserId, userName, details) => {
  const adminUserIds = await getAllAdminUserIds();

  if (adminUserIds.length === 0) return;

  const { title, message } = ADMIN_MESSAGES.USER.SUSPICIOUS_ACCOUNT_ACTIVITY(userName, details);

  await sendToUsers(adminUserIds, {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.SYSTEM, // 'system'
    related_id:        suspectedUserId,
    related_type:      'security',
  });
};


// ── 3.2  Payments ─────────────────────────────────────────────────────────────

/**
 * Send when: a student raises a dispute on a payment.
 * Notifies ALL admins so someone can take action.
 *
 * Called by: Payment module when a dispute is filed.
 *
 * @param {number} paymentId
 * @param {number} amount
 * @param {string} studentName
 */
export const notifyAdminPaymentDisputeRaised = async (paymentId, amount, studentName) => {
  const adminUserIds = await getAllAdminUserIds();

  if (adminUserIds.length === 0) return;

  const { title, message } = ADMIN_MESSAGES.PAYMENT.DISPUTE_RAISED(studentName, amount, paymentId);

  await sendToUsers(adminUserIds, {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.PAYMENT, // 'payment'
    related_id:        paymentId,
    related_type:      'payment',
  });
};

/**
 * Send when: a payment above a large-amount threshold is made.
 * Notifies ALL admins for fraud monitoring.
 *
 * Called by: Payment module after webhook confirms a payment above the threshold.
 *
 * @param {number} paymentId
 * @param {number} amount
 * @param {string} studentName
 */
export const notifyAdminLargeTransactionAlert = async (paymentId, amount, studentName) => {
  const adminUserIds = await getAllAdminUserIds();

  if (adminUserIds.length === 0) return;

  const { title, message } = ADMIN_MESSAGES.PAYMENT.LARGE_TRANSACTION_ALERT(studentName, amount, paymentId);

  await sendToUsers(adminUserIds, {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.PAYMENT, // 'payment'
    related_id:        paymentId,
    related_type:      'payment',
  });
};


// ── 3.3  System Operations ────────────────────────────────────────────────────

/**
 * Send when: a large bulk data import finishes (success or partial failure).
 * Notifies ALL admins with a summary.
 *
 * Called by: Bulk import module after processing is complete.
 *
 * @param {string} importType    - e.g. "Student CSV Import", "Course Data Import"
 * @param {number} totalRecords  - total rows processed
 * @param {number} failedCount   - rows that failed
 */
export const notifyAdminBulkImportCompleted = async (importType, totalRecords, failedCount) => {
  const adminUserIds = await getAllAdminUserIds();

  if (adminUserIds.length === 0) return;

  const { title, message } = ADMIN_MESSAGES.SYSTEM.BULK_IMPORT_COMPLETED(importType, totalRecords, failedCount);

  await sendToUsers(adminUserIds, {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.SYSTEM, // 'system'
    related_id:        null,
    related_type:      'system',
  });
};

/**
 * Send when: a background scheduled job throws an error and fails to run.
 * Notifies ALL admins immediately — these are high priority.
 *
 * Called by: Job scheduler (scheduler.js) inside each job's catch block.
 *
 * @param {string} jobName      - e.g. "broadcastScheduledAnnouncements"
 * @param {string} errorMessage - the error that was thrown
 */
export const notifyAdminScheduledJobFailed = async (jobName, errorMessage) => {
  const adminUserIds = await getAllAdminUserIds();

  if (adminUserIds.length === 0) return;

  const { title, message } = ADMIN_MESSAGES.SYSTEM.SCHEDULED_JOB_FAILED(jobName, errorMessage);

  await sendToUsers(adminUserIds, {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.SYSTEM, // 'system'
    related_id:        null,
    related_type:      'system',
  });
};

/**
 * Send when: the platform catches an unexpected critical error.
 * Notifies ALL admins immediately.
 *
 * Called by: Global error handler or any critical try-catch block.
 *
 * @param {string} errorSummary  - short description of what went wrong
 * @param {string} location      - where it happened e.g. "Payment Webhook Handler"
 */
export const notifyAdminSystemErrorDetected = async (errorSummary, location) => {
  const adminUserIds = await getAllAdminUserIds();

  if (adminUserIds.length === 0) return;

  const { title, message } = ADMIN_MESSAGES.SYSTEM.ERROR_DETECTED(errorSummary, location);

  await sendToUsers(adminUserIds, {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.SYSTEM, // 'system'
    related_id:        null,
    related_type:      'system',
  });
};

/**
 * Send when: server CPU or memory crosses a critical threshold.
 * Notifies ALL admins — they may need to scale infrastructure.
 *
 * Called by: System health monitoring service.
 *
 * @param {number} cpuPercent  - current CPU usage e.g. 92
 * @param {string} details     - e.g. "Sustained for 5 minutes on Server 1"
 */
export const notifyAdminHighSystemLoad = async (cpuPercent, details) => {
  const adminUserIds = await getAllAdminUserIds();

  if (adminUserIds.length === 0) return;

  const { title, message } = ADMIN_MESSAGES.SYSTEM.HIGH_SYSTEM_LOAD(cpuPercent, details);

  await sendToUsers(adminUserIds, {
    title,
    message,
    notification_type: NOTIFICATION_TYPES.SYSTEM, // 'system'
    related_id:        null,
    related_type:      'system',
  });
};