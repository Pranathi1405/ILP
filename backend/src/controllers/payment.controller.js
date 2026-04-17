//Author: Harshitha Ravuri
/**
 * Payment Controller
 *
 * HTTP layer only — reads req, calls PaymentService, writes res.
 * No business logic or DB calls here.
 */

import PaymentService from '../services/payment.service.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/responseHandler.js';
import { getStudentIdByUserId } from '../models/targetResolution.model.js';
import razorpayClient from '../integrations/razorpay/razorpay.client.js';
import PaymentModel from '../models/payment.model.js';
import logger from '../utils/logger.js';

// ─────────────────────────────────────────────
// ORDER ENDPOINTS
// ─────────────────────────────────────────────

/**
 * POST /payments/create-order
 * Create an ILP order and a Razorpay order.
 * Handles both fresh purchases and plan upgrades.
 * Returns order + pricing details for the frontend Razorpay SDK.
 */
export const createOrder = async (req, res) => {
  try {
    const { course_id, plan_id } = req.body;
    const studentId = await getStudentIdByUserId(req.user.id);
    console.log("BODY:", req.body);
    console.log("USER:", req.user.id);    
    const orderDetails = await PaymentService.createOrder(studentId, course_id, plan_id);

    const message = orderDetails.is_upgrade
      ? 'Upgrade order created. Proceed to payment.'
      : 'Order created. Proceed to payment.';

    return sendSuccess(res, 201, message, orderDetails);
  } catch (err) {
    return sendError(res, err.statusCode || 500, err.message);
  }
};

/**
 * GET /payments/orders/:orderId
 * Poll the status of an order (e.g. while student is on the payment pending screen).
 */
export const getOrderStatus = async (req, res) => {
  try {
    const studentId = await getStudentIdByUserId(req.user.id);
    const orderId   = parseInt(req.params.orderId, 10);

    const orderStatus = await PaymentService.getOrderStatus(orderId, studentId);

    return sendSuccess(res, 200, 'Order status fetched.', orderStatus);
  } catch (err) {
    return sendError(res, err.statusCode || 500, err.message);
  }
};

/**
 * POST /payments/orders/:orderId/cancel
 * Cancel a pending order before payment is completed.
 */
export const cancelOrder = async (req, res) => {
  try {
    const studentId = await getStudentIdByUserId(req.user.id);
    const orderId   = parseInt(req.params.orderId, 10);

    const result = await PaymentService.cancelOrder(orderId, studentId);

    return sendSuccess(res, 200, result.message, null);
  } catch (err) {
    return sendError(res, err.statusCode || 500, err.message);
  }
};

// ─────────────────────────────────────────────
// UPGRADE ENDPOINT
// ─────────────────────────────────────────────

/**
 * GET /payments/upgrade-options/:courseId
 *
 * Returns the student's current plan for the given course and the list of
 * plans they can upgrade to (all plans priced strictly above current plan).
 *
 * Frontend uses this to render the upgrade screen before calling create-order.
 *
 * Response shape:
 * {
 *   current_plan: { plan_id, plan_code, plan_price, valid_until },
 *   eligible_upgrades: [ ...plans ]
 * }
 */
export const getUpgradeOptions = async (req, res) => {
  try {
    const studentId = await getStudentIdByUserId(req.user.id);
    const courseId  = parseInt(req.params.courseId, 10);

    const options = await PaymentService.getUpgradeOptions(studentId, courseId);

    return sendSuccess(res, 200, 'Upgrade options fetched.', options);
  } catch (err) {
    return sendError(res, err.statusCode || 500, err.message);
  }
};

// ─────────────────────────────────────────────
// FRONTEND-DRIVEN PAYMENT VERIFICATION (NEW)
// ─────────────────────────────────────────────

/**
 * POST /payments/verify-payment
 * 
 * Frontend-driven payment verification endpoint.
 * 
 * Called from frontend after Razorpay success handler completes.
 * Instead of relying on webhook, frontend sends payment details for verification.
 * 
 * Request body:
 * {
 *   "razorpayOrderId": "order_xxx",
 *   "razorpayPaymentId": "pay_xxx",
 *   "razorpaySignature": "signature_hex"
 * }
 * 
 * Flow:
 * 1. Verify HMAC signature (prevents tampering)
 * 2. Fetch order from DB using gateway_order_id
 * 3. Construct paymentEntity object
 * 4. Call processWebhook (same business logic as webhook handler)
 * 5. Return success/error
 * 
 * IMPORTANT:
 * - Signature verification is mandatory — frontend cannot bypass this
 * - All business logic stays in PaymentService.processWebhook (NO duplication)
 * - This endpoint must be protected by JWT auth (logged-in users only)
 */
