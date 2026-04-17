/* AUthors: Harshitha Ravuri,
// ============================================================
// analyticsTypes.js
// All event names and constants used by the analytics system
// ============================================================

/**
 * ANALYTICS EVENTS
 * These are the names of events that trigger analytics updates.
 * When something important happens (e.g., a student submits a test),
 * we emit one of these events to update the analytics tables.
 */
export const ANALYTICS_EVENTS = {
  // ── Test lifecycle ──────────────────────────────────────────
  TEST_SUBMITTED:               'TEST_SUBMITTED',
  UPDATE_STUDENT_SCORE_TREND:   'UPDATE_STUDENT_SCORE_TREND',
 
  // ── User & auth ─────────────────────────────────────────────
  USER_REGISTERED:              'USER_REGISTERED',
 
  // ── Course lifecycle ────────────────────────────────────────
  COURSE_ENROLLED:              'COURSE_ENROLLED',
  COURSE_COMPLETED:             'COURSE_COMPLETED',
  MODULE_COMPLETED:             'MODULE_COMPLETED',
  SUBJECT_COMPLETED:            'SUBJECT_COMPLETED',
 
  // ── Content consumption ─────────────────────────────────────
  VIDEO_WATCHED:                'VIDEO_WATCHED',
  CONTENT_CONSUMED:             'CONTENT_CONSUMED',
  STUDENT_ACTIVITY:             'STUDENT_ACTIVITY',
 
  // ── Live classes ────────────────────────────────────────────
  LIVE_CLASS_JOINED:            'LIVE_CLASS_JOINED',
  LIVE_CLASS_LEFT:              'LIVE_CLASS_LEFT',
 
  // ── Payments ────────────────────────────────────────────────
  PAYMENT_SUCCESS:              'PAYMENT_SUCCESS',
 
  // ── Doubts ──────────────────────────────────────────────────
  DOUBT_CREATED:                'DOUBT_CREATED',
  DOUBT_RESOLVED:               'DOUBT_RESOLVED',
 
  // ── Parent analytics refresh ────────────────────────────────
  UPDATE_PARENT_ANALYTICS:      'UPDATE_PARENT_ANALYTICS',
 
  // ─────────────────────────────────────────────────────────────────────────
  // NEW EVENTS (added as part of unified event-driven enhancement)
  // ─────────────────────────────────────────────────────────────────────────
 
  // ── Learning funnel ─────────────────────────────────────────
  COURSE_STARTED:               'COURSE_STARTED',       // first video/module opened
  COURSE_VIEWED:                'COURSE_VIEWED',        // course detail page viewed
  MODULE_STARTED:               'MODULE_STARTED',
  SUBJECT_STARTED:              'SUBJECT_STARTED',
 
  // ── Video funnel ────────────────────────────────────────────
  VIDEO_STARTED:                'VIDEO_STARTED',
  VIDEO_PROGRESS:               'VIDEO_PROGRESS',       // periodic progress ping
  VIDEO_PAUSED:                 'VIDEO_PAUSED',
  VIDEO_COMPLETED:              'VIDEO_COMPLETED',
 
  // ── Test funnel ─────────────────────────────────────────────
  TEST_STARTED:                 'TEST_STARTED',
  TEST_ABANDONED:               'TEST_ABANDONED',
 
  // ── Payment funnel ──────────────────────────────────────────
  PAYMENT_INITIATED:            'PAYMENT_INITIATED',
  PAYMENT_FAILED:               'PAYMENT_FAILED',
 
  // ── User session ────────────────────────────────────────────
  USER_LOGGED_IN:               'USER_LOGGED_IN',
  SESSION_STARTED:              'SESSION_STARTED',
  SESSION_ENDED:                'SESSION_ENDED',
 
  // ── Discovery ───────────────────────────────────────────────
  SEARCH_PERFORMED:             'SEARCH_PERFORMED',
  FILTER_APPLIED:               'FILTER_APPLIED',
 
  // ── Doubt funnel ────────────────────────────────────────────
  DOUBT_ASSIGNED:               'DOUBT_ASSIGNED',
 
  // ── Gamification ────────────────────────────────────────────
  POINTS_UPDATED:               'POINTS_UPDATED',
  BADGE_EARNED:                 'BADGE_EARNED',
  RANK_UPDATED:                 'RANK_UPDATED',
};
 
// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM SOURCES — used for the unified ingestion endpoint
// ─────────────────────────────────────────────────────────────────────────────
 
export const EVENT_PLATFORMS = ['web', 'android', 'ios', 'server'];
 
// Set of all valid event types (used for fast O(1) validation in the validator)
export const VALID_EVENT_TYPES = new Set(Object.values(ANALYTICS_EVENTS));

/**
 * MASTERY LEVELS
 * Used in topic_mastery_analytics table.
 * Based on student's average score in a topic:
 *   - WEAK:    avg_score < 40
 *   - AVERAGE: avg_score 40–74
 *   - STRONG:  avg_score >= 75
 */
export const MASTERY_LEVELS = {
  WEAK:    'WEAK',
  AVERAGE: 'AVERAGE',
  STRONG:  'STRONG',
};

/**
 * CRON JOB SCHEDULES
 * How often each cron job runs.
 * Uses standard cron syntax: 'minute hour day month weekday'
 */
export const CRON_SCHEDULES = {
  LEADERBOARD_RECOMPUTE:        '0 2 * * *',   // Every day at 2:00 AM
  REVENUE_AGGREGATION:          '0 3 * * *',   // Every day at 3:00 AM
  DROPOUT_DETECTION:            '0 4 * * *',   // Every day at 4:00 AM
  INACTIVE_INSTRUCTOR_DETECTION:'0 5 * * 1',   // Every Monday at 5:00 AM
  PARENT_ANALYTICS_RECOMPUTE:    '0 2 * * *',  // Every day at 2:00 AM (can be same as leaderboard)
};

/**
 * QUEUE NAMES
 * Name of the Bull queue used for analytics updates.
 */
export const QUEUE_NAMES = {
  ANALYTICS: 'analyticsQueue',
};

/**
 * MASTERY THRESHOLDS
 * Score cutoffs used to determine mastery level.
 */
export const MASTERY_THRESHOLDS = {
  WEAK_MAX:    39,   // 0–39 = WEAK
  AVERAGE_MAX: 74,   // 40–74 = AVERAGE
                     // 75–100 = STRONG
};

/**
 * INACTIVE DAYS LIMIT
 * An instructor is considered inactive if they haven't
 * conducted a class in this many days.
 */
export const INACTIVE_INSTRUCTOR_DAYS = 30;

/**
 * DATE RANGE OPTIONS
 * Used by admin user-growth endpoint.
 */
export const DATE_RANGES = {
  SEVEN_DAYS:    '7d',
  THIRTY_DAYS:   '30d',
  TWELVE_MONTHS: '12m',
};