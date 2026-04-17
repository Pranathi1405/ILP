//Author: Harshitha Ravuri
/**
 * Payment Model
 * All database operations for the payments module.
 */

import pool from '../config/database.config.js';

// ─────────────────────────────────────────────
// PLANS
// ─────────────────────────────────────────────

/**
 * Get a single plan by plan_id.
 */
const findPlanById = async (planId) => {
  const [rows] = await pool.execute(
    `SELECT plan_id, plan_code, plan_name, description, price,
            duration_days, course_purchase_limit,
            custom_test_limit, sme_test_attempt_limit, features
     FROM plans
     WHERE plan_id = ?`,
    [planId]
  );
  return rows[0] || null;
};

/**
 * Get all plans ordered by price ascending (cheapest first).
 */
const getAllPlans = async () => {
  const [rows] = await pool.execute(
    `SELECT plan_id, plan_code, plan_name, description, price,
            duration_days, course_purchase_limit,
            custom_test_limit, sme_test_attempt_limit, features
     FROM plans
     ORDER BY price ASC`
  );
  return rows;
};

// ─────────────────────────────────────────────
// COURSES  (read-only — used for validation)
// ─────────────────────────────────────────────

/**
 * Fetch a published course for pre-payment validation.
 * Returns null if course doesn't exist or is not published.
 */
const findPublishedCourseById = async (courseId) => {
  const [rows] = await pool.execute(
    `SELECT course_id, course_name, price, is_free
     FROM courses
     WHERE course_id = ? AND is_published = 1`,
    [courseId]
  );
  return rows[0] || null;
};

/**
 * Fetch course + plan data in a single optimized query for pricing calculation.
 * Replaces two sequential round-trips (findPublishedCourseById + findPlanById)
 * with one JOIN — both PKs are indexed so this is O(1) lookups.
 *
 * Returns null if either the course doesn't exist / isn't published,
 * or the plan doesn't exist.
 *
 * @param {number} courseId
 * @param {number} planId
 * @returns {{
 *   course_id: number,
 *   course_name: string,
 *   course_price: string,   // DECIMAL comes back as string from mysql2
 *   is_free: number,        // 0 | 1
 *   plan_id: number,
 *   plan_code: string,
 *   plan_name: string,
 *   plan_price: string,     // DECIMAL comes back as string from mysql2
 *   duration_days: number
 * } | null}
 */
const findCourseAndPlan = async (courseId, planId) => {
  const [rows] = await pool.execute(
    `SELECT
       c.course_id,
       c.course_name,
       c.price          AS course_price,
       c.is_free,
       p.plan_id,
       p.plan_code,
       p.plan_name,
       p.price          AS plan_price,
       p.duration_days
     FROM courses c
     JOIN plans   p ON p.plan_id = ?
     WHERE c.course_id    = ?
       AND c.is_published = 1`,
    [planId, courseId]
  );
  return rows[0] || null;
};

/**
 * Fetch the current active purchase for a student + course,
 * joined with the associated plan details (price, plan_code).
 * Used for upgrade eligibility checks — tells us what plan they currently have
 * and whether the new plan is actually an upgrade.
 *
 * @param {number} studentId
 * @param {number} courseId
 * @returns {{
 *   purchase_id: number,
 *   plan_id: number,
 *   plan_code: string,
 *   plan_price: string,
 *   valid_until: Date,
 *   status: string
 * } | null}
 */
const findActivePurchaseWithPlan = async (studentId, courseId) => {
  const [rows] = await pool.execute(
    `SELECT
       cp.purchase_id,
       cp.plan_id,
       cp.valid_until,
       cp.status,
       p.plan_code,
       p.price AS plan_price
     FROM course_purchases cp
     JOIN plans p ON cp.plan_id = p.plan_id
     WHERE cp.student_id = ?
       AND cp.course_id  = ?
       AND cp.status     = 'active'
       AND (cp.valid_until IS NULL OR cp.valid_until > NOW())`,
    [studentId, courseId]
  );
  return rows[0] || null;
};

// ─────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────

/**
 * Insert a new order row with status = 'pending'.
 * is_upgrade flag is stored so the webhook knows whether to cancel
 * the previous purchase row or not.
 */
