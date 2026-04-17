/**
 * src/queues/workers/recurring.worker.js
 * =========================================
 * This file does two things:
 *
 *   1. Sets up repeatable jobs in the "recurring-jobs" queue
 *      (these replace the old setInterval in scheduler.js)
 *
 *   2. Creates a Worker that processes those repeatable jobs
 *      when they fire every 60 seconds
 *
 *
 * JOBS MANAGED HERE (all run every 60 seconds):
 *   1. CHECK_SCHEDULED_ANNOUNCEMENTS      — broadcast announcements whose start_date has arrived
 *   2. EXPIRE_ANNOUNCEMENTS               — deactivate announcements past their end_date
 *   3. SEND_PENDING_TEACHER_NOTIFICATIONS — deliver teacher notifications whose scheduled_at has passed
 */

import { Worker } from 'bullmq';

import { redisConnection }     from '../../config/redis.config.js';
import { recurringJobsQueue, JOB_NAMES } from '../queues.js';

// The actual job functions (same ones scheduler.js used to call)
import { broadcastScheduledAnnouncements, expireOldAnnouncements } from '../../jobs/announcement.job.js';
import { sendPendingTeacherNotifications }                          from '../../jobs/teacherNotification.job.js';

// ─────────────────────────────────────────────────────────────────────────────
// HOW OFTEN TO RUN EACH JOB
// ─────────────────────────────────────────────────────────────────────────────

const EVERY_60_SECONDS = 60 * 1000; // milliseconds


// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: SET UP REPEATABLE JOBS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register the three recurring jobs into the Redis queue.
 *
 * DEDUPLICATION:
 *   We first remove any existing repeatable jobs from Redis, then add them fresh.
 *   This prevents duplicate jobs from piling up after multiple server restarts.
 *
 *   Without this: after 10 restarts, each job would fire 10 times per minute!
 *   With this:    each job always fires exactly once per minute, no matter
 *                 how many times the server restarts.
 *
 * Call this ONCE at server startup (from startWorkers.js).
 */
export const setupRecurringJobs = async () => {
  console.log('[RecurringWorker] Setting up repeatable jobs...');

  // ── Clear existing repeatable jobs first ─────────────────────────────────
  //
  // getRepeatableJobs() returns all jobs currently registered with a "repeat" option.
  // We remove them all so we can add fresh ones without duplicates.

  const existingRepeatableJobs = await recurringJobsQueue.getRepeatableJobs();

  for (const repeatableJob of existingRepeatableJobs) {
    await recurringJobsQueue.removeRepeatableByKey(repeatableJob.key);
    console.log(`[RecurringWorker] Removed old repeatable job: "${repeatableJob.name}"`);
  }

  // ── Register the three jobs ───────────────────────────────────────────────
  //
  // Each call adds a "blueprint" to Redis.
  // BullMQ will automatically create a new job instance every `every` milliseconds.
  // The worker below processes each instance when it fires.

  // Job 1: Broadcast announcements that are scheduled and whose start_date has arrived
  await recurringJobsQueue.add(
    JOB_NAMES.CHECK_SCHEDULED_ANNOUNCEMENTS,
    {},  // No data needed — the job function queries the DB itself
    { repeat: { every: EVERY_60_SECONDS } }
  );

  // Job 2: Expire announcements whose end_date has passed
  await recurringJobsQueue.add(
    JOB_NAMES.EXPIRE_ANNOUNCEMENTS,
    {},
    { repeat: { every: EVERY_60_SECONDS } }
  );

  // Job 3: Send pending teacher notifications whose scheduled_at has passed
  await recurringJobsQueue.add(
    JOB_NAMES.SEND_PENDING_TEACHER_NOTIFICATIONS,
    {},
    { repeat: { every: EVERY_60_SECONDS } }
  );

  console.log('[RecurringWorker] ✅ 3 repeatable jobs registered (every 60s each)');
};


// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: JOB PROCESSOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process one recurring job when it fires.
 * BullMQ calls this automatically based on the `repeat: { every }` schedule.
 *
 * We use job.name (the job type string) to decide which function to run.
 *
 * @param {Job} job - BullMQ Job object with job.name telling us which job to run
 */
const processRecurringJob = async (job) => {
  console.log(`[RecurringWorker] Running job: "${job.name}" at ${new Date().toISOString()}`);

  // ── Job 1: Broadcast ready scheduled announcements ───────────────────────
  if (job.name === JOB_NAMES.CHECK_SCHEDULED_ANNOUNCEMENTS) {
    await broadcastScheduledAnnouncements();
    return;
  }

  // ── Job 2: Expire old announcements ──────────────────────────────────────
  if (job.name === JOB_NAMES.EXPIRE_ANNOUNCEMENTS) {
    await expireOldAnnouncements();
    return;
  }

  // ── Job 3: Send pending teacher notifications ─────────────────────────────
  if (job.name === JOB_NAMES.SEND_PENDING_TEACHER_NOTIFICATIONS) {
    await sendPendingTeacherNotifications();
    return;
  }

  // Unknown job name — this should never happen
  console.warn(`[RecurringWorker] Unknown job name: "${job.name}". Skipping.`);
};


// ─────────────────────────────────────────────────────────────────────────────
// STEP 3: CREATE THE WORKER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create and return the recurring jobs worker.
 * Called once from startWorkers.js at server startup.
 *
 * Concurrency is set to 1 because:
 *   - We only want ONE instance of each recurring job running at a time
 *   - Announcement broadcast and teacher notification jobs both modify DB rows
 *     and we don't want two instances stepping on each other
 *
 * @returns {Worker} BullMQ Worker instance
 */
export const createRecurringWorker = () => {
  const worker = new Worker(
    'recurring-jobs',          // Queue name — must match the Queue name in queues.js
    processRecurringJob,       // Processor function above
    {
      connection:  redisConnection,
      concurrency: 1,          // Only 1 recurring job at a time — prevents overlapping runs
    }
  );

  // ── Event listeners ───────────────────────────────────────────────────────

  worker.on('completed', (job) => {
    console.log(`[RecurringWorker] ✅ "${job.name}" completed`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[RecurringWorker] ❌ "${job?.name}" failed:`, error.message);
    // Note: recurring jobs have attempts: 1 (configured in queues.js)
    // so failed jobs are not retried — the next scheduled run will try again
  });

  worker.on('error', (error) => {
    // This fires for Redis connection errors (not job errors)
    console.error('[RecurringWorker] Worker connection error:', error.message);
  });

  console.log('[RecurringWorker] ✅ Worker started — watching "recurring-jobs" queue');

  return worker;
};