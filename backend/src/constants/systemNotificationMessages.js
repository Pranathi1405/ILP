/**
 * src/constants/systemNotificationMessages.js
 * ==============================================
 * Central place for ALL system notification message templates.
 *
 * WHY THIS FILE EXISTS:
 *   Instead of writing title/message strings directly inside service
 *   functions, we keep them all here. This means:
 *     - Easy to find and update any message in one place
 *     - No "magic strings" scattered across service files
 *     - Consistent tone across the whole platform
 *
 * HOW IT WORKS:
 *   Each entry is a function that takes some data and returns
 *   an object with { title, message }.
 *
 *   Example usage in a service:
 *     import { STUDENT_MESSAGES } from '../constants/systemNotificationMessages.js';
 *     const { title, message } = STUDENT_MESSAGES.COURSE.ENROLLMENT(courseName);
 *
 * ORGANISATION:
 *   STUDENT_MESSAGES  → notifications sent TO students
 *   TEACHER_MESSAGES  → notifications sent TO teachers
 *   ADMIN_MESSAGES    → notifications sent TO admins
 *
 *   Each section is further split by category (Course, Test, etc.)
 *   to match the specification document exactly.
 */

// ============================================================
// STUDENT MESSAGES
// ============================================================

export const STUDENT_MESSAGES = {

  // ── Course Related ───────────────────────────────────────────────────────

  COURSE: {

    /**
     * Triggered when: student is enrolled in a course
     * @param {string} courseName
     */
    ENROLLMENT: (courseName) => ({
      title:   '🎓 Enrollment Confirmed!',
      message: `You have been successfully enrolled in "${courseName}". Head to My Courses to start learning!`,
    }),

    /**
     * Triggered when: a new course appears in the student's stream/feed
     * @param {string} courseName
     * @param {string} teacherName
     */
    NEW_COURSE_IN_STREAM: (courseName, teacherName) => ({
      title:   '📚 New Course Available',
      message: `A new course "${courseName}" by ${teacherName} has been added to your stream. Check it out!`,
    }),

    /**
     * Triggered when: admin manually assigns a course to a student
     * @param {string} courseName
     */
    ASSIGNED_BY_ADMIN: (courseName) => ({
      title:   '📋 Course Assigned to You',
      message: `An admin has assigned the course "${courseName}" to your account. You can start it now from My Courses.`,
    }),

    /**
     * Triggered when: teacher adds a new video/module/content to a course
     * @param {string} courseName
     * @param {string} moduleName
     */
    NEW_CONTENT_ADDED: (courseName, moduleName) => ({
      title:   '✨ New Content Added',
      message: `New content "${moduleName}" has been added to "${courseName}". Keep the momentum going!`,
    }),

    /**
     * Triggered when: student hasn't completed a course and a reminder is due
     * @param {string} courseName
     * @param {number} progressPercent  e.g. 65
     */
    COMPLETION_REMINDER: (courseName, progressPercent) => ({
      title:   '⏰ Don\'t Stop Now!',
      message: `You are ${progressPercent}% through "${courseName}". Keep going — you are almost there!`,
    }),

    /**
     * Triggered when: student completes 100% and certificate is generated
     * @param {string} courseName
     */
    CERTIFICATE_READY: (courseName) => ({
      title:   '🏆 Your Certificate is Ready!',
      message: `Congratulations! Your completion certificate for "${courseName}" is ready. Download it from My Certificates.`,
    }),
  },

  // ── Tests / Quizzes ──────────────────────────────────────────────────────

  TEST: {

    /**
     * Triggered when: a teacher schedules a new test for the course
     * @param {string} testTitle
     * @param {string} scheduledAt  human-readable datetime e.g. "12 Mar 2026, 10:00 AM"
     */
    SCHEDULED: (testTitle, scheduledAt) => ({
      title:   '📝 New Test Scheduled',
      message: `A new test "${testTitle}" has been scheduled for ${scheduledAt}. Make sure you are prepared!`,
    }),

    /**
     * Triggered when: X hours/days before the test deadline (configurable by caller)
     * @param {string} testTitle
     * @param {string} deadline  human-readable e.g. "12 Mar 2026, 11:59 PM"
     */
    REMINDER: (testTitle, deadline) => ({
      title:   '⏰ Test Reminder',
      message: `Reminder: "${testTitle}" is due on ${deadline}. Don't forget to complete it in time.`,
    }),

    /**
     * Triggered when: very close to deadline (e.g. 1 hour left)
     * @param {string} testTitle
     * @param {string} deadline
     */
    DEADLINE_APPROACHING: (testTitle, deadline) => ({
      title:   '🚨 Test Deadline Approaching!',
      message: `Hurry! The deadline for "${testTitle}" is ${deadline}. Submit before time runs out.`,
    }),

    /**
     * Triggered when: student successfully submits a test
     * @param {string} testTitle
     */
    SUBMISSION_SUCCESSFUL: (testTitle) => ({
      title:   '✅ Test Submitted Successfully',
      message: `Your submission for "${testTitle}" has been recorded. Results will be published once evaluated.`,
    }),

    /**
     * Triggered when: teacher/system publishes test results
     * @param {string} testTitle
     */
    RESULTS_PUBLISHED: (testTitle) => ({
      title:   '📊 Test Results Published',
      message: `Results for "${testTitle}" are now available. Check your performance in the Tests section.`,
    }),
  },

  // ── Live Classes ─────────────────────────────────────────────────────────

  LIVE_CLASS: {

    /**
     * Triggered when: teacher/admin schedules a new live class for a course
     * @param {string} classTitle
     * @param {string} scheduledAt  e.g. "12 Mar 2026, 03:00 PM"
     */
    SCHEDULED: (classTitle, scheduledAt) => ({
      title:   '🎥 Live Class Scheduled',
      message: `A live class "${classTitle}" has been scheduled for ${scheduledAt}. Add it to your calendar!`,
    }),

    /**
     * Triggered when: X minutes before the class starts (e.g. 15 min reminder)
     * @param {string} classTitle
     * @param {string} startsAt  e.g. "03:00 PM"
     */
    REMINDER: (classTitle, startsAt) => ({
      title:   '🔔 Live Class Starting Soon',
      message: `Your live class "${classTitle}" starts at ${startsAt}. Get ready and join on time!`,
    }),

    /**
     * Triggered when: teacher clicks "Start Class" — class goes live
     * @param {string} classTitle
     */
    STARTED: (classTitle) => ({
      title:   '🔴 Live Class Started!',
      message: `"${classTitle}" is now live! Join immediately so you don\'t miss anything.`,
    }),

    /**
     * Triggered when: teacher ends the class session
     * @param {string} classTitle
     */
    ENDED: (classTitle) => ({
      title:   '✅ Live Class Ended',
      message: `"${classTitle}" has ended. Thank you for attending! A recording will be available shortly.`,
    }),

    /**
     * Triggered when: the class recording is processed and uploaded
     * @param {string} classTitle
     */
    RECORDING_AVAILABLE: (classTitle) => ({
      title:   '🎬 Recording Now Available',
      message: `The recording of "${classTitle}" is ready to watch. Find it under Live Classes → Recordings.`,
    }),
  },

  // ── Doubts / Discussions ─────────────────────────────────────────────────

  DOUBT: {

    /**
     * Triggered when: student's doubt is saved successfully
     * @param {string} questionTitle  short summary of the question
     */
    POSTED_SUCCESSFULLY: (questionTitle) => ({
      title:   '💬 Doubt Posted Successfully',
      message: `Your doubt "${questionTitle}" has been posted. A teacher will respond shortly.`,
    }),

    /**
     * Triggered when: teacher marks a doubt as answered
     * @param {string} questionTitle
     * @param {string} teacherName
     */
    ANSWERED_BY_TEACHER: (questionTitle, teacherName) => ({
      title:   '✅ Your Doubt Was Answered',
      message: `${teacherName} has answered your doubt "${questionTitle}". Check the response in Doubts & Discussions.`,
    }),

    /**
     * Triggered when: someone adds a reply to a thread the student is part of
     * @param {string} questionTitle
     */
    REPLY_ADDED: (questionTitle) => ({
      title:   '💬 New Reply in Discussion',
      message: `A new reply has been added to the thread "${questionTitle}". Join the discussion!`,
    }),
  },

  // ── Achievements & Progress ──────────────────────────────────────────────

  ACHIEVEMENT: {

    /**
     * Triggered when: student earns a badge or achievement
     * @param {string} achievementName  e.g. "Fast Learner", "Quiz Master"
     */
    BADGE_EARNED: (achievementName) => ({
      title:   '🏅 Achievement Unlocked!',
      message: `Congratulations! You earned the "${achievementName}" badge. Keep up the great work!`,
    }),

    /**
     * Triggered when: student hits a learning milestone (e.g. 10 hours studied)
     * @param {string} milestone  e.g. "10 hours of learning", "5 courses started"
     */
    LEARNING_MILESTONE: (milestone) => ({
      title:   '🌟 Learning Milestone Reached!',
      message: `You just hit a major milestone: ${milestone}. You are on a roll!`,
    }),

    /**
     * Triggered when: student reaches a progress checkpoint in a course (e.g. 50%)
     * @param {string} courseName
     * @param {number} percent  e.g. 50
     */
    COURSE_PROGRESS_MILESTONE: (courseName, percent) => ({
      title:   `📈 ${percent}% Complete!`,
      message: `You have completed ${percent}% of "${courseName}". Keep going — the finish line is in sight!`,
    }),
  },

  // ── Payments / Subscriptions ─────────────────────────────────────────────

  PAYMENT: {

    /**
     * Triggered when: Razorpay/payment gateway confirms success
     * @param {number} amount   e.g. 2999
     * @param {string} courseName
     */
    SUCCESSFUL: (amount, courseName) => ({
      title:   '🎉 Payment Successful!',
      message: `Your payment of ₹${amount} for "${courseName}" was successful. You now have full access!`,
    }),

    /**
     * Triggered when: payment gateway returns a failure
     * @param {number} amount
     * @param {string} courseName
     */
    FAILED: (amount, courseName) => ({
      title:   '❌ Payment Failed',
      message: `Your payment of ₹${amount} for "${courseName}" could not be processed. Please try again or use a different payment method.`,
    }),

    /**
     * Triggered when: payment is initiated but not yet confirmed
     * @param {number} amount
     * @param {string} courseName
     */
    PENDING: (amount, courseName) => ({
      title:   '⏳ Payment Pending',
      message: `Your payment of ₹${amount} for "${courseName}" is being processed. We will notify you once confirmed.`,
    }),

    /**
     * Triggered when: student's subscription plan is activated
     * @param {string} planName    e.g. "Pro Plan", "Annual Bundle"
     * @param {string} validUntil  human-readable e.g. "31 Mar 2027"
     */
    SUBSCRIPTION_ACTIVATED: (planName, validUntil) => ({
      title:   '⭐ Subscription Activated!',
      message: `Your "${planName}" subscription is now active and valid until ${validUntil}. Enjoy unlimited access!`,
    }),
  },

  // ── System / General ─────────────────────────────────────────────────────

  SYSTEM: {

    /**
     * Triggered when: admin broadcasts a new announcement
     * @param {string} announcementTitle
     */
    NEW_ANNOUNCEMENT: (announcementTitle) => ({
      title:   '📢 New Announcement',
      message: `A new announcement has been posted: "${announcementTitle}". Check the Announcements section for details.`,
    }),

    /**
     * Triggered when: student updates their profile (name, photo, etc.)
     */
    PROFILE_UPDATED: () => ({
      title:   '✅ Profile Updated Successfully',
      message: 'Your profile has been updated successfully. If you did not make this change, please contact support immediately.',
    }),

    /**
     * Triggered when: suspicious login or unusual account activity is detected
     * @param {string} alertMessage  e.g. "Login from a new device in Mumbai"
     */
    SECURITY_ALERT: (alertMessage) => ({
      title:   '⚠️ Account Security Alert',
      message: `Security notice: ${alertMessage}. If this was not you, please change your password immediately.`,
    }),

    /**
     * Triggered when: student successfully changes their password
     */
    PASSWORD_CHANGED: () => ({
      title:   '🔐 Password Changed Successfully',
      message: 'Your password has been changed successfully. If you did not do this, contact support right away.',
    }),
  },
};


