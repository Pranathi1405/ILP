/** 
 * Author: Harshitha Ravuri
 * Announcement Target Audience
 * These match the DB ENUM in the `announcements` table.
 * target_audience ENUM: 'all','students','teachers','parents','specific_course'
 */
// ─────────────────────────────────────────────────────────────────────────────
// ANNOUNCEMENT LIFECYCLE STATUSES
// ─────────────────────────────────────────────────────────────────────────────
//
//  Admin creates →
//    with no start_date           → 'draft'       (saved, not sent)
//    with future start_date       → 'scheduled'   (background job sends it)
//    instant broadcast call       → 'broadcasted' (sent immediately)
//    After broadcast →
//    admin edits content          → 'edited'
//    admin disables / end_date    → 'deactivated'

export const ANNOUNCEMENT_STATUS = {
  DRAFT:       'draft',       // Created but not sent to anyone
  SCHEDULED:   'scheduled',   // Queued — background job fires at start_date
  BROADCASTED: 'broadcasted', // Notifications already sent to users
  EDITED:      'edited',      // Content changed after it was broadcasted
  DEACTIVATED: 'deactivated', // Disabled manually or expired by end_date
};

export const VALID_ANNOUNCEMENT_STATUSES = Object.values(ANNOUNCEMENT_STATUS);

// ─────────────────────────────────────────────────────────────────────────────
// TARGET AUDIENCES
// ─────────────────────────────────────────────────────────────────────────────
//
//  all_users       → every active user (students + teachers + parents + admins)
//  all_students    → only users with user_type = 'student'
//  course_students → students enrolled in one specific course (needs course_id)
//  teachers        → only users with user_type = 'teacher'
//  parents         → only users with user_type = 'parent'

export const TARGET_AUDIENCES = {
  ALL_USERS:       'all_users',
  ALL_STUDENTS:    'all_students',
  COURSE_STUDENTS: 'course_students',
  TEACHERS:        'teachers',
  PARENTS:         'parents',
};

export const VALID_TARGET_AUDIENCES = Object.values(TARGET_AUDIENCES);

// ─────────────────────────────────────────────────────────────────────────────
// PRIORITY LEVELS
// ─────────────────────────────────────────────────────────────────────────────

export const PRIORITIES = {
  LOW:    'low',
  MEDIUM: 'medium',
  HIGH:   'high',
};

export const VALID_PRIORITIES = Object.values(PRIORITIES);










