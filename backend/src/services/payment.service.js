//Author: Harshitha Ravuri
/**
 * Payment Service
 *
 * Pure business logic — NO raw SQL here.
 * DB work is delegated entirely to PaymentModel.
 * The only reason pool is imported is to obtain a connection for transactions.
 */

import crypto from 'crypto';
import pool from '../config/database.config.js';
import PaymentModel from '../models/payment.model.js';
import razorpayClient from '../integrations/razorpay/razorpay.client.js';
import logger from '../utils/logger.js';
import { getUserIdByStudentId } from '../models/targetResolution.model.js';
import {emitAnalyticsEvent} from '../queues/analyticsQueue.js';
import { ANALYTICS_EVENTS } from '../constants/analyticsTypes.js';
import { notifyStudentCourseEnrollment } from './systemNotifications.service.js';
// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

/**
 * The plan_code value for the basic plan.
 * Basic plan → student pays only the course price (no plan addon).
 * Any other plan (pro, premium, etc.) → course price + plan price.
 *
 * Change this only if the plan_code in the DB changes.
 */
const BASIC_PLAN_CODE = 'basic';

// ─────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────

/** Convert rupees to paise (Razorpay uses the smallest currency unit). */
const rupeesToPaise = (amount) => Math.round(parseFloat(amount) * 100);

/** Build a receipt reference string once we have the ILP order_id. */
const buildReceiptRef = (orderId) => `ILP-ORD-${orderId}-${Date.now()}`;

/** Build a human-readable receipt number for the payment_receipts table. */
const buildReceiptNumber = () => {
  const year = new Date().getFullYear();
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `RCP-${year}-${rand}`;
};

/** Return a Date 15 minutes from now (order expiry). */
const orderExpiresAt = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 15);
  return d;
};

/** Return a Date `days` days from now (subscription / purchase validity). */
const dateAfterDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

/**
 * Calculate the final charge based on plan type.
 *
 * Pricing rules:
 *   - basic plan  → finalAmount = coursePrice  (plan addon is free)
 *   - any other   → finalAmount = coursePrice + planPrice
 *
 * @param {string} planCode
 * @param {number} coursePrice
 * @param {number} planPrice
 * @returns {{ isBasicPlan: boolean, planAddon: number, finalAmount: number }}
 */
const calculatePricing = (planCode, coursePrice, planPrice) => {
  const isBasicPlan = planCode.toLowerCase() === BASIC_PLAN_CODE;
  const planAddon   = isBasicPlan ? 0 : planPrice;
  const finalAmount = coursePrice + planAddon;
  return { isBasicPlan, planAddon, finalAmount };
};

// ─────────────────────────────────────────────
// ORDER CREATION  (new purchase)
// ─────────────────────────────────────────────

/**
 * Validate inputs, create ILP order, call Razorpay, return checkout details.
 *
 * Upgrade detection:
 *   - No existing purchase            → fresh purchase
 *   - Same plan_id as current         → 409 duplicate
 *   - Different (higher-priced) plan  → upgrade, allowed
 *   - Lower-priced plan               → downgrade, blocked (403)
 *
 * Pricing:
 *   basic plan  → charge = course.price
 *   other plans → charge = course.price + plan.price
 *
 * @param {number} studentId
 * @param {number} courseId
 * @param {number} planId
 * @returns {object} order details for the frontend Razorpay SDK
 */
