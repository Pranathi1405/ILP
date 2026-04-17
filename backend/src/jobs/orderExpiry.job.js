//Author: Harshitha Ravuri
/**
 * Order Expiry Job
 * Marks pending orders older than 15 minutes as 'expired'.
 * Register this scheduler in your app startup.
 *
 * Usage:
 *   import { startOrderExpiryJob } from './jobs/orderExpiry.job.js';
 *   startOrderExpiryJob();
 */

import PaymentService from '../services/payment.service.js';
import logger from '../utils/logger.js';

/**
 * Start the order expiry cron.
 * Runs every 5 minutes by default.
 *
 * @param {number} intervalMs - How often to run in milliseconds (default: 5 minutes)
 */
export const startOrderExpiryJob = (intervalMs = 5 * 60 * 1000) => {
  logger.info('Order expiry job started', { intervalMs });

  const run = async () => {
    try {
      const count = await PaymentService.expireStaleOrders();
      if (count > 0) {
        logger.info(`Order expiry job: expired ${count} orders`);
      }
    } catch (err) {
      logger.error('Order expiry job failed', { error: err.message });
    }
  };

  // Run once immediately on startup, then on interval
  run();
  return setInterval(run, intervalMs);
};