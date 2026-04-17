// ============================================================
// src/middleware/rateLimit.middleware.js
// Compatible with your existing route usage
// ============================================================

import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiter = ({
  windowMs = 60 * 1000,
  max = 100,
  message = 'Too many requests. Please try again later.',
  prefix = 'rl',
} = {}) => {
  const rateLimiter = new RateLimiterMemory({
    points: max,                         // max requests
    duration: Math.ceil(windowMs / 1000), // convert ms → seconds
    keyPrefix: prefix,
  });

  return async (req, res, next) => {
    try {
      const key = req.user?.id
        ? `user:${req.user.id}`
        : req.ip;

      await rateLimiter.consume(key);
      next();
    } catch (rejRes) {
      return res.status(429).json({
        status: 'fail',
        message,
        meta: {
          retryAfter: Math.ceil(rejRes.msBeforeNext / 1000),
        },
      });
    }
  };
};

export default rateLimiter;