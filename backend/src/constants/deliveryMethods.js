/**
 * AUTHORS: Harshitha Ravuri,
 * Delivery Methods
 * These values match exactly with the DB ENUM in the `notifications` table.
 * delivery_method ENUM: 'in_app','email','sms','push'
 *
 * NOTE: This module only handles 'in_app' and 'push' (as per requirements).
 * Email and SMS are out of scope for this module but kept here for future use.
 */

export const DELIVERY_METHODS = {
  IN_APP: 'in_app', // Always used — source of truth
  PUSH: 'push',     // Optional — based on user preference
  EMAIL: 'email',   // Out of scope (future)
  SMS: 'sms',       // Out of scope (future)
};

export const VALID_DELIVERY_METHODS = Object.values(DELIVERY_METHODS);
