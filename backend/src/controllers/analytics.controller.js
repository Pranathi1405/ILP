// ============================================================
// src/controllers/analytics.controller.js
// Unified analytics event ingestion endpoint.
//
// Endpoint:  POST /api/v1/analytics/events
// Auth:      Required (JWT) — user_id injected from req.user
//
// Flow:
//   1. Validate request body (Joi)
//   2. Check idempotency — reject duplicate event_id
//   3. Log event to analytics_events_log
//   4. Push to BullMQ queue
//   5. Return 202 Accepted — do NOT wait for worker
//
// Design principles:
//   • Never block the response on analytics processing
//   • Analytics failures must NEVER affect the main API
//   • event_id deduplication prevents double-counting
// ============================================================

import { ingestEventSchema }  from '../validators/analyticsEvents.validator.js';
import { emitAnalyticsEvent } from '../queues/analyticsQueue.js';
import pool                   from '../config/database.config.js';
import logger                 from '../utils/logger.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

// ─────────────────────────────────────────────────────────────────────────────
// ingestEvent
// POST /api/v1/analytics/events
// ─────────────────────────────────────────────────────────────────────────────

export const ingestEvent = async (req, res) => {
  try {
    // ── Step 1: Validate body ──────────────────────────────────
    const { error, value } = ingestEventSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return sendError(res, 400, 'Validation failed', {
        errors: error.details.map(d => ({ field: d.path.join('.'), message: d.message })),
      });
    }

    const {
      event_id,
      event_type,
      timestamp,
      platform,
      session_id,
      metadata,
    } = value;

    // Inject user_id from JWT — never trust body for user identity
    const userId = req.user?.user_id;
    if (!userId) {
      return sendError(res, 401, 'Unauthorized — missing user context');
    }

    // ── Step 2: Idempotency check ──────────────────────────────
    // Check if this event_id was already received.
    // Uses INSERT IGNORE + a subsequent SELECT to avoid race conditions.
    const eventTimestamp = new Date(timestamp);

    const payload = { event_type, user_id: userId, platform, session_id, metadata };

    let logId;
    try {
      const [insertResult] = await pool.query(
        `INSERT IGNORE INTO analytics_events_log
         (event_id, event_type, user_id, platform, session_id, payload, event_timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [event_id, event_type, userId, platform, session_id ?? null, JSON.stringify(payload), eventTimestamp],
      );

      if (insertResult.affectedRows === 0) {
        // Duplicate — already received
        logger.debug(`[AnalyticsIngest] Duplicate event_id=${event_id} — skipped`);
        return sendSuccess(res, 202, 'Event already received (duplicate)', { event_id, duplicate: true });
      }

      logId = insertResult.insertId;
    } catch (dbError) {
      // Log table failure must not block the main response
      logger.error(`[AnalyticsIngest] Failed to write to analytics_events_log: ${dbError.message}`);
    }

    // ── Step 3: Enqueue ────────────────────────────────────────
    // Build the worker payload — merge userId into metadata so all
    // existing handlers receive it via payload.userId (backward-compatible).
    const workerPayload = {
      ...metadata,
      userId,
      eventId: event_id,
      logId,
    };

    // Fire-and-forget — worker failures are retried by BullMQ
    emitAnalyticsEvent(event_type, workerPayload).catch(err => {
      logger.error(`[AnalyticsIngest] Queue push failed for ${event_type}: ${err.message}`);
      // Mark log row as failed (best-effort)
      if (logId) {
        pool.query(
          `UPDATE analytics_events_log SET processed_status = 'failed', error_message = ? WHERE id = ?`,
          [err.message?.slice(0, 500), logId],
        ).catch(() => {});
      }
    });

    // ── Step 4: Respond immediately ────────────────────────────
    logger.debug(`[AnalyticsIngest] Accepted ${event_type} (event_id=${event_id}, userId=${userId})`);
    return sendSuccess(res, 202, 'Event accepted', { event_id });

  } catch (err) {
    logger.error(`[AnalyticsIngest] Unexpected error: ${err.message}`, { stack: err.stack });
    return sendError(res, 500, 'Internal server error');
  }
};