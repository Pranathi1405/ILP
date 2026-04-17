// ============================================================
// src/docs/analyticsEvents.swagger.js
// Swagger docs for POST /api/v1/analytics/events
//
// Merge into swagger.config.js the same way parentAnalyticsSwagger is merged.
// ============================================================

export const analyticsEventsSwagger = {
  tags: [
    {
      name: 'Analytics Events',
      description: 'Unified analytics event ingestion endpoint',
    },
  ],

  schemas: {
    AnalyticsEventRequest: {
      type: 'object',
      required: ['event_id', 'event_type'],
      properties: {
        event_id: {
          type: 'string',
          format: 'uuid',
          description: 'Client-generated UUIDv4 for idempotency',
          example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        },
        event_type: {
          type: 'string',
          description: 'Analytics event type',
          example: 'VIDEO_PROGRESS',
          enum: [
            'VIDEO_STARTED', 'VIDEO_PROGRESS', 'VIDEO_PAUSED', 'VIDEO_COMPLETED',
            'VIDEO_WATCHED', 'COURSE_STARTED', 'COURSE_VIEWED', 'COURSE_ENROLLED',
            'COURSE_COMPLETED', 'MODULE_STARTED', 'MODULE_COMPLETED',
            'SUBJECT_STARTED', 'SUBJECT_COMPLETED', 'TEST_STARTED',
            'TEST_SUBMITTED', 'TEST_ABANDONED', 'PAYMENT_INITIATED',
            'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'USER_REGISTERED',
            'USER_LOGGED_IN', 'SESSION_STARTED', 'SESSION_ENDED',
            'SEARCH_PERFORMED', 'FILTER_APPLIED', 'DOUBT_CREATED',
            'DOUBT_ASSIGNED', 'DOUBT_RESOLVED', 'POINTS_UPDATED',
            'BADGE_EARNED', 'RANK_UPDATED', 'LIVE_CLASS_JOINED',
            'LIVE_CLASS_LEFT', 'CONTENT_CONSUMED', 'STUDENT_ACTIVITY',
            'UPDATE_PARENT_ANALYTICS', 'UPDATE_STUDENT_SCORE_TREND',
          ],
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          description: 'Client-side event timestamp (ISO 8601). Defaults to server time if omitted.',
          example: '2026-04-10T10:30:00Z',
        },
        platform: {
          type: 'string',
          enum: ['web', 'android', 'ios', 'server'],
          default: 'web',
        },
        session_id: {
          type: 'string',
          maxLength: 128,
          description: 'Optional session identifier for funnel grouping',
          nullable: true,
        },
        metadata: {
          type: 'object',
          description: 'Event-specific payload. Shape varies per event_type.',
          example: {
            video_id: 101,
            course_id: 45,
            watch_time: 120,
            progress_percentage: 40,
          },
        },
      },
    },

    AnalyticsEventResponse: {
      type: 'object',
      properties: {
        status:  { type: 'string', example: 'success' },
        code:    { type: 'integer', example: 202 },
        message: { type: 'string', example: 'Event accepted' },
        data: {
          type: 'object',
          properties: {
            event_id:  { type: 'string', format: 'uuid' },
            duplicate: { type: 'boolean', description: 'true if this event_id was already received' },
          },
        },
      },
    },
  },

  paths: {
    '/api/v1/analytics/events': {
      post: {
        tags: ['Analytics Events'],
        summary: 'Ingest a single analytics event',
        description: [
          'Unified endpoint for both **frontend** and **backend** analytics events.',
          '',
          '**Flow:** Validate → Idempotency check → Log to analytics_events_log → Enqueue → 202 Accepted',
          '',
          '**Key points:**',
          '- `user_id` is injected from the JWT — never send it in the body',
          '- `event_id` must be a client-generated UUIDv4 — used for deduplication',
          '- Processing is asynchronous — the response does not wait for the worker',
          '- Duplicate `event_id` values return 202 with `duplicate: true`',
        ].join('\n'),
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AnalyticsEventRequest' },
              examples: {
                videoProgress: {
                  summary: 'Video progress ping',
                  value: {
                    event_id:   'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                    event_type: 'VIDEO_PROGRESS',
                    platform:   'web',
                    metadata: {
                      video_id:            101,
                      course_id:           45,
                      watch_time:          120,
                      progress_percentage: 40,
                    },
                  },
                },
                testStarted: {
                  summary: 'Test started',
                  value: {
                    event_id:   'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    event_type: 'TEST_STARTED',
                    metadata: { test_id: 22, course_id: 45 },
                  },
                },
                paymentInitiated: {
                  summary: 'Payment initiated',
                  value: {
                    event_id:   'b2c3d4e5-f6a7-8901-bcde-f12345678901',
                    event_type: 'PAYMENT_INITIATED',
                    metadata: { order_id: 999, amount: 4999, currency: 'INR', course_id: 45 },
                  },
                },
              },
            },
          },
        },
        responses: {
          202: {
            description: 'Event accepted for async processing',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AnalyticsEventResponse' },
              },
            },
          },
          400: { description: 'Validation error — invalid event_type, malformed UUID, etc.' },
          401: { description: 'Unauthorized — missing or invalid JWT' },
          429: { description: 'Rate limit exceeded (120 req/min per user)' },
        },
      },
    },
  },
};