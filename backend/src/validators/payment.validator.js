//Author: Harshitha Ravuri
/**
 * Payment Validators
 * Joi schemas for validating payment-related request bodies and params.
 */

import Joi from 'joi';

// ── Create Order ──────────────────────────────────────────────────────
export const createOrderSchema = Joi.object({
  course_id: Joi.number().integer().positive().required().messages({
    'number.base': 'course_id must be a number',
    'any.required': 'course_id is required',
  }),
  plan_id: Joi.number().integer().positive().required().messages({
    'number.base': 'plan_id must be a number',
    'any.required': 'plan_id is required',
  }),
});

// ── Webhook Payload ───────────────────────────────────────────────────
export const webhookPayloadSchema = Joi.object({
  // We validate what we need; extra Razorpay keys are allowed
  razorpay_order_id: Joi.string().required(),
  razorpay_payment_id: Joi.string().required(),
  razorpay_signature: Joi.string().required(),
}).options({ allowUnknown: true });

// ── Order ID Param ────────────────────────────────────────────────────
export const orderIdParamSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
});

// ── Payment ID Param ──────────────────────────────────────────────────
export const paymentIdParamSchema = Joi.object({
  paymentId: Joi.number().integer().positive().required(),
});

// ── Pagination Query ──────────────────────────────────────────────────
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

/**
 * Generic Joi validation middleware factory.
 * @param {Joi.Schema} schema
 * @param {'body'|'params'|'query'} target
 */
export const validate = (schema, target = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[target], { abortEarly: false });

  if (error) {
    return res.status(422).json({
      status: 'validation_error',
      code: 422,
      message: 'Validation failed',
      errors: error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      })),
    });
  }

  req[target] = value; // replace with sanitized/coerced value
  next();
};