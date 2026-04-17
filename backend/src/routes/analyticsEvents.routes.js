// ============================================================
// src/routes/analyticsEvents.routes.js
// Route: POST /api/v1/analytics/events
//
// Mount in app.js:
//   import analyticsEventsRoutes from './routes/analyticsEvents.routes.js';
//   app.use('/api/v1/analytics', analyticsEventsRoutes);
// ============================================================

import { Router }      from 'express';
import { ingestEvent } from '../controllers/analytics.controller.js';
import {authenticate}  from '../middleware/auth.middleware.js';
import rateLimiter     from '../middleware/rateLimit.middleware.js';

const router = Router();
router.use(authenticate); // All analytics endpoints require authentication

// Rate limit specifically for analytics ingestion:
// High-frequency endpoint (video progress pings every 30s), but
// still needs a ceiling to prevent abuse.
const analyticsRateLimit = rateLimiter({
  windowMs: 60 * 1000,   // 1 minute
  max:      120,          // 2 events/second per user — sufficient for all use cases
  message:  'Too many analytics events. Please slow down.',
});

/**
 * POST /api/v1/analytics/events
 * Unified analytics event ingestion.
 * Auth required — user identity sourced from JWT, never from body.
 */
router.post('/events', analyticsRateLimit, ingestEvent);

export default router;