export const verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    // ── 1. VALIDATE INPUT ───────────────────────────────────────────────
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return sendError(res, 400, 'Missing required payment verification fields: razorpayOrderId, razorpayPaymentId, razorpaySignature');
    }

    const logCtx = { razorpayOrderId, razorpayPaymentId };

    logger.info('Payment verification initiated', logCtx);

    // ── 2. VERIFY HMAC SIGNATURE ────────────────────────────────────────
    // This prevents frontend tampering — signature is generated server-side
    // and must match what Razorpay originally sent.
    let isValidSignature;
    try {
      isValidSignature = razorpayClient.verifyPaymentSignature(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      );
    } catch (signatureErr) {
      logger.warn('Signature verification error', {
        ...logCtx,
        error: signatureErr.message,
      });
      return sendError(res, 400, 'Invalid payment signature');
    }

    if (!isValidSignature) {
      logger.warn('Signature verification failed — possible tampering attempt', logCtx);
      return sendError(res, 400, 'Payment signature verification failed');
    }

    logger.info('Signature verified successfully', logCtx);

    // ── 3. FETCH ORDER FROM DATABASE ────────────────────────────────────
    // We need the order to:
    //   - Verify ownership (optional, processWebhook will check)
    //   - Get final_amount for constructing paymentEntity
    //   - Validate order exists
    const order = await PaymentModel.findOrderByGatewayId(razorpayOrderId);

    if (!order) {
      logger.warn('Order not found for gateway_order_id', logCtx);
      return sendError(res, 404, 'Order not found');
    }

    logger.info('Order found', {
      ...logCtx,
      order_id: order.order_id,
      student_id: order.student_id,
    });

    // ── 4. CONSTRUCT PAYMENT ENTITY ─────────────────────────────────────
    // Since we don't have the full webhook payload, we construct a minimal
    // paymentEntity object with the fields needed by processWebhook.
    // The actual payment details (method, etc.) will be retrieved from Razorpay
    // if needed in the future, but for now we use what we have.
    const paymentEntity = {
      id: razorpayPaymentId,
      order_id: razorpayOrderId,
      amount: order.final_amount * 100,  // Convert rupees to paise
      currency: 'INR',
      payment_method: 'unknown',  // Will be fetched from Razorpay if needed later
      status: 'captured',  // Frontend only calls this after Razorpay success
    };

    logger.info('Constructed payment entity', {
      ...logCtx,
      amount: paymentEntity.amount,
      currency: paymentEntity.currency,
    });

    // ── 5. CALL CORE BUSINESS LOGIC (UNCHANGED) ────────────────────────
    // processWebhook handles:
    //   - Signature verification (again, as defense-in-depth)
    //   - Idempotency check
    //   - Payment record creation
    //   - Enrollment pipeline
    //   - Upgrade handling
    //   - Analytics events
    //   - Receipt generation
    // NO logic is duplicated — everything stays in the service layer.
    const result = await PaymentService.processWebhook(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      paymentEntity
    );

    if (result?.already_processed) {
      logger.info('Payment already processed (idempotent)', logCtx);
    } else {
      logger.info('Payment verified and processed successfully', {
        ...logCtx,
        payment_id: result?.payment_id,
        is_upgrade: result?.is_upgrade,
      });
    }

    // ── 6. RETURN SUCCESS RESPONSE ──────────────────────────────────────
    return sendSuccess(res, 200, 'Payment verified and processed', {
      payment_id: result?.payment_id,
      order_id: result?.order_id,
      is_upgrade: result?.is_upgrade,
      already_processed: result?.already_processed || false,
    });

  } catch (err) {
    // Log error but don't expose internal details to frontend
    logger.error('Payment verification failed', {
      error: err.message,
      statusCode: err.statusCode,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    });

    return sendError(res, err.statusCode || 500, err.message);
  }
};

// ─────────────────────────────────────────────
// WEBHOOK (DEPRECATED — kept for backwards compatibility)
// ─────────────────────────────────────────────

/**
 * POST /payments/webhook
 * 
 * ⚠️ DEPRECATED: This endpoint is no longer the primary payment verification flow.
 * 
 * Razorpay webhook handler. Verifies HMAC and processes the enrollment pipeline.
 * Also handles the upgrade pipeline when order.is_upgrade = 1.
 *
 * WHY we always return 200 to Razorpay:
 *   Razorpay retries any non-2xx response up to 5 times over 24 hours.
 *   Returning 500 on a processing error would cause duplicate processing attempts.
 *   Instead, we always ACK with 200 and handle failures internally via logging +
 *   a failed_webhooks record so ops can replay them manually if needed.
 *
 * MIGRATION NOTE:
 * This endpoint may still receive events from Razorpay if it was registered in the
 * webhook settings. We continue to process them for backwards compatibility.
 * However, new payment flows use verifyPayment() endpoint instead.
 * 
 * To fully deprecate:
 *   1. Update Razorpay webhook registration to disable this endpoint
 *   2. Monitor logs for any remaining webhook calls
 *   3. After 1 month of zero traffic, remove this endpoint
 *
 * IMPORTANT: This endpoint must be excluded from JWT auth middleware.
 *            The raw request body must be preserved for signature verification.
 */
