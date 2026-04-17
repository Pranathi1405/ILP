// ============================================================
// src/validators/analyticsEvents.validator.js
// Joi schemas for POST /api/v1/analytics/events
//
// Design decisions:
//   • event_id   — UUID supplied by client for idempotency
//   • metadata   — open object; shape is event-specific (validated loosely here,
//                  tightly validated inside the worker handler)
//   • timestamp  — ISO 8601 string; defaults to server time if absent
//   • session_id — optional, for funnel reconstruction
// ============================================================

import Joi from 'joi';
import { VALID_EVENT_TYPES, EVENT_PLATFORMS } from '../constants/analyticsTypes.js';

// ─────────────────────────────────────────────────────────────────────────────
// BASE SCHEMA
// Every incoming event must satisfy this shape.
// ─────────────────────────────────────────────────────────────────────────────

export const ingestEventSchema = Joi.object({
  // Client-generated UUID for idempotency — required
  event_id: Joi.string().uuid({ version: ['uuidv4'] }).required()
    .messages({ 'string.guid': 'event_id must be a valid UUIDv4' }),

  // Must be one of the known ANALYTICS_EVENTS values
  event_type: Joi.string()
    .valid(...VALID_EVENT_TYPES)
    .required()
    .messages({
      'any.only': `event_type must be one of: ${[...VALID_EVENT_TYPES].join(', ')}`,
    }),

  // The authenticated user's ID (populated from JWT by the controller —
  // not required in the body because the controller injects req.user.user_id)
  user_id: Joi.number().integer().positive().optional(),

  // ISO 8601 timestamp — client sends its own clock; server records received_at separately
  timestamp: Joi.string().isoDate().optional().default(() => new Date().toISOString()),

  // Origin platform
  platform: Joi.string()
    .valid(...EVENT_PLATFORMS)
    .optional()
    .default('web'),

  // Optional session identifier (for funnel grouping)
  session_id: Joi.string().max(128).optional().allow(null, ''),

  // Flexible metadata — shape validated per event type inside the worker
  metadata: Joi.object().optional().default({}),
});

// ─────────────────────────────────────────────────────────────────────────────
// PER-EVENT METADATA SHAPES
// Used by the worker to validate metadata after dequeue.
// Exported so worker handlers can import and call .validate() themselves.
// ─────────────────────────────────────────────────────────────────────────────

export const metadataSchemas = {

  VIDEO_PROGRESS: Joi.object({
    video_id:            Joi.number().integer().positive().required(),
    course_id:           Joi.number().integer().positive().required(),
    watch_time:          Joi.number().min(0).required(),          // seconds watched this session
    progress_percentage: Joi.number().min(0).max(100).required(),
  }).unknown(true),

  VIDEO_COMPLETED: Joi.object({
    video_id:   Joi.number().integer().positive().required(),
    course_id:  Joi.number().integer().positive().required(),
    watch_time: Joi.number().min(0).required(),
  }).unknown(true),

  VIDEO_STARTED: Joi.object({
    video_id:  Joi.number().integer().positive().required(),
    course_id: Joi.number().integer().positive().required(),
  }).unknown(true),

  VIDEO_PAUSED: Joi.object({
    video_id:            Joi.number().integer().positive().required(),
    course_id:           Joi.number().integer().positive().required(),
    progress_percentage: Joi.number().min(0).max(100).optional(),
  }).unknown(true),

  TEST_STARTED: Joi.object({
    test_id:   Joi.number().integer().positive().required(),
    course_id: Joi.number().integer().positive().optional(),
  }).unknown(true),

  TEST_ABANDONED: Joi.object({
    test_id:             Joi.number().integer().positive().required(),
    questions_attempted: Joi.number().integer().min(0).optional(),
    time_spent_seconds:  Joi.number().min(0).optional(),
  }).unknown(true),

  PAYMENT_INITIATED: Joi.object({
    order_id:  Joi.alternatives().try(Joi.number(), Joi.string()).required(),
    amount:    Joi.number().positive().required(),
    currency:  Joi.string().length(3).default('INR'),
    course_id: Joi.number().integer().positive().optional(),
    plan_id:   Joi.number().integer().positive().optional(),
  }).unknown(true),

  PAYMENT_FAILED: Joi.object({
    order_id:       Joi.alternatives().try(Joi.number(), Joi.string()).required(),
    failure_reason: Joi.string().max(255).optional(),
    amount:         Joi.number().positive().optional(),
  }).unknown(true),

  COURSE_VIEWED: Joi.object({
    course_id: Joi.number().integer().positive().required(),
  }).unknown(true),

  COURSE_STARTED: Joi.object({
    course_id: Joi.number().integer().positive().required(),
  }).unknown(true),

  SEARCH_PERFORMED: Joi.object({
    query:       Joi.string().max(255).required(),
    result_count: Joi.number().integer().min(0).optional(),
  }).unknown(true),

  FILTER_APPLIED: Joi.object({
    filters: Joi.object().required(),
  }).unknown(true),

  SESSION_STARTED: Joi.object({
    session_id: Joi.string().max(128).optional(),
  }).unknown(true),

  SESSION_ENDED: Joi.object({
    session_id:        Joi.string().max(128).optional(),
    duration_seconds:  Joi.number().min(0).optional(),
  }).unknown(true),

  POINTS_UPDATED: Joi.object({
    points_delta: Joi.number().required(),
    reason:       Joi.string().max(100).optional(),
  }).unknown(true),

  BADGE_EARNED: Joi.object({
    badge_id:   Joi.number().integer().positive().required(),
    badge_name: Joi.string().max(100).optional(),
  }).unknown(true),

  RANK_UPDATED: Joi.object({
    new_rank: Joi.number().integer().positive().required(),
    period:   Joi.string().valid('weekly', 'monthly', 'yearly', 'all_time').optional(),
  }).unknown(true),

  DOUBT_ASSIGNED: Joi.object({
    doubt_id:          Joi.number().integer().positive().required(),
    assigned_teacher_user_id: Joi.number().integer().positive().required(),
  }).unknown(true),
};