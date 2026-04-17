// ============================================================
// Authors: Harshitha Ravuri,
// src/queues/analyticsQueue.js
// BullMQ queue for analytics events
//
// HOW IT WORKS:
// 1. Something happens (student submits test, payment succeeds, etc.)
// 2. Any controller/service calls emitAnalyticsEvent()
// 3. That adds a named BullMQ job to this queue
// 4. analytics.worker.js picks it up and updates analytics tables

// ============================================================
import { Queue } from 'bullmq';
import logger from '../utils/logger.js';

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE FLAG 
// ─────────────────────────────────────────────────────────────────────────────

const QUEUES_ENABLED = process.env.ENABLE_QUEUES === 'true';

// ─────────────────────────────────────────────────────────────────────────────
// REDIS CONNECTION
// ─────────────────────────────────────────────────────────────────────────────

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
};

// ─────────────────────────────────────────────────────────────────────────────
// QUEUE (conditionally created)
// ─────────────────────────────────────────────────────────────────────────────

let analyticsQueue = null;

if (QUEUES_ENABLED) {
  analyticsQueue = new Queue('analytics', {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

export const emitAnalyticsEvent = async (eventType, payload) => {
  try {
    if (!QUEUES_ENABLED || !analyticsQueue) {
      logger.warn(`[AnalyticsQueue] Queues disabled — skipped ${eventType}`);
      return {
        id: null,
        disabled: true,
      };
    }

    const job = await analyticsQueue.add(eventType, {
      eventType,
      payload,
      timestamp: new Date().toISOString(),
    });

    logger.debug(`[AnalyticsQueue] Queued ${eventType} (job ${job.id})`);
    return job;

  } catch (error) {
    logger.error(`[AnalyticsQueue] Failed to queue ${eventType}: ${error.message}`);
    // swallow — analytics must never break the main flow
  }
};

export default analyticsQueue;