const createOrder = async (orderData) => {
  const {
    student_id,
    course_id,
    plan_id,
    original_price,
    discount_amount,
    final_amount,
    currency = 'INR',
    gateway = 'razorpay',
    receipt_ref,
    expires_at,
    is_upgrade = false,
    notes = null,
  } = orderData;

  const [result] = await pool.execute(
    `INSERT INTO orders
     (student_id, course_id, plan_id, original_price, discount_amount, final_amount,
      currency, gateway, receipt_ref, status, expires_at, is_processed, is_upgrade, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, 0, ?, ?)`,
    [
      student_id, course_id, plan_id, original_price, discount_amount,
      final_amount, currency, gateway, receipt_ref, expires_at,
      is_upgrade ? 1 : 0, notes,
    ]
  );

  return findOrderById(result.insertId);
};

/**
 * Update the order row with the Razorpay gateway_order_id and receipt_ref.
 * Called immediately after a successful Razorpay Orders API call.
 */
const updateOrderReceiptAndGatewayId = async (orderId, receiptRef, gatewayOrderId) => {
  await pool.execute(
    `UPDATE orders SET receipt_ref = ?, gateway_order_id = ? WHERE order_id = ?`,
    [receiptRef, gatewayOrderId, orderId]
  );
};

/**
 * Find an order by its internal PK.
 */
const findOrderById = async (orderId) => {
  const [rows] = await pool.execute(
    `SELECT * FROM orders WHERE order_id = ?`,
    [orderId]
  );
  return rows[0] || null;
};

/**
 * Find an order by the Razorpay gateway_order_id.
 * Used in webhook processing.
 */
const findOrderByGatewayId = async (gatewayOrderId) => {
  const [rows] = await pool.execute(
    `SELECT * FROM orders WHERE gateway_order_id = ?`,
    [gatewayOrderId]
  );
  return rows[0] || null;
};

/**
 * Mark an order as paid and set is_processed = 1.
 * Must be called with an active transaction connection.
 */
const markOrderAsPaid = async (orderId, conn) => {
  await conn.execute(
    `UPDATE orders
     SET status = 'paid', paid_at = NOW(), is_processed = 1
     WHERE order_id = ?`,
    [orderId]
  );
};

/**
 * Mark a pending order as failed (called on payment.failed webhook event).
 */
const markOrderAsFailed = async (orderId) => {
  await pool.execute(
    `UPDATE orders SET status = 'failed' WHERE order_id = ? AND status = 'pending'`,
    [orderId]
  );
};

/**
 * Cancel a pending order. Only succeeds if order belongs to the student
 * and is still in 'pending' status. Returns true if a row was updated.
 */
const cancelOrder = async (orderId, studentId) => {
  const [result] = await pool.execute(
    `UPDATE orders
     SET status = 'cancelled'
     WHERE order_id = ? AND student_id = ? AND status = 'pending'`,
    [orderId, studentId]
  );
  return result.affectedRows > 0;
};

/**
 * Mark all orders as 'expired' where status = 'pending' and expires_at has passed.
 * Called by the order expiry cron job every 5 minutes.
 * Returns the number of rows updated.
 */
const expireStaleOrders = async () => {
  const [result] = await pool.execute(
    `UPDATE orders
     SET status = 'expired'
     WHERE status = 'pending' AND expires_at < NOW()`
  );
  return result.affectedRows;
};

/**
 * Delete a pending order that was created but Razorpay call failed.
 * Keeps the DB clean on gateway errors.
 */
const deleteOrder = async (orderId) => {
  await pool.execute(
    `DELETE FROM orders WHERE order_id = ? AND status = 'pending'`,
    [orderId]
  );
};

// ─────────────────────────────────────────────
// PAYMENTS
// ─────────────────────────────────────────────

/**
 * Insert a confirmed payment record.
 * Must be called with an active transaction connection.
 *
 * Note: payment_id is INT AUTO_INCREMENT in the schema.
 *       payment_id in course_purchases / user_test_subscriptions is VARCHAR(100)
 *       — we store the INT as a string there.
 */
