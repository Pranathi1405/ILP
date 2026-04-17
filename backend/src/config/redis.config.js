/**
 * src/config/redis.config.js
 * ============================
 * Redis connection settings used by BullMQ queues.
 *
 * WHY REDIS?
 *   BullMQ uses Redis as its backbone. Every job you add to a queue
 *   is stored in Redis. This means:
 *     - Jobs survive server restarts (they are persisted in Redis)
 *     - Multiple server instances can share the same queue (horizontal scaling)
 *     - You can inspect jobs, retry them, see failures — all from Redis
 *
 * HOW TO RUN REDIS LOCALLY:
 *   Option 1 — Docker (easiest):
 *     docker run -d -p 6379:6379 redis:7
 *
 *   Option 2 — Install natively:
 *     brew install redis && brew services start redis   (Mac)
 *     sudo apt install redis-server && sudo service redis start   (Ubuntu)
 *
 * ENVIRONMENT VARIABLES (add to your .env file):
 *   REDIS_HOST     → Redis server hostname  (default: localhost)
 *   REDIS_PORT     → Redis server port      (default: 6379)
 *   REDIS_PASSWORD → Redis password         (default: none — leave empty for local dev)
 *
 * IMPORTANT — maxRetriesPerRequest: null
 *   BullMQ REQUIRES this to be set to null on the connection object.
 *   Without it, BullMQ will throw an error on startup.
 *   ioredis (the Redis client BullMQ uses) defaults to 20 retries per request,
 *   but BullMQ needs unlimited retries to work correctly.
 */

export const redisConnection = {
  host:     process.env.REDIS_HOST     || 'localhost',
  port:     Number(process.env.REDIS_PORT) || 6379,

  // Only add password if it is set — Redis local dev usually has no password
  ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),

  // BullMQ REQUIRES this — do not remove
  maxRetriesPerRequest: null,
};