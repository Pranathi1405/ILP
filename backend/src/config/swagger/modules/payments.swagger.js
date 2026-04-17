/**
 * payments.swagger.js
 * Swagger/OpenAPI 3.0 documentation for the Payments module.
 */

// ─────────────────────────────────────────────
// REUSABLE SCHEMAS
// ─────────────────────────────────────────────
const paymentsSwaggerComponents = {
  schemas: {

    SuccessResponse: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        code: { type: 'integer', example: 200 },
        message: { type: 'string' },
        data: { type: 'object' },
        meta: {
          type: 'object',
          properties: { timestamp: { type: 'string', format: 'date-time' } },
        },
      },
    },

    ErrorResponse: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        code: { type: 'integer', example: 400 },
        message: { type: 'string' },
        meta: {
          type: 'object',
          properties: { timestamp: { type: 'string', format: 'date-time' } },
        },
      },
    },

    ValidationErrorResponse: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'validation_error' },
        code: { type: 'integer', example: 422 },
        message: { type: 'string', example: 'Validation failed' },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string', example: 'course_id' },
              message: { type: 'string', example: 'course_id is required' },
            },
          },
        },
      },
    },

    PaginationMeta: {
      type: 'object',
      properties: {
        current_page: { type: 'integer', example: 1 },
        per_page: { type: 'integer', example: 20 },
        total_records: { type: 'integer', example: 50 },
        total_pages: { type: 'integer', example: 3 },
        has_next: { type: 'boolean', example: true },
        has_previous: { type: 'boolean', example: false },
      },
    },

    Plan: {
      type: 'object',
      properties: {
        plan_id: { type: 'integer', example: 1 },
        plan_code: { type: 'string', example: 'basic' },
        plan_name: { type: 'string', example: 'Basic Plan' },
        description: { type: 'string', example: 'Perfect for regular learners' },
        price: { type: 'number', format: 'float', example: 499.00 },
        duration_days: { type: 'integer', example: 730 },
        custom_test_limit: { type: 'integer', nullable: true, example: 10 },
        sme_test_attempt_limit: { type: 'integer', nullable: true, example: 5 },
        ug_exam_test_limit: { type: 'integer', nullable: true, example: null },
        is_active: { type: 'boolean', example: true },
        sort_order: { type: 'integer', example: 1 },
      },
    },

    CreateOrderRequest: {
      type: 'object',
      required: ['course_id', 'plan_id'],
      properties: {
        course_id: { type: 'integer', example: 1 },
        plan_id: { type: 'integer', example: 2 },
      },
    },

    OrderCreatedData: {
      type: 'object',
      properties: {
        order_id: { type: 'integer', example: 123 },
        gateway_order_id: { type: 'string', example: 'order_Razorpay123abc' },
        amount: { type: 'number', format: 'float', example: 999.00 },
        currency: { type: 'string', example: 'INR' },
        razorpay_key_id: { type: 'string', example: 'rzp_test_abc123' },
        expires_at: { type: 'string', format: 'date-time' },
        is_upgrade: { type: 'boolean', example: false },
        pricing: {
          type: 'object',
          properties: {
            course_price: { type: 'number', format: 'float', example: 499.00 },
            plan_addon: { type: 'number', format: 'float', example: 500.00 },
            discount: { type: 'number', format: 'float', example: 0.00 },
            total: { type: 'number', format: 'float', example: 999.00 },
          },
        },
      },
    },

    OrderStatus: {
      type: 'object',
      properties: {
        order_id: { type: 'integer', example: 123 },
        status: {
          type: 'string',
          enum: ['pending', 'paid', 'failed', 'expired', 'cancelled'],
          example: 'pending',
        },
        amount: { type: 'number', format: 'float', example: 999.00 },
        currency: { type: 'string', example: 'INR' },
        gateway_order_id: { type: 'string', example: 'order_Razorpay123abc' },
        created_at: { type: 'string', format: 'date-time' },
        expires_at: { type: 'string', format: 'date-time' },
        is_processed: { type: 'boolean', example: false },
        is_upgrade: { type: 'boolean', example: false },
      },
    },

    // ── NEW: Frontend payment verification request ─────────────────────
    VerifyPaymentRequest: {
      type: 'object',
      required: ['razorpayOrderId', 'razorpayPaymentId', 'razorpaySignature'],
      properties: {
        razorpayOrderId: {
          type: 'string',
          example: 'order_30EK3e3oeHyVnK',
          description: 'Razorpay order ID (from Razorpay success callback)',
        },
        razorpayPaymentId: {
          type: 'string',
          example: 'pay_30EK0eHztvYVqO',
          description: 'Razorpay payment ID (from Razorpay success callback)',
        },
        razorpaySignature: {
          type: 'string',
          example: '9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d',
          description: 'Razorpay signature (from Razorpay success callback). Used for HMAC verification.',
        },
      },
    },

    VerifyPaymentResponseData: {
      type: 'object',
      properties: {
        payment_id: {
          type: 'integer',
          example: 1001,
          description: 'ILP internal payment ID',
        },
        order_id: {
          type: 'integer',
          example: 123,
          description: 'ILP internal order ID',
        },
        is_upgrade: {
          type: 'boolean',
          example: false,
          description: 'Whether this payment is for a plan upgrade',
        },
        already_processed: {
          type: 'boolean',
          example: false,
          description: 'True if payment was already verified in a previous request (idempotent)',
        },
      },
    },

    // Only documents payment.captured — all other event types are silently ignored.
    WebhookPayload: {
      type: 'object',
      description: 'Full Razorpay event payload. Only `payment.captured` events trigger processing; all others are silently ignored.',
      required: ['event', 'payload'],
      properties: {
        event: {
          type: 'string',
          example: 'payment.captured',
          description: 'Razorpay event type. Must be `payment.captured` to trigger processing.',
        },
        payload: {
          type: 'object',
          required: ['payment'],
          properties: {
            payment: {
              type: 'object',
              required: ['entity'],
              properties: {
                entity: {
                  type: 'object',
                  required: ['id', 'order_id', 'amount'],
                  properties: {
                    id: { type: 'string', example: 'pay_Razorpay456def', description: 'Razorpay payment ID' },
                    order_id: { type: 'string', example: 'order_Razorpay123abc', description: 'Razorpay order ID' },
                    amount: { type: 'integer', example: 99900, description: 'Amount in paise' },
                    currency: { type: 'string', example: 'INR' },
                    method: { type: 'string', example: 'upi' },
                  },
                },
              },
            },
          },
        },
      },
    },

    Payment: {
      type: 'object',
      properties: {
        payment_id: { type: 'integer', example: 1001 },
        order_id: { type: 'integer', example: 123 },
        amount: { type: 'number', format: 'float', example: 999.00 },
        currency: { type: 'string', example: 'INR' },
        payment_method: {
          type: 'string',
          enum: ['credit_card', 'debit_card', 'upi', 'net_banking', 'wallet'],
          example: 'upi',
        },
        payment_status: {
          type: 'string',
          enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
          example: 'completed',
        },
        transaction_id: { type: 'string', example: 'pay_Razorpay456def' },
        payment_date: { type: 'string', format: 'date-time' },
        course_id: { type: 'integer', example: 1 },
        course_name: { type: 'string', example: 'Mathematics Fundamentals' },
        thumbnail_url: { type: 'string', example: 'https://cdn.ilp.com/courses/1.jpg' },
        receipt_number: { type: 'string', nullable: true, example: 'RCP-2026-AB12CD' },
        receipt_url: { type: 'string', nullable: true, example: 'https://storage.googleapis.com/ilp-receipts/RCP-2026-AB12CD.pdf' },
      },
    },

    PaymentHistoryResponse: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        code: { type: 'integer', example: 200 },
        data: { type: 'array', items: { $ref: '#/components/schemas/Payment' } },
        pagination: { $ref: '#/components/schemas/PaginationMeta' },
        meta: {
          type: 'object',
          properties: { timestamp: { type: 'string', format: 'date-time' } },
        },
      },
    },

    Receipt: {
      type: 'object',
      properties: {
        receipt_id: { type: 'integer', example: 100 },
        payment_id: { type: 'integer', example: 1001 },
        receipt_number: { type: 'string', example: 'RCP-2026-AB12CD' },
        receipt_url: { type: 'string', example: 'https://storage.googleapis.com/ilp-receipts/RCP-2026-AB12CD.pdf' },
        generated_at: { type: 'string', format: 'date-time' },
      },
    },

    CoursePurchase: {
      type: 'object',
      properties: {
        purchase_id: { type: 'integer', example: 55 },
        student_id: { type: 'integer', example: 123 },
        course_id: { type: 'integer', example: 1 },
        payment_id: { type: 'integer', example: 1001 },
        plan_id: { type: 'integer', example: 2 },
        purchase_date: { type: 'string', format: 'date-time' },
        valid_until: { type: 'string', format: 'date', nullable: true, example: '2028-03-15' },
        status: { type: 'string', enum: ['active', 'expired', 'cancelled'], example: 'active' },
        course_name: { type: 'string', example: 'Mathematics Fundamentals' },
        thumbnail_url: { type: 'string', example: 'https://cdn.ilp.com/courses/1.jpg' },
        plan_name: { type: 'string', example: 'Pro Plan' },
        plan_code: { type: 'string', example: 'pro' },
      },
    },

    PurchasesResponse: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        code: { type: 'integer', example: 200 },
        data: { type: 'array', items: { $ref: '#/components/schemas/CoursePurchase' } },
        pagination: { $ref: '#/components/schemas/PaginationMeta' },
        meta: {
          type: 'object',
          properties: { timestamp: { type: 'string', format: 'date-time' } },
        },
      },
    },

    UpgradeOptionsResponse: {
      type: 'object',
      properties: {
        current_plan: {
          type: 'object',
          properties: {
            plan_id: { type: 'integer', example: 1 },
            plan_code: { type: 'string', example: 'basic' },
            plan_price: { type: 'number', format: 'float', example: 0.00 },
            valid_until: { type: 'string', format: 'date', nullable: true, example: '2028-03-15' },
          },
        },
        eligible_upgrades: { type: 'array', items: { $ref: '#/components/schemas/Plan' } },
      },
    },
  },

  securitySchemes: {
    BearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Student JWT access token. Obtain via POST /auth/login.',
    },
  },
};

