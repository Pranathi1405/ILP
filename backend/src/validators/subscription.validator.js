// validators/subscription.validator.js
import { body, query, param, validationResult } from 'express-validator';

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  next();
};

export const createSubscriptionValidator = [
  body('user_id').isInt({ min: 1 }).withMessage('user_id must be a positive integer'),
  body('course_id').isInt({ min: 1 }).withMessage('course_id must be a positive integer'),
  body('enrollment_id').isInt({ min: 1 }).withMessage('enrollment_id must be a positive integer'),
  body('plan_id').isInt({ min: 1 }).withMessage('plan_id must be a positive integer'),
  body('payment_id').optional().isInt({ min: 1 }),
  body('start_date').isDate().withMessage('start_date must be YYYY-MM-DD'),
  body('end_date').isDate().withMessage('end_date must be YYYY-MM-DD')
    .custom((end, { req }) => {
      if (new Date(end) <= new Date(req.body.start_date)) throw new Error('end_date must be after start_date');
      return true;
    }),
  handleValidation,
];

export const updateSubscriptionValidator = [
  param('id').isInt({ min: 1 }),
  body('plan_id').optional().isInt({ min: 1 }),
  body('payment_id').optional().isInt({ min: 1 }),
  body('start_date').optional().isDate(),
  body('end_date').optional().isDate(),
  body('is_active').optional().isBoolean(),
  body('custom_tests_used').optional().isInt({ min: 0 }),
  body('sme_attempts_used').optional().isInt({ min: 0 }),
  handleValidation,
];

export const idParamValidator = [
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  handleValidation,
];

export const userIdParamValidator = [
  param('userId').isInt({ min: 1 }).withMessage('userId must be a positive integer'),
  handleValidation,
];

export const paginationValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('is_active').optional().isBoolean(),
  handleValidation,
];