const createOrder = async (studentId, courseId, planId) => {
  // ── 1. Check for any existing active purchase ──────────────────────
  const existingPurchase = await PaymentModel.findActivePurchaseWithPlan(studentId, courseId);
  let isUpgrade = false;

  if (existingPurchase) {
    // Same plan → genuine duplicate, reject
    if (existingPurchase.plan_id === planId) {
      const err = new Error('You already have an active enrollment with this plan.');
      err.statusCode = 409;
      throw err;
    }

    const existingPlanPrice = parseFloat(existingPurchase.plan_price);

    // ── 2. Fetch the new plan to compare prices ──────────────────────
    // We need the new plan price before the combined query below,
    // so we can do the upgrade/downgrade check.
    const newPlan = await PaymentModel.findPlanById(planId);
    if (!newPlan) {
      const err = new Error('Selected plan not found.');
      err.statusCode = 400;
      throw err;
    }

    const newPlanPrice = parseFloat(newPlan.price);

    // Downgrade (cheaper plan) is not allowed through this flow
    if (newPlanPrice < existingPlanPrice) {
      const err = new Error(
        'Downgrading to a lower plan is not supported. Please contact support if you need assistance.'
      );
      err.statusCode = 403;
      throw err;
    }

    // Higher-priced plan → valid upgrade
    isUpgrade = true;
  }

  // ── 3. Fetch course + plan in one optimized JOIN query ─────────────
  const courseAndPlan = await PaymentModel.findCourseAndPlan(courseId, planId);

  if (!courseAndPlan) {
    const err = new Error('Course or plan not found, or course is not available.');
    err.statusCode = 404;
    throw err;
  }

  const {
    is_free,
    plan_code,
    plan_name,
    course_price: rawCoursePrice,
    plan_price:   rawPlanPrice,
    duration_days,
  } = courseAndPlan;

  // ── 4. Free-course guard ───────────────────────────────────────────
  if (is_free) {
    const err = new Error('This course is free. Please use the enroll endpoint directly.');
    err.statusCode = 400;
    throw err;
  }

  // ── 5. Pricing calculation ─────────────────────────────────────────
  // mysql2 returns DECIMAL columns as strings — always parseFloat before arithmetic.
  const coursePrice    = parseFloat(rawCoursePrice);
  const planPrice      = parseFloat(rawPlanPrice);
  const discountAmount = 0;  // Coupon / promo logic can be wired here later

  const { isBasicPlan, planAddon, finalAmount: baseAmount } = calculatePricing(
    plan_code,
    coursePrice,
    planPrice
  );

  const finalAmount = baseAmount - discountAmount;
  const expiresAt   = orderExpiresAt();

  logger.info('Pricing snapshot', {
    student_id:    studentId,
    course_id:     courseId,
    plan_id:       planId,
    plan_code,
    course_price:  coursePrice,
    plan_addon:    planAddon,
    discount:      discountAmount,
    final_amount:  finalAmount,
    is_upgrade:    isUpgrade,
  });

  // ── 6. Insert ILP order row ────────────────────────────────────────
  // original_price stores only the course base price for clean audit trails.
  // final_amount  is what Razorpay actually charges the student.
  // is_upgrade flag tells the webhook to cancel the old purchase row.
  const orderRow = await PaymentModel.createOrder({
    student_id:      studentId,
    course_id:       courseId,
    plan_id:         planId,
    original_price:  coursePrice,
    discount_amount: discountAmount,
    final_amount:    finalAmount,
    currency:        'INR',
    gateway:         'razorpay',
    receipt_ref:     `ILP-TEMP-${Date.now()}`,
    expires_at:      expiresAt,
    is_upgrade:      isUpgrade,
    notes: isBasicPlan
  ? {}
  : {
      type: isUpgrade ? 'upgrade' : 'purchase',
      plan_name,
      addon_price: planAddon,
      message: `${isUpgrade ? 'Upgrade' : 'Purchase'}: ${plan_name} add-on (+₹${planAddon.toFixed(2)})`
    },
  });

  const receiptRef = buildReceiptRef(orderRow.order_id);

  // ── 7. Call Razorpay Orders API ────────────────────────────────────
  let razorpayOrder;
  try {
    razorpayOrder = await razorpayClient.createRazorpayOrder(
      rupeesToPaise(finalAmount),
      'INR',
      receiptRef
    );
  } catch (razorpayErr) {
    await PaymentModel.deleteOrder(orderRow.order_id);
    logger.error('Razorpay order creation failed', {
      error:      razorpayErr.message,
      student_id: studentId,
      course_id:  courseId,
    });
    const err = new Error('Payment gateway is temporarily unavailable. Please try again.');
    err.statusCode = 503;
    err.retryAfter = 30;
    throw err;
  }

  // ── 8. Persist receipt_ref + gateway_order_id ─────────────────────
  await PaymentModel.updateOrderReceiptAndGatewayId(
    orderRow.order_id,
    receiptRef,
    razorpayOrder.id
  );

  logger.info('Order created', {
    order_id:         orderRow.order_id,
    gateway_order_id: razorpayOrder.id,
    student_id:       studentId,
    course_id:        courseId,
    plan_code,
    final_amount:     finalAmount,
    is_upgrade:       isUpgrade,
  });

  return {
    order_id:         orderRow.order_id,
    gateway_order_id: razorpayOrder.id,
    amount:           finalAmount,
    currency:         'INR',
    razorpay_key_id:  process.env.RAZORPAY_KEY_ID,
    expires_at:       expiresAt,
    is_upgrade:       isUpgrade,
    // Pricing breakdown for the frontend to display at checkout
    pricing: {
      course_price:  coursePrice,
      plan_addon:    planAddon,
      discount:      discountAmount,
      total:         finalAmount,
    },
  };
};