const createPayment = async (paymentData, conn) => {
  const {
    student_id,
    course_id,
    order_id,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    amount,
    currency = 'INR',
    payment_method,
    payment_status = 'completed',
    transaction_id,
    description,
    metadata,
  } = paymentData;

  const [result] = await conn.execute(
    `INSERT INTO payments
     (student_id, course_id, order_id, razorpay_order_id, razorpay_payment_id,
      razorpay_signature, amount, currency, payment_method, payment_status,
      transaction_id, payment_date, description, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
    [
      student_id, course_id, order_id, razorpay_order_id, razorpay_payment_id,
      razorpay_signature, amount, currency, payment_method, payment_status,
      transaction_id, description,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );

  // Return the new payment_id as a string (VARCHAR compatibility with related tables)
  return String(result.insertId);
};

/**
 * Find a single payment by payment_id, scoped to the requesting student.
 * Joins courses for display info.
 */
const findPaymentById = async (paymentId, studentId) => {
  const [rows] = await pool.execute(
    `SELECT p.payment_id, p.order_id, p.amount, p.currency, p.payment_method,
            p.payment_status, p.transaction_id, p.payment_date,
            p.razorpay_payment_id, p.description,
            c.course_id, c.course_name, c.thumbnail_url,
            pr.receipt_number, pr.receipt_url
     FROM payments p
     LEFT JOIN courses c ON p.course_id = c.course_id
     LEFT JOIN payment_receipts pr ON pr.payment_id = p.payment_id
     WHERE p.payment_id = ? AND p.student_id = ?`,
    [paymentId, studentId]
  );
  return rows[0] || null;
};

/**
 * Get paginated payment history for a student, newest first.
 */
const getPaymentHistory = async (studentId, { page = 1, limit = 20 } = {}) => {
  // ✅ Ensure numbers (avoid MySQL errors)
  const pageNum  = Math.max(Number(page) || 1, 1);
  const limitNum = Math.min(Number(limit) || 20, 100);
  const offset   = (pageNum - 1) * limitNum;

  // ✅ Main query (NO placeholders for LIMIT/OFFSET)
  const [rows] = await pool.execute(
    `SELECT 
        p.payment_id,
        p.order_id,
        p.amount,
        p.currency,
        p.payment_method,
        p.payment_status,
        p.transaction_id,
        p.payment_date,
        c.course_id,
        c.course_name,
        pr.receipt_number,
        pr.receipt_url
     FROM payments p
     LEFT JOIN courses c 
        ON p.course_id = c.course_id
     LEFT JOIN payment_receipts pr 
        ON pr.payment_id = p.payment_id
     WHERE p.student_id = ?
     ORDER BY p.payment_date DESC
     LIMIT ${limitNum} OFFSET ${offset}`,
    [studentId] // ✅ only actual placeholder
  );

  // ✅ Count query
  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total 
     FROM payments 
     WHERE student_id = ?`,
    [studentId]
  );

  return { rows, total };
};

// ─────────────────────────────────────────────
// COURSE PURCHASES
// ─────────────────────────────────────────────

/**
 * Insert a course_purchase row.
 * payment_id is stored as VARCHAR(100) per the schema.
 * Must be called with an active transaction connection.
 */
const createCoursePurchase = async (purchaseData, conn) => {
  const {
    student_id,
    course_id,
    payment_id,
    plan_id,
    valid_until,
    status = 'active',
  } = purchaseData;

  const [result] = await conn.execute(
    `INSERT INTO course_purchases
     (student_id, course_id, payment_id, plan_id, purchase_date, valid_until, status)
     VALUES (?, ?, ?, ?, NOW(), ?, ?)`,
    [student_id, course_id, payment_id, plan_id, valid_until, status]
  );

  return result.insertId;
};

/**
 * Upsert a course_purchase row — handles BOTH fresh purchases and upgrades.
 *
 * Why this exists:
 *   The unique key on course_purchases is (student_id, course_id) with no status
 *   column included. This means setting status = 'cancelled' on the old row and
 *   then INSERTing a new one still triggers a duplicate-key error because the
 *   cancelled row still occupies the unique slot.
 *
 *   For upgrades we therefore UPDATE the existing row in-place (changing plan,
 *   payment, dates, status back to active) rather than cancel + insert.
 *   For fresh purchases there is no existing row, so we INSERT normally.
 *
 * @param {object} purchaseData
 * @param {boolean} isUpgrade  - true → UPDATE existing row; false → INSERT new row
 * @param {object} conn        - active transaction connection
 * @returns {number} purchase_id
 */
