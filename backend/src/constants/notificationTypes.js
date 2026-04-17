/**
 * AUTHORS: Harshitha Ravuri,
 * Notification Types
 * These values match exactly with the DB ENUM in the `notifications` table.
 * Do NOT change these unless you also update the DB schema.
 *
 * DB ENUM: 'course','quiz','test','assignment','chat','system','achievement','payment','live_class','doubt'
 */

export const NOTIFICATION_TYPES = {
  COURSE: 'course',           // Course updates, enrollment confirmations
  QUIZ: 'quiz',               // Quiz reminders, results()
  TEST: 'test',               // Test generation, results
  ASSIGNMENT: 'assignment',   // Assignment due dates, submissions
  CHAT: 'chat',               // Chat messages
  SYSTEM: 'system',           // System alerts, OTP, maintenance
  ACHIEVEMENT: 'achievement', // Performance milestones, badges
  PAYMENT: 'payment',         // Payment success, failure, reminders
  LIVE_CLASS: 'live_class',   // Class reminders, class started
  DOUBT: 'doubt',             // Doubt answered, pending
  TEACHER_NOTIFICATION: 'teacher_notification', // Teacher manually sent this
  ANNOUNCEMENT:         'announcement',          // Broadcast from admin announcement
  ENROLLMENT:           'enrollment',            // Student enrolled in a course
};

// Array of all valid notification type values (useful for validation)
export const VALID_NOTIFICATION_TYPES = Object.values(NOTIFICATION_TYPES);