// ─────────────────────────────────────────────
// UPGRADE ELIGIBILITY CHECK
// ─────────────────────────────────────────────

/**
 * GET /payments/upgrade-options/:courseId
 *
 * Returns the student's current plan for a course and lists all plans
 * that are eligible upgrades (price strictly higher than current plan).
 * Used by the frontend to render the upgrade screen.
 *
 * @param {number} studentId
 * @param {number} courseId
 * @returns {{
 *   current_plan: object | null,
 *   eligible_upgrades: object[]
 * }}
 */
const getUpgradeOptions = async (studentId, courseId) => {
  const existingPurchase = await PaymentModel.findActivePurchaseWithPlan(studentId, courseId);

  if (!existingPurchase) {
    const err = new Error('No active purchase found for this course.');
    err.statusCode = 404;
    throw err;
  }

  const currentPlanPrice = parseFloat(existingPurchase.plan_price);

  // Fetch all plans and filter to those strictly more expensive than current
  const allPlans = await PaymentModel.getAllPlans();
  const eligibleUpgrades = allPlans.filter(
    (p) => parseFloat(p.price) > currentPlanPrice
  );

  return {
    current_plan: {
      plan_id:    existingPurchase.plan_id,
      plan_code:  existingPurchase.plan_code,
      plan_price: existingPurchase.plan_price,
      valid_until: existingPurchase.valid_until,
    },
    eligible_upgrades: eligibleUpgrades,
  };
};

// ─────────────────────────────────────────────
// WEBHOOK PROCESSING
// ─────────────────────────────────────────────
 
/**
 * Process a Razorpay `payment.captured` webhook event.
 *
 * All DB writes run inside a single transaction so that a mid-flight crash
 * leaves no partial state. is_processed = 1 guarantees idempotency on retries.
 *
 * Upgrade path (order.is_upgrade = 1):
 *   Step 8a — cancel old course_purchases row
 *   Step 8b — insert new course_purchases row
 *   Steps 9, 10 — enrollment and subscription upserts handle upgrade natively
 *
 * @param {string} razorpayOrderId
 * @param {string} razorpayPaymentId
 * @param {string} razorpaySignature
 * @param {object} razorpayPayload
 */