const upsertCoursePurchase = async (purchaseData, isUpgrade, conn) => {
  const {
    student_id,
    course_id,
    payment_id,
    plan_id,
    valid_until,
  } = purchaseData;
 
  if (isUpgrade) {
    // UPDATE the existing row in-place — avoids the unique-key collision entirely.
    // Resets purchase_date to now so the new plan period is tracked cleanly.
    await conn.execute(
      `UPDATE course_purchases
       SET plan_id       = ?,
           payment_id    = ?,
           purchase_date = NOW(),
           valid_until   = ?,
           status        = 'active'
       WHERE student_id = ?
         AND course_id  = ?`,
      [plan_id, payment_id, valid_until, student_id, course_id]
    );
 
    // Return the existing purchase_id for audit consistency
    const [rows] = await conn.execute(
      `SELECT purchase_id FROM course_purchases WHERE student_id = ? AND course_id = ?`,
      [student_id, course_id]
    );
    return rows[0]?.purchase_id ?? null;
  }
 
  // Fresh purchase — simple INSERT
  const [result] = await conn.execute(
    `INSERT INTO course_purchases
     (student_id, course_id, payment_id, plan_id, purchase_date, valid_until, status)
     VALUES (?, ?, ?, ?, NOW(), ?, 'active')`,
    [student_id, course_id, payment_id, plan_id, valid_until]
  );
 
  return result.insertId;
};
 
/**
 * Cancel any existing active purchase for a student + course.
 * NOTE: This is kept for non-upgrade cancellation flows (e.g. refunds).
 * Do NOT use this before upsertCoursePurchase — the unique key collision
 * will still occur. Use upsertCoursePurchase(isUpgrade=true) instead.
 * Must be called with an active transaction connection.
 */
const cancelActivePurchase = async (studentId, courseId, conn) => {
  await conn.execute(
    `UPDATE course_purchases
     SET status = 'cancelled'
     WHERE student_id = ? AND course_id = ? AND status = 'active'`,
    [studentId, courseId]
  );
};
 
/**
 * Check if a student already has an active, non-expired purchase for a course.
 * Returns the bare purchase row (no plan join). Used as a simple existence check.
 */
const findActivePurchase = async (studentId, courseId) => {
  const [rows] = await pool.execute(
    `SELECT purchase_id, plan_id, valid_until, status
     FROM course_purchases
     WHERE student_id = ? AND course_id = ?
       AND status = 'active'
       AND (valid_until IS NULL OR valid_until > NOW())`,
    [studentId, courseId]
  );
  return rows[0] || null;
};
 
/**
 * Paginated list of all course purchases for a student.
 * Joins courses and plans for display details.
 */
