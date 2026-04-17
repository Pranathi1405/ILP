//Author: Harshitha Ravuri
/**
 * Razorpay Client
 * Wraps the Razorpay SDK for order creation and signature verification.
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize the Razorpay SDK using env credentials
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a Razorpay order.
 * @param {number} amountInPaise - Amount in smallest currency unit (paise)
 * @param {string} currency - e.g. 'INR'
 * @param {string} receiptRef - ILP order reference string
 * @returns {object} Razorpay order object (contains id as gateway_order_id)
 */
const createRazorpayOrder = async (amountInPaise, currency, receiptRef) => {
  const order = await razorpayInstance.orders.create({
    amount: amountInPaise,
    currency,
    receipt: receiptRef,
  });
  return order;
};
// Verify Razorpay payment signature (called from frontend flow)

const verifyPaymentSignature = (orderId, paymentId, signature) => {
  const body = `${orderId}|${paymentId}`;

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  return expected === signature;
};

/**
 * Fetch a Razorpay payment by its ID (used for reconciliation).
 * @param {string} razorpayPaymentId
 * @returns {object} Razorpay payment object
 */
const fetchPayment = async (razorpayPaymentId) => {
  return razorpayInstance.payments.fetch(razorpayPaymentId);
};

export default {
  createRazorpayOrder,
  verifyPaymentSignature,
  fetchPayment,
};