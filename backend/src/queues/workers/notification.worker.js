/**
 * src/queues/workers/notification.worker.js
 * ============================================
 * This worker processes jobs from the "notification-delivery" queue.
 *
 * WHAT IS A WORKER?
 *   A worker is a function that runs in the background.
 *   It listens to the queue and picks up jobs one by one.
 *   When it picks a job, it does the actual work.
 *
 * WHAT THIS WORKER DOES:
 *   It handles the SEND_BATCH job, which contains:
 *     - userIds:  array of user_ids to notify
 *     - payload:  { title, message, notification_type, related_id, related_type }
 *
 *   For each job, it:
 *     1. Builds one notification row per user
 *     2. Batch-inserts them into the DB (in chunks of 500)
 *     3. Emits a WebSocket event to each online user
 *     4. Checks push preferences and sends push to eligible users
 *
 *
 * HOW RETRIES WORK:
 *   If this worker throws an error, BullMQ retries it automatically
 *   (up to 3 times with exponential backoff, as configured in queues.js).
 *   This means even if the DB is briefly down, the job will be retried.
 */

import { Worker } from 'bullmq';

import { redisConnection }           from '../../config/redis.config.js';
import * as NotificationModel        from '../../models/notification.model.js';
import * as PreferenceModel          from '../../models/notificationPreference.model.js';
import { emitNotificationToMany }    from '../../websockets/handlers/notification.handler.js';
import { DELIVERY_METHODS }          from '../../constants/deliveryMethods.js';
import { JOB_NAMES }                 from '../queues.js';

// ─────────────────────────────────────────────────────────────────────────────
// PUSH PREFERENCE CHECK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a user has push notifications enabled for a given type.
 * If no preference row exists in the DB, the default is: push enabled.
 *
 * @param {number} userId
 * @param {string} notificationType
 * @returns {boolean}
 */
const isUserPushEnabled = async (userId, notificationType) => {
  const pref = await PreferenceModel.findPreferenceByUserAndType(userId, notificationType);

  // No row in DB means user has never changed their settings → use default (enabled)
  if (!pref) return true;

  // mysql2 returns BOOLEAN columns as 0/1, so check both
  return pref.push_enabled === 1 || pref.push_enabled === true;
};


/**
 * Placeholder for the actual push notification SDK.
 * Replace this with Firebase Cloud Messaging (FCM) when ready.
 *
 * @param {Array<number>} userIds
 * @param {Object}        payload
 */
const sendPushNotifications = async (userIds, payload) => {
  // TODO: Integrate Firebase Cloud Messaging (FCM) here
  // Example:
  //   const tokens = await getFCMTokensForUsers(userIds);
  //   await fcmAdmin.sendMulticast({ tokens, notification: { title: payload.title, body: payload.message } });

  console.log(`[NotificationWorker] 📲 Push triggered for ${userIds.length} user(s): "${payload.title}"`);
};


// ─────────────────────────────────────────────────────────────────────────────
// JOB PROCESSOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process one SEND_BATCH job.
 * This function is called by BullMQ automatically when a job is available.
 *
 * @param {Job} job - BullMQ Job object
 *   job.data = { userIds: [...], payload: { title, message, notification_type, ... } }
 */
