/**
 * src/queues/startWorkers.js
 * ============================
 * Single entry point that starts ALL Bull workers and sets up repeatable jobs.
 *
 * This file replaces the old `src/jobs/scheduler.js` startScheduler() call.
 * server.js calls startWorkers() once at startup instead of startScheduler().
 *
 * WHAT HAPPENS WHEN startWorkers() IS CALLED:
 *
 *   1. Start the Notification Delivery Worker
 *      → Begins listening to the "notification-delivery" queue
 *      → Processes SEND_BATCH jobs (DB insert + WebSocket + push)
 *
 *   2. Start the Recurring Jobs Worker
 *      → Begins listening to the "recurring-jobs" queue
 *
 *   3. Set up the 3 repeatable jobs in Redis
 *      → These fire every 60 seconds automatically
 *      → Replaces setInterval from the old scheduler.js
 *
 *   4. Set up graceful shutdown handlers (SIGTERM / SIGINT)
 *      → Cleanly close all workers when the server stops
 *      → Prevents jobs from being interrupted mid-execution
 */

import { createNotificationWorker } from './workers/notification.worker.js';
import { createRecurringWorker, setupRecurringJobs } from './workers/recurring.worker.js';
import { notificationDeliveryQueue, recurringJobsQueue } from './queues.js';
import analyticsQueue from './analyticsQueue.js';
import { startAnalyticsWorker }   from './workers/analytics.worker.js';
import { startAnalyticsCronJobs } from '../jobs/analyticsCron.job.js';
// Feature flag
const QUEUES_ENABLED = process.env.ENABLE_QUEUES === 'true';

export const startWorkers = async () => {

  // ── If queues disabled, skip everything ───────────────────────────────
  if (!QUEUES_ENABLED) {
    console.log('─────────────────────────────────────────');
    console.log('⚠️  BullMQ queues are disabled (ENABLE_QUEUES=false)');
    console.log('⚙️  Workers will not start');
    console.log('─────────────────────────────────────────');
    return;
  }

  console.log('─────────────────────────────────────────');
  console.log('⚙️  Starting BullMQ workers...');

  // ── Step 1: Start notification worker ─────────────────────────────────
  const notificationWorker = createNotificationWorker();

  // ── Step 2: Start recurring jobs worker ───────────────────────────────
  const recurringWorker = createRecurringWorker();

  // ── Step 3: Register repeatable jobs ──────────────────────────────────
  await setupRecurringJobs();

  // ── Step 4: Start analytics worker and cron jobs ─────────────────────
  await startAnalyticsWorker();
  await startAnalyticsCronJobs();

  console.log('✅  All workers started');
  console.log('📋  Queues: notification-delivery | recurring-jobs | analytics');
  console.log('🔁  Recurring jobs: firing every 60s');
  console.log('─────────────────────────────────────────');

  // ── Step 5: Graceful shutdown ─────────────────────────────────────────
  const shutdown = async (signal) => {

    console.log(`\n[Workers] ${signal} received — shutting down workers gracefully...`);

    await Promise.all([
      notificationWorker.close(),
      recurringWorker.close(),
      analyticsWorker.close(),

    ]);

    if (notificationDeliveryQueue) {
      await notificationDeliveryQueue.close();
    }

    if (recurringJobsQueue) {
      await recurringJobsQueue.close();
    }
    if (analyticsQueue) {
      await analyticsQueue.close();
    }

    console.log('[Workers] All workers and queues closed cleanly');
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};