// ============================================================
// TEACHER MESSAGES
// ============================================================

export const TEACHER_MESSAGES = {

  // ── Account / Admin Actions ──────────────────────────────────────────────

  ACCOUNT: {

    /**
     * Triggered when: teacher registers — they need to wait for admin approval
     */
    REGISTRATION_PENDING: () => ({
      title:   '⏳ Registration Under Review',
      message: 'Your teacher registration has been received and is currently being reviewed by our team. You will be notified once approved.',
    }),

    /**
     * Triggered when: admin approves a teacher's account
     */
    APPROVED: () => ({
      title:   '🎉 Your Account Has Been Approved!',
      message: 'Congratulations! Your teacher account has been approved. You can now log in and start setting up your courses.',
    }),

    /**
     * Triggered when: admin rejects a teacher's account
     * @param {string} reason  reason for rejection (optional but helpful)
     */
    REJECTED: (reason) => ({
      title:   '❌ Account Application Not Approved',
      message: reason
        ? `We are sorry, your teacher account application was not approved. Reason: ${reason}. Please contact support for more information.`
        : 'We are sorry, your teacher account application was not approved. Please contact support for more information.',
    }),

    /**
     * Triggered when: admin assigns a subject to the teacher
     * @param {string} subjectName
     */
    SUBJECT_ASSIGNED: (subjectName) => ({
      title:   '📚 Subject Assigned to You',
      message: `The subject "${subjectName}" has been assigned to you by the admin. You can now create courses under this subject.`,
    }),

    /**
     * Triggered when: admin assigns an existing course to the teacher
     * @param {string} courseName
     */
    COURSE_ASSIGNED: (courseName) => ({
      title:   '📋 Course Assigned to You',
      message: `The course "${courseName}" has been assigned to you. Log in to the Teacher Dashboard to manage it.`,
    }),
  },

  // ── Doubts / Questions ───────────────────────────────────────────────────

  DOUBT: {

    /**
     * Triggered when: a student in the teacher's course posts a new doubt
     * @param {string} studentName
     * @param {string} questionTitle
     * @param {string} courseName
     */
    NEW_DOUBT_POSTED: (studentName, questionTitle, courseName) => ({
      title:   '❓ New Doubt Posted',
      message: `${studentName} posted a new doubt in "${courseName}": "${questionTitle}". Please respond at your earliest.`,
    }),

    /**
     * Triggered when: a doubt is about to hit its response deadline
     * @param {string} questionTitle
     * @param {string} deadline  e.g. "Today at 11:59 PM"
     */
    DEADLINE_APPROACHING: (questionTitle, deadline) => ({
      title:   '⏰ Doubt Response Deadline Approaching',
      message: `You have not yet answered "${questionTitle}" and the deadline is ${deadline}. Please respond soon.`,
    }),

    /**
     * Triggered when: a doubt has been open and unresolved for a long time
     * @param {string} questionTitle
     * @param {number} daysPending  e.g. 5
     */
    UNRESOLVED_LONG_TIME: (questionTitle, daysPending) => ({
      title:   '⚠️ Unresolved Doubt Alert',
      message: `The doubt "${questionTitle}" has been waiting for a response for ${daysPending} day(s). Please reply as soon as possible.`,
    }),

    /**
     * Triggered when: student marks their doubt as resolved/closed
     * @param {string} questionTitle
     * @param {string} studentName
     */
    CLOSED_BY_STUDENT: (questionTitle, studentName) => ({
      title:   '✅ Doubt Closed by Student',
      message: `${studentName} has marked the doubt "${questionTitle}" as resolved. No further action is needed.`,
    }),
  },

  // ── Tests / Assessments ──────────────────────────────────────────────────

  TEST: {

    /**
     * Triggered when: the submission window for a test closes
     * @param {string} testTitle
     * @param {string} courseName
     */
    SUBMISSION_DEADLINE_REACHED: (testTitle, courseName) => ({
      title:   '📋 Test Submission Window Closed',
      message: `The submission deadline for "${testTitle}" in "${courseName}" has been reached. You can now review submissions.`,
    }),

    /**
     * Triggered when: the system detects unusual/suspicious activity during a test
     * @param {string} testTitle
     * @param {string} studentName
     */
    SUSPICIOUS_ACTIVITY: (testTitle, studentName) => ({
      title:   '🚨 Suspicious Test Activity Detected',
      message: `Unusual activity was detected for ${studentName} during "${testTitle}". Please review the submission immediately.`,
    }),
  },

  // ── Live Classes ─────────────────────────────────────────────────────────

  LIVE_CLASS: {

    /**
     * Triggered when: a live class is scheduled for the teacher's course
     * @param {string} classTitle
     * @param {string} scheduledAt  e.g. "12 Mar 2026, 03:00 PM"
     */
    SCHEDULED: (classTitle, scheduledAt) => ({
      title:   '📅 Live Class Scheduled',
      message: `A live class "${classTitle}" has been scheduled for ${scheduledAt}. Prepare your materials in advance.`,
    }),

    /**
     * Triggered when: X minutes before the class starts
     * @param {string} classTitle
     * @param {string} startsAt  e.g. "03:00 PM"
     */
    REMINDER: (classTitle, startsAt) => ({
      title:   '🔔 Live Class Reminder',
      message: `Your live class "${classTitle}" starts at ${startsAt}. Students are waiting — make sure you are ready to go live!`,
    }),

    
  },

  // ── System / Admin ───────────────────────────────────────────────────────

  SYSTEM: {

    /**
     * Triggered when: a large bulk operation the teacher initiated is complete
     * @param {string} operationType  e.g. "Student Import", "Grade Export"
     * @param {number} recordsCount   e.g. 150
     */
    BULK_OPERATION_COMPLETED: (operationType, recordsCount) => ({
      title:   '✅ Bulk Operation Completed',
      message: `Your bulk operation "${operationType}" has been completed successfully. ${recordsCount} records were processed.`,
    }),

    /**
     * Triggered when: admin posts an announcement targeted at teachers
     * @param {string} announcementTitle
     */
    NEW_ADMIN_ANNOUNCEMENT: (announcementTitle) => ({
      title:   '📢 New Admin Announcement',
      message: `Admin posted a new announcement: "${announcementTitle}". Please read it in the Announcements section.`,
    }),

    /**
     * Triggered when: admin schedules system maintenance
     * @param {string} scheduledAt  e.g. "15 Mar 2026, 02:00 AM – 04:00 AM"
     * @param {string} details      e.g. "Database upgrade"
     */
    MAINTENANCE_SCHEDULED: (scheduledAt, details) => ({
      title:   '🔧 Scheduled System Maintenance',
      message: `The platform will undergo maintenance on ${scheduledAt}. Reason: ${details}. Please save your work beforehand.`,
    }),
  },
};


