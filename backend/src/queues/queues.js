/**
 * src/queues/queues.js
 * ======================
 * Central place where ALL queues are defined.
 *
 * WHAT IS A QUEUE?
 *   A queue is like a to-do list stored in Redis.
 *   Your app adds jobs to the list.
 *   Workers pick jobs off the list and do the actual work.
 *
 * WHY QUEUES INSTEAD OF DOING WORK INLINE?
 *   Without queues (old way):
 *     API request → insert 5000 DB rows → emit WebSocket → send push → respond
 *     The HTTP request is blocked for seconds. If anything crashes, the work is lost.
 *
 *   With queues (new way):
 *     API request → add job to queue → respond immediately (milliseconds)
 *     Worker picks up job → insert DB rows → emit WebSocket → send push
 *     If it crashes mid-way, BullMQ retries automatically.
 *
 * QUEUES IN THIS FILE:
 *
 *   1. notification-delivery
 *      Used for: Delivering notifications to users
 *      Job data: { userIds: [...], payload: { title, message, ... } }
 *      Worker:   src/queues/workers/notification.worker.js
 *
 *   2. recurring-jobs
 *      Used for: Running the 3 background jobs that used to run via setInterval
 *      Jobs:     CHECK_SCHEDULED_ANNOUNCEMENTS, EXPIRE_ANNOUNCEMENTS,
 *                SEND_PENDING_TEACHER_NOTIFICATIONS
 *      Worker:   src/queues/workers/recurring.worker.js
 */

import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.config.js';

// Feature flag
const QUEUES_ENABLED = process.env.ENABLE_QUEUES === 'true';


// ─────────────────────────────────────────────────────────────────────────────
// QUEUE 1: Notification Delivery
// ─────────────────────────────────────────────────────────────────────────────

let notificationDeliveryQueue = null;

if (QUEUES_ENABLED) {
  notificationDeliveryQueue = new Queue('notification-delivery', {
    connection: redisConnection,

    defaultJobOptions: {
      attempts: 3,

      backoff: {
        type: 'exponential',
        delay: 2000,
      },

      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// QUEUE 2: Recurring Jobs
// ─────────────────────────────────────────────────────────────────────────────

let recurringJobsQueue = null;

if (QUEUES_ENABLED) {
  recurringJobsQueue = new Queue('recurring-jobs', {
    connection: redisConnection,

    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { count: 5 },
      removeOnFail: { count: 20 },
    },
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// JOB NAMES
// ─────────────────────────────────────────────────────────────────────────────

export const JOB_NAMES = {
  SEND_BATCH: 'SEND_BATCH',

  CHECK_SCHEDULED_ANNOUNCEMENTS: 'CHECK_SCHEDULED_ANNOUNCEMENTS',
  EXPIRE_ANNOUNCEMENTS: 'EXPIRE_ANNOUNCEMENTS',
  SEND_PENDING_TEACHER_NOTIFICATIONS: 'SEND_PENDING_TEACHER_NOTIFICATIONS',
};


// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Add notification delivery job
// ─────────────────────────────────────────────────────────────────────────────

export const queueNotificationDelivery = async (userIds, payload) => {

  if (!QUEUES_ENABLED) {
    console.warn('Queues disabled — job not added');
    return {
      id: null,
      disabled: true,
    };
  }

  const job = await notificationDeliveryQueue.add(
    JOB_NAMES.SEND_BATCH,
    { userIds, payload }
  );

  return job;
};


// Export queues (may be null if disabled)
export {
  notificationDeliveryQueue,
  recurringJobsQueue
};