const processWebhook = async (
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  paymentEntity // ✅ this is payload.payment.entity
) => {
 
  // ── Step 1: Signature Verification ───────────────────────────────
  let signatureValid = false;
 
  if (process.env.NODE_ENV === "development") {
    console.log("⚠️ Skipping signature verification (DEV)");
    signatureValid = true;
  } else {
    try {
      signatureValid = razorpayClient.verifyPaymentSignature(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      );
    } catch (_) {
      signatureValid = false;
    }
  }
 
  if (!signatureValid) {
    logger.warn('Webhook: invalid signature', { razorpayOrderId });
    const err = new Error('Invalid webhook signature.');
    err.statusCode = 400;
    throw err;
  }
 
  // ── Step 2: Find order using gateway_order_id ────────────────────
  const order = await PaymentModel.findOrderByGatewayId(razorpayOrderId);
 
  if (!order) {
    logger.warn('Webhook: order not found', { razorpayOrderId });
    const err = new Error('Order not found.');
    err.statusCode = 404;
    throw err;
  }
 
  // ── Step 3: Idempotency check ────────────────────────────────────
  if (order.is_processed === 1) {
    logger.info('Webhook: already processed — skipping', {
      order_id: order.order_id
    });
    return { already_processed: true };
  }
 
  // ── Step 4: Validate order state ─────────────────────────────────
  if (order.status !== 'pending') {
    logger.warn('Webhook: order not pending', {
      order_id: order.order_id,
      status: order.status,
    });
 
    const err = new Error(`Order is '${order.status}', cannot process payment.`);
    err.statusCode = 422;
    throw err;
  }
 
  // ── Step 5: Amount verification ──────────────────────────────────
  const receivedInRupees = parseFloat(paymentEntity.amount) / 100;
 
  if (Math.abs(receivedInRupees - parseFloat(order.final_amount)) > 0.01) {
    logger.error('Webhook: amount mismatch', {
      order_id: order.order_id,
      expected: order.final_amount,
      received: receivedInRupees,
    });
 
    const err = new Error('Payment amount mismatch.');
    err.statusCode = 422;
    throw err;
  }
 
  // ── Step 6: Fetch plan ───────────────────────────────────────────
  const plan = await PaymentModel.findPlanById(order.plan_id);
 
  if (!plan) {
    const err = new Error('Plan not found.');
    err.statusCode = 422;
    throw err;
  }
 
  const validityDays = plan.duration_days || 730;
  const startDate = new Date();
  const endDate = dateAfterDays(validityDays);
  const isUpgrade = order.is_upgrade === 1;
 
  // ── Step 7: DB TRANSACTION ───────────────────────────────────────
  const conn = await pool.getConnection();
  await conn.beginTransaction();
 
  try {
 
    // Step 7.1: Mark order as paid
    await PaymentModel.markOrderAsPaid(order.order_id, conn);
 
    // Step 7.2: Insert payment
 const paymentId = await PaymentModel.createPayment(
  {
    student_id: order.student_id,
    course_id: order.course_id,
    order_id: order.order_id,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
 
    // ✅ FIX HERE
    razorpay_signature: razorpaySignature || "test_signature",
 
    amount: order.final_amount,
    currency: order.currency,
 
    // ✅ SAFE fallback
    payment_method: paymentEntity.method || null,
 
    payment_status: 'completed',
    transaction_id: razorpayPaymentId,
 
    description: isUpgrade
      ? `Plan upgrade — order #${order.order_id}`
      : `Course purchase — order #${order.order_id}`,
 
    // ✅ SAFE fallback
    metadata: paymentEntity || null,
  },
  conn
);
 
    // Step 7.3 + 7.4: Upsert course purchase
    // For upgrades: UPDATE the existing row in-place (avoids unique-key collision
    // that occurs when cancel + insert are used because the unique index on
    // course_purchases is on (student_id, course_id) with no status column).
    // For fresh purchases: INSERT a new row normally.
    await PaymentModel.upsertCoursePurchase(
      {
        student_id:  order.student_id,
        course_id:   order.course_id,
        payment_id:  paymentId,
        plan_id:     order.plan_id,
        valid_until: endDate,
      },
      isUpgrade,
      conn
    );
    console.log(isUpgrade ? "existing purchase updated in-place (upgrade)" : "new course purchase created");
    console.log("enrollment initiated");
    // Step 7.5: Ensure enrollment
    const enrollmentId = await PaymentModel.ensureEnrollment(
      order.student_id,
      order.course_id,
      conn
    );
      console.log("enrollment completed with id:", enrollmentId);
      const courseName = await PaymentModel.getCourseNameById(order.course_id);
      await notifyStudentCourseEnrollment(order.student_id, order.course_id,courseName);
    // Step 7.6: Subscription
    const userId = await getUserIdByStudentId(order.student_id);
    await PaymentModel.upsertTestSubscription(
      {
        user_id: userId,
        course_id: order.course_id,
        enrollment_id: enrollmentId,
        plan_id: order.plan_id,
        payment_id: paymentId,
        start_date: startDate,
        end_date: endDate,
      },
      conn
    );
 
    // Step 7.7: Activity log
    await PaymentModel.logActivity(
      userId,
      isUpgrade ? 'plan_upgraded' : 'payment_completed',
      isUpgrade ? 'Plan upgraded' : 'Course purchased',
      'payment',
      paymentId,
      {
        order_id: order.order_id,
        course_id: order.course_id,
        plan_id: order.plan_id,
        is_upgrade: isUpgrade,
      },
      conn
    );
    
 
    await conn.commit();
 
    logger.info('Webhook processed successfully', {
      order_id: order.order_id,
      payment_id: paymentId,
    });
 
    // Step 8: Async receipt
    setImmediate(() => _generateReceiptAsync(paymentId));
  setImmediate(async () => {
  try {


    const userId = await getUserIdByStudentId(order.student_id);

    // ─────────────────────────────────────────
    // 1. PAYMENT SUCCESS
    // ─────────────────────────────────────────
    await emitAnalyticsEvent(ANALYTICS_EVENTS.PAYMENT_SUCCESS, {
      userId,
      courseId: order.course_id,
      teacherUserId: order.teacher_id || null,
      amount: order.final_amount,
      paymentId,
      logId: null,
    });

    // ─────────────────────────────────────────
    // 2. COURSE ENROLLED
    // ─────────────────────────────────────────
    await emitAnalyticsEvent(ANALYTICS_EVENTS.COURSE_ENROLLED, {
      userId,
      courseId: order.course_id,
      enrollmentId,
      teacherUserId: order.teacher_id || null,
      logId: null,
    });

    // ─────────────────────────────────────────
    // 3. STUDENT ACTIVITY (purchase event)
    // ─────────────────────────────────────────
    await emitAnalyticsEvent(ANALYTICS_EVENTS.STUDENT_ACTIVITY, {
      userId,
      activityType: 'COURSE_PURCHASED',
      logId: null,
    });

    // ─────────────────────────────────────────
    // 4. COURSE STARTED (optional but powerful)
    // triggers engagement funnel immediately
    // ─────────────────────────────────────────
    await emitAnalyticsEvent(ANALYTICS_EVENTS.COURSE_STARTED, {
      userId,
      course_id: order.course_id,
      logId: null,
    });

  } catch (err) {
    logger.warn('Analytics emit failed after payment', { error: err.message });
  }
});
    return {
      payment_id: paymentId,
      order_id: order.order_id,
      is_upgrade: isUpgrade
    };
 
  } catch (err) {
    await conn.rollback();
    logger.error('Webhook transaction failed', { error: err.message });
    throw err;
  } finally {
    conn.release();
  }
};
// ─────────────────────────────────────────────
// ASYNC RECEIPT GENERATION  (outside transaction)
// ─────────────────────────────────────────────