// ─────────────────────────────────────────────
// API PATHS
// ─────────────────────────────────────────────
export const paymentsSwaggerPaths = {

  '/payments/plans': {
    get: {
      tags: ['Payments'],
      summary: 'Get all active plans',
      description: 'Returns all active subscription plans. No authentication required.',
      operationId: 'getPlans',
      responses: {
        200: {
          description: 'Plans fetched successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  code: { type: 'integer', example: 200 },
                  message: { type: 'string', example: 'Plans fetched.' },
                  data: { type: 'array', items: { $ref: '#/components/schemas/Plan' } },
                },
              },
            },
          },
        },
        500: { description: 'Internal server error.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/payments/create-order': {
    post: {
      tags: ['Payments'],
      summary: 'Create a payment order',
      description: `
**Step 1 of the payment flow.**

- Validates that the student does not already own the course with the same plan.
- Supports upgrades: if the student has an active purchase with a lower-priced plan, a new order is created with \`is_upgrade = true\`.
- Creates an ILP \`orders\` record with \`status = pending\`.
- Calls the Razorpay Orders API and stores the \`gateway_order_id\`.
- Returns order details including a pricing breakdown for the frontend checkout UI.

> **Frontend:** Use the returned \`gateway_order_id\` and \`razorpay_key_id\` to open the Razorpay JS SDK modal.
> **After Razorpay success:** Call \`POST /payments/verify-payment\` with the payment details.
      `,
      operationId: 'createOrder',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateOrderRequest' },
            examples: {
              basicPlan: { summary: 'Basic plan purchase', value: { course_id: 1, plan_id: 1 } },
              proPlan: { summary: 'Pro plan purchase', value: { course_id: 1, plan_id: 2 } },
              upgradePlan: { summary: 'Upgrade from basic to pro', value: { course_id: 1, plan_id: 3 } },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Order created.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  code: { type: 'integer', example: 201 },
                  message: { type: 'string', example: 'Order created. Proceed to payment.' },
                  data: { $ref: '#/components/schemas/OrderCreatedData' },
                },
              },
            },
          },
        },
        400: { description: 'Invalid inputs or course is free.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { description: 'Unauthorized.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: {
          description: 'Not a student, or attempted a plan downgrade.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' }, example: { status: 'error', code: 403, message: 'Downgrading to a lower plan is not supported.' } } },
        },
        404: { description: 'Course or plan not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        409: {
          description: 'Already enrolled with the same plan.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' }, example: { status: 'error', code: 409, message: 'You already have an active enrollment with this plan.' } } },
        },
        422: { description: 'Validation error.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorResponse' } } } },
        503: {
          description: 'Razorpay gateway unavailable.',
          headers: { 'Retry-After': { schema: { type: 'integer' }, description: 'Seconds to wait before retrying.' } },
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
      },
    },
  },

  '/payments/orders/{orderId}': {
    get: {
      tags: ['Payments'],
      summary: 'Get order status',
      description: 'Poll the status of a specific order.',
      operationId: 'getOrderStatus',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'orderId', in: 'path', required: true, schema: { type: 'integer' }, description: 'ILP internal order ID' },
      ],
      responses: {
        200: {
          description: 'Order status fetched.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  code: { type: 'integer', example: 200 },
                  message: { type: 'string', example: 'Order status fetched.' },
                  data: { $ref: '#/components/schemas/OrderStatus' },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Order not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        422: { description: 'Invalid orderId.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorResponse' } } } },
      },
    },
  },

  '/payments/orders/{orderId}/cancel': {
    post: {
      tags: ['Payments'],
      summary: 'Cancel a pending order',
      description: 'Student cancels a pending order. Cannot cancel paid or expired orders.',
      operationId: 'cancelOrder',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'orderId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        200: {
          description: 'Order cancelled.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  code: { type: 'integer', example: 200 },
                  message: { type: 'string', example: 'Order cancelled successfully.' },
                  data: { type: 'object', nullable: true, example: null },
                },
              },
            },
          },
        },
        400: { description: 'Order is not in pending state.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { description: 'Unauthorized.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Order not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/payments/upgrade-options/{courseId}': {
    get: {
      tags: ['Payments'],
      summary: 'Get upgrade options for a course',
      description: 'Returns current plan and eligible upgrade plans (price strictly higher than current). Returns 404 if no active purchase exists.',
      operationId: 'getUpgradeOptions',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'courseId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        200: {
          description: 'Upgrade options fetched.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  code: { type: 'integer', example: 200 },
                  message: { type: 'string', example: 'Upgrade options fetched.' },
                  data: { $ref: '#/components/schemas/UpgradeOptionsResponse' },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'User is not a student.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: {
          description: 'No active purchase found for this course.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' }, example: { status: 'error', code: 404, message: 'No active purchase found for this course.' } } },
        },
        422: { description: 'Invalid courseId.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorResponse' } } } },
      },
    },
  },

  // ── NEW: Frontend-driven payment verification ────────────────────────────

  '/payments/verify-payment': {
    post: {
      tags: ['Payments - Payment Verification'],
      summary: 'Verify and process a payment (frontend-driven)',
      description: `
**Step 2 of the new payment flow (replaces webhook dependency).**

### When to call this
After Razorpay payment success callback fires (Razorpay success handler). Frontend immediately calls this endpoint with payment details.

### Request body
The Razorpay success callback provides:
- \`razorpay_order_id\` → \`razorpayOrderId\`
- \`razorpay_payment_id\` → \`razorpayPaymentId\`
- \`razorpay_signature\` → \`razorpaySignature\`

### Processing flow
1. **Validate input**: Check all three fields are present.
2. **Verify signature**: HMAC-SHA256 signature verification (prevents tampering).
3. **Fetch order**: Load order details from database to get amount.
4. **Construct payment entity**: Build minimal payment object for processWebhook.
5. **Call core logic**: Invoke PaymentService.processWebhook (same as webhook handler).
6. **Return response**: HTTP 200 with payment details or error.

### Security
- ✅ JWT authentication required (logged-in students only).
- ✅ Signature verification prevents frontend tampering.
- ✅ Server-side verification — frontend cannot bypass security.
- ✅ Idempotent — calling twice with same data returns same result.

### Response behavior
| Status | Meaning |
|--------|---------|
| **200** | Payment verified, enrollment active, receipt queued. |
| **400** | Invalid signature, missing fields, or signature mismatch. |
| **404** | Order not found in database. |
| **500** | Server error (DB issue, service error, etc.). |

### Idempotency
Calling this endpoint twice with the same payment details is safe:
- First call: Payment processed, enrollment created.
- Second call: Already processed, returns \`already_processed: true\`.
- Result: No duplicate enrollments.

### Advantages over webhooks
- ✅ Synchronous — response within 100-500ms (not seconds/minutes).
- ✅ Deterministic — no webhook retries or failures.
- ✅ User feedback — frontend immediately knows enrollment status.
- ✅ No polling — frontend doesn't need to wait/check status.
- ✅ Error clarity — HTTP status + message clearly indicate issue.
      `,
      operationId: 'verifyPayment',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/VerifyPaymentRequest' },
            example: {
              razorpayOrderId: 'order_30EK3e3oeHyVnK',
              razorpayPaymentId: 'pay_30EK0eHztvYVqO',
              razorpaySignature: '9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d',
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Payment verified and processed successfully. Enrollment is now active.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  code: { type: 'integer', example: 200 },
                  message: { type: 'string', example: 'Payment verified and processed' },
                  data: { $ref: '#/components/schemas/VerifyPaymentResponseData' },
                },
              },
            },
          },
        },
        400: {
          description: 'Invalid signature, missing fields, or signature verification failed.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              examples: {
                missingFields: {
                  summary: 'Missing required fields',
                  value: { status: 'error', code: 400, message: 'Missing required payment verification fields: razorpayOrderId, razorpayPaymentId, razorpaySignature' },
                },
                invalidSignature: {
                  summary: 'Signature verification failed',
                  value: { status: 'error', code: 400, message: 'Payment signature verification failed' },
                },
              },
            },
          },
        },
        401: {
          description: 'Unauthorized — JWT token missing, invalid, or expired.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
        404: {
          description: 'Order not found in database. Order may have expired or been deleted.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: { status: 'error', code: 404, message: 'Order not found' },
            },
          },
        },
        500: {
          description: 'Internal server error during payment processing (DB error, enrollment failure, etc.).',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: { status: 'error', code: 500, message: 'Payment verification failed' },
            },
          },
        },
      },
    },
  },

  // ── Webhook (Deprecated) ────────────────────────────────────────────────

  '/payments/webhook': {
    post: {
      tags: ['Payments - Webhook (Deprecated)'],
      summary: 'Razorpay webhook handler (DEPRECATED)',
      description: `
⚠️ **DEPRECATED** — This endpoint is no longer the primary payment verification flow.

### Deprecation notice
**New integrations should use \`POST /payments/verify-payment\` instead.**

This webhook endpoint is kept for **backwards compatibility only**. If you still have Razorpay webhooks configured,
they will continue to work. However:

- **Frontend should call** \`POST /payments/verify-payment\` after Razorpay success callback.
- **Webhooks will be ignored** once frontend verification is active (payments processed twice is prevented by idempotency).
- **Plan to disable webhooks** in Razorpay settings after 1 month of production usage.
- **Remove this endpoint** after 2-3 months of zero webhook traffic.

---

### Historical documentation (kept for reference)

**Called by Razorpay only — NOT by the frontend.**

### Response behaviour
This endpoint **always returns HTTP 200**, regardless of processing outcome.
Returning any non-2xx status causes Razorpay to retry the event up to 5 times over 24 hours,
which risks duplicate enrollment processing. Instead, all outcomes are handled internally:

| Scenario | Internal action |
|---|---|
| \`payment.captured\` — success | Enrollment activated, receipt queued |
| Duplicate event (\`is_processed = 1\`) | Skipped, logged as \`info\` |
| Unsupported event type | Silently ignored, logged as \`info\` |
| Missing \`payload.payment.entity\` | Logged as \`warn\`, no processing |
| Body parse failure | Logged as \`error\`, no processing |
| Processing error (DB / amount mismatch / etc.) | Logged as \`error\` with full context (\`razorpay_order_id\`, \`razorpay_payment_id\`, error message) for manual replay |

### Processing steps (on \`payment.captured\` only)
1. Parse body — if invalid JSON, log and return.
2. Check \`event === 'payment.captured'\` — if not, log and return.
3. Verify HMAC-SHA256 signature (skipped in \`development\` env).
4. Idempotency check — if \`order.is_processed = 1\`, log and return.
5. Validate order state (\`pending\`) and amount (must match \`final_amount\` within ±0.01).
6. **DB transaction:** mark order paid → insert payment → cancel old purchase (if upgrade) → create course_purchase → ensure enrollment → upsert subscription → log activity.
7. Trigger async receipt generation (outside the transaction, with 3-attempt retry).

### Security
- Exclude from JWT auth middleware.
- Restrict to Razorpay's published IP ranges at the infrastructure level.

### Migration path
1. **Now**: Both webhook and verify-payment endpoints are active. Frontend uses verify-payment.
2. **Week 2**: Monitor logs, confirm webhook traffic is zero.
3. **Week 4**: Disable webhook in Razorpay settings.
4. **Month 3**: Remove this endpoint from codebase.
      `,
      operationId: 'handleWebhook',
      deprecated: true,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/WebhookPayload' },
            example: {
              event: 'payment.captured',
              payload: {
                payment: {
                  entity: {
                    id: 'pay_Razorpay456def',
                    order_id: 'order_Razorpay123abc',
                    amount: 99900,
                    currency: 'INR',
                    method: 'upi',
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: '**Always returned**, regardless of processing outcome. See description for per-scenario behaviour.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'ok' },
                },
              },
            },
          },
        },
      },
    },
  },

  '/payments/me/payments': {
    get: {
      tags: ['Payments'],
      summary: "Get student's payment history",
      description: 'Paginated list of all confirmed payments for the authenticated student.',
      operationId: 'getPaymentHistory',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
      ],
      responses: {
        200: { description: 'Payment history fetched.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentHistoryResponse' } } } },
        401: { description: 'Unauthorized.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/payments/{paymentId}': {
    get: {
      tags: ['Payments'],
      summary: 'Get payment details',
      description: 'Full details of a single payment. Students can only view their own payments.',
      operationId: 'getPaymentDetails',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'paymentId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        200: {
          description: 'Payment details fetched.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  code: { type: 'integer', example: 200 },
                  message: { type: 'string', example: 'Payment details fetched.' },
                  data: { $ref: '#/components/schemas/Payment' },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Payment not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/payments/{paymentId}/receipt': {
    get: {
      tags: ['Payments'],
      summary: 'Get payment receipt',
      description: 'Returns receipt details for a completed payment. Generated asynchronously — if not yet ready, returns 404 with a retry message.',
      operationId: 'getReceipt',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'paymentId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        200: {
          description: 'Receipt available.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  code: { type: 'integer', example: 200 },
                  message: { type: 'string', example: 'Receipt fetched.' },
                  data: { $ref: '#/components/schemas/Receipt' },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: {
          description: 'Receipt not yet generated.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' }, example: { status: 'error', code: 404, message: 'Receipt not yet available. Please try again shortly.' } } },
        },
      },
    },
  },

  '/payments/me/purchases': {
    get: {
      tags: ['Payments'],
      summary: "Get student's course purchases",
      description: 'All course purchases (access entitlements) for the authenticated student.',
      operationId: 'getStudentPurchases',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
      ],
      responses: {
        200: { description: 'Purchases fetched.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PurchasesResponse' } } } },
        401: { description: 'Unauthorized.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },
};

// ── Tag definitions ──────────────────────────────────────────────────
const paymentsSwaggerTags = [
  {
    name: 'Payments',
    description: 'Order creation, payment history, receipts, and course purchases.',
  },
  {
    name: 'Payments - Payment Verification',
    description: 'Frontend-driven payment verification endpoint. Called after Razorpay success callback.',
  },
  {
    name: 'Payments - Webhook (Deprecated)',
    description: 'Razorpay webhook handler (DEPRECATED). Use POST /payments/verify-payment instead.',
  },
];

export const paymentsSwagger = {
  schemas: paymentsSwaggerComponents.schemas,
  paths: paymentsSwaggerPaths,
  tags: paymentsSwaggerTags,
};