const processSendBatch = async (job) => {
  const { userIds, payload } = job.data;
   console.log("🔥 Worker Payload:", payload);
  console.log(`[NotificationWorker] Job #${job.id} — Sending to ${userIds.length} user(s): "${payload.title}"`);

  // ── Step 1: Build one notification row per user ──────────────────────────
  //
  // We map over userIds to create an array of objects.
  // Each object becomes one row in the notifications table.

  const notificationsToInsert = userIds.map((userId) => ({
  user_id:           userId,
  title:             payload.title,
  message:           payload.message,
  notification_type: payload.notification_type,
  related_id:        payload.related_id   || null,
  related_type:      payload.related_type || null,
  delivery_method:   DELIVERY_METHODS.IN_APP,
  created_by:        payload.created_by || null, 
}));

  // ── Step 2: Batch insert into DB (model handles chunking into 500s) ──────

  await NotificationModel.insertNotificationsBatch(notificationsToInsert);

  // ── Step 3: Emit WebSocket event to all users instantly ──────────────────
  //
  // Users who are online right now will see the notification appear
  // immediately in their browser without refreshing.
  // Users who are offline will see it the next time they load the app
  // (because the row is already in the DB).

  emitNotificationToMany(userIds, {
  title:             payload.title,
  message:           payload.message,
  notification_type: payload.notification_type,
  related_id:        payload.related_id   || null,
  related_type:      payload.related_type || null,
  created_by:        payload.created_by || null,
  is_read:           false,
  created_at:        new Date().toISOString(),
});

  // ── Step 4: Check push preferences and send to eligible users ────────────
  //
  // We check each user's preference in parallel (Promise.all is faster
  // than checking one-by-one in a loop).

  const pushEligibilityChecks = userIds.map((uid) =>
    isUserPushEnabled(uid, payload.notification_type)
  );
  const eligibilityResults = await Promise.all(pushEligibilityChecks);

  // Filter to only users who have push enabled
  const pushEligibleIds = userIds.filter((_, index) => eligibilityResults[index]);

  if (pushEligibleIds.length > 0) {
    await sendPushNotifications(pushEligibleIds, payload);
  }

  // ── Step 5: Log delivery summary ─────────────────────────────────────────

  console.log(
    `[NotificationWorker] Job #${job.id} done. ` +
    `DB: ${userIds.length} rows | Push: ${pushEligibleIds.length}/${userIds.length} users`
  );

  // Return a summary so it's visible in BullMQ dashboard/logs
  return {
    total:        userIds.length,
    in_app_sent:  userIds.length,
    push_sent:    pushEligibleIds.length,
    push_skipped: userIds.length - pushEligibleIds.length,
  };
};


// ─────────────────────────────────────────────────────────────────────────────
// CREATE THE WORKER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create and return the notification delivery worker.
 * Called once from startWorkers.js at server startup.
 *
 * The Worker:
 *   - Connects to Redis and watches the "notification-delivery" queue
 *   - Calls processSendBatch() for each SEND_BATCH job it picks up
 *   - Handles concurrency: can process up to 5 jobs at the same time
 *
 * @returns {Worker} BullMQ Worker instance
 */
export const createNotificationWorker = () => {
  const worker = new Worker(
    'notification-delivery',  // Queue name — must match the Queue name in queues.js

    // The processor function — called once per job
    async (job) => {
      if (job.name === JOB_NAMES.SEND_BATCH) {
        return processSendBatch(job);
      }

      // Unknown job type — log a warning but don't throw (would cause a retry loop)
      console.warn(`[NotificationWorker] Unknown job type: "${job.name}". Skipping.`);
    },

    {
      connection: redisConnection,

      // How many jobs this worker can process at the same time.
      // For notification delivery (DB + network I/O), 5 is a good starting point.
      // Increase this if your DB can handle more concurrent writes.
      concurrency: 5,
    }
  );

  // ── Event listeners (for logging) ────────────────────────────────────────

  worker.on('completed', (job) => {
    console.log(`[NotificationWorker] ✅ Job #${job.id} completed successfully`);
  });

  worker.on('failed', (job, error) => {
    console.error(
      `[NotificationWorker] ❌ Job #${job?.id} failed (attempt ${job?.attemptsMade}/${job?.opts?.attempts}):`,
      error.message
    );
  });

  worker.on('error', (error) => {
    // This fires for Redis connection errors (not job errors)
    console.error('[NotificationWorker] Worker connection error:', error.message);
  });

  console.log('[NotificationWorker] ✅ Worker started — watching "notification-delivery" queue');

  return worker;
};