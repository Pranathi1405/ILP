/**
 * src/config/swagger/modules/subscriptions.swagger.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Swagger docs for the Subscriptions module.
 */

export const subscriptionsSwagger = {

  // ─────────────────────────────────────────────────────────────────────────
  // SCHEMAS
  // ─────────────────────────────────────────────────────────────────────────
  schemas: {

    CreateSubscription: {
      type: 'object',
      required: ['user_id', 'course_id', 'enrollment_id', 'plan_id', 'start_date', 'end_date'],
      properties: {
        user_id:       { type: 'integer', example: 1 },
        course_id:     { type: 'integer', example: 2 },
        enrollment_id: { type: 'integer', example: 1 },
        plan_id:       { type: 'integer', example: 1 },
        payment_id:    { type: 'integer', example: 10, nullable: true },
        start_date:    { type: 'string',  example: '2025-01-01' },
        end_date:      { type: 'string',  example: '2026-01-01' },
      },
    },

    UpdateSubscription: {
      type: 'object',
      properties: {
        plan_id:           { type: 'integer', example: 2 },
        payment_id:        { type: 'integer', example: 15 },
        start_date:        { type: 'string',  example: '2025-01-01' },
        end_date:          { type: 'string',  example: '2027-01-01' },
        is_active:         { type: 'boolean', example: true },
        custom_tests_used: { type: 'integer', example: 3 },
        sme_attempts_used: { type: 'integer', example: 1 },
      },
    },

  },

  // ─────────────────────────────────────────────────────────────────────────
  // PATHS
  // ─────────────────────────────────────────────────────────────────────────
  paths: {

    '/subscriptions': {
      post: {
        tags: ['Subscriptions'],
        summary: 'Create a new subscription',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateSubscription' } } },
        },
        responses: {
          201: { description: 'Subscription created successfully' },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },

      get: {
        tags: ['Subscriptions'],
        summary: 'Get all subscriptions — Admin only',
        parameters: [
          { name: 'page',      in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit',     in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'is_active', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: {
          200: { description: 'Subscriptions fetched successfully' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/subscriptions/user/{userId}': {
      get: {
        tags: ['Subscriptions'],
        summary: 'Get subscriptions by user ID',
        parameters: [
          { name: 'userId', in: 'path',  required: true, schema: { type: 'integer' } },
          { name: 'page',   in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit',  in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: { description: 'User subscriptions fetched' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/subscriptions/{id}': {
      get: {
        tags: ['Subscriptions'],
        summary: 'Get subscription by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Subscription fetched successfully' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },

      put: {
        tags: ['Subscriptions'],
        summary: 'Update subscription — Admin only',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateSubscription' } } },
        },
        responses: {
          200: { description: 'Subscription updated successfully' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },

      delete: {
        tags: ['Subscriptions'],
        summary: 'Delete subscription permanently — Admin only',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Subscription deleted successfully' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/subscriptions/{id}/cancel': {
      patch: {
        tags: ['Subscriptions'],
        summary: 'Cancel a subscription (soft deactivate)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Subscription cancelled successfully' },
          400: { description: 'Subscription already inactive' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

  },

  // ─────────────────────────────────────────────────────────────────────────
  // TAGS
  // ─────────────────────────────────────────────────────────────────────────
  tags: [
    { name: 'Subscriptions', description: 'Subscription management APIs' },
  ],
};