/**
 * Generate and persist a receipt for a completed payment.
 * Called via setImmediate after the transaction commits.
 * Retries up to 3 times with exponential backoff on failure.
 *
 * @param {string} paymentId
 * @param {number} attempt
 */
const _generateReceiptAsync = async (paymentId, attempt = 1) => {
  try {
    const receiptNumber = buildReceiptNumber();

    // ✅ 1. Fetch payment details (create this in model if not exists)
    const payment = await PaymentModel.getPaymentFullDetails(paymentId);

    if (!payment) throw new Error('Payment not found for receipt');

    const tempPath = `./temp/${receiptNumber}.pdf`;

    // ✅ 2. Generate PDF
    await generateReceiptPDF(
      {
        receiptNumber,
        paymentId,
        userId: payment.user_id,
        courseId: payment.course_id,
        amount: payment.amount,
      },
      tempPath
    );

    // ✅ 3. Upload to GCS
    const receiptUrl = await uploadReceiptToGCS(
      tempPath,
      payment.user_id,
      payment.order_id
    );

    // ✅ 4. Save in DB
    await PaymentModel.createReceipt(paymentId, receiptNumber, receiptUrl);

    logger.info('Receipt generated', {
      payment_id: paymentId,
      receipt_number: receiptNumber,
      url: receiptUrl,
    });

  } catch (err) {
    if (attempt < 3) {
      const delayMs = attempt * 2000;
      setTimeout(() => _generateReceiptAsync(paymentId, attempt + 1), delayMs);
    } else {
      logger.error('Receipt failed after retries', {
        payment_id: paymentId,
        error: err.message,
      });
    }
  }
};
// ─────────────────────────────────────────────
// ORDER MANAGEMENT
// ─────────────────────────────────────────────

