/**
 * AUTHORS: Harshitha Ravuri, NDMATRIX
 * Response Handler Utility
 * ==========================
 * Provides consistent API response structure across all controllers.
 *
 * Success response shape:
 * {
 *   success: true,
 *   message: "...",
 *   data: { ... }
 * }
 *
 * Error response shape:
 * {
 *   success: false,
 *   message: "...",
 *   errors: [ ... ]  // Optional, for validation errors
 * }
 */

/**
 * Send a success response.
 *
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {string} message - Human-readable success message
 * @param {*} data - The response payload
 */
export const sendSuccess = (res, statusCode = 200, message, data = null) => {
  const response = { success: true, message };
  if (data !== null) {
    response.data = data;
  }
  return res.status(statusCode).json(response);
};

/**
 * Send an error response.
 *
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} message - Error message
 * @param {Array} errors - Optional array of validation errors
 */
export const sendError = (res, statusCode = 500, message, errors = null) => {
  const response = { success: false, message };
  if (errors) {
    response.errors = errors;
  }
  return res.status(statusCode).json(response);
};

/**
 * Send a paginated success response.
 *
 * @param {Object} res - Express response object
 * @param {string} message - Human-readable success message
 * @param {Array} data - Array of records
 * @param {Object} pagination - Pagination metadata
 */
export const sendPaginated = (res, message, data, pagination) => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination,
  });
};