const getStudentPurchases = async (studentId, { page = 1, limit = 20 } = {}) => {
 
  const pageNum  = parseInt(page, 10)  || 1;
  const limitNum = parseInt(limit, 10) || 20;
  const offset   = (pageNum - 1) * limitNum;
 
  const [rows] = await pool.execute(
    `SELECT cp.purchase_id, cp.student_id, cp.course_id, cp.payment_id,
            cp.plan_id, cp.purchase_date, cp.valid_until, cp.status,
            c.course_name, c.thumbnail_url,
            pl.plan_name, pl.plan_code
     FROM course_purchases cp
     JOIN courses c  ON cp.course_id = c.course_id
     JOIN plans   pl ON cp.plan_id   = pl.plan_id
     WHERE cp.student_id = ?
     ORDER BY cp.purchase_date DESC
     LIMIT ${limitNum} OFFSET ${offset}`, // ✅ FIXED
    [studentId]
  );
 
  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM course_purchases WHERE student_id = ?`,
    [studentId]
  );
 
  return {
    rows,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum)
  };
};
// ─────────────────────────────────────────────
// COURSE ENROLLMENTS
// ─────────────────────────────────────────────
 
/**
 * Ensure an enrollment row exists for the student + course.
 * If a dropped enrollment exists, it is re-activated.
 * Must be called with an active transaction connection.
 */
const ensureEnrollment = async (studentId, courseId, conn) => {
  const [existing] = await conn.execute(
    `SELECT enrollment_id, status FROM course_enrollments
     WHERE student_id = ? AND course_id = ?`,
    [studentId, courseId]
  );
 
  if (existing.length > 0) {
    const { enrollment_id, status } = existing[0];
    if (status === 'dropped') {
      await conn.execute(
        `UPDATE course_enrollments
         SET status = 'enrolled', enrollment_date = NOW()
         WHERE enrollment_id = ?`,
        [enrollment_id]
      );
    }
    return enrollment_id;
  }
 
  const [result] = await conn.execute(
    `INSERT INTO course_enrollments
     (student_id, course_id, enrollment_date, status)
     VALUES (?, ?, NOW(), 'enrolled')`,
    [studentId, courseId]
  );
 
  return result.insertId;
};
 
// ─────────────────────────────────────────────
// USER TEST SUBSCRIPTIONS
// ─────────────────────────────────────────────
 
/**
 * Create or update a user_test_subscriptions row.
 * On upgrade: plan, payment, dates updated and all usage counters reset to 0.
 * Must be called with an active transaction connection.
 */
const upsertTestSubscription = async (subData, conn) => {
  const {
    user_id,
    course_id,
    enrollment_id,
    plan_id,
    payment_id,
    start_date,
    end_date,
  } = subData;
 
  const [existing] = await conn.execute(
    `SELECT subscription_id FROM user_test_subscriptions
     WHERE user_id = ? AND course_id = ?`,
    [user_id, course_id]
  );
 
  if (existing.length > 0) {
    await conn.execute(
      `UPDATE user_test_subscriptions
       SET plan_id            = ?,
           payment_id         = ?,
           start_date         = ?,
           end_date           = ?,
           custom_tests_used  = 0,
           sme_attempts_used  = 0,
           ug_exam_tests_used = 0,
           is_active          = 1
       WHERE user_id = ? AND course_id = ?`,
      [plan_id, payment_id, start_date, end_date, user_id, course_id]
    );
    return existing[0].subscription_id;
  }
 
  const [result] = await conn.execute(
    `INSERT INTO user_test_subscriptions
     (user_id, course_id, enrollment_id, plan_id, payment_id,
      start_date, end_date,
      custom_tests_used, sme_attempts_used, ug_exam_tests_used, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 1)`,
    [user_id, course_id, enrollment_id, plan_id, payment_id, start_date, end_date]
  );
 
  return result.insertId;
};

// ─────────────────────────────────────────────
// PAYMENT RECEIPTS
// ─────────────────────────────────────────────

/**
 * Insert a receipt row after async PDF generation.
 */
const createReceipt = async (paymentId, receiptNumber, receiptUrl) => {
  const [result] = await pool.execute(
    `INSERT INTO payment_receipts (payment_id, receipt_number, receipt_url, generated_at)
     VALUES (?, ?, ?, NOW())`,
    [paymentId, receiptNumber, receiptUrl]
  );
  return result.insertId;
};

/**
 * Fetch the receipt for a payment, scoped to the student (ownership check via JOIN).
 */
const findReceiptByPaymentId = async (paymentId, studentId) => {
  const [rows] = await pool.execute(
    `SELECT pr.receipt_id, pr.payment_id, pr.receipt_number,
            pr.receipt_url, pr.generated_at
     FROM payment_receipts pr
     JOIN payments p ON pr.payment_id = p.payment_id
     WHERE pr.payment_id = ? AND p.student_id = ?`,
    [paymentId, studentId]
  );
  return rows[0] || null;
};
const getCourseNameById = async (courseId) => {
  const parsedId = Number(courseId);

  if (!Number.isInteger(parsedId)) {
    throw new Error("Invalid courseId");
  }

  const [rows] = await pool.execute(
    `SELECT course_name 
     FROM courses 
     WHERE course_id = ? 
     LIMIT 1`,
    [parsedId]
  );

  return rows.length ? rows[0].course_name : null;
};
// ─────────────────────────────────────────────
// ACTIVITY LOGS  (written during webhook transaction)
// ─────────────────────────────────────────────

/**
 * Log a payment activity event inside the webhook DB transaction.
 */
const logActivity = async (userId, activityType, description, entityType, entityId, metadata, conn) => {
  await conn.execute(
    `INSERT INTO activity_logs
     (user_id, activity_type, activity_description, related_entity_type, related_entity_id, metadata)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, activityType, description, entityType, entityId, JSON.stringify(metadata)]
  );
};

export default {
  // Plans
  findPlanById,
  getAllPlans,
  // Courses (validation)
  findPublishedCourseById,
  findCourseAndPlan,
  // Orders
  createOrder,
  updateOrderReceiptAndGatewayId,
  findOrderById,
  findOrderByGatewayId,
  markOrderAsPaid,
  markOrderAsFailed,
  cancelOrder,
  expireStaleOrders,
  deleteOrder,
  // Payments
  createPayment,
  findPaymentById,
  getPaymentHistory,
  // Course Purchases
  createCoursePurchase,
  upsertCoursePurchase,
  cancelActivePurchase,         // ← NEW: cancels old purchase row on upgrade
  findActivePurchase,
  findActivePurchaseWithPlan,   // ← NEW: purchase + plan details for upgrade checks
  getStudentPurchases,
  getCourseNameById,

  // Enrollments
  ensureEnrollment,
  // Subscriptions
  upsertTestSubscription,
  // Receipts
  createReceipt,
  findReceiptByPaymentId,
  // Activity logs
  logActivity,
};