/**
 * Return order status details. Ownership is verified.
 */
const getOrderStatus = async (orderId, studentId) => {
  const order = await PaymentModel.findOrderById(orderId);

  if (!order || order.student_id !== studentId) {
    const err = new Error('Order not found.');
    err.statusCode = 404;
    throw err;
  }

  return {
    order_id:         order.order_id,
    status:           order.status,
    amount:           order.final_amount,
    currency:         order.currency,
    gateway_order_id: order.gateway_order_id,
    created_at:       order.created_at,
    expires_at:       order.expires_at,
    is_processed:     order.is_processed === 1,
    is_upgrade:       order.is_upgrade === 1,
  };
};

/**
 * Student-initiated cancellation of a pending order.
 */
const cancelOrder = async (orderId, studentId) => {
  const order = await PaymentModel.findOrderById(orderId);

  if (!order || order.student_id !== studentId) {
    const err = new Error('Order not found.');
    err.statusCode = 404;
    throw err;
  }

  if (order.status !== 'pending') {
    const err = new Error(`Cannot cancel an order with status '${order.status}'.`);
    err.statusCode = 400;
    throw err;
  }

  const cancelled = await PaymentModel.cancelOrder(orderId, studentId);
  if (!cancelled) {
    const err = new Error('Unable to cancel order. It may have just expired.');
    err.statusCode = 400;
    throw err;
  }

  return { message: 'Order cancelled successfully.' };
};

// ─────────────────────────────────────────────
// PAYMENT HISTORY & DETAILS
// ─────────────────────────────────────────────

const getPaymentHistory = async (studentId, { page, limit }) => {
  const pageNum  = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
  return PaymentModel.getPaymentHistory(studentId, { page: pageNum, limit: limitNum });
};

const getPaymentDetails = async (paymentId, studentId) => {
  const payment = await PaymentModel.findPaymentById(paymentId, studentId);
  if (!payment) {
    const err = new Error('Payment not found.');
    err.statusCode = 404;
    throw err;
  }
  return payment;
};

// ─────────────────────────────────────────────
// RECEIPTS
// ─────────────────────────────────────────────

const getReceipt = async (paymentId, studentId) => {
  const receipt = await PaymentModel.findReceiptByPaymentId(paymentId, studentId);
  if (!receipt) {
    const err = new Error('Receipt not yet available. Please try again shortly.');
    err.statusCode = 404;
    throw err;
  }
  return receipt;
};

// ─────────────────────────────────────────────
// PURCHASES
// ─────────────────────────────────────────────

const getStudentPurchases = async (studentId, { page, limit }) => {
  const pageNum  = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
  return PaymentModel.getStudentPurchases(studentId, { page: pageNum, limit: limitNum });
};

// ─────────────────────────────────────────────
// CRON HELPER
// ─────────────────────────────────────────────

const expireStaleOrders = async () => {
  const count = await PaymentModel.expireStaleOrders();
  if (count > 0) {
    logger.info(`Order expiry job: expired ${count} order(s)`);
  }
  return count;
};

// ─────────────────────────────────────────────
// PLANS
// ─────────────────────────────────────────────

const getAllPlans = async () => PaymentModel.getAllPlans();

export default {
  createOrder,
  processWebhook,
  getOrderStatus,
  cancelOrder,
  getPaymentHistory,
  getPaymentDetails,
  getReceipt,
  getStudentPurchases,
  expireStaleOrders,
  getAllPlans,
  getUpgradeOptions,   // ← NEW
};