// ============================================================
// ADMIN MESSAGES
// ============================================================

export const ADMIN_MESSAGES = {

  // ── User Management ──────────────────────────────────────────────────────

  USER: {

    /**
     * Triggered when: a new teacher registers on the platform
     * @param {string} teacherName
     */
    NEW_TEACHER_REGISTRATION: (teacherName) => ({
      title:   '👤 New Teacher Registration',
      message: `${teacherName} has submitted a teacher registration request. Please review and approve or reject from the Admin Panel.`,
    }),

    /**
     * Triggered when: a teacher registration is still pending after a threshold
     * @param {string} teacherName
     * @param {number} hoursPending  e.g. 48
     */
    TEACHER_APPROVAL_REQUIRED: (teacherName, hoursPending) => ({
      title:   '⚠️ Teacher Approval Pending',
      message: `${teacherName}'s teacher registration has been waiting for approval for ${hoursPending} hour(s). Please action it now.`,
    }),

    /**
     * Triggered when: a new student registers on the platform
     * @param {string} studentName
     */
    NEW_STUDENT_REGISTRATION: (studentName) => ({
      title:   '🎓 New Student Registered',
      message: `${studentName} has just registered as a new student. You can view the account details in User Management.`,
    }),

    /**
     * Triggered when: suspicious activity is detected on any account
     * @param {string} userName
     * @param {string} details  e.g. "Multiple failed logins from different IPs"
     */
    SUSPICIOUS_ACCOUNT_ACTIVITY: (userName, details) => ({
      title:   '🚨 Suspicious Account Activity',
      message: `Suspicious activity detected on the account of ${userName}: ${details}. Please review and take action immediately.`,
    }),
  },

  // ── Payments ─────────────────────────────────────────────────────────────

  PAYMENT: {

    /**
     * Triggered when: a student raises a payment dispute
     * @param {string} studentName
     * @param {number} amount
     * @param {string} paymentId
     */
    DISPUTE_RAISED: (studentName, amount, paymentId) => ({
      title:   '⚠️ Payment Dispute Raised',
      message: `${studentName} has raised a dispute for payment ID #${paymentId} of ₹${amount}. Please review and resolve it promptly.`,
    }),

    /**
     * Triggered when: a payment above a set threshold is made
     * @param {string} studentName
     * @param {number} amount
     * @param {string} paymentId
     */
    LARGE_TRANSACTION_ALERT: (studentName, amount, paymentId) => ({
      title:   '💰 Large Transaction Alert',
      message: `A large transaction of ₹${amount} was made by ${studentName} (Payment ID: #${paymentId}). Verify if this looks correct.`,
    }),
  },

  // ── System Operations ────────────────────────────────────────────────────

  SYSTEM: {

    /**
     * Triggered when: a bulk data import (users, courses, etc.) finishes
     * @param {string} importType   e.g. "Student CSV Import"
     * @param {number} totalRecords  e.g. 500
     * @param {number} failedCount   e.g. 12
     */
    BULK_IMPORT_COMPLETED: (importType, totalRecords, failedCount) => ({
      title:   '📦 Bulk Import Completed',
      message: `Bulk import "${importType}" finished. Total: ${totalRecords} records. Failed: ${failedCount}. Check the import log for details.`,
    }),

    /**
     * Triggered when: a background job (scheduler) fails to execute
     * @param {string} jobName      e.g. "broadcastScheduledAnnouncements"
     * @param {string} errorMessage  the error thrown
     */
    SCHEDULED_JOB_FAILED: (jobName, errorMessage) => ({
      title:   '🚨 Scheduled Job Failed',
      message: `The background job "${jobName}" failed to run. Error: ${errorMessage}. Immediate investigation required.`,
    }),

    /**
     * Triggered when: the platform catches an unexpected system error
     * @param {string} errorSummary  short description of the error
     * @param {string} location      where it happened, e.g. "Payment Webhook Handler"
     */
    ERROR_DETECTED: (errorSummary, location) => ({
      title:   '🔴 System Error Detected',
      message: `A system error occurred in "${location}": ${errorSummary}. Please check the server logs immediately.`,
    }),

    /**
     * Triggered when: CPU/memory usage crosses a critical threshold
     * @param {number} cpuPercent   e.g. 92
     * @param {string} details      e.g. "Sustained for 5 minutes on Server 1"
     */
    HIGH_SYSTEM_LOAD: (cpuPercent, details) => ({
      title:   '⚡ High System Load Alert',
      message: `System load has reached ${cpuPercent}%. Details: ${details}. Please investigate and scale resources if needed.`,
    }),
  },
};