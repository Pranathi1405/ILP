//Author: Harshitha Ravuri
/**
 * Payment Routes
 *
 * All routes are JWT-protected except the Razorpay webhook.
 * The webhook endpoint must receive the raw body for HMAC verification —
 * ensure express.raw() or bodyParser is configured upstream for that path.
 */
import express from 'express';
import {
  createOrder,
  getOrderStatus,
  cancelOrder,
  getUpgradeOptions,
  handleWebhook,
  getPaymentHistory,
  getPaymentDetails,
  getReceipt,
  getStudentPurchases,
  verifyPayment,
  getPlans,
} from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// ── PUBLIC ─────────────────────────────
router.post('/webhook', handleWebhook);
router.get('/plans', getPlans);

// ── PROTECTED ──────────────────────────
router.use(authenticate);

// ✅ student scoped
router.get('/me/payments', getPaymentHistory);
router.get('/me/purchases', getStudentPurchases);

// order lifecycle
 
//Frontend-driven payment verification
// Called from frontend after Razorpay success handler
router.post('/verify-payment', verifyPayment);
router.post('/create-order', createOrder);
router.get('/orders/:orderId', getOrderStatus);
router.post('/orders/:orderId/cancel', cancelOrder);

// upgrade
router.get('/upgrade-options/:courseId', getUpgradeOptions);

// ✅ dynamic routes LAST
router.get('/:paymentId/receipt', getReceipt);
router.get('/:paymentId', getPaymentDetails);

export default router;