export const handleWebhook = async (req, res) => {
  // Always ACK immediately — Razorpay needs this within 5 seconds
  res.status(200).json({ status: 'ok' });

  logger.warn('DEPRECATED: handleWebhook called — consider migrating to verifyPayment endpoint');

  // ── Parse body ───────────────────────────────────────────────────
  let body;
  try {
    body = Buffer.isBuffer(req.body)
      ? JSON.parse(req.body.toString())
      : req.body;
  } catch (parseErr) {
    logger.error('Webhook: failed to parse body', { error: parseErr.message });
    return;
  }

  const event           = body.event;
  const paymentEntity   = body.payload?.payment?.entity;
  const razorpaySignature = req.headers['x-razorpay-signature'];

  // ── Only handle payment.captured events ─────────────────────────
  // Razorpay sends multiple event types (payment.failed, refund.created, etc.)
  // Silently ignore anything that isn't a captured payment.
  if (event !== 'payment.captured') {
    logger.info('Webhook: ignored non-capture event', { event });
    return;
  }

  if (!paymentEntity) {
    logger.warn('Webhook: missing payload.payment.entity', { event, body });
    return;
  }

  const razorpayOrderId   = paymentEntity.order_id;
  const razorpayPaymentId = paymentEntity.id;

  // ── Structured context for all logs in this request ─────────────
  const logCtx = { razorpayOrderId, razorpayPaymentId, event };

  logger.info('Webhook: received payment.captured', logCtx);

  // ── Process — errors are caught and logged, never thrown to Razorpay ──
  try {
    const result = await PaymentService.processWebhook(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      paymentEntity
    );

    if (result?.already_processed) {
      logger.info('Webhook: duplicate event — already processed', logCtx);
    } else {
      logger.info('Webhook: processed successfully', {
        ...logCtx,
        payment_id: result?.payment_id,
        is_upgrade: result?.is_upgrade,
      });
    }

  } catch (err) {
    // Log full context so ops can identify and manually replay failed webhooks
    logger.error('Webhook: processing failed', {
      ...logCtx,
      error:      err.message,
      statusCode: err.statusCode,
      stack:      process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    });

    // TODO: Insert into failed_webhooks table here for a retry/replay queue
    // await FailedWebhookModel.create({ razorpayOrderId, razorpayPaymentId, error: err.message, raw_body: body });
  }
};

// ─────────────────────────────────────────────
// PAYMENT HISTORY & DETAILS
// ─────────────────────────────────────────────

/**
 * GET /students/me/payments
 * Get the logged-in student's payment history (paginated).
 */
export const getPaymentHistory = async (req, res) => {
  try {
    const studentId = await getStudentIdByUserId(req.user.id);
    const { page, limit } = req.query;

    const { rows, total } = await PaymentService.getPaymentHistory(studentId, { page, limit });

    const pageNum  = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;

    return sendPaginated(res, 'Payment history fetched.', rows, {
      total,
      page:        pageNum,
      limit:       limitNum,
      total_pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    return sendError(res, err.statusCode || 500, err.message);
  }
};

/**
 * GET /payments/:paymentId
 * Get details of a single payment.
 */
export const getPaymentDetails = async (req, res) => {
  try {
    const studentId = await getStudentIdByUserId(req.user.id);
    const paymentId = parseInt(req.params.paymentId, 10);

    const payment = await PaymentService.getPaymentDetails(paymentId, studentId);

    return sendSuccess(res, 200, 'Payment details fetched.', payment);
  } catch (err) {
    return sendError(res, err.statusCode || 500, err.message);
  }
};

// ─────────────────────────────────────────────
// RECEIPTS
// ─────────────────────────────────────────────

/**
 * GET /payments/:paymentId/receipt
 * Get the receipt URL for a completed payment.
 */
export const getReceipt = async (req, res) => {
  try {
    const studentId = await getStudentIdByUserId(req.user.id);
    const paymentId = parseInt(req.params.paymentId, 10);

    const receipt = await PaymentService.getReceipt(paymentId, studentId);

    return sendSuccess(res, 200, 'Receipt fetched.', receipt);
  } catch (err) {
    return sendError(res, err.statusCode || 500, err.message);
  }
};

// ─────────────────────────────────────────────
// PURCHASES
// ─────────────────────────────────────────────

/**
 * GET /students/me/purchases
 * Get all course purchases for the logged-in student (paginated).
 */
export const getStudentPurchases = async (req, res) => {
  try {
    const studentId = await getStudentIdByUserId(req.user.id);
    const { page, limit } = req.query;

    const { rows, total } = await PaymentService.getStudentPurchases(studentId, { page, limit });

    const pageNum  = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;

    return sendPaginated(res, 'Purchases fetched.', rows, {
      total,
      page:        pageNum,
      limit:       limitNum,
      total_pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    return sendError(res, err.statusCode || 500, err.message);
  }
};

// ─────────────────────────────────────────────
// PLANS
// ─────────────────────────────────────────────

/**
 * GET /payments/plans
 * Get all subscription plans (shown before checkout).
 */
export const getPlans = async (req, res) => {
  try {
    const plans = await PaymentService.getAllPlans();
    return sendSuccess(res, 200, 'Plans fetched.', plans);
  } catch (err) {
    return sendError(res, err.statusCode || 500, err.message);
  }
};